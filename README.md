<div align="center">

# 🌿 CivicNode AI — Backend

**Platform pengawasan lingkungan cerdas berbasis AI & Blockchain**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Polygon](https://img.shields.io/badge/Polygon-8247E5?style=for-the-badge&logo=polygon&logoColor=white)

</div>

---

## 📖 Tentang Proyek

CivicNode AI adalah sistem pengawasan lingkungan yang mendeteksi pelanggaran buang sampah sembarangan secara otomatis menggunakan CCTV + AI. Setiap bukti pelanggaran dikunci di blockchain Polygon agar tidak bisa dimanipulasi.

Backend ini bertanggung jawab atas seluruh logika bisnis — dari autentikasi user, menerima data deteksi dari AI server, hingga eksekusi transaksi blockchain.

---

## ⚙️ Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth (Warga) · MetaMask (Admin/Owner) |
| Blockchain | Polygon PoS + Solidity |
| Storage | IPFS (foto bukti pelanggaran) |

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
│   ├── pelanggaran/    🚧 coming soon
│   ├── cctv/           🚧 coming soon
│   ├── zona/           🚧 coming soon
│   ├── web3/           🚧 coming soon
│   ├── staff/          🚧 coming soon
│   └── dashboard/      🚧 coming soon
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

> Detail lengkap: [`docs/google-oauth-flow.md`](docs/google-oauth-flow.md)

---

## 🛣️ API Endpoints

**Base URL:** `http://localhost:3001/api`

| Method | Endpoint | Akses | Status |
|---|---|---|---|
| GET | `/auth/google` | Public | ✅ |
| GET | `/auth/google/callback` | Public | ✅ |
| GET | `/auth/me` | Warga+ | ✅ |
| POST | `/auth/logout` | Warga+ | ✅ |
| GET | `/pelanggaran` | Warga+ | 🚧 |
| GET | `/cctv` | Admin+ | 🚧 |
| GET | `/zona` | Warga+ | 🚧 |
| GET | `/web3/:hash` | Warga+ | 🚧 |
| GET | `/dashboard/stats` | Warga+ | 🚧 |

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

POLYGON_RPC_URL=
CONTRACT_ADDRESS=

AI_SERVER_SECRET=
```

---

## 👥 Role System

| Role | Auth | Akses |
|---|---|---|
| **Guest** | — | Landing page only |
| **Warga** | Google OAuth | Read-only dashboard & data |
| **Admin** | MetaMask | + CCTV, export data |
| **Owner** | MetaMask | Full access + approve blockchain |

---

<div align="center">

*Built with ☕ by tim CivicNode*

</div>
