// ─── Module B: Asset Router Service ──────────────────────────────────────────
// Maps Cloudinary auto-tags (or user-selected category) → pipeline name

/**
 * Tag-to-pipeline mapping rules.
 * Priority: first match wins.
 */
const PIPELINE_RULES = [
  {
    pipeline: 'qr',
    tags: ['qr code', 'qrcode', 'barcode', 'qr'],
    keywords: ['qr', 'barcode'],
  },
  {
    pipeline: 'email_kyc',
    tags: ['document', 'email', 'letter', 'form', 'kyc', 'aadhaar', 'pan'],
    keywords: ['kyc', 'document', 'notice', 'letter'],
  },
  {
    pipeline: 'payment_page',
    tags: ['payment', 'website', 'browser', 'form', 'login page', 'banking'],
    keywords: ['payment', 'login', 'banking', 'form'],
  },
  {
    pipeline: 'text_thread',
    tags: ['screenshot', 'text', 'chat', 'sms', 'whatsapp', 'messaging', 'mobile', 'phone'],
    keywords: ['chat', 'message', 'sms', 'text'],
  },
];

/**
 * Given an array of Cloudinary tags, return the best matching pipeline name.
 * Defaults to 'text_thread' if no confident match.
 *
 * @param {string[]} tags - Tags from Cloudinary auto-tagging
 * @returns {'qr' | 'text_thread' | 'payment_page' | 'email_kyc'}
 */
exports.routeFromTags = (tags = []) => {
  const normalizedTags = tags.map(t => t.toLowerCase());

  for (const rule of PIPELINE_RULES) {
    const hasTag = rule.tags.some(tag => normalizedTags.includes(tag));
    const hasKeyword = rule.keywords.some(kw =>
      normalizedTags.some(t => t.includes(kw))
    );
    if (hasTag || hasKeyword) {
      return rule.pipeline;
    }
  }

  // Safe fallback — OCR-first pipeline handles everything
  return 'text_thread';
};

/**
 * Given a user-selected category string, map to pipeline.
 * userCategory comes from the frontend's active tab.
 */
exports.routeFromUserCategory = (category) => {
  const map = {
    screenshot: 'text_thread',
    message: 'text_thread',
    email: 'email_kyc',
    url: 'payment_page',
    qr: 'qr',
  };
  return map[category?.toLowerCase()] || 'text_thread';
};

/**
 * Human-readable label for each pipeline
 */
exports.pipelineLabel = (pipeline) => {
  const labels = {
    qr: 'QR Code / UPI',
    text_thread: 'SMS / Chat Message',
    payment_page: 'Payment Page / URL',
    email_kyc: 'Email / KYC Document',
  };
  return labels[pipeline] || 'Unknown Pipeline';
};
