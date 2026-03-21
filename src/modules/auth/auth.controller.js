import { getGoogleAuthUrl, handleGoogleCallback, getMe } from "./auth.service.js";
import { success, error } from "../../utils/response.js";
import { FRONTEND_URL } from "../../config/env.js";

export const getGoogleUrl = (req, res, next) => {
  try {
    const url = getGoogleAuthUrl();
    return res.json({ url });
  } catch (err) {
    next(err);
  }
};

export const googleCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code)
      return error(res, "Missing OAuth code", 400, "MISSING_CODE");

    const access_token = await handleGoogleCallback(code);
    return res.redirect(`${FRONTEND_URL}/sign-in?access_token=${access_token}`);
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  return success(res, { message: "Logged out successfully" });
};

export const me = async (req, res, next) => {
  try {
    const data = await getMe(req.user);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};
