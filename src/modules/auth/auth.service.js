import { OAuth2Client } from "google-auth-library";
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
