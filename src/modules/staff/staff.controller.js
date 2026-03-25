import { listStaff, getStaff, createStaff, updateStaff, deleteStaff } from "./staff.service.js";
import { success, error } from "../../utils/response.js";

export const list = async (req, res, next) => {
  try {
    const data = await listStaff();
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const detail = async (req, res, next) => {
  try {
    const data = await getStaff(req.params.id);
    if (!data) return error(res, "Staff tidak ditemukan", 404, "NOT_FOUND");
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { wallet_address, full_name } = req.body;
    if (!wallet_address || !full_name) {
      return error(res, "wallet_address dan full_name wajib diisi", 400, "MISSING_FIELDS");
    }

    const data = await createStaff({ wallet_address, full_name });
    return success(res, data, 201);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { full_name } = req.body;
    if (!full_name) return error(res, "full_name wajib diisi", 400, "MISSING_FIELDS");

    // Owner tidak boleh mengedit dirinya sendiri via endpoint ini
    if (req.params.id === req.user.staff_id) {
      return error(res, "Gunakan endpoint /api/auth/me untuk mengubah profil sendiri", 400, "SELF_EDIT");
    }

    const data = await updateStaff(req.params.id, { full_name });
    if (!data) return error(res, "Staff tidak ditemukan", 404, "NOT_FOUND");
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    // Owner tidak boleh menghapus dirinya sendiri
    if (req.params.id === req.user.staff_id) {
      return error(res, "Tidak bisa menghapus akun sendiri", 400, "SELF_DELETE");
    }

    await deleteStaff(req.params.id);
    return success(res, null);
  } catch (err) {
    next(err);
  }
};
