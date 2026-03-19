# Google OAuth Flow — Final Implementation

## Komponen

| Komponen | Peran |
|---|---|
| **User** | Pembeli yang mau masuk jaringan |
| **Frontend** | Resepsionis Los Pollos Hermanos |
| **Backend** | Dapur rahasia di bawah Los Pollos |
| **Google** | Gustavo Fring |
| **`code`** | Pass khusus dari Gus |
| **`getToken(code)`** | Mike yang diutus dapur ke Gus buat konfirmasi pass |
| **`verifyIdToken()`** | Mike ngecek info dari Gus memang buat jaringan dapur ini |
| **JWT** | Kartu akses jaringan yang berlaku untuk transaksi selanjutnya |

---

## Flow

**1. Resepsionis minta alamat Gus ke dapur**
User klik "Masuk dengan Google". Resepsionis (frontend) tidak tau alamat Gus, jadi dia tanya ke dapur dulu via `GET /api/auth/google`.

**2. Dapur kasih alamat Gus**
Dapur return `{ url: "https://accounts.google.com/..." }`. Resepsionis langsung arahkan pembeli ke sana (`window.location.href = url`).

**3. Pembeli menghadap Gustavo**
Pembeli ketemu Gus (Google), Gus verifikasi identitasnya. Kalau clear, Gus kasih **pass khusus** (`code`) dan redirect pembeli ke pintu belakang dapur (`/api/auth/google/callback?code=...`).

**4. Dapur kirim Mike buat konfirmasi ke Gus**
Dapur nggak langsung percaya sama pass itu. Mike (`getToken`) dibalikin ke Gus buat konfirmasi: *"Pass ini beneran lu yang keluarin?"* Kalau valid, Gus kasih `id_token` berisi info lengkap si pembeli.

**5. Mike cek satu hal lagi**
Sebelum lapor ke dapur, Mike (`verifyIdToken`) mastiin info dari Gus itu memang ditujukan buat **jaringan dapur ini** — bukan bocoran dari operasi Gus yang lain.

**6. Dapur cek buku catatan**
Dapur cek arsipnya (`public.users` di Supabase) — pembeli ini udah pernah masuk jaringan atau belum? Kalau baru, catat. Kalau lama, update profilnya. (upsert by email)

**7. Dapur kasih kartu akses**
Dapur bikin **kartu akses** (custom JWT) berisi `{ user_id, email, role: "warga" }`, lalu redirect resepsionis ke:
`http://localhost:3000/sign-in?access_token=TOKEN`

**8. Resepsionis simpan kartu**
`useEffect` di halaman sign-in nangkep token dari URL, simpan ke localStorage sebagai `access_token`, bersihkan URL, lalu redirect ke `/dashboard`.

---

## Kontrak Backend

### GET /api/auth/google
Response **tidak pakai `success()` wrapper** — return langsung:
```json
{ "url": "https://accounts.google.com/o/oauth2/auth?..." }
```
> Semua endpoint lain pakai `{ success: true, data: {...} }`. Hanya endpoint ini yang berbeda karena frontend destructure `{ url }` langsung dari root.

### GET /api/auth/google/callback
- Menerima `?code=...` dari Google
- Redirect ke: `http://[FRONTEND_URL]/sign-in?access_token=TOKEN`
- `refresh_token` tidak dikirim — token expire 24h, user login ulang

---

## Token

Custom JWT — di-sign dan di-verify backend sendiri via `jsonwebtoken`. Bukan Supabase native token.

```json
{ "user_id": "uuid", "email": "user@gmail.com", "role": "warga" }
```

Keputusan ini didokumentasikan lebih lengkap di [`auth-token-decision.md`](auth-token-decision.md).

---

## Kenapa `CLIENT_SECRET` harus selalu di backend?

Hanya dapur yang pegang `CLIENT_SECRET`, jadi hanya dapur yang bisa nyuruh Mike ngonfirmasi pass ke Gus. Kalau frontend dibobol hacker, mereka paling banter cuma bisa dapet `code` — tapi tetap nggak bisa nukar sendiri ke Gus karena nggak punya stempel rahasia itu.

**`CLIENT_SECRET` tidak boleh pernah keluar ke frontend.**

---

## Konfigurasi

### Google Cloud Console
```
Authorized redirect URIs → http://localhost:3001/api/auth/google/callback
```

### Environment Variables
```env
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## File yang Relevan

- [`src/modules/auth/auth.service.js`](../src/modules/auth/auth.service.js) — `getGoogleAuthUrl()`, `handleGoogleCallback()`
- [`src/modules/auth/auth.controller.js`](../src/modules/auth/auth.controller.js) — `getGoogleUrl`, `googleCallback`
- [`src/modules/auth/auth.router.js`](../src/modules/auth/auth.router.js) — `GET /google`, `GET /google/callback`
- [`frontend/app/sign-in/page.tsx`](../../civicnode-frontend/frontend/app/sign-in/page.tsx) — `handleGoogleLogin` + `useEffect` token receiver
