# 🔧 Hướng dẫn cài đặt tính năng Nạp thẻ cào

## 1. Đăng ký TrumThe API
1. Vào **https://trumthe.vn** → Đăng ký tài khoản đối tác
2. Lấy **Partner ID** và **Partner Key** từ trang quản trị
3. Điền **Callback URL** vào cài đặt TrumThe:
   ```
   https://YOUR-SITE.netlify.app/.netlify/functions/card-callback
   ```

## 2. Cài đặt Firebase Admin SDK
1. Vào **Firebase Console** → Project Settings → Service Accounts
2. Nhấn **"Generate new private key"** → tải file JSON
3. Lấy 3 giá trị từ file JSON:
   - `project_id`
   - `client_email`
   - `private_key`

## 3. Thêm Environment Variables trên Netlify
Vào **Netlify Dashboard** → Site Settings → Environment Variables, thêm:

| Tên biến | Giá trị |
|----------|---------|
| `TRUMTHE_PARTNER_ID` | Partner ID từ trumthe.vn |
| `TRUMTHE_PARTNER_KEY` | Partner Key từ trumthe.vn |
| `FIREBASE_PROJECT_ID` | project_id từ service account |
| `FIREBASE_CLIENT_EMAIL` | client_email từ service account |
| `FIREBASE_PRIVATE_KEY` | private_key (giữ nguyên dấu `\n`) |
| `SITE_URL` | https://YOUR-SITE.netlify.app |

## 4. Cập nhật Firestore Rules
Thêm vào **Firebase Console** → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: chỉ đọc profile của chính mình
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      allow read: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    // Topup requests: user chỉ đọc của mình
    match /topup_requests/{id} {
      allow read: if request.auth != null
        && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null;
    }
    // Transactions: user chỉ đọc của mình
    match /transactions/{id} {
      allow read: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }
  }
}
```

## 5. Deploy
```bash
git add .
git commit -m "feat: add card topup & balance management"
git push
```
Netlify sẽ tự động build và deploy. Functions sẽ có tại:
- `POST /.netlify/functions/charge-card` — Frontend gọi để nạp thẻ
- `POST /.netlify/functions/card-callback` — TrumThe gọi về sau khi xử lý

## 6. Luồng hoạt động
```
User nhập thẻ → Frontend → charge-card function → TrumThe API
                                                      ↓
                                              (xử lý async)
                                                      ↓
TrumThe → card-callback function → Cộng tiền vào Firestore → User thấy số dư mới
```

## 7. Chức năng Admin cộng tiền
- Vào trang **/admin** → Quản lý thành viên
- Mỗi user có nút 💰 (icon Wallet) → mở modal cộng/trừ tiền
- Chọn nhanh mệnh giá hoặc nhập tự do
- Có ghi chú và lịch sử giao dịch tự động
