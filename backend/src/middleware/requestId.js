// ─── Request ID Middleware ────────────────────────────────────────────────────
// Injects a unique UUID on every request for log correlation + tracing

const { v4: uuidv4 } = require('uuid');

const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || uuidv4();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
};

module.exports = requestId;
