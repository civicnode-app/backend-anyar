import { OAuth2Client } from "google-auth-library";
import { ethers } from "ethers";
import supabase from "../../config/supabase.js";
import { signToken } from "../../utils/jwt.js";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  BACKEND_URL,
} from "../../config/env.js";

const CALLBACK_URL = `${BACKEND_URL}/api/auth/google/callback`;

// ── Google ────────────────────────────────────────────────────────────────────

export const getGoogleAuthUrl = () => {
  const client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    CALLBACK_URL,
  );
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["email", "profile"],
  });
};

export const handleGoogleCallback = async (code) => {
  const client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    CALLBACK_URL,
  );

  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });

  const { email, name, picture } = ticket.getPayload();

  const { data: user, error } = await supabase
    .from("users")
    .upsert(
      { email, full_name: name, avatar_url: picture },
      { onConflict: "email" },
    )
    .select()
    .single();

  if (error) throw error;

  return signToken({ user_id: user.id, email, role: "warga" });
};

// ── MetaMask ──────────────────────────────────────────────────────────────────

const nonceStore = new Map(); // wallet_address → { nonce, expiresAt }

export const getNonce = (wallet_address) => {
  const nonce = `CivicNode sign-in: ${crypto.randomUUID()}`;
  nonceStore.set(wallet_address.toLowerCase(), {
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 menit
  });
  return nonce;
};

export const loginWithMetaMask = async (wallet_address, signature, nonce) => {
  const key = wallet_address.toLowerCase();
  const stored = nonceStore.get(key);

  if (!stored)
    throw {
      status: 401,
      message: "Nonce not found, request nonce again",
      code: "INVALID_NONCE",
    };
  if (Date.now() > stored.expiresAt) {
    nonceStore.delete(key);
    throw {
      status: 401,
      message: "Nonce expired, request nonce again",
      code: "NONCE_EXPIRED",
    };
  }
  if (stored.nonce !== nonce)
    throw { status: 401, message: "Invalid nonce", code: "INVALID_NONCE" };

  const recovered = ethers.verifyMessage(nonce, signature);
  if (recovered.toLowerCase() !== key)
    throw {
      status: 401,
      message: "Invalid signature",
      code: "INVALID_SIGNATURE",
    };

  nonceStore.delete(key); // nonce sekali pakai

  const { data: staff, error } = await supabase
    .from("staff")
    .select()
    .ilike("wallet_address", wallet_address)
    .single();

  if (error || !staff)
    throw {
      status: 401,
      message: "Wallet not registered as staff",
      code: "UNAUTHORIZED",
    };

  return signToken({ staff_id: staff.id, wallet_address, role: staff.role });
};

// ── Me ────────────────────────────────────────────────────────────────────────

export const getMe = async (decoded) => {
  if (decoded.role === "warga") {
    const { data, error } = await supabase
      .from("users")
      .select()
      .eq("id", decoded.user_id)
      .single();

    if (error || !data)
      throw { status: 404, message: "User not found", code: "NOT_FOUND" };
    return data;
  }

  const { data, error } = await supabase
    .from("staff")
    .select()
    .eq("id", decoded.staff_id)
    .single();

  if (error || !data)
    throw { status: 404, message: "Staff not found", code: "NOT_FOUND" };
  return data;
};
