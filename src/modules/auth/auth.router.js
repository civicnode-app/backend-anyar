import { Router } from "express";
import {
  getGoogleUrl,
  googleCallback,
  logout,
  me,
} from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/google", getGoogleUrl);
router.get("/google/callback", googleCallback);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
