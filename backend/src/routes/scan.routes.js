// ─── Scan Routes (v2 — Async Pipeline) ───────────────────────────────────────

const express = require('express');
const multer = require('multer');
const router = express.Router();

const scanController = require('../controllers/scan.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadRateLimit, scanRateLimit } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { analyzeSchema, feedbackSchema, historyQuerySchema } = require('../schemas/scan.schema');

// Multer — memory storage, max 10MB, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF images allowed.'));
  },
});

// POST /api/scan/upload — multipart image → Cloudinary (with magic bytes check)
router.post(
  '/upload',
  optionalAuth,
  uploadRateLimit,
  upload.single('image'),
  scanController.uploadImage
);

// POST /api/scan/analyze — submit analysis job
// Returns { scanId, status: "pending" } immediately; frontend polls
router.post(
  '/analyze',
  optionalAuth,
  scanRateLimit,
  validate(analyzeSchema),
  scanController.analyzeContent
);

// GET /api/scan/history — authenticated user's past scans (paginated)
router.get(
  '/history',
  requireAuth,
  validate(historyQuerySchema, 'query'),
  scanController.getHistory
);

// GET /api/scan/:scanId/public — public shareable verdict (no auth, PII stripped)
router.get('/:scanId/public', scanController.getPublicScan);

// PATCH /api/scan/:scanId/share — toggle public sharing (owner only)
router.patch('/:scanId/share', requireAuth, scanController.toggleShare);

// GET /api/scan/:scanId — poll for scan status + full verdict
router.get('/:scanId', optionalAuth, scanController.getScan);

// POST /api/scan/:scanId/feedback — user marks verdict correct/incorrect
router.post(
  '/:scanId/feedback',
  optionalAuth,
  validate(feedbackSchema),
  scanController.submitFeedback
);

module.exports = router;
