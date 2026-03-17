const { Router } = require("express");
const { googleLogin, logout, me } = require("./auth.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = Router();

router.post("/google", googleLogin);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

module.exports = router;
