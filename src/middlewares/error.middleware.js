const { NODE_ENV } = require("../config/env");

const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  const code = err.code || "INTERNAL_ERROR";

  const body = { success: false, message, code };

  if (NODE_ENV === "development") {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
};

module.exports = { errorHandler };
