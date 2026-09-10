// ─── Scan Controller (v2 — Async Pipeline) ───────────────────────────────────
// Immediately returns scanId + status:"pending"
// BullMQ worker picks up the job and processes in background
// Frontend polls GET /api/scan/:id until status = "completed"

const prisma = require('../config/db');
const uploadService = require('../services/upload.service');
const assetRouter = require('../services/assetRouter.service');
const ocrService = require('../services/ocr.service');
const qrService = require('../services/qr.service');
const reputationService = require('../services/reputation.service');
const scoringService = require('../services/scoring.service');
const verdictService = require('../services/verdict.service');
const { addScanJob } = require('../queues/scan.queue');
const { isRedisAvailable } = require('../config/redis');

// ─── POST /api/scan/upload ────────────────────────────────────────────────────
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });

    const userId = req.user?.id || req.body.userId || null;

    // Magic bytes check + Cloudinary upload
    const uploadResult = await uploadService.uploadToCloudinary(req.file, userId);
    const pipeline = assetRouter.routeFromTags(uploadResult.tags);

    res.status(200).json({
      cloudinaryUrl: uploadResult.transformedUrl,
      originalUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      tags: uploadResult.tags,
      pipeline,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/scan/analyze ───────────────────────────────────────────────────
exports.analyzeContent = async (req, res, next) => {
  try {
    const { cloudinaryUrl, publicId, inputType, content, sender, subject, userCategory } = req.body;
    const userId = req.user?.id || null;

    // Create scan row with status: pending
    const scan = await prisma.scan.create({
      data: {
        userId,
        status: 'pending',
        inputType,
        cloudinaryPublicId: publicId || null,
        cloudinaryUrl: cloudinaryUrl || null,
        // Store raw input summary
        rawOcrText: content ? content.slice(0, 500) : null,
        // Auto-expire after 30 days
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Try async via BullMQ (if Redis available)
    if (isRedisAvailable()) {
      await addScanJob(scan.id, { cloudinaryUrl, publicId, inputType, content, sender, subject, userCategory });

      return res.status(202).json({
        scanId: scan.id,
        status: 'pending',
        message: 'Scan queued. Poll GET /api/scan/' + scan.id + ' for results.',
        pollUrl: `/api/scan/${scan.id}`,
      });
    }

    // Synchronous fallback (no Redis) — run pipeline inline
    res.status(202).json({
      scanId: scan.id,
      status: 'processing',
      message: 'Processing synchronously (Redis not available).',
      pollUrl: `/api/scan/${scan.id}`,
    });

    // Run pipeline after responding (fire-and-forget)
    runSyncPipeline(scan.id, { cloudinaryUrl, publicId, inputType, content, sender, subject, userCategory })
      .catch(err => console.error(`[Sync Pipeline] Failed for ${scan.id}:`, err.message));

  } catch (err) {
    next(err);
  }
};

// ─── Sync Pipeline (fallback when Redis/BullMQ is unavailable) ───────────────
async function runSyncPipeline(scanId, jobData) {
  const { processScanJob } = require('../queues/scan.processor');
  await processScanJob({ data: { scanId, ...jobData }, log: (msg) => console.log(msg) });
}

// ─── GET /api/scan/:scanId ────────────────────────────────────────────────────
exports.getScan = async (req, res, next) => {
  try {
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { entities: { select: { type: true, value: true } } },
    });

    if (!scan) return res.status(404).json({ error: 'Scan not found.' });

    // Access control — only owner or guest scans (no userId)
    if (scan.userId && req.user?.id !== scan.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // If still pending/processing, return status only
    if (scan.status === 'pending' || scan.status === 'processing') {
      return res.json({ scanId: scan.id, status: scan.status, message: 'Analysis in progress…' });
    }

    if (scan.status === 'failed') {
      return res.json({ scanId: scan.id, status: 'failed', message: 'Analysis failed. Please try again.' });
    }

    // Build entity map
    const extracted = { urls: [], upiIds: [], phoneNumbers: [], domains: [], emails: [] };
    for (const e of scan.entities) {
      if (e.type === 'url') extracted.urls.push(e.value);
      else if (e.type === 'upi') extracted.upiIds.push(e.value);
      else if (e.type === 'phone') extracted.phoneNumbers.push(e.value);
      else if (e.type === 'domain') extracted.domains.push(e.value);
      else if (e.type === 'email') extracted.emails.push(e.value);
    }

    res.json({
      scanId: scan.id,
      status: 'completed',
      verdict: scan.verdict,
      riskScore: scan.riskScore,
      severity: scan.severity,
      ruleScore: scan.ruleScore,
      llmScore: scan.llmScore,
      reasons: scan.reasons,
      tactics: scan.tactics,
      recommendations: scan.recommendations,
      urlRisk: scan.urlRisk,
      extractedText: scan.extractedText,
      extracted,
      pipeline: scan.pipelineType,
      inputType: scan.inputType,
      language: scan.language,
      cloudinaryUrl: scan.cloudinaryUrl,
      isPublicShare: scan.isPublicShare,
      createdAt: scan.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/scan/:scanId/public ─────────────────────────────────────────────
exports.getPublicScan = async (req, res, next) => {
  try {
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return res.status(404).json({ error: 'Scan not found.' });
    if (!scan.isPublicShare) return res.status(403).json({ error: 'This scan is not publicly shared.' });
    if (scan.status !== 'completed') return res.json({ scanId: scan.id, status: scan.status });

    // Strip PII — only return verdict, score, reasons, tactics
    res.json({
      scanId: scan.id,
      verdict: scan.verdict,
      riskScore: scan.riskScore,
      severity: scan.severity,
      reasons: scan.reasons,
      tactics: scan.tactics,
      recommendations: scan.recommendations,
      urlRisk: scan.urlRisk,
      inputType: scan.inputType,
      createdAt: scan.createdAt,
      // No cloudinaryUrl, no rawOcrText, no entities — PII stripped
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/scan/:scanId/share ────────────────────────────────────────────
exports.toggleShare = async (req, res, next) => {
  try {
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return res.status(404).json({ error: 'Scan not found.' });
    if (scan.userId !== req.user.id) return res.status(403).json({ error: 'Not your scan.' });

    const updated = await prisma.scan.update({
      where: { id: scanId },
      data: { isPublicShare: !scan.isPublicShare },
      select: { id: true, isPublicShare: true },
    });

    res.json({
      scanId: updated.id,
      isPublicShare: updated.isPublicShare,
      shareUrl: updated.isPublicShare
        ? `${process.env.FRONTEND_URL}/report/${updated.id}/public`
        : null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/scan/history ────────────────────────────────────────────────────
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true, inputType: true, rawOcrText: true, verdict: true,
          severity: true, riskScore: true, cloudinaryUrl: true, status: true, createdAt: true,
        },
      }),
      prisma.scan.count({ where: { userId } }),
    ]);

    res.json({
      scans: scans.map(s => ({
        scanId: s.id,
        type: s.inputType,
        preview: (s.rawOcrText || 'Screenshot analysis').slice(0, 40) + '...',
        verdict: s.verdict,
        severity: s.severity,
        riskScore: s.riskScore,
        thumbnailUrl: s.cloudinaryUrl,
        status: s.status,
        date: s.createdAt,
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/scan/:scanId/feedback ──────────────────────────────────────────
exports.submitFeedback = async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const { userMarkedCorrect, notes } = req.body;

    const feedback = await prisma.scanFeedback.create({
      data: { scanId, userMarkedCorrect, notes: notes?.slice(0, 500) || null },
    });

    res.status(201).json({ message: 'Feedback recorded. Thank you!', feedbackId: feedback.id });
  } catch (err) {
    next(err);
  }
};
