# MetaMask Auth Flow — Konsep & Implementasi

## Komponen

| Komponen             | Peran                                                      |
| -------------------- | ---------------------------------------------------------- |
| **User/Staff**       | Pemilik wallet MetaMask                                    |
| **MetaMask**         | Ekstensi browser yang menyimpan private key                |
| **Frontend**         | Minta nonce, minta user sign, kirim ke backend             |
| **Backend**          | Generate nonce, verifikasi signature, return JWT           |
| **`nonce`**          | String random sekali pakai — "kupon taman hiburan"         |
| **`signature`**      | Hasil sign nonce pakai private key — "sidik jari di kupon" |
| **`wallet_address`** | Identitas publik wallet — "nomor KTP"                      |

---

## Flow

```
1. Frontend: GET /api/auth/nonce?address=0x...
         ↓
2. Backend generate nonce random, simpan sementara, return { nonce }
         ↓
3. Frontend minta user sign nonce via MetaMask:
   ethereum.request({ method: "personal_sign", params: [nonce, address] })
         ↓
4. MetaMask return signature (tanpa expose private key)
         ↓
5. Frontend: POST /api/auth/metamask
   body: { wallet_address, signature, nonce }
         ↓
6. Backend verifikasi:
   recoverAddress(nonce, signature) === wallet_address?
         ↓
7. Backend cek tabel staff — wallet_address terdaftar?
   → tidak ada → 401 (bukan sembarang orang bisa jadi staff)
   → ada → sign JWT { staff_id, wallet_address, role }
         ↓
8. Return { access_token } ke frontend
```

---

## Fundamental Kriptografi

### Tiga Kunci Wallet

```
private_key → (kurva eliptik) → public_key → (keccak256 hash) → wallet_address
```

| Kunci              | Ukuran   | Sifat                                             |
| ------------------ | -------- | ------------------------------------------------- |
| **private_key**    | 32 bytes | Rahasia mutlak, tidak pernah keluar dari MetaMask |
| **public_key**     | 64 bytes | Boleh dibagikan, diturunkan dari private_key      |
| **wallet_address** | 20 bytes | Hash dari public_key, yang beredar di blockchain  |

> `wallet_address` bukan `public_key` — wallet_address adalah 20 byte terakhir dari hasil hash keccak256 dari public_key. Ini lapisan proteksi tambahan jika suatu saat komputer quantum bisa serang kurva eliptik.

### Rumus Inti

```
nonce + private_key  →  signature        (dilakukan MetaMask)
signature + nonce    →  wallet_address   (dilakukan backend untuk verifikasi)
```

Algoritma yang dipakai: **ECDSA** (Elliptic Curve Digital Signature Algorithm).

Sifat ajaibnya: siapapun bisa recover `wallet_address` dari `signature + nonce`, tapi **tidak ada yang bisa recover `private_key` dari `signature`**. Matematika satu arah.

Di kode backend, cukup satu baris via `ethers.js`:

```js
const recoveredAddress = ethers.verifyMessage(nonce, signature);
if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase()) {
  throw new Error("Invalid signature");
}
```

---

## Kenapa Perlu Nonce? (Proteksi Replay Attack)

### Tanpa nonce — rentan replay attack

```
Hacker ngintip request: { wallet_address: "0xABC", signature: "0x123..." }
Hacker kirim ulang request yang sama kapanpun → backend terima ✅ → login berhasil 😱
```

Backend tidak bisa bedain request asli vs replay — signature-nya memang valid.

### Dengan nonce — replay attack gagal

```
Hacker kirim ulang: { wallet_address: "0xABC", signature: "0x123...", nonce: "xK9mPq" }
Backend: nonce "xK9mPq" sudah dipakai/expired → ❌ ditolak
```

Nonce hanya berlaku sekali. Setelah dipakai, langsung dibuang.

### Analogi Kupon Taman Hiburan

- **Kupon** = nonce (sekali pakai, dipotong kasir setelah dipakai)
- **Sidik jari di kupon** = signature (hanya bisa dibuat pemilik wallet asli)
- **KTP untuk cocokkan sidik jari** = wallet_address
- **Kasir** = backend yang verifikasi

Bocil random tidak bisa replay karena:

1. Kuponnya sudah dipotong (nonce expired/used)
2. Tidak bisa bikin kupon baru karena tidak punya sidik jari aslinya (private key)

---

## Kenapa Staff Harus Didaftarkan Manual?

Tidak ada endpoint registrasi untuk staff — ini by design. Hanya programmer/owner yang bisa tambah staff langsung via Supabase Dashboard. Ini mencegah sembarang orang bisa daftar sebagai admin/owner.

Alur:

1. Owner minta programmer tambah wallet_address ke tabel `staff`
2. Baru bisa login via MetaMask

---

## Token

Custom JWT — sama seperti Google/warga, tapi payload berbeda:

```json
{ "staff_id": "uuid", "wallet_address": "0x...", "role": "admin" }
```

atau

```json
{ "staff_id": "uuid", "wallet_address": "0x...", "role": "owner" }
```

Expire 24h, tidak ada refresh token — staff login ulang kalau expired.

---

## Catatan Implementasi

### wallet_address selalu lowercase
Semua wallet_address distandardisasi ke lowercase di seluruh lapisan:
- **nonceStore key**: `wallet_address.toLowerCase()`
- **query DB**: pakai `key` (lowercase) dengan `.eq()`
- **data di Supabase**: semua row sudah di-update via `UPDATE staff SET wallet_address = LOWER(wallet_address)`

Jangan pakai mixed case atau checksum format (EIP-55) — simpan dan bandingkan selalu dalam lowercase.

### wallet_requestPermissions vs eth_requestAccounts
Frontend pakai `wallet_requestPermissions` agar popup pilih akun **selalu muncul** setiap login, tidak langsung pakai akun yang sudah connected sebelumnya.

> Catatan: `wallet_requestPermissions` trigger bug BigNumber di Brave browser versi tertentu karena konflik dengan Brave Wallet. Gunakan Firefox atau Chrome untuk development.

### Verifikasi via curl
Flow backend sudah diverifikasi end-to-end via curl tanpa browser:
```bash
# 1. Minta nonce
curl "http://localhost:3001/api/auth/nonce?address=0x..."

# 2. Sign nonce (pakai ethers.js di Node)
node -e "import('ethers').then(async ({ ethers }) => {
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(await wallet.signMessage(NONCE));
})"

# 3. Login
curl -X POST "http://localhost:3001/api/auth/metamask" \
  -H "Content-Type: application/json" \
  -d '{ "wallet_address": "0x...", "signature": "0x...", "nonce": "..." }'
```

---

## File yang Relevan

- [`src/modules/auth/auth.service.js`](../src/modules/auth/auth.service.js) — `getNonce()`, `loginWithMetaMask()`
- [`src/modules/auth/auth.controller.js`](../src/modules/auth/auth.controller.js) — `getMetaMaskNonce`, `metamaskLogin`
- [`src/modules/auth/auth.router.js`](../src/modules/auth/auth.router.js) — `GET /nonce`, `POST /metamask`
