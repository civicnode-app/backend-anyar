import { Router } from "express";
import { list, detail, create, update, remove } from "./staff.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.get("/",      authenticate, requireRole("admin", "owner"), list);
router.get("/:id",   authenticate, requireRole("admin", "owner"), detail);
router.post("/",     authenticate, requireRole("owner"),          create);
router.patch("/:id", authenticate, requireRole("owner"),          update);
router.delete("/:id",authenticate, requireRole("owner"),          remove);

export default router;
