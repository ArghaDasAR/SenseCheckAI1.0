// ─── Cleanup Service ──────────────────────────────────────────────────────────
// Deletes Cloudinary originals after their TTL expires (30 days)
// Run this on a cron schedule: e.g. every day at 2 AM

const prisma = require('../config/db');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

/**
 * Delete Cloudinary assets for scans whose expiresAt has passed.
 * Safe to run repeatedly — already-deleted assets are skipped.
 */
exports.cleanupExpiredScans = async () => {
  if (!isCloudinaryConfigured()) {
    console.log('[Cleanup] Cloudinary not configured — skipping');
    return { deleted: 0, errors: 0 };
  }

  const expiredScans = await prisma.scan.findMany({
    where: {
      expiresAt: { lte: new Date() },
      cloudinaryPublicId: { not: null },
    },
    select: { id: true, cloudinaryPublicId: true },
    take: 100, // process in batches
  });

  let deleted = 0;
  let errors = 0;

  for (const scan of expiredScans) {
    try {
      await cloudinary.uploader.destroy(scan.cloudinaryPublicId, { resource_type: 'image' });
      await prisma.scan.update({
        where: { id: scan.id },
        data: { cloudinaryPublicId: null, cloudinaryUrl: null },
      });
      deleted++;
    } catch (err) {
      console.error(`[Cleanup] Failed to delete ${scan.cloudinaryPublicId}:`, err.message);
      errors++;
    }
  }

  console.log(`[Cleanup] Deleted ${deleted} expired Cloudinary assets, ${errors} errors`);
  return { deleted, errors };
};

/**
 * Revoke expired refresh tokens to keep the table lean.
 */
exports.cleanupExpiredTokens = async () => {
  const result = await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lte: new Date() } }, { revoked: true }] },
  });
  console.log(`[Cleanup] Removed ${result.count} expired/revoked refresh tokens`);
  return result.count;
};
