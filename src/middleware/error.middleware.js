export const notFound = (req, res) => {
  res.status(404).json({ status: 'error', error: 'Route not found' });
};

export const generalError = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 'error', error: 'Server error' });
};
