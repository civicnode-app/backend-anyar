import { verifyToken } from "../utils/jwt.js";
import { error } from "../utils/response.js";

export const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return error(res, "No token provided", 401, "MISSING_TOKEN");

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return error(res, "Invalid or expired token", 401, "INVALID_TOKEN");
  }
};
