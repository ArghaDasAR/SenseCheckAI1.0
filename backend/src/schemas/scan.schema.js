// ─── Scan Zod Schemas ─────────────────────────────────────────────────────────

const { z } = require('zod');

const INPUT_TYPES = ['screenshot', 'message', 'email', 'url'];
const PIPELINE_TYPES = ['text_thread', 'qr', 'payment_page', 'email_kyc'];

exports.analyzeSchema = z.object({
  cloudinaryUrl: z.string().url().optional(),
  publicId: z.string().optional(),
  inputType: z.enum(INPUT_TYPES, {
    errorMap: () => ({ message: `inputType must be one of: ${INPUT_TYPES.join(', ')}` }),
  }),
  content: z.string().max(10000).optional(),
  sender: z.string().max(500).optional(),
  subject: z.string().max(500).optional(),
  userCategory: z.enum(PIPELINE_TYPES).optional(),
}).refine(
  (data) => {
    if (data.inputType === 'screenshot') return !!data.cloudinaryUrl;
    return !!(data.content && data.content.trim().length > 0);
  },
  {
    message: 'cloudinaryUrl required for screenshots; content required for text/email/url',
    path: ['content'],
  }
);

exports.feedbackSchema = z.object({
  userMarkedCorrect: z.boolean({ required_error: 'userMarkedCorrect (boolean) is required' }),
  notes: z.string().max(500).optional(),
});

exports.reportSchema = z.object({
  type: z.enum(['upi', 'url', 'phone', 'domain'], {
    errorMap: () => ({ message: 'type must be upi, url, phone, or domain' }),
  }),
  value: z.string().min(1).max(500).trim(),
  notes: z.string().max(500).optional(),
});

exports.statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
}).optional();

exports.historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
