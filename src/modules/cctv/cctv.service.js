import supabase from "../../config/supabase.js";

export const createCctv = async ({ nama, zona_id, jenis_kamera, stream_url, ip_address, latitude, longitude }) => {
  const { data, error } = await supabase
    .from("cctv")
    .insert({ nama, zona_id, jenis_kamera, stream_url, ip_address, latitude, longitude })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const listCctv = async () => {
  const { data, error } = await supabase
    .from("cctv")
    .select("id, nama, zona_id, jenis_kamera, stream_url, ip_address, status, active_detections, confidence_score, created_at, zona(id, nama)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

export const listActiveCctv = async () => {
  const { data, error } = await supabase
    .from("cctv")
    .select("id, nama, zona_id, stream_url, ip_address")
    .eq("status", true);

  if (error) throw error;
  return data;
};

export const getCctv = async (id) => {
  const { data, error } = await supabase
    .from("cctv")
    .select("*, zona(id, nama)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const updateCctv = async (id, fields) => {
  const allowed = ["nama", "zona_id", "jenis_kamera", "stream_url", "ip_address", "latitude", "longitude", "status"];
  const updates = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowed.includes(k) && fields[k] !== undefined)
  );

  const { data, error } = await supabase
    .from("cctv")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCctv = async (id) => {
  const { error } = await supabase
    .from("cctv")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
