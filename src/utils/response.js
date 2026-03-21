export const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

export const error = (res, message, statusCode = 400, code = null) => {
  const body = { success: false, message };
  if (code) body.code = code;
  return res.status(statusCode).json(body);
};
