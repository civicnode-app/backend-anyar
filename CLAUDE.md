# CivicNode AI — Backend Context for Claude Code

## 🧠 Project Overview

Platform monitoring kebersihan lingkungan berbasis AI — CCTV + AI server mendeteksi sampah secara real-time, hasilnya dicatat sebagai log dan ditampilkan di dashboard. Fokus utama adalah **monitoring**, bukan pencatatan pelanggaran atau penghakiman pelanggar.

Autentikasi MetaMask tetap dipertahankan untuk unsur Web3 dan keamanan login Admin/Owner.

**Stack Backend:** Node.js (ES Modules) + Express.js
**Database:** Supabase (PostgreSQL)
**Auth:** Google OAuth (Warga) + MetaMask (Admin/Owner)
**Blockchain integration:** ethers.js — hanya untuk verifikasi signature MetaMask, bukan transaksi

---

## 📁 Struktur Folder

```
civicnode-backend/
│
├── src/
│   ├── config/
│   │   ├── supabase.js        → init Supabase client
│   │   └── env.js             → load + validasi env variables
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js      → verifikasi JWT
│   │   ├── role.middleware.js      → guard per role (implement belakangan)
│   │   └── error.middleware.js     → global error handler
│   │
│   ├── modules/
│   │   ├── auth/              ✅ selesai
│   │   ├── cctv/              🚧 coming soon
│   │   ├── zona/              🚧 coming soon
│   │   ├── staff/             🚧 coming soon
│   │   └── timeline-log/      🚧 coming soon
│   │
│   ├── utils/
│   │   ├── jwt.js             → sign + verify JWT
│   │   └── response.js        → format response API konsisten
│   │
│   └── app.js                 → setup Express, pasang semua middleware + router
│
├── .env
├── .env.example
└── package.json
```

**Pattern: Layered Architecture**

```
Request → Router → Controller → Service → Supabase
```

- **Router** — daftarin endpoint, pasang middleware
- **Controller** — handle req/res, validasi input, panggil service
- **Service** — logika bisnis, query ke Supabase
- **Jangan** taruh query Supabase di controller

---

## 🗄️ ERD — Database Schema

### `users` (Warga — login Google)

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
email       VARCHAR UNIQUE NOT NULL
full_name   VARCHAR NOT NULL
avatar_url  VARCHAR
created_at  TIMESTAMP DEFAULT now()
```

### `staff` (Admin + Owner — login MetaMask)

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
wallet_address   VARCHAR UNIQUE NOT NULL   -- selalu lowercase
full_name        VARCHAR NOT NULL
role             ENUM('admin', 'owner') NOT NULL
created_at       TIMESTAMP DEFAULT now()
```

> Owner pertama → seed manual via Supabase Dashboard
> Avatar → generate Jazzicon dari wallet_address di frontend
> Tidak ada endpoint registrasi staff — hanya Owner yang bisa tambah Admin via `/api/staff`

### `zona`

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
nama             VARCHAR NOT NULL
deskripsi        VARCHAR
zone_reputation  DECIMAL DEFAULT 100   -- skor kebersihan zona (0–100), di-flush dari in-memory tiap 5 detik
created_at       TIMESTAMP DEFAULT now()
```

### `cctv`

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
nama                VARCHAR NOT NULL
zona_id             UUID REFERENCES zona(id) NOT NULL
jenis_kamera        ENUM('cctv', 'ponsel') NOT NULL
stream_url          VARCHAR NOT NULL
ip_address          VARCHAR NOT NULL
latitude            DECIMAL
longitude           DECIMAL
status              BOOLEAN DEFAULT true
active_detections   INT DEFAULT 0        -- jumlah bounding box sampah aktif di frame, di-flush dari in-memory tiap 5 detik
confidence_score    DECIMAL DEFAULT 0    -- rata-rata skor keyakinan AI (0.0–1.0), di-flush dari in-memory tiap 5 detik
created_at          TIMESTAMP DEFAULT now()
```

### `timeline_log` ← menggantikan `data_pelanggaran` yang lama

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
cctv_id         UUID REFERENCES cctv(id) NOT NULL
zona_id         UUID REFERENCES zona(id) NOT NULL   -- denormalized untuk query cepat
jenis_objek     VARCHAR NOT NULL                    -- dinamis dari AI: "kaleng kosong", "bungkus permen", dll
waktu_kejadian  TIMESTAMP NOT NULL
created_at      TIMESTAMP DEFAULT now()
```

> Immutable — tidak ada endpoint DELETE
> `jenis_objek` bersifat dinamis, tergantung hasil interpretasi model AI terhadap objek yang terdeteksi

---

## 🔄 Arsitektur Data Flow

Backend adalah **satu-satunya pintu masuk** bagi frontend — tidak ada komunikasi langsung antara frontend dan AI server.

```
AI Server ──(POST /api/timeline-log)────→ Backend → simpan ke DB (timeline_log)
AI Server ──(POST /api/realtime-stats)──→ Backend → in-memory Map → flush ke DB tiap 5 detik
Frontend  ──(GET /api/timeline-log)─────→ Backend → ambil history log
Frontend  ──(GET /api/zona)─────────────→ Backend → termasuk zone_reputation
Frontend  ──(GET /api/cctv)─────────────→ Backend → termasuk active_detections, confidence_score
```

**Yang dikirim AI server ke `POST /api/timeline-log` (per event deteksi):**
- `cctv_id` — kamera yang mendeteksi
- `zona_id` — zona yang dipantau
- `jenis_objek` — jenis sampah yang terdeteksi
- `waktu_kejadian` — timestamp deteksi

**Yang dikirim AI server ke `POST /api/realtime-stats` (periodik, per kamera aktif):**
- `cctv_id` — kamera yang bersangkutan
- `zona_id` — zona kamera tersebut
- `active_detections` — jumlah bounding box sampah yang terdeteksi di frame saat ini
- `confidence_score` — rata-rata skor keyakinan AI (indikator kualitas kamera)
- `zone_reputation` — skor kebersihan zona (0–100)

**Write-back flush mechanism:**
Data dari `POST /api/realtime-stats` disimpan di in-memory Map dulu, lalu di-flush ke DB setiap 5 detik via `setInterval`. Ini mencegah query spam ke Supabase.

---

## 👥 Role System

| Role | Auth | Akses |
|---|---|---|
| **Guest** | — | Landing page only |
| **Warga** | Google OAuth | Read-only dashboard & timeline log |
| **Admin** | MetaMask | + Akses & kelola CCTV, export data |
| **Owner** | MetaMask | Full access + kelola zona & staff |

### Hak Akses Detail

| Resource              | Warga | Admin | Owner |
| --------------------- | :---: | :---: | :---: |
| Lihat dashboard       |  ✅   |  ✅   |  ✅   |
| Lihat timeline log    |  ✅   |  ✅   |  ✅   |
| Lihat zona            |  ✅   |  ✅   |  ✅   |
| Tambah/hapus zona     |  ❌   |  ❌   |  ✅   |
| Lihat CCTV            |  ❌   |  ✅   |  ✅   |
| Tambah/hapus CCTV     |  ❌   |  ❌   |  ✅   |
| Lihat staff           |  ❌   |  ✅   |  ✅   |
| Tambah/hapus staff    |  ❌   |  ❌   |  ✅   |

---

## 🔐 Auth Flow

### Google (Warga)

```
GET /api/auth/google
→ redirect ke Google OAuth

GET /api/auth/google/callback?code=...
→ tukar code → upsert tabel users → sign JWT → redirect frontend dengan token
```

### MetaMask (Admin + Owner)

```
GET /api/auth/nonce?address=0x...
→ generate nonce (single-use, expire 5 menit) → return nonce

POST /api/auth/metamask
Body: { wallet_address, signature, nonce }
→ verifikasi signature via ethers.verifyMessage
→ cek tabel staff → sign JWT → return token
```

### JWT Payload

```json
// Warga
{ "user_id": "uuid", "email": "...", "role": "warga" }

// Admin / Owner
{ "staff_id": "uuid", "wallet_address": "0x...", "role": "admin|owner" }
```

---

## 🛣️ API Endpoints

**Base URL:** `http://localhost:3001/api`

### Auth ✅

```
GET  /api/auth/google            → public
GET  /api/auth/google/callback   → public
GET  /api/auth/nonce             → public
POST /api/auth/metamask          → public
GET  /api/auth/me                → Warga+
POST /api/auth/logout            → Warga+
```

### Timeline Log 🚧

```
POST /api/timeline-log           → AI server kirim log deteksi [AI only — pakai AI_SERVER_SECRET]
GET  /api/timeline-log           → list history log [Warga+]

Query params GET: ?zona_id=&cctv_id=&from=&to=&limit=
```

### Realtime Stats 🚧

```
POST /api/realtime-stats         → AI server kirim stats real-time per kamera [AI only — pakai AI_SERVER_SECRET]

Body: { cctv_id, zona_id, active_detections, confidence_score, zone_reputation }
→ update in-memory Map → flush ke cctv.active_detections, cctv.confidence_score, zona.zone_reputation tiap 5 detik
```

### CCTV 🚧

```
POST   /api/cctv                → tambah CCTV [Owner]
GET    /api/cctv                → list semua [Admin+]
GET    /api/cctv/active         → list aktif + stream_url [AI only]
GET    /api/cctv/:id            → detail [Admin+]
PATCH  /api/cctv/:id            → update [Admin+]
DELETE /api/cctv/:id            → hapus [Owner]
```

### Zona 🚧

```
POST   /api/zona                → tambah zona [Owner]
GET    /api/zona                → list semua [Warga+]
GET    /api/zona/:id            → detail + list CCTV [Warga+]
PATCH  /api/zona/:id            → update [Owner]
DELETE /api/zona/:id            → hapus [Owner]
```

### Staff 🚧

```
GET    /api/staff               → list [Admin+]
GET    /api/staff/:id           → detail [Admin+]
POST   /api/staff               → tambah Admin [Owner]
PATCH  /api/staff/:id           → update [Owner]
DELETE /api/staff/:id           → hapus [Owner]
```

---

## 📋 .env Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=24h

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# AI Server
AI_SERVER_SECRET=        # shared secret untuk validasi request dari AI server
```

---

## 🧩 Konvensi Kode

### Response format (selalu pakai utils/response.js)

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "...", "code": "ERROR_CODE" }
```

### Error handling

- Semua async handler dibungkus `try/catch`
- Error dilempar ke `error.middleware.js` via `next(error)`
- Jangan return raw error message ke client di production

### Naming

- File: `kebab-case` atau `nama.tipe.js`
- Variabel/fungsi: `camelCase`
- Konstanta: `UPPER_SNAKE_CASE`
- Tabel DB: `snake_case`
