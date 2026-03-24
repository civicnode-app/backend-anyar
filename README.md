<div align="center">

# 🌿 CivicNode AI — Backend

**Platform monitoring kebersihan lingkungan berbasis AI & Web3**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Polygon](https://img.shields.io/badge/Polygon-8247E5?style=for-the-badge&logo=polygon&logoColor=white)

</div>

---

## 📖 Tentang Proyek

CivicNode AI adalah sistem monitoring kebersihan lingkungan berbasis AI. CCTV yang terhubung ke AI server memantau zona secara real-time — mendeteksi keberadaan sampah, menghitung `zone_reputation`, dan mencatat setiap event deteksi ke dalam log.

Fokus aplikasi adalah **monitoring real-time**, bukan pencatatan pelanggaran. Autentikasi MetaMask dipertahankan untuk unsur Web3 dan keamanan akses Admin/Owner.

---

## ⚙️ Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js (ES Modules) + Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth (Warga) · MetaMask (Admin/Owner) |
| Web3 | ethers.js — verifikasi signature MetaMask |

---

## 🗂️ Struktur Folder

```
src/
├── config/
│   ├── env.js          → load & validasi environment variables
│   └── supabase.js     → init Supabase client
│
├── middlewares/
│   ├── auth.middleware.js   → verifikasi JWT
│   ├── role.middleware.js   → guard per role
│   └── error.middleware.js  → global error handler
│
├── modules/
│   ├── auth/           ✅ selesai
│   ├── cctv/           🚧 coming soon
│   ├── zona/           🚧 coming soon
│   ├── staff/          🚧 coming soon
│   └── timeline-log/   🚧 coming soon
│
├── utils/
│   ├── jwt.js          → sign & verify JWT
│   └── response.js     → format response API konsisten
│
└── app.js              → setup Express, middleware, router
```

---

## 🚀 Cara Menjalankan

**1. Clone & install dependencies**
```bash
git clone <repo-url>
cd backend-anyar
npm install
```

**2. Setup environment variables**
```bash
cp .env.example .env
# isi semua variabel di .env
```

**3. Jalankan server**
```bash
npm run dev     # development (nodemon)
npm start       # production
```

Server berjalan di `http://localhost:3001`

---

## 🔄 Arsitektur Data Flow

```
AI Server ──(POST /api/timeline-log)──→ Backend → simpan ke DB
AI Server ──(web polling)─────────────→ Frontend → zone_reputation, confidence_score, active_detections
Frontend  ──(GET /api/timeline-log)───→ Backend → ambil history log
```

`zone_reputation` dan `confidence_score` dikirim AI server **langsung ke frontend** (tidak lewat backend) untuk menghindari polling yang redundan.

---

## 🔐 Auth Flow

### Warga — Google OAuth
```
GET  /api/auth/google           → dapat URL login Google
GET  /api/auth/google/callback  → tukar code → redirect ke frontend dengan JWT
```

### Admin / Owner — MetaMask
```
GET  /api/auth/nonce            → minta nonce untuk ditandatangani
POST /api/auth/metamask         → verifikasi signature → dapat JWT
```

> Detail lengkap: [`docs/google-oauth-flow.md`](docs/google-oauth-flow.md) · [`docs/metamask-auth-flow.md`](docs/metamask-auth-flow.md)

---

## 🛣️ API Endpoints

**Base URL:** `http://localhost:3001/api`

| Method | Endpoint | Akses | Status |
|---|---|---|---|
| GET | `/auth/google` | Public | ✅ |
| GET | `/auth/google/callback` | Public | ✅ |
| GET | `/auth/nonce` | Public | ✅ |
| POST | `/auth/metamask` | Public | ✅ |
| GET | `/auth/me` | Warga+ | ✅ |
| POST | `/auth/logout` | Warga+ | ✅ |
| POST | `/timeline-log` | AI only | 🚧 |
| GET | `/timeline-log` | Warga+ | 🚧 |
| GET | `/cctv` | Admin+ | 🚧 |
| POST | `/cctv` | Owner | 🚧 |
| GET | `/zona` | Warga+ | 🚧 |
| POST | `/zona` | Owner | 🚧 |
| GET | `/staff` | Admin+ | 🚧 |
| POST | `/staff` | Owner | 🚧 |

---

## 📋 Environment Variables

```env
PORT=3001

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
JWT_EXPIRES_IN=24h

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

AI_SERVER_SECRET=
```

---

## 👥 Role System

| Role | Auth | Akses |
|---|---|---|
| **Guest** | — | Landing page only |
| **Warga** | Google OAuth | Read-only dashboard & timeline log |
| **Admin** | MetaMask | + Kelola CCTV, export data |
| **Owner** | MetaMask | Full access + kelola zona & staff |

---

<div align="center">

*Built with ☕ by tim CivicNode*

</div>
