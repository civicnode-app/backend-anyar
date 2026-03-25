-- ============================================================
-- CivicNode AI — Database Schema (Lengkap)
-- Jalankan di: Supabase Dashboard → SQL Editor
--
-- Urutan eksekusi penting — jangan diubah urutannya karena
-- ada foreign key dependencies antar tabel.
-- ============================================================


-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------

CREATE TYPE staff_role_enum    AS ENUM ('admin', 'owner');
CREATE TYPE jenis_kamera_enum  AS ENUM ('cctv', 'ponsel');


-- ------------------------------------------------------------
-- TABEL: users  (Warga — login Google OAuth)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR UNIQUE NOT NULL,
  full_name   VARCHAR NOT NULL,
  avatar_url  VARCHAR,
  created_at  TIMESTAMP DEFAULT now()
);


-- ------------------------------------------------------------
-- TABEL: staff  (Admin + Owner — login MetaMask)
-- Avatar di-generate di frontend via Jazzicon dari wallet_address.
-- Owner pertama harus di-seed manual — tidak ada endpoint register.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   VARCHAR UNIQUE NOT NULL,  -- selalu disimpan lowercase
  full_name        VARCHAR NOT NULL,
  role             staff_role_enum NOT NULL,
  created_at       TIMESTAMP DEFAULT now()
);


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
