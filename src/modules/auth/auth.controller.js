const { loginWithGoogle, getMe } = require("./auth.service");
const { success, error } = require("../../utils/response");

const googleLogin = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code)
      return error(res, "Google OAuth code is required", 400, "MISSING_CODE");

    const result = await loginWithGoogle(code);
    return success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  return success(res, { message: "Logged out successfully" });
};

const me = async (req, res, next) => {
  try {
    const data = await getMe(req.user);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { googleLogin, logout, me };
