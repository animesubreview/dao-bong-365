/**
 * Bản "có bảo vệ" của các hàm ghi Firestore.
 * Dùng thay cho import trực tiếp từ 'firebase/firestore' trong các file quản trị:
 *  - setDoc/addDoc/updateDoc/deleteDoc: có timeout 20s (không treo vô hạn khi mạng bị chặn),
 *    lỗi được dịch sang tiếng Việt và báo lên banner của Admin.
 *  - onSnapshot: tự gắn error-callback nếu nơi gọi quên → lỗi đọc (permission-denied, thiếu index...) không còn im lặng.
 */
import {
  setDoc as _setDoc, addDoc as _addDoc, updateDoc as _updateDoc, deleteDoc as _deleteDoc,
  onSnapshot as _onSnapshot,
} from 'firebase/firestore';
import { guardWrite, reportFirestoreError } from './firebaseUtils';

export const setDoc = ((...args: any[]) => guardWrite((_setDoc as any)(...args))) as unknown as typeof _setDoc;
export const addDoc = ((...args: any[]) => guardWrite((_addDoc as any)(...args))) as unknown as typeof _addDoc;
export const updateDoc = ((...args: any[]) => guardWrite((_updateDoc as any)(...args))) as unknown as typeof _updateDoc;
export const deleteDoc = ((...args: any[]) => guardWrite((_deleteDoc as any)(...args))) as unknown as typeof _deleteDoc;

export const onSnapshot = ((ref: any, ...args: any[]) => {
  const report = (e: any) => reportFirestoreError(e, 'read');
  const fnIdx = args.findIndex(a => typeof a === 'function');
  if (fnIdx >= 0) {
    const userErr = args[fnIdx + 1];
    if (typeof userErr === 'function') {
      args[fnIdx + 1] = (e: any) => { report(e); userErr(e); };
    } else {
      args.splice(fnIdx + 1, 0, report);
    }
  } else if (args[0] && typeof args[0] === 'object' && typeof args[0].next === 'function') {
    const userErr = args[0].error;
    args[0] = { ...args[0], error: (e: any) => { report(e); userErr?.(e); } };
  }
  return (_onSnapshot as any)(ref, ...args);
}) as unknown as typeof _onSnapshot;
