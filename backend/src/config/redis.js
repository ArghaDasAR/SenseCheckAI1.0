// ─── Redis + BullMQ Configuration ────────────────────────────────────────────

const { Redis } = require('ioredis');
const { Queue } = require('bullmq');

let redis = null;
let scanQueue = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection.
 * Fails gracefully — if Redis is unavailable, the app runs in sync fallback mode.
 */
function initRedis() {
  if (!process.env.REDIS_URL) {
    console.warn('[Redis] REDIS_URL not set — running in sync fallback mode (no job queue)');
    return;
  }

  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    isRedisAvailable = true;
    console.log('[Redis] Connected ✅');
  });

  redis.on('error', (err) => {
    if (isRedisAvailable) {
      console.warn('[Redis] Connection lost — falling back to sync mode:', err.message);
    }
    isRedisAvailable = false;
  });

  redis.connect().catch(() => {
    console.warn('[Redis] Could not connect — running in sync fallback mode');
  });

  // BullMQ scan queue
  scanQueue = new Queue('scans', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
}

/**
 * Add a scan job to the queue.
 * @param {string} scanId
 * @param {object} payload
 */
async function addScanJob(scanId, payload) {
  if (!scanQueue || !isRedisAvailable) {
    return null; // Caller handles sync fallback
  }
  return scanQueue.add(`scan:${scanId}`, { scanId, ...payload }, {
    jobId: scanId,
    priority: 1,
  });
}

/**
 * Get a cached value from Redis.
 * Returns null if Redis is unavailable or key doesn't exist.
 */
async function cacheGet(key) {
  if (!redis || !isRedisAvailable) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Set a value in Redis cache with TTL (seconds).
 */
async function cacheSet(key, value, ttlSeconds = 3600) {
  if (!redis || !isRedisAvailable) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache write failure is non-critical
  }
}

/**
 * Delete a key from cache.
 */
async function cacheDel(key) {
  if (!redis || !isRedisAvailable) return;
  try {
    await redis.del(key);
  } catch {}
}

module.exports = {
  initRedis,
  getRedis: () => redis,
  getScanQueue: () => scanQueue,
  isRedisAvailable: () => isRedisAvailable,
  addScanJob,
  cacheGet,
  cacheSet,
  cacheDel,
};
