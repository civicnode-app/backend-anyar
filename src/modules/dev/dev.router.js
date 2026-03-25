// TODO: Hapus modul ini setelah AI server terhubung ke backend

import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// Dummy stats yang drift pelan-pelan tiap di-hit
const state = {
  active_detections: 5,
  confidence_score:  0.82,
  zone_reputation:   78.5,
};

const drift = (val, min, max, step) => {
  const delta = (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, val + delta));
};

router.get("/stats", authenticate, (req, res) => {
  state.active_detections = Math.round(drift(state.active_detections, 0, 15, 2));
  state.confidence_score  = parseFloat(drift(state.confidence_score,  0.5, 0.99, 0.03).toFixed(2));
  state.zone_reputation   = parseFloat(drift(state.zone_reputation,   40, 100, 1.5).toFixed(1));

  res.json({ success: true, data: { ...state } });
});

// Dummy timeline log — hourly summary statis
const DUMMY_LOGS = [
  {
    id: "dummy-1",
    periode_mulai:   "2026-03-25T20:00:00Z",
    periode_selesai: "2026-03-25T21:00:00Z",
    ringkasan: { "kaleng kosong": 12, "bungkus permen": 5 },
    total_deteksi: 17,
    cctv: { id: "dummy-cctv-1", nama: "CCTV 1", ip_address: "192.168.1.10" },
    zona: { id: "dummy-zona-1", nama: "Taman Kota" },
  },
  {
    id: "dummy-2",
    periode_mulai:   "2026-03-25T19:00:00Z",
    periode_selesai: "2026-03-25T20:00:00Z",
    ringkasan: { "botol plastik": 8, "kantong kresek": 3 },
    total_deteksi: 11,
    cctv: { id: "dummy-cctv-2", nama: "CCTV 2", ip_address: "192.168.1.11" },
    zona: { id: "dummy-zona-1", nama: "Taman Kota" },
  },
  {
    id: "dummy-3",
    periode_mulai:   "2026-03-25T18:00:00Z",
    periode_selesai: "2026-03-25T19:00:00Z",
    ringkasan: { "kaleng kosong": 4, "bungkus permen": 9, "botol plastik": 2 },
    total_deteksi: 15,
    cctv: { id: "dummy-cctv-1", nama: "CCTV 1", ip_address: "192.168.1.10" },
    zona: { id: "dummy-zona-2", nama: "Alun-alun" },
  },
  {
    id: "dummy-4",
    periode_mulai:   "2026-03-25T17:00:00Z",
    periode_selesai: "2026-03-25T18:00:00Z",
    ringkasan: { "kantong kresek": 6 },
    total_deteksi: 6,
    cctv: { id: "dummy-cctv-3", nama: "CCTV 3", ip_address: "192.168.1.12" },
    zona: { id: "dummy-zona-2", nama: "Alun-alun" },
  },
  {
    id: "dummy-5",
    periode_mulai:   "2026-03-25T16:00:00Z",
    periode_selesai: "2026-03-25T17:00:00Z",
    ringkasan: { "bungkus permen": 2, "botol plastik": 7, "kaleng kosong": 1 },
    total_deteksi: 10,
    cctv: { id: "dummy-cctv-2", nama: "CCTV 2", ip_address: "192.168.1.11" },
    zona: { id: "dummy-zona-1", nama: "Taman Kota" },
  },
];

router.get("/timeline-log", authenticate, (req, res) => {
  res.json({ success: true, data: DUMMY_LOGS });
});

export default router;
