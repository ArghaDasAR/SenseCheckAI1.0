// ─── Community Report Controller ──────────────────────────────────────────────

const prisma = require('../config/db');

// ─── POST /api/report/scam ────────────────────────────────────────────────────
exports.reportScam = async (req, res, next) => {
  try {
    const { type, value, notes } = req.body;
    const userId = req.user?.id || null;
    const normalizedValue = value.trim().toLowerCase();

    // Create community report
    const [report] = await prisma.$transaction([
      prisma.communityReport.create({
        data: { userId, type, value: normalizedValue, notes: notes || null },
      }),
      // Upsert into threat blocklist — increment count if already known
      prisma.threatBlocklist.upsert({
        where: { value: normalizedValue },
        create: {
          type,
          value: normalizedValue,
          reportedCount: 1,
          source: 'user_report',
          verified: false,
        },
        update: {
          reportedCount: { increment: 1 },
          updatedAt: new Date(),
        },
      }),
    ]);

    res.status(201).json({
      message: 'Thank you! Your report has been submitted and will help protect others.',
      reportId: report.id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/report/blocklist ────────────────────────────────────────────────
exports.getBlocklist = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const type = req.query.type || undefined;

    const where = type ? { type } : {};

    const [items, total] = await Promise.all([
      prisma.threatBlocklist.findMany({
        where,
        orderBy: { reportedCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          value: true,
          reportedCount: true,
          verified: true,
          source: true,
          createdAt: true,
        },
      }),
      prisma.threatBlocklist.count({ where }),
    ]);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
