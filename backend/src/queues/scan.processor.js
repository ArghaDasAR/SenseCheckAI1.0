// ─── BullMQ Scan Job Processor ────────────────────────────────────────────────
// This is the actual pipeline that runs asynchronously for each scan job

const prisma = require('../config/db');
const uploadService = require('../services/upload.service');
const assetRouter = require('../services/assetRouter.service');
const ocrService = require('../services/ocr.service');
const qrService = require('../services/qr.service');
const reputationService = require('../services/reputation.service');
const scoringService = require('../services/scoring.service');

/**
 * Main processor function — called by BullMQ Worker for each job.
 * @param {import('bullmq').Job} job
 */
async function processScanJob(job) {
  const { scanId, cloudinaryUrl, inputType, content, sender, subject, userCategory } = job.data;

  // Mark as processing
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: 'processing', updatedAt: new Date() },
  });

  try {
    job.log(`[${scanId}] Pipeline started — type: ${inputType}`);

    // ── Step 1: Determine pipeline ─────────────────────────────────────────
    let pipeline = userCategory || assetRouter.routeFromUserCategory(inputType);

    // ── Step 2: OCR + QR decode (screenshot only) ──────────────────────────
    let rawOcrText = content || '';
    let qrPayload = null;
    let detectedLanguage = 'en';

    if (inputType === 'screenshot' && cloudinaryUrl) {
      const ocrUrl = uploadService.buildOcrUrl(cloudinaryUrl);

      job.log(`[${scanId}] Running QR decode`);
      try {
        qrPayload = await qrService.decodeQR(ocrUrl);
        if (qrPayload) pipeline = 'qr';
      } catch { /* Not a QR */ }

      job.log(`[${scanId}] Running OCR`);
      try {
        const ocrResult = await ocrService.extractText(ocrUrl);
        rawOcrText = ocrResult.text;
        detectedLanguage = ocrResult.language || 'en';
      } catch (err) {
        job.log(`[${scanId}] OCR failed: ${err.message}`);
        rawOcrText = '';
      }
    }

    // ── Step 3: Entity extraction ──────────────────────────────────────────
    const fullText = [rawOcrText, content, qrPayload, sender, subject]
      .filter(Boolean).join('\n');

    const entities = ocrService.extractEntities(fullText);

    if (qrPayload) {
      const upiData = qrService.parseUPIIntent(qrPayload);
      if (upiData.upiId) entities.upiIds.push(upiData.upiId);
    }

    // ── Step 4: Reputation checks (parallel) ──────────────────────────────
    job.log(`[${scanId}] Checking reputation for ${entities.urls.length} URLs, ${entities.upiIds.length} UPI IDs`);
    const [urlRep, upiRep] = await Promise.allSettled([
      reputationService.checkURLs(entities.urls),
      reputationService.checkUPIIds(entities.upiIds),
    ]);

    // ── Step 5: Scam scoring ───────────────────────────────────────────────
    job.log(`[${scanId}] Running scoring engine`);
    const scoringInput = {
      inputType, pipeline, rawText: fullText, entities,
      sender: sender || '', subject: subject || '',
      urlReputations: urlRep.status === 'fulfilled' ? urlRep.value : {},
      upiFlags: upiRep.status === 'fulfilled' ? upiRep.value : {},
      qrPayload,
    };

    const verdict = await scoringService.score(scoringInput);

    // ── Step 6: Persist entity rows ───────────────────────────────────────
    const entityRows = [
      ...entities.urls.map(v => ({ scanId, type: 'url', value: v.slice(0, 500) })),
      ...entities.upiIds.map(v => ({ scanId, type: 'upi', value: v.toLowerCase() })),
      ...entities.phoneNumbers.map(v => ({ scanId, type: 'phone', value: v })),
      ...entities.senderDomains.map(v => ({ scanId, type: 'domain', value: v.toLowerCase() })),
      ...entities.emails.map(v => ({ scanId, type: 'email', value: v.toLowerCase() })),
    ];

    // ── Step 7: Update scan to completed ──────────────────────────────────
    await prisma.$transaction([
      prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'completed',
          pipelineType: pipeline,
          language: detectedLanguage,
          rawOcrText: rawOcrText || null,
          extractedText: (rawOcrText || content || '').slice(0, 500),
          verdict: verdict.verdict,
          severity: verdict.severity,
          riskScore: verdict.riskScore,
          ruleScore: verdict.ruleScore,
          llmScore: verdict.llmScore,
          reasons: verdict.reasons,
          tactics: verdict.tactics,
          recommendations: verdict.recommendations,
          urlRisk: verdict.urlRisk,
          updatedAt: new Date(),
        },
      }),
      ...(entityRows.length > 0 ? [
        prisma.scanEntity.createMany({ data: entityRows, skipDuplicates: true }),
      ] : []),
    ]);

    job.log(`[${scanId}] ✅ Completed — verdict: ${verdict.verdict} (${verdict.riskScore}%)`);
    return { scanId, verdict: verdict.verdict, riskScore: verdict.riskScore };

  } catch (err) {
    // Mark as failed
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'failed', updatedAt: new Date() },
    }).catch(() => {});
    throw err; // Let BullMQ handle retries
  }
}

module.exports = { processScanJob };
