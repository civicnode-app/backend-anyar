# Google OAuth Flow — Login with Google

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
| **`CLIENT_ID`** | Tanda pengenal app di ekosistem Google — dipakai frontend + backend |
| **`CLIENT_SECRET`** | Stempel rahasia yang cuma dipegang dapur — wajib untuk ngutus Mike ke Gus |
| **JWT** | Kartu akses jaringan yang berlaku untuk transaksi selanjutnya |

---

## Flow

**1. Pembeli minta masuk jaringan**
Pembeli (user) dateng ke resepsionis Los Pollos (frontend). Resepsionis bilang: *"Lu harus menghadap Gus dulu sebelum bisa masuk."*

**2. Pembeli menghadap Gustavo**
Pembeli ketemu Gus (Google), Gus verifikasi identitasnya — siapa lu, bisa dipercaya nggak. Kalau clear, Gus kasih **pass khusus** (`code`) — *"Bawa ini ke dapur, berlaku sekali dan jangan kelamaan."*

**3. Resepsionis bawa pass ke dapur**
Resepsionis serahin pass itu ke dapur (backend) via `POST /auth/google`.

**4. Dapur kirim Mike buat konfirmasi ke Gus**
Dapur nggak langsung percaya sama pass itu. Mike (`getToken`) dibalikin ke Gus buat konfirmasi: *"Pass ini beneran lu yang keluarin?"* Kalau valid, Gus kasih info lengkap si pembeli.

**5. Mike cek satu hal lagi**
Sebelum lapor ke dapur, Mike (`verifyIdToken`) mastiin info dari Gus itu memang ditujukan buat **jaringan dapur ini** — bukan bocoran dari operasi Gus yang lain.

**6. Dapur cek buku catatan**
Dapur cek arsipnya (Supabase) — pembeli ini udah pernah masuk jaringan atau belum? Kalau baru, catat. Kalau lama, ambil profilnya.

**7. Dapur kasih kartu akses**
Dapur kasih **kartu akses** (JWT) ke resepsionis buat diterusin ke pembeli. Mulai sini pembeli tinggal tunjukin kartu itu setiap mau akses jaringan — nggak perlu ngadepin Gus lagi.

---

## Kenapa `CLIENT_SECRET` harus selalu di backend?

Hanya dapur yang pegang `CLIENT_SECRET`, jadi hanya dapur yang bisa nyuruh Mike ngonfirmasi pass ke Gus. Kalau frontend dibobol hacker, mereka paling banter cuma bisa dapet `code` — tapi tetap nggak bisa nukar sendiri ke Gus karena nggak punya stempel rahasia itu.

**`CLIENT_SECRET` tidak boleh pernah keluar ke frontend.**

---

## Catatan CORS

CORS bukan verifikasi identitas resepsionis, tapi **whitelist alamat** — dapur nentuin resepsionis mana yang boleh kirim request. Resepsionis dari domain lain langsung ditolak sebelum diproses.

Kelemahan: CORS hanya berlaku di browser. Request via Postman atau curl tidak terpengaruh CORS, jadi CORS bukan security layer utama.
