// ─── Firebase Auth Utility ────────────────────────────────────────────────────
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  createdAt: number;
  lastLogin: number;
  balance: number; // số dư tài khoản (VNĐ)
  vipTier?: 'UVIP' | 'SVIP' | 'SSVIP' | null;
  vipExpiry?: number | null; // timestamp ms
}

// ─── Đăng ký ──────────────────────────────────────────────────────────────────
export async function register(
  username: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!username || username.length < 3) return { ok: false, error: 'Tên tài khoản tối thiểu 3 ký tự' };
  if (!email || !email.includes('@')) return { ok: false, error: 'Email không hợp lệ' };
  if (!password || password.length < 6) return { ok: false, error: 'Mật khẩu tối thiểu 6 ký tự' };

  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    if (usernameDoc.exists()) return { ok: false, error: 'Tên tài khoản đã tồn tại' };

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const avatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`;

    await updateProfile(cred.user, { displayName: username, photoURL: avatar });

    const profile: UserProfile = {
      uid: cred.user.uid,
      username,
      email,
      avatar,
      role: 'user',
      isBanned: false,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      balance: 0,
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: cred.user.uid });

    window.dispatchEvent(new Event('auth_changed'));
    return { ok: true };
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') return { ok: false, error: 'Email đã được đăng ký' };
    if (err.code === 'auth/invalid-email') return { ok: false, error: 'Email không hợp lệ' };
    if (err.code === 'auth/weak-password') return { ok: false, error: 'Mật khẩu quá yếu' };
    return { ok: false, error: 'Đăng ký thất bại: ' + (err.message || '') };
  }
}

// ─── Đăng nhập ────────────────────────────────────────────────────────────────
export async function login(
  emailOrUsername: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    let emailToUse = emailOrUsername.trim();

    if (!emailToUse.includes('@')) {
      const usernameDoc = await getDoc(doc(db, 'usernames', emailToUse.toLowerCase()));
      if (!usernameDoc.exists()) return { ok: false, error: 'Tài khoản không tồn tại' };
      const uid = usernameDoc.data().uid;
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) return { ok: false, error: 'Tài khoản không tồn tại' };
      emailToUse = userDoc.data().email;
    }

    const cred = await signInWithEmailAndPassword(auth, emailToUse, password);

    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (userDoc.exists() && userDoc.data().isBanned) {
      await signOut(auth);
      return { ok: false, error: 'Tài khoản đã bị khóa' };
    }

    await updateDoc(doc(db, 'users', cred.user.uid), { lastLogin: Date.now() });
    window.dispatchEvent(new Event('auth_changed'));
    return { ok: true };
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      return { ok: false, error: 'Email hoặc mật khẩu không đúng' };
    }
    if (err.code === 'auth/wrong-password') return { ok: false, error: 'Mật khẩu không đúng' };
    if (err.code === 'auth/too-many-requests') return { ok: false, error: 'Quá nhiều lần thử, hãy thử lại sau' };
    return { ok: false, error: 'Đăng nhập thất bại' };
  }
}

// ─── Đăng xuất ────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  window.dispatchEvent(new Event('auth_changed'));
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch { return null; }
}

// ─── Admin: lấy tất cả users ──────────────────────────────────────────────────
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch { return []; }
}

export async function banUser(uid: string) {
  await updateDoc(doc(db, 'users', uid), { isBanned: true });
}
export async function unbanUser(uid: string) {
  await updateDoc(doc(db, 'users', uid), { isBanned: false });
}
export async function deleteUserProfile(uid: string) {
  await deleteDoc(doc(db, 'users', uid));
}

export async function updateUserProfile(
  uid: string,
  updates: { username?: string; avatar?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const updateData: Partial<UserProfile> = {};
    if (updates.avatar) updateData.avatar = updates.avatar;

    if (updates.username) {
      const newUsername = updates.username.trim();
      if (newUsername.length < 3) return { ok: false, error: 'Tên tài khoản tối thiểu 3 ký tự' };

      const usernameDoc = await getDoc(doc(db, 'usernames', newUsername.toLowerCase()));
      if (usernameDoc.exists() && usernameDoc.data().uid !== uid) {
        return { ok: false, error: 'Tên tài khoản đã tồn tại' };
      }

      const currentDoc = await getDoc(doc(db, 'users', uid));
      if (currentDoc.exists()) {
        const currentUsername = currentDoc.data().username;
        if (currentUsername && currentUsername.toLowerCase() !== newUsername.toLowerCase()) {
          await deleteDoc(doc(db, 'usernames', currentUsername.toLowerCase()));
          await setDoc(doc(db, 'usernames', newUsername.toLowerCase()), { uid });
        }
      }

      updateData.username = newUsername;
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newUsername });
      }
    }

    if (updates.avatar) {
      updateData.avatar = updates.avatar;
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: updates.avatar });
      }
    }

    await updateDoc(doc(db, 'users', uid), updateData);
    window.dispatchEvent(new Event('auth_changed'));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: 'Cập nhật thất bại: ' + (err.message || '') };
  }
}

export type { User };

// ─── Admin: cấp/thu quyền admin ───────────────────────────────────────────────
export async function setUserRole(uid: string, role: 'user' | 'admin') {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ─── Admin: cộng/trừ số dư tài khoản ─────────────────────────────────────────
export async function addUserBalance(uid: string, amount: number, note: string = '') {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('User not found');
  const current = (snap.data().balance as number) || 0;
  const newBalance = current + amount;
  await updateDoc(doc(db, 'users', uid), { balance: newBalance });

  // Ghi lịch sử giao dịch
  const txRef = doc(collection(db, 'transactions'));
  await setDoc(txRef, {
    id: txRef.id,
    uid,
    type: amount >= 0 ? 'admin_add' : 'admin_deduct',
    amount,
    balanceBefore: current,
    balanceAfter: newBalance,
    note: note || (amount >= 0 ? 'Admin cộng tiền' : 'Admin trừ tiền'),
    createdAt: Date.now(),
    status: 'success',
  });

  return newBalance;
}

// ─── Lấy lịch sử giao dịch của user ─────────────────────────────────────────
export async function getUserTransactions(uid: string) {
  const { getDocs: _getDocs, query: _query, where, orderBy: _orderBy } = await import('firebase/firestore');
  const snap = await _getDocs(
    _query(collection(db, 'transactions'), where('uid', '==', uid), _orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => d.data());
}
