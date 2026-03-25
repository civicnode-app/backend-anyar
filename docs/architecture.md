# Arsitektur Sistem CivicNode AI

## Gambaran Umum

CivicNode AI adalah platform monitoring kebersihan lingkungan real-time. AI server memantau zona via CCTV, menghitung reputasi zona, dan mencatat setiap event deteksi sampah ke backend.

Fokus: **monitoring**, bukan pencatatan pelanggaran atau penghakiman pelanggar.

---

## Data Flow

```
┌─────────────┐   POST /api/detection         ┌─────────────┐
│  AI Server  │ ──────────────────────────→   │   Backend   │
│  (YOLO)     │   (per frame, frequent)        │  (Express)  │
│             │                               │             │
│             │                               │  in-memory  │
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

### AI Server → Backend: Single Detection Endpoint

- Endpoint: `POST /api/detection`
- Auth: header `x-ai-secret: <AI_SERVER_SECRET>`
- Dikirim AI server per frame (frequent, dari YOLO)
- Payload:

```json
{
  "cctv_id": "uuid",
  "zona_id": "uuid",
  "detections": [
    { "jenis_objek": "kaleng kosong", "confidence": 0.91 },
    { "jenis_objek": "bungkus permen", "confidence": 0.87 }
  ],
  "waktu": "2026-03-25T21:43:00Z"
}
```

> `detections` boleh array kosong `[]` jika tidak ada objek terdeteksi di frame tersebut.

### Backend: Dua Tanggung Jawab dari Satu Endpoint

**Tanggung jawab 1 — Update real-time stats (in-memory, flush tiap 5 detik):**

```
AI Server POST /api/detection → hitung stats dari payload:
  active_detections = detections.length
  confidence_score  = rata-rata confidence semua item (0 kalau array kosong)
  zone_reputation   = dihitung berdasarkan frekuensi deteksi (TBD)

→ simpan di in-memory Map (per cctv_id)

setInterval(5000) → flush Map ke DB:
  active_detections + confidence_score → tabel cctv
  zone_reputation                      → tabel zona
```

**Tanggung jawab 2 — Akumulasi hourly summary (in-memory, flush tiap 1 jam):**

```
AI Server POST /api/detection → tambahkan detections ke in-memory accumulator:
  accumulator[cctv_id].counts["kaleng kosong"] += 1
  accumulator[cctv_id].counts["bungkus permen"] += 1
  ...

setInterval(tiap :00) → flush accumulator ke DB:
  1 row per kamera → tabel timeline_log
  reset accumulator untuk jam berikutnya
```

Saat backend restart, kedua in-memory store kosong — nilai terakhir tetap tersedia dari DB sebagai fallback, dan AI server akan repopulate dalam 5 detik berikutnya.

### Frontend → Backend

- `GET /api/timeline-log` — history hourly summary (Auth: JWT Warga+)
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
periode_mulai   TIMESTAMP NOT NULL                  -- awal jam, misal 2026-03-25 21:00:00
periode_selesai TIMESTAMP NOT NULL                  -- akhir jam, misal 2026-03-25 22:00:00
ringkasan       JSONB NOT NULL                      -- { "kaleng kosong": 12, "bungkus permen": 5 }
total_deteksi   INT NOT NULL                        -- total semua jenis dalam periode ini
created_at      TIMESTAMP DEFAULT now()
```

**Catatan:**
- `zona_id` di-denormalize meski bisa di-derive dari `cctv.zona_id` — ini disengaja untuk performa query filter per zona
- `ringkasan` pakai JSONB agar fleksibel mengikuti output model YOLO yang bisa berkembang
- Ditulis backend **sekali per jam per kamera** dari hasil akumulasi in-memory
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

Backend memvalidasi header ini sebelum menerima data di endpoint `POST /api/detection`.

---

## Module yang Ada vs Tidak Ada

| Module | Status | Catatan |
|---|---|---|
| `auth` | ✅ Selesai | Google OAuth + MetaMask |
| `detection` | 🚧 Next | Single endpoint AI server — handle stats + hourly log |
| `cctv` | 🚧 Planned | CRUD kamera |
| `zona` | 🚧 Planned | CRUD zona |
| `staff` | 🚧 Planned | CRUD Admin/Owner |
| ~~`timeline-log` (POST)~~ | ❌ Dihapus | Digabung ke `detection` |
| ~~`realtime-stats`~~ | ❌ Dihapus | Digabung ke `detection` |
| ~~`pelanggaran`~~ | ❌ Dihapus | Diganti `timeline-log` (hourly summary) |
| ~~`web3`~~ | ❌ Dihapus | Tidak ada blockchain sync |
| ~~`dashboard`~~ | ❌ Dihapus | Stats tidak lagi bypass ke frontend langsung |
