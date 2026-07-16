import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, Send, History, Zap } from 'lucide-react';
import {
  submitCardTopup,
  subscribeUserTopupHistory,
  CARD_TELCOS,
  CARD_AMOUNTS,
  formatVND,
  getStatusInfo,
  TopupRequest,
  CardTelco,
} from '../lib/topup';
import { onAuthChange, getUserProfile, UserProfile } from '../lib/auth';

function StatusBadge({ status }: { status: TopupRequest['status'] }) {
  const info = getStatusInfo(status)!;
  const Icon = status === 'pending' ? Clock : status === 'success' ? CheckCircle2 : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${info.bg} ${info.color}`}>
      <Icon size={11} />
      {info.label}
    </span>
  );
}

export default function NapThe() {
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined); // undefined = đang load
  const [tab, setTab] = useState<'form' | 'history'>('form');
  const [telco, setTelco]   = useState<CardTelco>('VIETTEL');
  const [serial, setSerial] = useState('');
  const [code, setCode]     = useState('');
  const [amount, setAmount] = useState(100000);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null);
  const [history, setHistory] = useState<TopupRequest[]>([]);

  useEffect(() => {
    const unsub = onAuthChange(async firebaseUser => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserTopupHistory(user.uid, setHistory);
    return () => unsub();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) { setMsg({ text: 'Bạn cần đăng nhập để nạp thẻ!', ok: false }); return; }
    if (!serial.trim() || !code.trim()) { setMsg({ text: 'Vui lòng nhập đầy đủ serial và mã thẻ!', ok: false }); return; }
    setLoading(true); setMsg(null);
    const result = await submitCardTopup(user.uid, telco, serial, code, amount);
    setLoading(false);
    if (result.ok) {
      setMsg({ text: '✅ Đã gửi thẻ! Hệ thống đang xử lý tự động, tiền sẽ cộng ngay khi có kết quả.', ok: true });
      setSerial(''); setCode(''); setTab('history');
    } else {
      setMsg({ text: result.error || 'Gửi thất bại, thử lại.', ok: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1117]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center">
          <CreditCard size={16} className="text-emerald-400" />
        </div>
        <h1 className="text-base font-black text-white tracking-wide">NẠP THẺ CÀO</h1>
        <span className="ml-auto text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <Zap size={11} /> Tự động
        </span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* Notice */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex gap-2.5 items-start">
          <AlertCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-emerald-200/80 text-xs leading-relaxed">
            Nạp thẻ <strong>tự động</strong>. Thẻ đúng sẽ được cộng tiền ngay lập tức, thường trong vòng <strong>vài giây đến 1 phút</strong>.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-800/60 rounded-xl p-1 gap-1">
          {(['form', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-300'
              }`}>
              {t === 'form' ? <><CreditCard size={14} /> Nạp thẻ</> : <><History size={14} /> Lịch sử</>}
            </button>
          ))}
        </div>

        {/* Form */}
        {tab === 'form' && (
          <div className="flex flex-col gap-4">
            {/* Nhà mạng */}
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Nhà mạng</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {CARD_TELCOS.map(t => (
                  <button key={t.value} onClick={() => setTelco(t.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      telco === t.value ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                    }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mệnh giá */}
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Mệnh giá</p>
              <div className="grid grid-cols-4 gap-2">
                {CARD_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setAmount(a)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      amount === a ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                    }`}>
                    {a >= 1000000 ? `${a / 1000000}tr` : `${a / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Serial */}
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Serial thẻ</p>
              <input type="text" value={serial} onChange={e => setSerial(e.target.value)}
                placeholder="Nhập số serial thẻ..."
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>

            {/* PIN */}
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Mã thẻ (PIN)</p>
              <input type="text" value={code} onChange={e => setCode(e.target.value)}
                placeholder="Nhập mã thẻ (PIN)..."
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>

            {/* Summary */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">Giá trị khai báo:</span>
              <span className="text-emerald-400 font-bold text-base">{formatVND(amount)}</span>
            </div>

            {/* Message */}
            {msg && (
              <div className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                msg.ok ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                       : 'bg-red-950/60 border border-red-500/30 text-red-300'}`}>
                {msg.text}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading || !user}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors">
              {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={16} />}
              {loading ? 'Đang gửi...' : user === undefined ? 'Đang tải...' : 'Gửi yêu cầu nạp thẻ'}
            </button>

            {user === null && (
              <p className="text-center text-slate-500 text-xs">
                Bạn cần <a href="/auth" className="text-emerald-400 underline">đăng nhập</a> để nạp thẻ.
              </p>
            )}
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="flex flex-col gap-3">
            {user === null && <p className="text-center text-slate-500 text-sm py-8">Đăng nhập để xem lịch sử.</p>}
            {user && history.length === 0 && (
              <div className="text-center py-12 text-slate-600 flex flex-col items-center gap-2">
                <History size={32} />
                <p className="text-sm">Chưa có yêu cầu nạp thẻ nào.</p>
              </div>
            )}
            {user && history.map(req => {
              const telcoInfo = CARD_TELCOS.find(t => t.value === req.telco);
              return (
                <div key={req.id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${telcoInfo?.color || 'bg-slate-500'}`} />
                      <span className="text-sm font-bold text-white">{telcoInfo?.label || req.telco}</span>
                      <span className="text-sm text-emerald-400 font-bold">{formatVND(req.amount)}</span>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div><span className="text-slate-600">Serial: </span><span className="text-slate-400 font-mono">{req.serial}</span></div>
                    <div><span className="text-slate-600">Mã: </span><span className="text-slate-400 font-mono">{req.code}</span></div>
                  </div>
                  {req.message && (
                    <div className={`text-[11px] px-2 py-1 rounded-lg border ${getStatusInfo(req.status)!.bg} ${getStatusInfo(req.status)!.color}`}>
                      {req.message}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-600">{new Date(req.createdAt).toLocaleString('vi-VN')}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
