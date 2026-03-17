# CivicNode AI — Backend Context for Claude Code

## 🧠 Project Overview

Platform pengawasan lingkungan cerdas — CCTV + AI deteksi buang sampah sembarangan, bukti pelanggaran dikunci di blockchain.

**Stack Backend:** Node.js + Express.js  
**Database:** Supabase (PostgreSQL)  
**Blockchain:** Polygon PoS + Solidity  
**Storage:** IPFS (foto bukti pelanggaran)  
**Auth:** Google OAuth (Warga) + MetaMask (Admin/Owner)

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
│   │   ├── auth/
│   │   │   ├── auth.router.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   │
│   │   ├── pelanggaran/       → implement belakangan
│   │   ├── cctv/              → implement belakangan
│   │   ├── zona/              → implement belakangan
│   │   ├── web3/              → implement belakangan
│   │   ├── staff/             → implement belakangan
│   │   └── dashboard/         → implement belakangan
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
wallet_address   VARCHAR UNIQUE NOT NULL
full_name        VARCHAR NOT NULL
role             ENUM('admin', 'owner') NOT NULL
created_at       TIMESTAMP DEFAULT now()
```

> Owner pertama → seed manual via Supabase Dashboard  
> Avatar → generate Jazzicon dari wallet_address di frontend

### `zona`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
nama        VARCHAR NOT NULL
deskripsi   VARCHAR
created_at  TIMESTAMP DEFAULT now()
```

> Skor zona = dihitung dinamis, TIDAK disimpan di DB  
> Formula: `skor = 100 - (jumlah_pelanggaran_30hari × bobot)`

### `cctv`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
nama          VARCHAR NOT NULL
zona_id       UUID REFERENCES zona(id) NOT NULL
jenis_kamera  ENUM('cctv', 'ponsel') NOT NULL
stream_url    VARCHAR NOT NULL
ip_address    VARCHAR NOT NULL
latitude      DECIMAL
longitude     DECIMAL
status        BOOLEAN DEFAULT true
created_at    TIMESTAMP DEFAULT now()
```

### `data_pelanggaran`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
cctv_id           UUID REFERENCES cctv(id) NOT NULL
foto_url          VARCHAR NOT NULL      -- link IPFS
ipfs_hash         VARCHAR NOT NULL      -- untuk verifikasi integritas
waktu_kejadian    TIMESTAMP NOT NULL
confidence_score  DECIMAL NOT NULL      -- 0.00 - 100.00
created_at        TIMESTAMP DEFAULT now()
```

> Immutable — tidak ada endpoint DELETE

### `web3_log`

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
pelanggaran_id      UUID REFERENCES data_pelanggaran(id) UNIQUE NOT NULL
blockchain_status   ENUM('pending', 'verified') DEFAULT 'pending'
blockchain_tx_hash  VARCHAR
approved_by         UUID REFERENCES staff(id)
approved_at         TIMESTAMP
created_at          TIMESTAMP DEFAULT now()
```

> UNIQUE di pelanggaran_id → one-to-one dengan data_pelanggaran  
> Immutable — tidak ada UPDATE/DELETE

---

## 👥 Role System

| Role      | Auth Method  | Akses                                                         |
| --------- | ------------ | ------------------------------------------------------------- |
| **Guest** | —            | Landing page only                                             |
| **Warga** | Google OAuth | Read-only dashboard, pelanggaran, zona, verifikasi blockchain |
| **Admin** | MetaMask     | + Akses CCTV, export data, modifikasi DB (perlu izin Owner)   |
| **Owner** | MetaMask     | Full access + approve blockchain                              |

### Hak Akses Detail

| Resource              | Warga | Admin | Owner |
| --------------------- | :---: | :---: | :---: |
| Lihat dashboard/stats |  ✅   |  ✅   |  ✅   |
| Lihat pelanggaran     |  ✅   |  ✅   |  ✅   |
| Export pelanggaran    |  ❌   |  ✅   |  ✅   |
| Lihat CCTV            |  ❌   |  ✅   |  ✅   |
| Tambah/hapus CCTV     |  ❌   |  ❌   |  ✅   |
| Lihat zona            |  ✅   |  ✅   |  ✅   |
| Tambah/hapus zona     |  ❌   |  ❌   |  ✅   |
| Verifikasi blockchain |  ✅   |  ✅   |  ✅   |
| Approve blockchain    |  ❌   |  ❌   |  ✅   |
| Lihat staff           |  ❌   |  ✅   |  ✅   |
| Tambah/hapus staff    |  ❌   |  ❌   |  ✅   |

---

## 🔐 Auth Flow

### Google (Warga)

```
POST /api/auth/google
Body: { code: "google_oauth_code" }

Flow:
1. Tukar code → dapat { email, name, avatar } dari Google
2. Cek tabel users: email ada? → ambil data / buat baru (upsert)
3. Sign JWT: { user_id, email, role: "warga" }
4. Return JWT
```

### MetaMask (Admin + Owner)

```
POST /api/auth/metamask
Body: { wallet_address, signature, nonce }

Flow:
1. Verify signature: recoverAddress(nonce, signature) === wallet_address
2. Cek tabel staff: wallet_address ada? → kalau tidak → 401
3. Sign JWT: { staff_id, wallet_address, role: "admin"|"owner" }
4. Return JWT
```

> Nonce = random string yang di-generate backend, dikirim ke frontend sebelum sign  
> Endpoint untuk request nonce: `GET /api/auth/nonce?address=0x...`

### JWT Payload

```json
// Warga
{ "user_id": "uuid", "role": "warga", "type": "user" }

// Admin / Owner
{ "staff_id": "uuid", "wallet_address": "0x...", "role": "admin|owner", "type": "staff" }
```

---

## 🛣️ API Endpoints

**Base URL:** `http://localhost:3000/api`

### Auth

```
GET  /api/auth/nonce           → generate nonce untuk MetaMask sign
POST /api/auth/google          → login Warga
POST /api/auth/metamask        → login Admin/Owner
POST /api/auth/logout          → logout
GET  /api/auth/me              → get current user
```

### Pelanggaran

```
POST /api/pelanggaran          → AI server kirim deteksi baru [AI only]
GET  /api/pelanggaran          → list semua [Warga+]
GET  /api/pelanggaran/:id      → detail [Warga+]
GET  /api/pelanggaran/export   → export CSV [Admin+]

Query params: ?zona_id=&cctv_id=&from=&to=&status=
```

### CCTV

```
POST   /api/cctv                 → tambah CCTV [Owner]
GET    /api/cctv                 → list semua [Admin+]
GET    /api/cctv/active          → list aktif + stream_url [AI only]
GET    /api/cctv/:id             → detail [Admin+]
GET    /api/cctv/:id/pelanggaran → pelanggaran dari CCTV ini [Admin+]
GET    /api/cctv/:id/summary     → CCTV + stats [Admin+]
PATCH  /api/cctv/:id             → update [Admin+]
DELETE /api/cctv/:id             → hapus [Owner]
```

### Zona

```
POST   /api/zona              → tambah zona [Owner]
GET    /api/zona              → list semua [Warga+]
GET    /api/zona/:id          → detail [Warga+]
GET    /api/zona/:id/cctv     → CCTV di zona ini [Admin+]
GET    /api/zona/:id/skor     → Node Reputation score [Warga+]
GET    /api/zona/:id/summary  → zona + stats [Warga+]
PATCH  /api/zona/:id          → update [Owner]
DELETE /api/zona/:id          → hapus [Owner]
```

### Web3

```
GET  /api/web3                    → semua log [Owner]
GET  /api/web3/:hash              → verifikasi hash [Warga+]
POST /api/web3/pelanggaran/:id    → approve ke blockchain [Owner]

Query params: ?status=pending|verified
```

### Staff

```
GET    /api/staff       → list [Admin+]
GET    /api/staff/:id   → detail [Admin+]
POST   /api/staff       → tambah Admin [Owner]
PATCH  /api/staff/:id   → update [Owner]
DELETE /api/staff/:id   → hapus [Owner]
```

### Dashboard

```
GET /api/dashboard/stats     → statistik global [Warga+]
GET /api/dashboard/timeline  → timeline log dengan filter [Warga+]

Query params /timeline: ?from=&to=&zona_id=&cctv_id=
```

---

## 📦 Dependencies (package.json)

```json
{
  "dependencies": {
    "express": "^4.18.x",
    "@supabase/supabase-js": "^2.x",
    "jsonwebtoken": "^9.x",
    "ethers": "^6.x",
    "google-auth-library": "^9.x",
    "dotenv": "^16.x",
    "cors": "^2.x",
    "helmet": "^7.x",
    "express-validator": "^7.x"
  },
  "devDependencies": {
    "nodemon": "^3.x"
  }
}
```

---

## 📋 .env Variables

```env
# Server
PORT=3000
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

# Blockchain
POLYGON_RPC_URL=
CONTRACT_ADDRESS=
OWNER_PRIVATE_KEY=       # untuk signing transaksi dari backend (opsional)

# AI Server
AI_SERVER_SECRET=        # shared secret untuk validasi request dari AI server
```

---

## ✅ Urutan Implementasi (Auth dulu)

```
1. package.json + install deps
2. .env + env.js (load & validasi)
3. config/supabase.js
4. utils/jwt.js
5. utils/response.js
6. auth.service.js
7. auth.controller.js
8. auth.router.js
9. middlewares/auth.middleware.js
10. middlewares/error.middleware.js
11. app.js
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
