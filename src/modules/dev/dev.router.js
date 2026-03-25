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

export default router;
