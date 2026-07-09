export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Uploaded file is too large.' });
  }

  if (error.message?.startsWith('Unsupported file type')) {
    return res.status(415).json({ message: error.message });
  }

  const status = error.status || 500;
  const message = status === 500 ? 'Unexpected server error.' : error.message;

  if (status === 500) {
    console.error(error);
  }

  res.status(status).json({ message });
}
