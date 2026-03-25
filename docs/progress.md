# Progress Log

## Sesi 2026-03-25

### Yang Sudah Selesai

#### Backend (`backend-anyar` — branch `dev`)
- ✅ Revisi arsitektur: 2 endpoint AI server digabung jadi satu `POST /api/detection`
- ✅ Schema DB diperbarui: `timeline_log` jadi hourly summary (JSONB), kolom baru di `cctv` dan `zona`
- ✅ `sql/schema.sql` — script lengkap semua tabel, siap dijalankan di Supabase Dashboard
- ✅ `role.middleware.js` — guard per role (`requireRole`)
- ✅ `aiAuth.middleware.js` — validasi `x-ai-secret` header untuk AI server
- ✅ Modul `detection` — `POST /api/detection` (stats + hourly accumulator, dual setInterval flush)
- ✅ Modul `timeline-log` — `GET /api/timeline-log` (query params: from, to, limit)
- ✅ Modul `zona` — CRUD lengkap
- ✅ Modul `cctv` — CRUD + `GET /api/cctv/active` untuk AI server
- ✅ Modul `staff` — CRUD + guard self-delete/self-edit
- ✅ Modul `dev` — dummy endpoint sementara (`/api/dev/stats`, `/api/dev/timeline-log`)

#### Frontend (`civicnode-frontend` — branch `dier-metamask-auth`)
- ✅ `dashboardStore.ts` — dibersihkan dari sisa desain lama, interface diperbarui ke struktur baru
- ✅ `TimelineLog.tsx` — fetch dari `/api/dev/timeline-log`, render zona, kamera, periode, ringkasan
- ✅ `StatsGrid.tsx` — polling `/api/dev/stats` tiap 1 detik, tambah grade (A–F) dan level (CLEAR/LOW/MEDIUM/HIGH)
- ✅ `TimelapseeFeed.tsx` — stream kamera laptop via `getUserMedia` (dev mode)

---

### Yang Belum Dikerjain

#### Frontend
- [ ] **CCTV page** — sambungkan ke `GET /api/cctv` (masih dummy data)
- [ ] **System Config page** — review apakah perlu disambungkan ke backend
- [ ] **Guard route** — redirect ke `/sign-in` kalau tidak ada token

#### Backend → Frontend (nanti setelah AI server nyambung)
- [ ] Ganti `GET /api/dev/stats` → `GET /api/cctv/:id` + `GET /api/zona/:id`
- [ ] Ganti `GET /api/dev/timeline-log` → `GET /api/timeline-log`
- [ ] Hapus modul `dev` dari backend

#### Backend
- [ ] Seeding Owner pertama di Supabase (manual via Dashboard)
- [ ] Test end-to-end semua endpoint

---

### Catatan Penting
- `AI_SERVER_SECRET` wajib diisi di `.env` backend sebelum server bisa start
- Schema DB sudah dijalankan di Supabase (zona, cctv, timeline_log pakai UUID)
- Modul `dev` ditandai TODO — **hapus sebelum production**
