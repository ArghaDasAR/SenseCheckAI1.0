// ─── JWT Auth Middleware ──────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');

/**
 * Require a valid JWT. Attaches req.user = { id, email, name }.
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in.' });
  }
};

/**
 * Optional auth — attaches user if token present, but doesn't block if missing.
 * Use for endpoints that work for both guests and authenticated users.
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch {
    // Token invalid — treat as guest
    req.user = null;
  }
  next();
};

module.exports = { requireAuth, optionalAuth };
