function errorHandler(err, req, res, next) {
  // eslint-disable-line
  console.error("❌ Error:", err);

  // Mongoose duplicate key
  if (err && err.code === 11000) {
    return res.status(409).json({ success: false, error: "Duplicate value", details: err.keyValue });
  }

  // Zod validation
  if (err && err.name === "ZodError") {
    return res.status(400).json({ success: false, error: "Validation error", details: err.errors });
  }

  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
}

module.exports = { errorHandler };
