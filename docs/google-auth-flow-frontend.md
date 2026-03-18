# Google Auth Flow — CivicNode Frontend

## Status
Frontend: sudah selesai, tidak perlu diubah.
Backend: perlu diimplementasi sesuai flow di bawah.

## Flow Lengkap

```
1. User klik "Masuk dengan Google"
         ↓
2. Frontend: GET /api/auth/google
         ↓
3. Backend: return { url: "https://accounts.google.com/o/oauth2/auth?..." }
         ↓
4. Frontend: window.location.href = url  → redirect ke halaman Google Login
         ↓
5. User login di Google
         ↓
6. Google redirect ke backend callback (redirect_uri yang backend set)
   contoh: http://localhost:3001/api/auth/google/callback?code=...
         ↓
7. Backend tukar code → dapat access_token + refresh_token dari Google/Supabase
         ↓
8. Backend redirect ke frontend:
   http://localhost:3000/sign-in?access_token=TOKEN&refresh_token=TOKEN
         ↓
9. useEffect di sign-in/page.tsx nangkep token dari URL params
   → simpan ke localStorage
   → redirect ke /dashboard
```

## Kontrak yang Harus Dipenuhi Backend

### GET /api/auth/google
Response:
```json
{ "url": "https://accounts.google.com/o/oauth2/auth?..." }
```

### GET /api/auth/google/callback
- Menerima `?code=...` dari Google
- Tukar code ke token
- Redirect ke: `http://localhost:3000/sign-in?access_token=TOKEN&refresh_token=TOKEN`

## File Frontend yang Relevan

- [`frontend/app/sign-in/page.tsx`](../frontend/app/sign-in/page.tsx) — handleGoogleLogin + useEffect token receiver
- [`frontend/.env`](../frontend/.env) — `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`
- [`frontend/next.config.ts`](../frontend/next.config.ts) — proxy `/api/*` → `http://localhost:3001/api/*`

## Catatan
- Token disimpan di localStorage dengan key `sb_access_token` dan `sb_refresh_token`
- Setelah token diterima, URL dibersihkan via `window.history.replaceState` sebelum redirect
