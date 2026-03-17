const { OAuth2Client } = require("google-auth-library");
const supabase = require("../../config/supabase");
const { signToken } = require("../../utils/jwt");
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = require("../../config/env");

// ── Google ────────────────────────────────────────────────────────────────────

const loginWithGoogle = async (code) => {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

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

  const token = signToken({ user_id: user.id, role: "warga" });

  return { token, user };
};

// ── Me ────────────────────────────────────────────────────────────────────────

const getMe = async (decoded) => {
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

module.exports = { loginWithGoogle, getMe };
