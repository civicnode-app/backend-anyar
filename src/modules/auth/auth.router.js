const { Router } = require("express");
const {
  getGoogleUrl,
  googleCallback,
  logout,
  me,
} = require("./auth.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = Router();

router.get("/google", getGoogleUrl);
router.get("/google/callback", googleCallback);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

module.exports = router;
