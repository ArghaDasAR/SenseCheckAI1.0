/**
 * cloudinary.js — Cloudinary upload abstraction
 *
 * All Cloudinary logic is isolated here.
 * Swap in real credentials via environment variables.
 *
 * NEVER put Cloudinary API Secret here.
 * Only unsigned upload preset is safe on the frontend.
 *
 * Required .env variables:
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 */

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME   || ''
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''

const UPLOAD_URL = CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  : null

/**
 * Upload a file to Cloudinary using an unsigned upload preset.
 *
 * @param {File} file - The file to upload
 * @param {function(number): void} onProgress - Called with 0-100 progress
 * @returns {Promise<CloudinaryResult>}
 */
export async function uploadToCloudinary(file, onProgress = () => {}) {
  if (!UPLOAD_URL) {
    // No Cloudinary configured — simulate upload for demo mode
    return simulateUpload(file, onProgress)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'sense-check-uploads')
  // Add tags for later AI pipeline routing
  formData.append('tags', detectFileCategory(file.name))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', UPLOAD_URL, true)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText)
        resolve(normaliseResult(result))
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')))
    xhr.timeout = 60_000

    xhr.send(formData)
  })
}

/**
 * Build a Cloudinary delivery URL with optimisation transformations.
 *
 * @param {string} publicId
 * @param {object} opts
 */
export function buildOptimisedUrl(publicId, opts = {}) {
  if (!CLOUD_NAME) return null

  const transforms = [
    'f_auto',       // Automatic format (WebP/AVIF)
    'q_auto',       // Automatic quality
    opts.enhance ? 'e_improve' : null,
    opts.width   ? `w_${opts.width}` : null,
  ].filter(Boolean).join(',')

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Detect rough asset category from filename for pipeline routing.
 * In production, an AI classifier replaces this heuristic.
 */
function detectFileCategory(filename = '') {
  const name = filename.toLowerCase()
  if (/qr/.test(name))                        return 'QR_CODE'
  if (/whatsapp|wa/.test(name))               return 'WHATSAPP'
  if (/sms|text|message/.test(name))          return 'SMS'
  if (/email|mail|phish/.test(name))          return 'EMAIL'
  if (/payment|pay|upi|gpay|phonepe/.test(name)) return 'PAYMENT_GATEWAY'
  if (/kyc|aadhar|pan|passport/.test(name))   return 'KYC_DOCUMENT'
  if (/receipt|transaction|transfer/.test(name)) return 'TRANSACTION_SCREENSHOT'
  return 'UNKNOWN'
}

function normaliseResult(raw) {
  return {
    publicId: raw.public_id,
    url: raw.secure_url,
    width: raw.width,
    height: raw.height,
    format: raw.format,
    bytes: raw.bytes,
    category: detectFileCategory(raw.public_id),
  }
}

/**
 * Simulate a Cloudinary upload for demo mode when no credentials are set.
 * Creates a local object URL to preview the image.
 */
async function simulateUpload(file, onProgress) {
  const totalSteps = 10
  for (let i = 1; i <= totalSteps; i++) {
    await new Promise(r => setTimeout(r, 120))
    onProgress(i * 10)
  }
  const objectUrl = URL.createObjectURL(file)
  return {
    publicId: `demo/${file.name}`,
    url: objectUrl,
    width: null,
    height: null,
    format: file.type.split('/')[1] || 'unknown',
    bytes: file.size,
    category: detectFileCategory(file.name),
    isDemo: true,
  }
}

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
export const MAX_SIZE_BYTES  = 10 * 1024 * 1024  // 10 MB

/**
 * Validate a file before upload.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: `Unsupported format. Please upload PNG, JPG, or WEBP.` }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: `File too large. Maximum size is 10 MB.` }
  }
  return { ok: true }
}
