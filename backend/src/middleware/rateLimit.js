// ─── Rate Limiting Middleware (v2) ────────────────────────────────────────────

const rateLimit = require('express-rate-limit');

const makeLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    keyGenerator: (req) => req.user?.id || req.ip,
  });

// Auth: 10 attempts per 15 min per IP
const authRateLimit = makeLimit(
  15 * 60 * 1000,
  parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  'Too many authentication attempts. Please wait 15 minutes.'
);

// Upload: 20 uploads per 15 min — Cloudinary quota guard
const uploadRateLimit = makeLimit(
  15 * 60 * 1000,
  parseInt(process.env.UPLOAD_RATE_LIMIT_MAX) || 20,
  'Too many uploads. Please wait a few minutes before trying again.'
);

// Scan/Analyze: 10 per minute — OCR + LLM are expensive
const scanRateLimit = makeLimit(
  60 * 1000,
  parseInt(process.env.SCAN_RATE_LIMIT_MAX) || 10,
  'Scan rate limit exceeded. Please wait a moment.'
);

// Community report: 5 per hour per IP — prevent blocklist spam
const reportRateLimit = makeLimit(
  60 * 60 * 1000,
  parseInt(process.env.REPORT_RATE_LIMIT_MAX) || 5,
  'Too many reports submitted. Please wait an hour before submitting more.'
);

module.exports = { authRateLimit, uploadRateLimit, scanRateLimit, reportRateLimit };
