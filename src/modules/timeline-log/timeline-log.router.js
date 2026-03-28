import { Router } from "express";
import { listTimelineLogs } from "./timeline-log.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.get("/", authenticate, requireRole("admin", "owner"), listTimelineLogs);

export default router;
