import { Router } from "express";
import { create, list, listActive, detail, update, remove } from "./cctv.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { authenticateAI } from "../../middlewares/aiAuth.middleware.js";

const router = Router();

// Khusus AI server — pakai x-ai-secret, bukan JWT
router.get("/active", authenticateAI, listActive);

// User endpoints
router.get("/",      authenticate, requireRole("admin", "owner"), list);
router.get("/:id",   authenticate, requireRole("admin", "owner"), detail);
router.post("/",     authenticate, requireRole("owner"),          create);
router.patch("/:id", authenticate, requireRole("admin", "owner"), update);
router.delete("/:id",authenticate, requireRole("owner"),          remove);

export default router;
