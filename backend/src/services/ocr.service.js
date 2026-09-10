// ─── Module C: OCR & Entity Extraction Service (v2 — multi-language) ─────────

const axios = require('axios');

// Languages most common in Indian scam messages
// Google Vision supports all; Tesseract needs lang packs
const INDIA_LANGUAGES = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa'];

// ─── Text Extraction ──────────────────────────────────────────────────────────

/**
 * Extract text from image URL.
 * Returns { text: string, language: string }
 * Tries Google Vision first (multi-language), falls back to Tesseract.
 */
exports.extractText = async (imageUrl) => {
  if (process.env.GOOGLE_VISION_API_KEY) {
    try {
      return await extractWithGoogleVision(imageUrl);
    } catch (err) {
      console.warn('[OCR] Google Vision failed, trying Tesseract:', err.message);
    }
  }
  return extractWithTesseract(imageUrl);
};

async function extractWithGoogleVision(imageUrl) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`;

  const body = {
    requests: [
      {
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
        imageContext: {
          // Explicitly hint all major Indian languages + English for better accuracy
          languageHints: INDIA_LANGUAGES,
        },
      },
    ],
  };

  const response = await axios.post(url, body, { timeout: 15000 });
  const annotation = response.data.responses?.[0];

  if (annotation?.error) throw new Error(annotation.error.message);

  const fullText = annotation?.fullTextAnnotation?.text || '';
  // Detect dominant language from Vision's page annotations
  const pages = annotation?.fullTextAnnotation?.pages || [];
  const detectedLangs = pages.flatMap(p => p.property?.detectedLanguages || []);
  const topLang = detectedLangs.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  const language = topLang?.languageCode || 'en';

  return { text: fullText.trim(), language };
}

async function extractWithTesseract(imageUrl) {
  try {
    const Tesseract = require('tesseract.js');
    // Multi-language: English + Hindi + Bengali
    const { data } = await Tesseract.recognize(imageUrl, 'eng+hin+ben', {
      logger: () => {},
      cachePath: './tesseract-cache',
    });
    return { text: data.text.trim(), language: data.data?.lang_string || 'en' };
  } catch (err) {
    console.error('[OCR] Tesseract failed:', err.message);
    return { text: '', language: 'en' };
  }
}

// ─── Entity Extraction ────────────────────────────────────────────────────────

/**
 * Extract structured entities from raw text.
 * @param {string} text
 * @returns {{ urls, upiIds, phoneNumbers, amounts, emails, senderDomains }}
 */
exports.extractEntities = (text) => {
  if (!text || typeof text !== 'string') {
    return { urls: [], upiIds: [], phoneNumbers: [], amounts: [], emails: [], senderDomains: [] };
  }

  // URLs
  const urlPattern = /https?:\/\/[^\s"'<>]+/gi;
  const urls = [...new Set((text.match(urlPattern) || []).map(u => u.replace(/[.,;)>]$/, '')))];

  // UPI IDs — comprehensive list of Indian VPAs
  const upiPattern = /[a-zA-Z0-9._-]+@(?:upi|ybl|oksbi|okaxis|okicici|okhdfcbank|paytm|ibl|apl|axl|barodampay|cnrb|eazypay|fbl|icici|idbi|indus|kotak|mobikwik|payzapp|pnb|sbi|unionbankofindia|utib|waave|yesbank|abfspay|airtel|allbank|andb|aubank|axis|bandhan|boi|cbi|centralbank|dbs|dcb|federal|fino|hdfcbank|idfc|idfcfirst|jkbank|kbl|kvb|nsdl|psb|rbl|saraswat|syndbank|tmb|ujjivan|union|united)/gi;
  const upiIds = [...new Set(text.match(upiPattern) || [])];

  // Indian phone numbers: 10 digits starting 6-9, optional +91 prefix
  const phonePattern = /(?:\+91[-\s]?|0)?[6-9]\d{9}/g;
  const phoneNumbers = [...new Set((text.match(phonePattern) || []).map(p => p.replace(/\s|-/g, '')))];

  // Indian monetary amounts
  const amountPattern = /(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d{1,2})?/gi;
  const amounts = [...new Set(text.match(amountPattern) || [])];

  // Email addresses
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set(text.match(emailPattern) || [])];

  // Extract domains from URLs
  const senderDomains = [...new Set(urls.map(url => {
    try { return new URL(url).hostname; } catch { return null; }
  }).filter(Boolean))];

  return { urls, upiIds, phoneNumbers, amounts, emails, senderDomains };
};
