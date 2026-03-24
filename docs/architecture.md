# Arsitektur Sistem CivicNode AI

## Gambaran Umum

CivicNode AI adalah platform monitoring kebersihan lingkungan real-time. AI server memantau zona via CCTV, menghitung reputasi zona, dan mencatat setiap event deteksi sampah ke backend.

Fokus: **monitoring**, bukan pencatatan pelanggaran atau penghakiman pelanggar.

---

## Data Flow

```
┌─────────────┐   POST /api/timeline-log      ┌─────────────┐
│  AI Server  │ ──────────────────────────→   │   Backend   │
│             │                               │  (Express)  │
│             │   POST /api/realtime-stats    │             │
│             │ ──────────────────────────→   │  in-memory  │
│             │                               │  Map + DB   │
└─────────────┘                               └──────┬──────┘
                                                     │ GET /api/timeline-log
                                                     │ GET /api/zona
                                                     │ GET /api/cctv
                                                     ↓
                                              ┌─────────────┐
                                              │  Frontend   │
                                              │  (Next.js)  │
                                              └─────────────┘
```

Backend adalah **satu-satunya pintu masuk** bagi frontend — tidak ada komunikasi langsung antara frontend dan AI server.

### AI Server → Backend: Event Deteksi

- Endpoint: `POST /api/timeline-log`
- Auth: header `x-ai-secret: <AI_SERVER_SECRET>`
- Payload yang disimpan ke DB:

```json
{
  "cctv_id": "uuid",
  "zona_id": "uuid",
  "jenis_objek": "kaleng kosong",
  "waktu_kejadian": "2026-03-24T21:00:00Z"
}
```

### AI Server → Backend: Real-time Stats

- Endpoint: `POST /api/realtime-stats`
- Auth: header `x-ai-secret: <AI_SERVER_SECRET>`
- Dikirim AI server secara periodik (per kamera aktif)
- Payload:

```json
{
  "cctv_id": "uuid",
  "zona_id": "uuid",
  "active_detections": 3,
  "confidence_score": 0.92,
  "zone_reputation": 85.0
}
```

### Backend: Write-back Cache (Periodic Flush)

Real-time stats **tidak langsung ditulis ke DB** — disimpan dulu di in-memory Map, lalu di-flush ke DB setiap 5 detik via `setInterval`. Ini mencegah AI server menyebabkan query spam ke database.

```
AI Server POST stats → update in-memory Map (instant)
setInterval(5000)    → flush Map ke DB (batched, hanya kalau ada perubahan)
```

- `active_detections` dan `confidence_score` → flush ke tabel `cctv`
- `zone_reputation` → flush ke tabel `zona`

Saat backend restart, in-memory Map kosong — tapi nilai terakhir tetap tersedia dari DB sebagai fallback, dan AI server akan repopulate dalam 5 detik berikutnya.

### Frontend → Backend

- `GET /api/timeline-log` — history log deteksi (Auth: JWT Warga+)
  - Query params: `?zona_id=&cctv_id=&from=&to=&limit=`
- `GET /api/zona` — list zona termasuk kolom `zone_reputation`
- `GET /api/cctv` — list kamera termasuk kolom `active_detections` dan `confidence_score`

---

## Kenapa Backend Jadi Single Gateway?

Alternatif sebelumnya adalah frontend langsung polling AI server untuk real-time stats. Ini ditolak karena:

1. **Frontend harus tahu dua URL** — `BACKEND_URL` dan `AI_SERVER_URL`. Kalau AI server pindah, frontend ikut kena.
2. **AI server jadi dua peran** — inferencing + melayani HTTP request frontend (harus handle CORS, auth, rate limiting).
3. **Celah keamanan** — endpoint AI server yang di-polling frontend tidak bisa diproteksi JWT seperti endpoint backend.
4. **Tidak konsisten** — historical data dari backend, real-time stats dari AI server. Sumber data terbelah.

Dengan backend sebagai single gateway: frontend hanya kenal satu server, keamanan terpusat, dan AI server fokus pada tugasnya.

---

## Database Schema

### `cctv` (penambahan kolom real-time)

Dua kolom baru ditambahkan untuk menyimpan state real-time dari AI server:

```sql
active_detections   INT DEFAULT 0        -- jumlah bounding box sampah yang terdeteksi di frame saat ini
confidence_score    DECIMAL DEFAULT 0    -- rata-rata skor keyakinan AI terhadap deteksi aktif (0.0 - 1.0)
```

Nilai ini diupdate via write-back flush dari in-memory Map setiap 5 detik.

### `zona` (penambahan kolom real-time)

```sql
zone_reputation     DECIMAL DEFAULT 100  -- skor kebersihan zona (0-100), dihitung AI server
```

Nilai ini diupdate via write-back flush dari in-memory Map setiap 5 detik.

### `timeline_log` (menggantikan `data_pelanggaran` lama)

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
cctv_id         UUID REFERENCES cctv(id) NOT NULL
zona_id         UUID REFERENCES zona(id) NOT NULL   -- denormalized, untuk query cepat tanpa JOIN
jenis_objek     VARCHAR NOT NULL                    -- dinamis dari AI: "kaleng kosong", "bungkus permen", dll
waktu_kejadian  TIMESTAMP NOT NULL
created_at      TIMESTAMP DEFAULT now()
```

**Catatan:**
- `zona_id` di-denormalize meski bisa di-derive dari `cctv.zona_id` — ini disengaja untuk performa query filter per zona
- `jenis_objek` bersifat bebas (tidak di-enum) karena tergantung model AI dan dataset training
- Immutable — tidak ada endpoint DELETE

### Tabel yang dihapus dari desain lama
- ~~`data_pelanggaran`~~ → diganti `timeline_log`
- ~~`web3_log`~~ → dihapus (tidak ada lagi sinkronisasi blockchain untuk data deteksi)

---

## `active_detections` — Apa Artinya?

Jumlah bounding box sampah yang sedang terdeteksi di frame video CCTV saat ini. Bersifat ephemeral — bisa berubah setiap frame.

**Kegunaan:** Membantu user di frontend mengetahui berapa kotak sampah yang terlihat di video streaming tanpa harus menghitung manual.

Disimpan di kolom `cctv.active_detections`, diupdate via write-back flush setiap 5 detik.

---

## `confidence_score` — Apa Artinya?

Rata-rata skor keyakinan AI terhadap semua bounding box sampah yang sedang aktif terdeteksi di kamera tersebut (0.0 – 1.0).

**Kegunaan:**
- Nilai tinggi = AI yakin dengan deteksinya
- Nilai rendah = bisa jadi kamera bermasalah (buram, berdebu, rusak sebagian)

Berguna sebagai **indikator kualitas kamera**, bukan hanya indikator keberadaan sampah. Disimpan di kolom `cctv.confidence_score`.

---

## `zone_reputation` — Apa Artinya?

Skor reputasi kebersihan suatu zona (0–100), dihitung oleh AI server berdasarkan frekuensi dan intensitas deteksi sampah.

Semakin sering sampah terdeteksi → skor turun. Zona yang bersih konsisten → skor tinggi.

Disimpan di kolom `zona.zone_reputation`, diupdate via write-back flush setiap 5 detik.

---

## Autentikasi AI Server ke Backend

AI server menggunakan shared secret untuk autentikasi ke backend (bukan JWT user biasa):

```
Header: x-ai-secret: <nilai AI_SERVER_SECRET dari .env>
```

Backend memvalidasi header ini sebelum menerima data di endpoint `POST /api/timeline-log`.

---

## Module yang Ada vs Tidak Ada

| Module | Status | Catatan |
|---|---|---|
| `auth` | ✅ Selesai | Google OAuth + MetaMask |
| `timeline-log` | 🚧 Next | Terima log dari AI, serve ke frontend |
| `realtime-stats` | 🚧 Next | Terima stats dari AI, write-back flush ke DB |
| `cctv` | 🚧 Planned | CRUD kamera |
| `zona` | 🚧 Planned | CRUD zona |
| `staff` | 🚧 Planned | CRUD Admin/Owner |
| ~~`pelanggaran`~~ | ❌ Dihapus | Diganti `timeline-log` |
| ~~`web3`~~ | ❌ Dihapus | Tidak ada blockchain sync |
| ~~`dashboard`~~ | ❌ Dihapus | Stats tidak lagi bypass ke frontend langsung |
