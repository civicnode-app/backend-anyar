import { getNonce, loginWithMetaMask, getMe } from "./auth.service.js";
import { success, error } from "../../utils/response.js";

export const getMetaMaskNonce = (req, res, next) => {
  try {
    const { address } = req.query;
    if (!address) return error(res, "Wallet address is required", 400, "MISSING_ADDRESS");
    const nonce = getNonce(address);
    return success(res, { nonce });
  } catch (err) {
    next(err);
  }
};

export const metamaskLogin = async (req, res, next) => {
  try {
    const { wallet_address, signature, nonce } = req.body;
    if (!wallet_address || !signature || !nonce)
      return error(res, "wallet_address, signature, and nonce are required", 400, "MISSING_FIELDS");

    const access_token = await loginWithMetaMask(wallet_address, signature, nonce);
    return success(res, { access_token });
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
