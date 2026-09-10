// ─── BullMQ Worker Process ────────────────────────────────────────────────────
// Run separately: node worker.js  (or: npm run worker)
// Processes async scan jobs from the Redis queue

require('dotenv').config();

const { Worker } = require('bullmq');
const { initRedis, getRedis } = require('./src/config/redis');
const { processScanJob } = require('./src/queues/scan.processor');

console.log('🔧  SenseCheck AI Worker starting...');

// Init Redis first
initRedis();

// Give Redis 2 seconds to connect before starting the worker
setTimeout(() => {
  const redis = getRedis();

  if (!redis) {
    console.error('❌  Redis not available. Worker cannot start without Redis.');
    console.error('    Set REDIS_URL in .env and ensure Redis is running.');
    process.exit(1);
  }

  const worker = new Worker(
    'scans',
    async (job) => {
      console.log(`[Worker] Processing job: ${job.id} (scanId: ${job.data.scanId})`);
      return processScanJob(job);
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 3,
      limiter: {
        max: 10,
        duration: 1000, // max 10 jobs/second
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[Worker] ✅ Job ${job.id} completed — verdict: ${result?.verdict} (${result?.riskScore}%)`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Error:', err.message);
  });

  console.log(`✅  Worker listening on queue "scans" (concurrency: ${worker.opts.concurrency})`);
  console.log('    Press Ctrl+C to stop\n');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Worker] Shutting down gracefully...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}, 2000);
