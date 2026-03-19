# Auth Token Decision — Custom JWT vs Supabase Native Token

## Keputusan
Pakai **custom JWT** yang di-sign dan di-verify oleh backend sendiri.

## Latar Belakang
Sempat ada diskusi apakah token auth untuk warga (Google login) harus pakai Supabase native token
atau custom JWT. Awalnya frontend doc menyebut "Supabase native token", tapi setelah ditelusuri
lebih dalam keputusan akhirnya adalah custom JWT.

## Alasan Tidak Pakai Supabase Native Token

**1. Tidak butuh akses langsung frontend → Supabase**
Arsitektur proyek ini: `Frontend → Backend → Supabase`.
Frontend tidak pernah query Supabase langsung, semua lewat backend.
Supabase token hanya relevan kalau frontend query Supabase langsung dengan RLS.

**2. Role custom tidak ada di Supabase token**
Supabase token hanya punya `role: "authenticated"` — bukan `"warga"`, `"admin"`, `"owner"`.
Untuk role-based authorization di backend, harus query DB dulu di setiap request.
Custom JWT bisa langsung embed `role` di payload, tidak perlu query tambahan.

**3. Staff (MetaMask) tetap butuh custom JWT**
Supabase tidak support MetaMask auth. Staff selalu pakai custom JWT.
Kalau warga pakai Supabase token, middleware harus handle dua jenis token berbeda —
lebih kompleks tanpa benefit yang jelas.

**4. `auth.users` tidak bisa ditambah custom column**
Kalau pakai Supabase Auth, tetap butuh `public.users` untuk data custom aplikasi.
Tidak ada penghematan — malah dua tabel yang harus disinkronisasi.

## Konsekuensi

- `public.users` tetap dipakai sebagai satu-satunya tabel data warga
- `auth.users` (Supabase internal) tidak disentuh sama sekali
- Token management (expired, verify) ditangani backend sendiri via `jsonwebtoken`
- Token expire: 24h — user login ulang kalau expired (tidak ada refresh token untuk sekarang)

## JWT Payload

```json
// Warga
{ "user_id": "uuid", "email": "user@gmail.com", "role": "warga" }

// Staff (belum diimplementasi)
{ "staff_id": "uuid", "wallet_address": "0x...", "role": "admin|owner" }
```
