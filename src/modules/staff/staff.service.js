import supabase from "../../config/supabase.js";

export const listStaff = async () => {
  const { data, error } = await supabase
    .from("staff")
    .select("id, wallet_address, full_name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

export const getStaff = async (id) => {
  const { data, error } = await supabase
    .from("staff")
    .select("id, wallet_address, full_name, role, created_at")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const createStaff = async ({ wallet_address, full_name }) => {
  const { data, error } = await supabase
    .from("staff")
    .insert({ wallet_address: wallet_address.toLowerCase(), full_name, role: "admin" })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateStaff = async (id, { full_name }) => {
  const { data, error } = await supabase
    .from("staff")
    .update({ full_name })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteStaff = async (id) => {
  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
