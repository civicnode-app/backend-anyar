import supabase from "../../config/supabase.js";

export const createZona = async ({ nama, deskripsi }) => {
  const { data, error } = await supabase
    .from("zona")
    .insert({ nama, deskripsi })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const listZona = async () => {
  const { data, error } = await supabase
    .from("zona")
    .select("id, nama, deskripsi, zone_reputation, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

export const getZona = async (id) => {
  const { data, error } = await supabase
    .from("zona")
    .select(`
      id, nama, deskripsi, zone_reputation, created_at,
      cctv ( id, nama, ip_address, jenis_kamera, status, active_detections, confidence_score )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const updateZona = async (id, { nama, deskripsi }) => {
  const fields = {};
  if (nama !== undefined)      fields.nama = nama;
  if (deskripsi !== undefined) fields.deskripsi = deskripsi;

  const { data, error } = await supabase
    .from("zona")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteZona = async (id) => {
  const { count, error: countError } = await supabase
    .from("cctv")
    .select("id", { count: "exact", head: true })
    .eq("zona_id", id);

  if (countError) throw countError;
  if (count > 0) {
    const err = new Error(`Zona tidak bisa dihapus karena masih memiliki ${count} kamera terdaftar.`);
    err.statusCode = 409;
    err.code = "ZONA_HAS_CCTV";
    throw err;
  }

  const { error } = await supabase
    .from("zona")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
