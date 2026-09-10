// ─── Module G: Verdict Builder Helper ────────────────────────────────────────
// Thin utility — actual verdict logic is in scoring.service.js
// This module handles formatting the final API response shape

/**
 * Shapes the scoring output into the exact JSON the frontend expects.
 * Also handles ephemeral (no-DB) scans for guests.
 */
exports.buildResponse = (scanId, verdict, rawText, content, entities, pipeline) => ({
  scanId,
  verdict: verdict.verdict,
  riskScore: verdict.riskScore,
  severity: verdict.severity,
  reasons: verdict.reasons,
  tactics: verdict.tactics,
  recommendations: verdict.recommendations,
  urlRisk: verdict.urlRisk,
  ruleScore: verdict.ruleScore,
  llmScore: verdict.llmScore,
  // extractedText truncated to 90 chars — matches what Result.jsx displays
  extractedText: (rawText || content || '').slice(0, 90),
  extracted: {
    text: rawText || content || '',
    urls: entities.urls || [],
    upiIds: entities.upiIds || [],
    phoneNumbers: entities.phoneNumbers || [],
    amounts: entities.amounts || [],
  },
  pipeline,
  createdAt: new Date().toISOString(),
});
