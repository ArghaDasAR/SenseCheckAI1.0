// ─── Auth Zod Schemas ─────────────────────────────────────────────────────────

const { z } = require('zod');

exports.signupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email('Valid email required').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

exports.loginSchema = z.object({
  email: z.string().email('Valid email required').toLowerCase(),
  password: z.string().min(1, 'Password required'),
});

exports.forgotPasswordSchema = z.object({
  email: z.string().email('Valid email required').toLowerCase(),
});

exports.resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

exports.refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});
