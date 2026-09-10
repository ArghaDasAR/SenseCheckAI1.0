// ─── Module A: Upload & Ingestion Service (v2 — magic bytes validation) ──────

const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Magic byte signatures for allowed image types
// Primary validation — no external dep, works synchronously
const MAGIC_BYTES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, trailingCheck: [0x57, 0x45, 0x42, 0x50] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
];

// file-type v22 is ESM-only — dynamic import for CommonJS compat
async function detectMimeWithFileType(buffer) {
  try {
    const { fileTypeFromBuffer } = await import('file-type');
    const result = await fileTypeFromBuffer(buffer);
    return result?.mime || null;
  } catch {
    return null; // fallback to magic bytes only if import fails
  }
}


/**
 * Validate file buffer by magic bytes + file-type library (dual layer).
 * Prevents disguised executables or scripts uploaded as images.
 * @param {Buffer} buffer
 * @returns {Promise<{ valid: boolean, detectedMime: string|null, error?: string }>}
 */
exports.validateMagicBytes = async (buffer) => {
  if (!buffer || buffer.length < 8) {
    return { valid: false, detectedMime: null, error: 'File buffer too small or empty.' };
  }

  // Layer 1: Manual magic bytes (fast, no deps)
  let magicMime = null;
  for (const sig of MAGIC_BYTES) {
    const match = sig.bytes.every((b, i) => buffer[sig.offset + i] === b);
    if (!match) continue;
    if (sig.mime === 'image/webp' && sig.trailingCheck) {
      if (!sig.trailingCheck.every((b, i) => buffer[8 + i] === b)) continue;
    }
    magicMime = sig.mime;
    break;
  }

  // Layer 2: file-type library secondary confirmation (async, ESM compat)
  const ftMime = await detectMimeWithFileType(buffer);

  const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  // Either layer must confirm it's an allowed image
  const detectedMime = magicMime || ftMime;
  const valid = !!(detectedMime && ALLOWED.includes(detectedMime));

  if (!valid) {
    return {
      valid: false,
      detectedMime,
      error: `File does not appear to be a valid image (detected: ${detectedMime || 'unknown'}). Possible disguised executable.`,
    };
  }

  return { valid: true, detectedMime };
};


/**
 * Upload a file buffer to Cloudinary.
 * Validates magic bytes BEFORE uploading.
 * Returns { url, publicId, tags, transformedUrl }
 */
exports.uploadToCloudinary = async (file, userId = null) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, API_KEY, and API_SECRET.');
  }

  // Magic bytes check
  const magicCheck = exports.validateMagicBytes(file.buffer);
  if (!magicCheck.valid) {
    const err = new Error(magicCheck.error);
    err.statusCode = 415;
    throw err;
  }

  const folder = userId ? `sensecheck-ai/uploads/${userId}` : 'sensecheck-ai/uploads/guest';
  // Auto-expire originals after 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder,
        tags: ['sensecheck-ai'],
        image_metadata: true,
        // invalidate: true, // uncomment if you need CDN cache busting
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else resolve(uploadResult);
      }
    );
    uploadStream.end(file.buffer);
  });

  const transformedUrl = buildOcrUrl(result.secure_url);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    tags: result.tags || [],
    transformedUrl,
    expiresAt,
  };
};

/**
 * Build an OCR-optimised Cloudinary URL.
 * Injects: f_auto, q_auto, e_improve, e_sharpen, e_enhance
 */
function buildOcrUrl(cloudinaryUrl) {
  if (!cloudinaryUrl) return cloudinaryUrl;
  if (cloudinaryUrl.includes('res.cloudinary.com')) {
    return cloudinaryUrl.replace(
      '/upload/',
      '/upload/f_auto,q_auto,e_improve,e_sharpen,e_enhance/'
    );
  }
  return cloudinaryUrl;
}

exports.buildOcrUrl = buildOcrUrl;

exports.deleteAsset = async (publicId) => {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[Cloudinary] Delete failed:', err.message);
  }
};
