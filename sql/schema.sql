-- ============================================================
-- CivicNode AI — Database Schema
-- Jalankan di: Supabase Dashboard → SQL Editor
--
-- CATATAN:
-- Tabel `users` dan `staff` diasumsikan sudah ada (dibuat saat
-- setup auth). Script ini hanya mencakup tabel-tabel baru.
-- ============================================================


-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------

CREATE TYPE jenis_kamera_enum AS ENUM ('cctv', 'ponsel');


-- ------------------------------------------------------------
-- TABEL: zona
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS zona (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama             VARCHAR NOT NULL,
  deskripsi        VARCHAR,
  zone_reputation  DECIMAL DEFAULT 100,  -- skor kebersihan (0–100), di-flush dari in-memory tiap 5 detik
  created_at       TIMESTAMP DEFAULT now()
);


-- ------------------------------------------------------------
-- TABEL: cctv
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cctv (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama                VARCHAR NOT NULL,
  zona_id             UUID REFERENCES zona(id) NOT NULL,
  jenis_kamera        jenis_kamera_enum NOT NULL,
  stream_url          VARCHAR NOT NULL,
  ip_address          VARCHAR NOT NULL,
  latitude            DECIMAL,
  longitude           DECIMAL,
  status              BOOLEAN DEFAULT true,
  active_detections   INT DEFAULT 0,      -- jumlah bounding box sampah aktif di frame, di-flush tiap 5 detik
  confidence_score    DECIMAL DEFAULT 0,  -- rata-rata skor keyakinan AI (0.0–1.0), di-flush tiap 5 detik
  created_at          TIMESTAMP DEFAULT now()
);


-- ------------------------------------------------------------
-- TABEL: timeline_log
-- Ditulis backend sekali per jam per kamera (hourly summary).
-- Immutable — tidak ada DELETE.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS timeline_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cctv_id         UUID REFERENCES cctv(id) NOT NULL,
  zona_id         UUID REFERENCES zona(id) NOT NULL,  -- denormalized untuk query cepat
  periode_mulai   TIMESTAMP NOT NULL,                 -- awal jam,  misal 2026-03-25 21:00:00
  periode_selesai TIMESTAMP NOT NULL,                 -- akhir jam, misal 2026-03-25 22:00:00
  ringkasan       JSONB NOT NULL,                     -- { "kaleng kosong": 12, "bungkus permen": 5 }
  total_deteksi   INT NOT NULL,                       -- total semua jenis dalam periode ini
  created_at      TIMESTAMP DEFAULT now()
);
