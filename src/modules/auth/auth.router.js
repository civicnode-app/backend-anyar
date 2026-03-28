import { Router } from "express";
import { getMetaMaskNonce, metamaskLogin, logout, me } from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/nonce", getMetaMaskNonce);
router.post("/metamask", metamaskLogin);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
