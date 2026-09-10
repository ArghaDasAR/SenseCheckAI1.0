// ─── BullMQ Scan Queue ────────────────────────────────────────────────────────

const { Queue } = require('bullmq');
const { getRedis } = require('../config/redis');

let _queue = null;

function getScanQueue() {
  if (_queue) return _queue;
  const redis = getRedis();
  if (!redis) return null;

  _queue = new Queue('scans', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
  return _queue;
}

async function addScanJob(scanId, payload) {
  const queue = getScanQueue();
  if (!queue) return null;
  return queue.add(`scan:${scanId}`, { scanId, ...payload }, { jobId: scanId, priority: 1 });
}

module.exports = { getScanQueue, addScanJob };
