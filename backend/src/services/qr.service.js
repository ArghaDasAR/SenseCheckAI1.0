// ─── Module D: QR Decode Service ─────────────────────────────────────────────
// Decodes QR codes from images and parses UPI intent links

const axios = require('axios');
const Jimp = require('jimp');
const jsQR = require('jsqr');

/**
 * Attempt to decode a QR code from an image URL.
 * Returns the raw QR payload string, or null if not a QR image.
 *
 * @param {string} imageUrl
 * @returns {Promise<string|null>}
 */
exports.decodeQR = async (imageUrl) => {
  try {
    // Fetch and decode image
    const image = await Jimp.read(imageUrl);
    const { data, width, height } = image.bitmap;

    // jsQR expects a Uint8ClampedArray of RGBA pixels
    const uint8 = new Uint8ClampedArray(data);
    const result = jsQR(uint8, width, height, {
      inversionAttempts: 'dontInvert',
    });

    if (result?.data) {
      console.log('[QR] Decoded payload:', result.data.substring(0, 80));
      return result.data;
    }

    return null;
  } catch (err) {
    // Image load failure or not a QR — not an error condition
    console.debug('[QR] Could not decode:', err.message);
    return null;
  }
};

/**
 * Parse a UPI intent URI into structured fields.
 * Format: upi://pay?pa=payee@upi&pn=Name&am=Amount&tn=Note&cu=INR
 *
 * @param {string} payload
 * @returns {{ isUPI: boolean, upiId?: string, payeeName?: string, amount?: string, note?: string, currency?: string, rawUrl?: string }}
 */
exports.parseUPIIntent = (payload) => {
  if (!payload) return { isUPI: false };

  // UPI deep link
  if (payload.toLowerCase().startsWith('upi://')) {
    try {
      // Replace upi:// with https:// for URL parsing
      const parseable = payload.replace(/^upi:\/\//i, 'https://upi/');
      const url = new URL(parseable);
      const params = url.searchParams;

      return {
        isUPI: true,
        upiId: params.get('pa') || null,
        payeeName: params.get('pn') || null,
        amount: params.get('am') || null,
        note: params.get('tn') || null,
        currency: params.get('cu') || 'INR',
        rawUrl: payload,
      };
    } catch {
      // Manual parse fallback
      const pa = payload.match(/[?&]pa=([^&]+)/i)?.[1];
      const pn = payload.match(/[?&]pn=([^&]+)/i)?.[1];
      const am = payload.match(/[?&]am=([^&]+)/i)?.[1];
      return {
        isUPI: true,
        upiId: pa ? decodeURIComponent(pa) : null,
        payeeName: pn ? decodeURIComponent(pn) : null,
        amount: am || null,
        rawUrl: payload,
      };
    }
  }

  // BHIM / PhonePe / GPay shortlink — extract URL if present
  const urlMatch = payload.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return {
      isUPI: false,
      containsUrl: true,
      rawUrl: urlMatch[0],
    };
  }

  return { isUPI: false, rawPayload: payload };
};
