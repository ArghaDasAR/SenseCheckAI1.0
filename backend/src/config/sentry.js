// ─── Sentry Error Tracking Configuration ─────────────────────────────────────

let sentryEnabled = false;

/**
 * Initialize Sentry. No-op if SENTRY_DSN is not set.
 */
function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.log('[Sentry] DSN not set — error tracking disabled');
    return;
  }

  try {
    const Sentry = require('@sentry/node');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration({ app }),
      ],
    });

    sentryEnabled = true;
    console.log('[Sentry] Error tracking enabled ✅');
  } catch (err) {
    console.warn('[Sentry] Failed to initialize:', err.message);
  }
}

/**
 * Capture an exception manually (e.g., from catch blocks).
 */
function captureException(err, context = {}) {
  if (!sentryEnabled) return;
  try {
    const Sentry = require('@sentry/node');
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
      Sentry.captureException(err);
    });
  } catch {}
}

module.exports = { initSentry, captureException };
