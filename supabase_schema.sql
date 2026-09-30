-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE SCHEMA cho Đảo Phim — thay thế Firebase Firestore
-- Cách dùng: Supabase Dashboard → SQL Editor → New query → dán TOÀN BỘ file này → Run
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- Bảng "document store" duy nhất — mô phỏng cấu trúc collection/document của Firestore.
-- Mỗi "collection path" của Firestore (kể cả subcollection, vd "livestream/main/chat")
-- trở thành 1 giá trị collection_path, mỗi "document" trở thành 1 dòng.
create table if not exists firestore_docs (
  collection_path text not null,
  doc_id          text not null,
  data            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (collection_path, doc_id)
);

create index if not exists idx_firestore_docs_collection on firestore_docs (collection_path);
create index if not exists idx_firestore_docs_updated on firestore_docs (collection_path, updated_at desc);
-- Index hỗ trợ where()/orderBy() theo field JSON hay dùng (uid, createdAt) cho nhanh hơn
create index if not exists idx_firestore_docs_uid on firestore_docs ((data->>'uid'));
create index if not exists idx_firestore_docs_created on firestore_docs ((data->>'createdAt'));

-- ─── Row Level Security — tương đương firestore.rules hiện tại ────────────────────────
alter table firestore_docs enable row level security;

drop policy if exists "read policy" on firestore_docs;
create policy "read policy" on firestore_docs for select
  using (true); -- mọi collection đều đọc công khai, giống firestore.rules hiện tại

drop policy if exists "insert policy" on firestore_docs;
create policy "insert policy" on firestore_docs for insert
  with check (
    -- collection "users": chỉ được tạo đúng document của chính mình (doc_id = uid đang đăng nhập)
    (collection_path <> 'users' or doc_id = auth.uid()::text)
  );

drop policy if exists "update policy" on firestore_docs;
create policy "update policy" on firestore_docs for update
  using (
    (collection_path <> 'users' or doc_id = auth.uid()::text)
  );

drop policy if exists "delete policy" on firestore_docs;
create policy "delete policy" on firestore_docs for delete
  using (true);

-- ─── Bật Realtime cho bảng này (tương đương onSnapshot của Firestore) ─────────────────
-- Nếu lệnh dưới báo lỗi "already member of publication" thì bỏ qua, không sao cả.
do $$
begin
  alter publication supabase_realtime add table firestore_docs;
exception when duplicate_object then null;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- LƯU Ý SAU KHI CHẠY XONG:
--   1) Authentication → Providers → Email → tắt "Confirm email"
--      (để đăng ký xong vào được luôn, giống hành vi cũ của Firebase Auth).
--   2) Storage → New bucket → đặt tên "media" (không dùng "public" vì trùng tên hệ thống), bật "Public bucket".
--   3) Copy Project URL + anon key (Project Settings → API) vào src/lib/supabase.ts
--      (hoặc set biến môi trường VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
--   4) Nếu dùng chức năng nạp thẻ cào (api/card-callback.js, api/charge-card.js):
--      set thêm 2 biến môi trường SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY
--      (khác anon key — lấy ở cùng trang Project Settings → API, mục "service_role").
-- ═══════════════════════════════════════════════════════════════════════════
