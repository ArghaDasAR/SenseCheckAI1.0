// ─────────────────────────────────────────────────────────────────────────────
// SenseCheck AI Backend — Entry Point (v2)
// pino logging, Sentry, Redis, Request IDs, all routes
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const pino = require('pino');

const { initRedis } = require('./src/config/redis');
const { initSentry } = require('./src/config/sentry');

const requestId = require('./src/middleware/requestId');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth.routes');
const scanRoutes = require('./src/routes/scan.routes');
const reportRoutes = require('./src/routes/report.routes');
const statsRoutes = require('./src/routes/stats.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

app.use(pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customSuccessMessage: (req, res) => `${req.method} ${req.url} — ${res.statusCode}`,
}));

// ─── Sentry (must be before routes) ──────────────────────────────────────────
initSentry(app);

// ─── Redis / BullMQ ──────────────────────────────────────────────────────────
initRedis();

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(requestId);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SenseCheck AI API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    integrations: {
      cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name',
      openai: !!process.env.OPENAI_API_KEY,
      googleVision: !!process.env.GOOGLE_VISION_API_KEY,
      virusTotal: !!process.env.VIRUSTOTAL_API_KEY,
      redis: !!process.env.REDIS_URL,
      sentry: !!process.env.SENTRY_DSN,
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/stats', statsRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: `${req.method} ${req.path}` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🛡️  SenseCheck AI API v2 → http://localhost:${PORT}`);
  logger.info(`📋  Health: http://localhost:${PORT}/health`);
  logger.info('⚡  Run worker separately: node worker.js');
});

module.exports = app;
