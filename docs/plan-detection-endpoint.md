# Rencana: Merged Detection Endpoint

## Latar Belakang

Dua endpoint terpisah (`POST /api/timeline-log` dan `POST /api/realtime-stats`) keduanya menerima kiriman frequent dari AI server (YOLO). Karena AI server hanya bisa kirim data per-frame detection, lebih efisien jika AI server cukup hit **satu endpoint** yang menangani dua tanggung jawab sekaligus.

---

## Endpoint Baru

```
POST /api/detection
Auth: header x-ai-secret: <AI_SERVER_SECRET>
```

### Payload dari AI Server (per frame / per interval kecil)

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

> `detections` bisa array kosong `[]` jika tidak ada objek terdeteksi di frame tersebut.

---

## Dua Tanggung Jawab Backend Setelah Menerima Request

### 1. Update Real-time Stats (langsung, in-memory)

Dari payload, backend langsung hitung dan update in-memory Map:

- `active_detections` = `detections.length`
- `confidence_score` = rata-rata semua `confidence` di array (0 kalau array kosong)
- `zone_reputation` = dihitung berdasarkan frekuensi deteksi (formula TBD)

Flush ke DB (`cctv` dan `zona`) setiap **5 detik** via `setInterval`.

### 2. Akumulasi untuk Hourly Summary (in-memory)

Backend akumulasi semua deteksi yang masuk per `cctv_id` selama 1 jam:

```js
// Struktur in-memory accumulator
{
  "cctv-uuid-A": {
    zona_id: "zona-uuid-X",
    counts: {
      "kaleng kosong": 12,
      "bungkus permen": 5
    }
  },
  ...
}
```

Di setiap jam (`setInterval` atau cron tiap :00), backend:
1. Ambil snapshot accumulator
2. Tulis ke tabel `timeline_log` (1 row per kamera yang aktif)
3. Reset accumulator

---

## Schema `timeline_log` (Revised)

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
cctv_id         UUID REFERENCES cctv(id) NOT NULL
zona_id         UUID REFERENCES zona(id) NOT NULL
periode_mulai   TIMESTAMP NOT NULL        -- awal jam, misal 2026-03-25 21:00:00
periode_selesai TIMESTAMP NOT NULL        -- akhir jam, misal 2026-03-25 22:00:00
ringkasan       JSONB NOT NULL            -- { "kaleng kosong": 12, "bungkus permen": 5 }
total_deteksi   INT NOT NULL              -- 17
created_at      TIMESTAMP DEFAULT now()
```

> Immutable — tidak ada endpoint DELETE.
> `ringkasan` pakai JSONB supaya fleksibel mengikuti output model YOLO yang bisa berkembang.

---

## Update Endpoint Table di CLAUDE.md

| Endpoint lama | Status | Diganti |
|---|---|---|
| `POST /api/timeline-log` | ❌ Dihapus | Digabung ke `POST /api/detection` |
| `POST /api/realtime-stats` | ❌ Dihapus | Digabung ke `POST /api/detection` |
| `GET /api/timeline-log` | ✅ Tetap | Frontend ambil history summary |
| `POST /api/detection` | 🆕 Baru | Single endpoint untuk AI server |

---

## Risiko yang Sudah Dipertimbangkan

**Backend restart di tengah jam:**
- In-memory accumulator hilang → jam berjalan saat itu tidak tercatat
- Maksimal kehilangan data 1 jam
- Jam-jam sebelumnya sudah tersimpan di DB → aman
- Setelah backend nyala lagi, AI server langsung kirim lagi → akumulasi jam berikutnya normal

**AI server spam / troll kamera:**
- Solved secara natural: spam 100x dalam 1 jam tetap hanya menghasilkan 1 row summary
- Count di `ringkasan` memang naik, tapi tidak menambah row baru

---

## Yang Perlu Dikerjakan (Urutan)

1. Update `CLAUDE.md` dan `docs/architecture.md` — reflect endpoint baru, schema baru
2. Buat migration SQL untuk schema `timeline_log` baru + kolom baru di `cctv` dan `zona`
3. Implementasi `POST /api/detection` — validasi payload, update in-memory stats, akumulasi
4. Implementasi `setInterval` flush stats (5 detik) dan hourly flush timeline (tiap :00)
5. Implementasi `GET /api/timeline-log` — serve history summary ke frontend
6. Update frontend `dashboardStore` dan `TimelineLog` component — sesuaikan struktur data baru
