import { AI_SERVER_SECRET } from "../config/env.js";
import { error } from "../utils/response.js";

export const authenticateAI = (req, res, next) => {
  const secret = req.headers["x-ai-secret"];
  if (!secret || secret !== AI_SERVER_SECRET) {
    return error(res, "Unauthorized", 401, "INVALID_AI_SECRET");
  }
  next();
};
