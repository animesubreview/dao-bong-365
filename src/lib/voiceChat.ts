// ─── Voice chat trong phòng xem chung (WebRTC mesh, tín hiệu qua Supabase/Firestore-compat) ───
// Mỗi người vào voice → ghi 1 dòng "có mặt" vào watchRooms/{room}/voice, rồi kết nối trực tiếp với từng người khác.
// Tín hiệu (offer/answer/ice) gửi qua watchRooms/{room}/signals và được xóa ngay sau khi xử lý.
import { collection, doc, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, where } from './firestore-compat';
import { db } from './firebase';

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};
const HEARTBEAT_MS = 20_000;
const STALE_MS = 70_000;

export interface VoicePeer { uid: string; muted: boolean; connected: boolean }

interface PeerConn {
  pc: RTCPeerConnection;
  sid: string;
  pending: RTCIceCandidateInit[];
  audio: HTMLAudioElement;
  connected: boolean;
}

export class VoiceChat {
  private roomId: string;
  private uid: string;
  private sid = Math.random().toString(36).slice(2, 10);
  private stream: MediaStream | null = null;
  private peers = new Map<string, PeerConn>();
  private presence: { uid: string; sid: string; muted?: boolean; ts?: number }[] = [];
  private seen = new Set<string>();
  private chain: Promise<void> = Promise.resolve();
  private unsubs: (() => void)[] = [];
  private hb: any = null;
  private muted = false;
  private closed = false;
  private onChange: (peers: VoicePeer[]) => void;

  constructor(roomId: string, uid: string, onChange: (peers: VoicePeer[]) => void) {
    this.roomId = roomId; this.uid = uid; this.onChange = onChange;
  }

  private presRef() { return doc(db, 'watchRooms', this.roomId, 'voice', this.uid); }

  async join() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt không hỗ trợ micro (cần HTTPS)');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    await setDoc(this.presRef(), { uid: this.uid, sid: this.sid, muted: false, ts: Date.now() });

    this.unsubs.push(onSnapshot(collection(db, 'watchRooms', this.roomId, 'voice'), (snap: any) => {
      this.presence = snap.docs.map((d: any) => d.data());
      this.syncPeers();
    }));
    this.unsubs.push(onSnapshot(
      query(collection(db, 'watchRooms', this.roomId, 'signals'), where('to', '==', this.uid)),
      (snap: any) => {
        const sigs = snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() }))
          .filter((s: any) => !this.seen.has(s.id))
          .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
        for (const s of sigs) {
          this.seen.add(s.id);
          this.chain = this.chain.then(() => this.handleSignal(s)).catch(() => {});
        }
      }));
    this.hb = setInterval(() => {
      updateDoc(this.presRef(), { ts: Date.now() }).catch(() => {});
    }, HEARTBEAT_MS);
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.stream?.getAudioTracks().forEach(t => { t.enabled = !m; });
    updateDoc(this.presRef(), { muted: m }).catch(() => {});
  }
  isMuted() { return this.muted; }

  async leave() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.hb);
    this.unsubs.forEach(u => { try { u(); } catch {} });
    this.peers.forEach((_, uid) => this.closePeer(uid));
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    try { await deleteDoc(this.presRef()); } catch {}
  }

  // ── Danh sách người trong voice ──
  private livePresence() {
    const now = Date.now();
    return this.presence.filter(p => p.uid !== this.uid && now - (p.ts || 0) < STALE_MS);
  }

  private syncPeers() {
    if (this.closed) return;
    const live = this.livePresence();
    const liveUids = new Set(live.map(p => p.uid));
    // người đã rời → đóng kết nối
    this.peers.forEach((_, uid) => { if (!liveUids.has(uid)) this.closePeer(uid); });
    // người mới (hoặc vào lại với phiên mới) → bên có uid nhỏ hơn chủ động gọi
    for (const p of live) {
      const cur = this.peers.get(p.uid);
      if (cur && cur.sid !== p.sid) this.closePeer(p.uid);
      if (!this.peers.has(p.uid) && this.uid < p.uid) {
        this.startOffer(p.uid, p.sid).catch(() => {});
      }
    }
    this.emit();
  }

  private emit() {
    this.onChange(this.livePresence().map(p => ({
      uid: p.uid, muted: !!p.muted, connected: !!this.peers.get(p.uid)?.connected,
    })));
  }

  // ── Kết nối từng cặp ──
  private makePeer(peerUid: string, sid: string): PeerConn {
    const pc = new RTCPeerConnection(ICE);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    (audio as any).playsInline = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    const peer: PeerConn = { pc, sid, pending: [], audio, connected: false };
    this.stream?.getTracks().forEach(t => pc.addTrack(t, this.stream!));
    pc.onicecandidate = e => { if (e.candidate) this.send(peerUid, 'ice', JSON.stringify(e.candidate.toJSON())); };
    pc.ontrack = e => { audio.srcObject = e.streams[0]; audio.play().catch(() => {}); };
    pc.onconnectionstatechange = () => {
      peer.connected = pc.connectionState === 'connected';
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (this.peers.get(peerUid) === peer) this.closePeer(peerUid);
        // thử gọi lại một lần nếu mình là bên gọi
        setTimeout(() => { if (!this.closed) this.syncPeers(); }, 2500);
      }
      this.emit();
    };
    this.peers.set(peerUid, peer);
    return peer;
  }

  private closePeer(uid: string) {
    const p = this.peers.get(uid);
    if (!p) return;
    this.peers.delete(uid);
    try { p.pc.close(); } catch {}
    p.audio.srcObject = null;
    p.audio.remove();
  }

  private async startOffer(peerUid: string, sid: string) {
    const peer = this.makePeer(peerUid, sid);
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    await this.send(peerUid, 'offer', JSON.stringify(peer.pc.localDescription));
  }

  private async handleSignal(s: any) {
    try { await deleteDoc(doc(db, 'watchRooms', this.roomId, 'signals', s.id)); } catch {}
    if (this.closed) return;
    const data = JSON.parse(s.payload);
    if (s.type === 'offer') {
      let peer = this.peers.get(s.from);
      if (peer && peer.sid !== s.fromSid) { this.closePeer(s.from); peer = undefined; }
      if (!peer) peer = this.makePeer(s.from, s.fromSid);
      await peer.pc.setRemoteDescription(data);
      await this.flush(peer);
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      await this.send(s.from, 'answer', JSON.stringify(peer.pc.localDescription));
    } else if (s.type === 'answer') {
      const peer = this.peers.get(s.from);
      if (peer && peer.pc.signalingState === 'have-local-offer') {
        await peer.pc.setRemoteDescription(data);
        await this.flush(peer);
      }
    } else if (s.type === 'ice') {
      const peer = this.peers.get(s.from);
      if (!peer) return;
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data).catch(() => {});
      else peer.pending.push(data);
    }
  }

  private async flush(peer: PeerConn) {
    for (const c of peer.pending.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
  }

  private send(to: string, type: string, payload: string) {
    return addDoc(collection(db, 'watchRooms', this.roomId, 'signals'), {
      from: this.uid, fromSid: this.sid, to, type, payload, createdAt: Date.now(),
    }).catch(() => {});
  }
}
