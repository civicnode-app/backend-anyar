import supabase from "../../config/supabase.js";

export const getTimelineLogs = async ({ from, to, limit }) => {
  let query = supabase
    .from("timeline_log")
    .select(`
      id,
      periode_mulai,
      periode_selesai,
      ringkasan,
      total_deteksi,
      created_at,
      cctv:cctv_id ( id, nama, ip_address ),
      zona:zona_id ( id, nama )
    `)
    .order("periode_mulai", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("periode_mulai", from);
  if (to)   query = query.lte("periode_mulai", to);

  const { data, error } = await query;
  if (error) throw error;

  return data;
};
