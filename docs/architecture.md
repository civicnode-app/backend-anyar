# Arsitektur Sistem CivicNode AI

## Gambaran Umum

CivicNode AI adalah platform monitoring kebersihan lingkungan real-time. AI server memantau zona via CCTV, menghitung reputasi zona, dan mencatat setiap event deteksi sampah ke backend.

Fokus: **monitoring**, bukan pencatatan pelanggaran atau penghakiman pelanggar.

---

## Data Flow

```
┌─────────────┐   POST /api/timeline-log    ┌─────────────┐
│  AI Server  │ ─────────────────────────→  │   Backend   │
│             │                             │  (Express)  │
│             │   web polling               │             │
│             │ ───────────────────────→    │             │
│             │   zone_reputation           └──────┬──────┘
│             │   confidence_score                 │ GET /api/timeline-log
│             │   active_detections                ↓
└─────────────┘                             ┌─────────────┐
                                            │  Frontend   │
                                            │  (Next.js)  │
                                            └─────────────┘
```

### AI Server → Backend (per event deteksi)
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

### AI Server → Frontend (real-time, bypass backend)
- Metode: web polling dari frontend ke AI server langsung
- Data: `zone_reputation`, `confidence_score`, `active_detections`
- Tidak disimpan di database backend — murni state real-time dari AI

### Frontend → Backend (history log)
- Endpoint: `GET /api/timeline-log`
- Auth: JWT token (Warga+)
- Query params: `?zona_id=&cctv_id=&from=&to=&limit=`

---

## Kenapa Stats Real-time Bypass Backend?

`zone_reputation`, `confidence_score`, dan `active_detections` dihitung real-time oleh AI server. Kalau dilewatkan backend dulu:
- Frontend polling ke backend → backend polling ke AI → redundan
- Menambah latency yang tidak perlu

Solusi: frontend langsung polling AI server untuk stats real-time. Backend hanya menerima dan menyimpan log event.

---

## Database Schema

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

## `confidence_score` — Apa Artinya?

`confidence_score` adalah rata-rata skor keyakinan AI terhadap semua objek yang sedang terdeteksi sebagai sampah di area kamera.

**Kegunaan:**
- Nilai tinggi = AI yakin dengan deteksinya
- Nilai rendah = bisa jadi kamera bermasalah (buram, berdebu, rusak sebagian) sehingga model AI kurang akurat

Ini berguna sebagai **indikator kualitas kamera**, bukan hanya indikator keberadaan sampah.

---

## `zone_reputation` — Apa Artinya?

`zone_reputation` adalah skor reputasi kebersihan suatu zona, dihitung real-time oleh AI server berdasarkan frekuensi dan intensitas deteksi sampah.

Semakin sering sampah terdeteksi → skor turun. Zona yang bersih konsisten → skor tinggi.

Tidak disimpan di database — selalu dihitung fresh oleh AI.

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
| `cctv` | 🚧 Planned | CRUD kamera |
| `zona` | 🚧 Planned | CRUD zona |
| `staff` | 🚧 Planned | CRUD Admin/Owner |
| ~~`pelanggaran`~~ | ❌ Dihapus | Diganti `timeline-log` |
| ~~`web3`~~ | ❌ Dihapus | Tidak ada blockchain sync |
| ~~`dashboard`~~ | ❌ Dihapus | Stats real-time langsung dari AI ke frontend |
