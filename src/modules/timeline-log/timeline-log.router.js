import { Router } from "express";
import { listTimelineLogs } from "./timeline-log.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, listTimelineLogs);

export default router;
