import { getTimelineLogs } from "./timeline-log.service.js";
import { success, error } from "../../utils/response.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const listTimelineLogs = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);

    if (from && isNaN(new Date(from).getTime())) {
      return error(res, "Format from tidak valid", 400, "INVALID_FROM");
    }
    if (to && isNaN(new Date(to).getTime())) {
      return error(res, "Format to tidak valid", 400, "INVALID_TO");
    }

    const data = await getTimelineLogs({ from, to, limit });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};
