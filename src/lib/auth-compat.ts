/**
 * ─── Lớp giả lập API của firebase/auth, chạy trên Supabase Auth ──────────────────────
 * QUAN TRỌNG: vào Supabase Dashboard → Authentication → Providers → Email,
 * tắt "Confirm email" (nếu không user phải bấm link xác nhận trong email mới đăng nhập
 * được — khác với hành vi hiện tại là đăng ký xong vào được luôn).
 */
import { supabase } from './supabase';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

function mapUser(u: any): User | null {
  if (!u) return null;
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: u.user_metadata?.displayName ?? null,
    photoURL: u.user_metadata?.photoURL ?? null,
  };
}

function mapAuthError(err: any): any {
  const msg = String(err?.message || '').toLowerCase();
  const e: any = new Error(err?.message || 'Lỗi xác thực');
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user_already_exists')) e.code = 'auth/email-already-in-use';
  else if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) e.code = 'auth/invalid-credential';
  else if (msg.includes('password') && (msg.includes('least') || msg.includes('short') || msg.includes('weak'))) e.code = 'auth/weak-password';
  else if (msg.includes('invalid') && msg.includes('email')) e.code = 'auth/invalid-email';
  else if (msg.includes('rate limit') || msg.includes('too many')) e.code = 'auth/too-many-requests';
  else e.code = 'auth/unknown';
  return e;
}

class AuthCompat {
  currentUser: User | null = null;
  private listeners: Array<(u: User | null) => void> = [];
  private ready = false;

  constructor() {
    supabase.auth.getSession().then(({ data }) => {
      this.currentUser = mapUser(data.session?.user);
      this.ready = true;
      this.listeners.forEach(l => l(this.currentUser));
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser = mapUser(session?.user);
      this.listeners.forEach(l => l(this.currentUser));
    });
  }
  _subscribe(cb: (u: User | null) => void): Unsubscribe {
    this.listeners.push(cb);
    if (this.ready) cb(this.currentUser);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
}
type Unsubscribe = () => void;

const authInstance = new AuthCompat();
export function getAuth(_app?: any) { return authInstance; }
export const auth = authInstance;

export async function createUserWithEmailAndPassword(_auth: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw mapAuthError(error);
  if (!data.user) throw mapAuthError({ message: 'Cần xác nhận email trước khi đăng nhập được' });
  authInstance.currentUser = mapUser(data.user);
  return { user: authInstance.currentUser };
}

export async function signInWithEmailAndPassword(_auth: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw mapAuthError(error);
  authInstance.currentUser = mapUser(data.user);
  return { user: authInstance.currentUser };
}

export async function signOut(_auth: any) {
  await supabase.auth.signOut();
  authInstance.currentUser = null;
}

export function onAuthStateChanged(_auth: any, callback: (user: User | null) => void): Unsubscribe {
  return authInstance._subscribe(callback);
}

export async function updateProfile(user: User, updates: { displayName?: string; photoURL?: string }) {
  const meta: any = {};
  if (updates.displayName !== undefined) meta.displayName = updates.displayName;
  if (updates.photoURL !== undefined) meta.photoURL = updates.photoURL;
  const { error } = await supabase.auth.updateUser({ data: meta });
  if (error) throw mapAuthError(error);
  if (authInstance.currentUser && authInstance.currentUser.uid === user.uid) {
    authInstance.currentUser = { ...authInstance.currentUser, ...updates } as User;
  }
}
