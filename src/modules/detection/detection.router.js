import { Router } from "express";
import { handleDetection } from "./detection.controller.js";
import { authenticateAI } from "../../middlewares/aiAuth.middleware.js";

const router = Router();

router.post("/", authenticateAI, handleDetection);

export default router;
