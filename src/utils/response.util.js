export const success = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ status: 'success', data });
};

export const error = (res, message = 'An error occurred', statusCode = 400) => {
  return res.status(statusCode).json({ status: 'error', error: message });
};
