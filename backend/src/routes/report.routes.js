// ─── Community Report Routes ──────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { optionalAuth } = require('../middleware/auth');
const { reportRateLimit } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { reportSchema } = require('../schemas/scan.schema');

// POST /api/report/scam — anyone can report a scam UPI/URL/phone
// Rate-limited to 5/hr per IP to prevent abuse
router.post(
  '/scam',
  optionalAuth,
  reportRateLimit,
  validate(reportSchema),
  reportController.reportScam
);

// GET /api/report/blocklist — public, paginated list of verified threats
router.get('/blocklist', reportController.getBlocklist);

module.exports = router;
