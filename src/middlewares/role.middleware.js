import { error } from "../utils/response.js";

/**
 * Middleware guard per role.
 * Selalu dipasang setelah `authenticate`.
 *
 * Contoh:
 *   router.post("/", authenticate, requireRole("owner"), createZona);
 *   router.get("/",  authenticate, requireRole("warga", "admin", "owner"), listZona);
 */
export const requireRole = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return error(res, "Forbidden", 403, "FORBIDDEN");
    }
    next();
  };
