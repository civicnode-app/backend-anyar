import supabase from "../../config/supabase.js";

// ------------------------------------------------------------
// In-memory: real-time stats (flush tiap 5 detik ke DB)
// Map<cctv_id, { zona_id, active_detections, confidence_score, zone_reputation, dirty }>
// ------------------------------------------------------------
const statsMap = new Map();

// ------------------------------------------------------------
// In-memory: hourly accumulator (flush tiap jam ke timeline_log)
// Map<cctv_id, { zona_id, counts: { jenis_objek: count }, periodeStart }>
// ------------------------------------------------------------
const accumulator = new Map();

const getCurrentHourStart = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
};

// ------------------------------------------------------------
// processDetection — dipanggil per request dari AI server
// ------------------------------------------------------------
export const processDetection = ({ cctv_id, zona_id, detections }) => {
  // --- Update statsMap ---
  const existing = statsMap.get(cctv_id) ?? { zona_id, zone_reputation: 100 };

  const active_detections = detections.length;
  const confidence_score =
    active_detections > 0
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / active_detections
      : 0;

  // Formula zone_reputation: turun saat ada deteksi, pulih pelan saat bersih
  let zone_reputation = existing.zone_reputation;
  if (active_detections > 0) {
    zone_reputation = Math.max(0, zone_reputation - active_detections * 0.1);
  } else {
    zone_reputation = Math.min(100, zone_reputation + 0.05);
  }

  statsMap.set(cctv_id, { zona_id, active_detections, confidence_score, zone_reputation, dirty: true });

  // --- Update accumulator ---
  if (!accumulator.has(cctv_id)) {
    accumulator.set(cctv_id, { zona_id, counts: {}, periodeStart: getCurrentHourStart() });
  }
  const entry = accumulator.get(cctv_id);
  for (const { jenis_objek } of detections) {
    entry.counts[jenis_objek] = (entry.counts[jenis_objek] ?? 0) + 1;
  }
};

// ------------------------------------------------------------
// flushStats — dipanggil setInterval tiap 5 detik
// ------------------------------------------------------------
export const flushStats = async () => {
  const dirtyEntries = [...statsMap.entries()].filter(([, v]) => v.dirty);
  if (dirtyEntries.length === 0) return;

  for (const [cctv_id, stats] of dirtyEntries) {
    await supabase
      .from("cctv")
      .update({ active_detections: stats.active_detections, confidence_score: stats.confidence_score })
      .eq("id", cctv_id);

    await supabase
      .from("zona")
      .update({ zone_reputation: stats.zone_reputation })
      .eq("id", stats.zona_id);

    stats.dirty = false;
  }
};

// ------------------------------------------------------------
// flushHourlyLog — dipanggil setInterval tiap jam di :00
// ------------------------------------------------------------
export const flushHourlyLog = async () => {
  if (accumulator.size === 0) return;

  const snapshot = new Map(accumulator);
  accumulator.clear();

  const periodeSelesai = new Date();
  periodeSelesai.setMinutes(0, 0, 0);

  for (const [cctv_id, entry] of snapshot.entries()) {
    const total_deteksi = Object.values(entry.counts).reduce((sum, n) => sum + n, 0);
    if (total_deteksi === 0) continue;

    await supabase.from("timeline_log").insert({
      cctv_id,
      zona_id: entry.zona_id,
      periode_mulai: entry.periodeStart.toISOString(),
      periode_selesai: periodeSelesai.toISOString(),
      ringkasan: entry.counts,
      total_deteksi,
    });
  }
};

// ------------------------------------------------------------
// startFlushIntervals — dipanggil sekali saat server start
// ------------------------------------------------------------
export const startFlushIntervals = () => {
  setInterval(flushStats, 5000);

  // Flush hourly tepat di :00 berikutnya, lalu tiap jam
  const now = new Date();
  const msUntilNextHour =
    (60 - now.getMinutes()) * 60 * 1000 -
    now.getSeconds() * 1000 -
    now.getMilliseconds();

  setTimeout(() => {
    flushHourlyLog();
    setInterval(flushHourlyLog, 60 * 60 * 1000);
  }, msUntilNextHour);

  console.log("[detection] Stats flush aktif: tiap 5 detik");
  console.log(`[detection] Hourly log flush aktif: dalam ${Math.round(msUntilNextHour / 1000 / 60)} menit`);
};
