// ─── Stats Controller ─────────────────────────────────────────────────────────
// Aggregate dashboard stats, Redis-cached for 5 minutes

const prisma = require('../config/db');
const { cacheGet, cacheSet } = require('../config/redis');

const CACHE_TTL = 5 * 60; // 5 minutes

// ─── GET /api/stats?days=7 ────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(90, parseInt(req.query?.days) || 7));
    const cacheKey = `stats:${days}`;

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      totalScans,
      scansThisPeriod,
      scamsCaught,
      suspiciousCaught,
      safeCaught,
      topPipelines,
      topFlaggedUPIs,
      topFlaggedDomains,
      topFlaggedPhones,
      totalReports,
    ] = await Promise.all([
      // All-time total scans
      prisma.scan.count({ where: { status: 'completed' } }),

      // Scans in the period
      prisma.scan.count({
        where: { createdAt: { gte: since }, status: 'completed' },
      }),

      // SCAM verdicts in period
      prisma.scan.count({
        where: { verdict: 'SCAM', createdAt: { gte: since } },
      }),

      // SUSPICIOUS verdicts in period
      prisma.scan.count({
        where: { verdict: 'SUSPICIOUS', createdAt: { gte: since } },
      }),

      // SAFE verdicts in period
      prisma.scan.count({
        where: { verdict: 'SAFE', createdAt: { gte: since } },
      }),

      // Top pipeline types
      prisma.scan.groupBy({
        by: ['pipelineType'],
        _count: { id: true },
        where: { createdAt: { gte: since }, status: 'completed' },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top flagged UPI IDs
      prisma.scanEntity.groupBy({
        by: ['value'],
        _count: { id: true },
        where: {
          type: 'upi',
          scan: { verdict: 'SCAM', createdAt: { gte: since } },
        },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top flagged domains
      prisma.scanEntity.groupBy({
        by: ['value'],
        _count: { id: true },
        where: {
          type: 'domain',
          scan: { verdict: { in: ['SCAM', 'SUSPICIOUS'] }, createdAt: { gte: since } },
        },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top flagged phone numbers
      prisma.scanEntity.groupBy({
        by: ['value'],
        _count: { id: true },
        where: {
          type: 'phone',
          scan: { verdict: 'SCAM', createdAt: { gte: since } },
        },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Community reports
      prisma.communityReport.count({ where: { createdAt: { gte: since } } }),
    ]);

    const stats = {
      period: `${days}d`,
      totalScans,
      scansThisPeriod,
      scamsCaught,
      suspiciousCaught,
      safeCaught,
      detectionRate: scansThisPeriod > 0
        ? Math.round(((scamsCaught + suspiciousCaught) / scansThisPeriod) * 100)
        : 0,
      topScamType: topPipelines[0]?.pipelineType || 'text_thread',
      topPipelines: topPipelines.map(p => ({
        pipeline: p.pipelineType,
        count: p._count.id,
      })),
      topFlaggedUPIs: topFlaggedUPIs.map(u => ({ value: u.value, count: u._count.id })),
      topFlaggedDomains: topFlaggedDomains.map(d => ({ value: d.value, count: d._count.id })),
      topFlaggedPhones: topFlaggedPhones.map(p => ({ value: p.value, count: p._count.id })),
      communityReports: totalReports,
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    await cacheSet(cacheKey, stats, CACHE_TTL);

    res.json({ ...stats, cached: false });
  } catch (err) {
    next(err);
  }
};
