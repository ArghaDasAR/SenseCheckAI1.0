// ─── Auth Routes (v2) ─────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
} = require('../schemas/auth.schema');

// POST /api/auth/signup
router.post('/signup', authRateLimit, validate(signupSchema), authController.signup);

// POST /api/auth/login → returns { accessToken, refreshToken, user }
router.post('/login', authRateLimit, validate(loginSchema), authController.login);

// POST /api/auth/refresh → swap refresh token for new access token (rotation)
router.post('/refresh', authRateLimit, validate(refreshSchema), authController.refresh);

// POST /api/auth/logout → revoke refresh token
router.post('/logout', authRateLimit, validate(refreshSchema), authController.logout);

// POST /api/auth/forgot-password → send reset email
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);

// POST /api/auth/reset-password → consume reset token, set new password
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), authController.resetPassword);

// GET /api/auth/me
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
