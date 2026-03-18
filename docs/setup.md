# Setup & Konfigurasi

## Port

| Service | URL |
|---|---|
| **Backend** (Express) | `http://localhost:3001` |
| **Frontend** (Next.js) | `http://localhost:3000` |

Backend digeser ke `3001` karena Next.js default jalan di `3000`.

---

## Menjalankan Server

```bash
npm run dev
```

---

## app.js

Entry point Express. Urutan middleware penting:

1. `helmet()` — pasang HTTP security headers buat browser
2. `cors()` — whitelist domain frontend yang boleh akses backend
3. `express.json()` — parse request body JSON
4. Routers — `/api/auth`, dst.
5. `errorHandler` — **harus paling bawah**, nangkep semua error yang di-`next(err)`

---

## Google Cloud Console

Sebelum testing Google OAuth, pastikan terdaftar di Google Cloud Console:

- **Authorized redirect URIs:** `http://localhost:3000/auth/callback`
- **Authorized JavaScript origins:** `http://localhost:3000`
- **OAuth consent screen:** status Testing dengan email developer didaftarkan sebagai test user
