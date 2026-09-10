// ─── Stats Routes ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const validate = require('../middleware/validate');
const { statsQuerySchema } = require('../schemas/scan.schema');

// GET /api/stats?days=7 — aggregate dashboard stats (Redis-cached, 5min TTL)
router.get('/', validate(statsQuerySchema, 'query'), statsController.getStats);

module.exports = router;
