import { createZona, listZona, getZona, updateZona, deleteZona } from "./zona.service.js";
import { success, error } from "../../utils/response.js";

export const create = async (req, res, next) => {
  try {
    const { nama, deskripsi } = req.body;
    if (!nama) return error(res, "nama wajib diisi", 400, "MISSING_FIELDS");

    const data = await createZona({ nama, deskripsi });
    return success(res, data, 201);
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const data = await listZona();
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const detail = async (req, res, next) => {
  try {
    const data = await getZona(req.params.id);
    if (!data) return error(res, "Zona tidak ditemukan", 404, "NOT_FOUND");
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { nama, deskripsi } = req.body;
    if (!nama && deskripsi === undefined) {
      return error(res, "Tidak ada field yang diupdate", 400, "MISSING_FIELDS");
    }

    const data = await updateZona(req.params.id, { nama, deskripsi });
    if (!data) return error(res, "Zona tidak ditemukan", 404, "NOT_FOUND");
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await deleteZona(req.params.id);
    return success(res, null);
  } catch (err) {
    next(err);
  }
};
