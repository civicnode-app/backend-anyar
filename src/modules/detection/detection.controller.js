import { processDetection } from "./detection.service.js";
import { success, error } from "../../utils/response.js";

export const handleDetection = (req, res, next) => {
  try {
    const { cctv_id, zona_id, detections, waktu } = req.body;

    if (!cctv_id || !zona_id || !Array.isArray(detections) || !waktu) {
      return error(res, "cctv_id, zona_id, detections, dan waktu wajib diisi", 400, "MISSING_FIELDS");
    }

    const waktuDate = new Date(waktu);
    if (isNaN(waktuDate.getTime())) {
      return error(res, "Format waktu tidak valid", 400, "INVALID_TIMESTAMP");
    }

    const oneMinuteFromNow = new Date(Date.now() + 60 * 1000);
    if (waktuDate > oneMinuteFromNow) {
      return error(res, "Timestamp tidak boleh dari masa depan", 400, "FUTURE_TIMESTAMP");
    }

    for (const item of detections) {
      if (!item.jenis_objek || typeof item.confidence !== "number") {
        return error(
          res,
          "Setiap item detections harus punya jenis_objek (string) dan confidence (number)",
          400,
          "INVALID_DETECTION_ITEM"
        );
      }
    }

    processDetection({ cctv_id, zona_id, detections, waktu: waktuDate });
    return success(res, null);
  } catch (err) {
    next(err);
  }
};
