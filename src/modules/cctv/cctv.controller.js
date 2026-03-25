import { createCctv, listCctv, listActiveCctv, getCctv, updateCctv, deleteCctv } from "./cctv.service.js";
import { success, error } from "../../utils/response.js";

const REQUIRED_CREATE = ["nama", "zona_id", "jenis_kamera", "stream_url", "ip_address"];

export const create = async (req, res, next) => {
  try {
    const missing = REQUIRED_CREATE.filter((f) => !req.body[f]);
    if (missing.length > 0) {
      return error(res, `Field wajib: ${missing.join(", ")}`, 400, "MISSING_FIELDS");
    }

    const data = await createCctv(req.body);
    return success(res, data, 201);
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const data = await listCctv();
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const listActive = async (req, res, next) => {
  try {
    const data = await listActiveCctv();
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const detail = async (req, res, next) => {
  try {
    const data = await getCctv(req.params.id);
    if (!data) return error(res, "CCTV tidak ditemukan", 404, "NOT_FOUND");
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    if (Object.keys(req.body).length === 0) {
      return error(res, "Tidak ada field yang diupdate", 400, "MISSING_FIELDS");
    }

    const data = await updateCctv(req.params.id, req.body);
    if (!data) return error(res, "CCTV tidak ditemukan", 404, "NOT_FOUND");
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await deleteCctv(req.params.id);
    return success(res, null);
  } catch (err) {
    next(err);
  }
};
