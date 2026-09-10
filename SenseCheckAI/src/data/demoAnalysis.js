/**
 * demoAnalysis.js — Mock analysis result data
 *
 * This data is used when no real AI backend is connected.
 * Clearly labelled DEMO throughout the UI.
 * Replace with real API response shape when backend is ready.
 */

export const ASSET_TYPES = [
  'QR_CODE',
  'WHATSAPP',
  'SMS',
  'EMAIL',
  'PAYMENT_GATEWAY',
  'KYC_DOCUMENT',
  'SOCIAL_MEDIA',
  'TRANSACTION_SCREENSHOT',
  'UNKNOWN',
]

/** Risk band thresholds (kept for backward compat) */
export const RISK_BANDS = {
  LOW:    { min: 0,  max: 29, label: 'Low Risk',   cls: 'low'    },
  MEDIUM: { min: 30, max: 69, label: 'Suspicious',  cls: 'medium' },
  HIGH:   { min: 70, max: 100, label: 'High Risk',  cls: 'high'   },
}

export function getRiskBand(score) {
  if (score <= 29) return RISK_BANDS.LOW
  if (score <= 69) return RISK_BANDS.MEDIUM
  return RISK_BANDS.HIGH
}

/**
 * getRiskPhrase — Returns a human-friendly verdict phrase instead of a raw number.
 * Used in the results UI so users see language, not scores.
 */
export function getRiskPhrase(score) {
  if (score <= 15) return {
    phrase: 'Verified',
    subtext: 'No threat signals detected. This content appears legitimate.',
    icon: '✓',
    cls: 'verified',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.35)',
  }
  if (score <= 30) return {
    phrase: 'Looks Safe',
    subtext: 'Minor signals found but no significant threats detected.',
    icon: '✓',
    cls: 'looks-safe',
    color: '#86efac',
    glow: 'rgba(134, 239, 172, 0.2)',
  }
  if (score <= 50) return {
    phrase: 'Suspicious',
    subtext: 'Several concerning patterns found. Proceed with caution.',
    icon: '⚠',
    cls: 'suspicious',
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.3)',
  }
  if (score <= 70) return {
    phrase: 'Risky',
    subtext: 'Significant threat indicators present. Do not take action without verification.',
    icon: '⚠',
    cls: 'risky',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.35)',
  }
  if (score <= 85) return {
    phrase: 'Very Risky',
    subtext: 'Strong evidence of deceptive intent. Do not interact with this content.',
    icon: '⛔',
    cls: 'very-risky',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  }
  return {
    phrase: 'Highly Dangerous',
    subtext: 'This is almost certainly a scam. Take immediate protective action.',
    icon: '🚨',
    cls: 'dangerous',
    color: '#dc2626',
    glow: 'rgba(220, 38, 38, 0.5)',
  }
}

/**
 * Simulated analysis result.
 * Shape mirrors what a real model API would return.
 */
export const demoAnalysis = {
  isDemo: true,
  riskScore: 91,
  confidence: 0.94,
  category: 'HIGH_RISK',
  assetType: 'WHATSAPP',
  processingStages: [
    { id: 'receive',    label: 'Receiving visual evidence'        },
    { id: 'optimize',   label: 'Optimising image via Cloudinary'  },
    { id: 'ocr',        label: 'Extracting text (OCR)'            },
    { id: 'patterns',   label: 'Analysing suspicious patterns'    },
    { id: 'indicators', label: 'Checking threat indicators'       },
    { id: 'explain',    label: 'Generating explanation'           },
  ],
  indicators: [
    {
      id: 'urgency',
      title: 'Urgency / Pressure Language',
      severity: 'high',
      confidence: 0.97,
      explanation:
        'The message uses time-pressure language ("act immediately", "within 24 hours") to prevent the recipient from verifying the claim independently.',
      evidence: '"Your account will be permanently suspended in 24 hours unless you verify now."',
    },
    {
      id: 'impersonation',
      title: 'Identity Impersonation',
      severity: 'high',
      confidence: 0.92,
      explanation:
        'The sender display name mimics a known financial institution. The actual sender number does not match official channels.',
      evidence: 'Sender: "HDFC-Bank" — number is a personal mobile, not a short code.',
    },
    {
      id: 'credential-request',
      title: 'Credential / OTP Request',
      severity: 'high',
      confidence: 0.96,
      explanation:
        'Legitimate banks never request OTPs, PIN codes, or passwords over chat messages or SMS. This message requests sensitive credentials.',
      evidence: '"Enter the OTP sent to your registered number to complete verification."',
    },
    {
      id: 'suspicious-link',
      title: 'Suspicious Link',
      severity: 'medium',
      confidence: 0.88,
      explanation:
        'The provided URL does not match the official domain of the claimed sender. It uses a lookalike domain with a slight misspelling.',
      evidence: 'hdfcbankverify-secure.in (not hdfcbank.com)',
    },
    {
      id: 'payment-instruction',
      title: 'Unusual Payment Instruction',
      severity: 'medium',
      confidence: 0.82,
      explanation:
        'The message asks the user to confirm a payment or transfer as part of "account verification", which is not a standard bank procedure.',
      evidence: '"Confirm a ₹1 payment to verify your account identity."',
    },
  ],
  recommendation: {
    summary: 'Do not interact with this message. Treat it as a phishing attempt.',
    actions: [
      'Do not click any link in the message.',
      'Do not share any OTP, password, or PIN.',
      'Verify the sender by calling your bank\'s official number.',
      'Report the message to your telecom provider.',
      'Block the sender number immediately.',
    ],
  },
}

/* ─── SMART RISK SCORING ─────────────────────────────────────────────────── */

/**
 * computeRiskScore — analyses content and returns a risk score 0–97.
 * Text/URL: keyword & pattern analysis.
 * Image: deterministic hash of filename for realistic variation in demo mode.
 *
 * Replace this function's body with a real API call when backend is available.
 */
export function computeRiskScore(inputType, content = '') {
  if (inputType === 'image') {
    // Deterministic hash of filename so same file always → same score
    const name = (content || 'unknown').toLowerCase()
    let h = 0
    for (let i = 0; i < name.length; i++) { h = Math.imul(31, h) + name.charCodeAt(i) | 0 }
    // Realistic demo range: 25–85
    return 25 + (Math.abs(h) % 60)
  }

  if (inputType === 'link') {
    const url = content.toLowerCase()
    let score = 8
    if (!/^https:\/\//i.test(url))                                    score += 28  // no HTTPS
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url))             score += 55  // raw IP address
    if (/\.(xyz|tk|ml|ga|cf|gq|top|click|download|pw)\b/i.test(url)) score += 40  // suspicious TLD
    if (/bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly/i.test(url))           score += 22  // URL shortener
    if (/free|win|prize|cash|lucky|award|claim|earn/i.test(url))       score += 28
    if (/login|secure-|verify|confirm|update-|banking|payment/i.test(url)) score += 20
    if (/\d{6,}/.test(url))                                             score += 10  // lots of numbers
    return Math.min(score, 97)
  }

  // SMS / Email text analysis
  const text = content.toLowerCase()
  let score = 5

  // Critical signals — each adds a large amount
  ;[
    'otp', 'your pin', 'your password', 'act immediately',
    'arrested', 'cyber crime notice', 'aadhar number', 'pan number',
    'account suspended', 'account blocked', 'frozen',
  ].forEach(w => { if (text.includes(w)) score += 18 })

  // High risk signals
  ;[
    'verify now', 'click here', 'click the link', 'urgent', 'immediately',
    'within 24', 'within 48', 'kyc update', 'kyc required', 'expire',
    'verify your account', 'confirm your identity', 'update your details',
    'your account will be', 'access will be',
  ].forEach(w => { if (text.includes(w)) score += 12 })

  // Medium risk signals
  ;[
    'bank', 'account', 'payment', 'transfer', 'free', 'offer', 'winner',
    'prize', 'claim', 'reward', 'lottery', 'congratulations', 'selected', 'lucky',
  ].forEach(w => { if (text.includes(w)) score += 6 })

  if (/https?:\/\//i.test(text))                        score += 12  // URL present
  if (/bit\.ly|tinyurl|goo\.gl/.test(text))             score += 18  // shortened URL
  if (/share your|send your|enter your|provide your/i.test(text)) score += 22
  if (/rbi|reserve bank|income tax|government of india|police|cyber cell/i.test(text)) score += 15

  return Math.min(score, 97)
}

/**
 * buildAnalysisResult — returns a full result object scaled to the computed score.
 * Indicator count and recommendation severity scale with risk level.
 */
export function buildAnalysisResult(score, inputType = 'image') {
  const count =
    score <= 20 ? 0 :
    score <= 40 ? 1 :
    score <= 55 ? 2 :
    score <= 70 ? 3 :
    score <= 85 ? 4 :
    demoAnalysis.indicators.length

  return {
    ...demoAnalysis,
    riskScore: score,
    confidence: Math.min(0.72 + score / 200, 0.98),
    indicators: demoAnalysis.indicators.slice(0, count),
    recommendation: score <= 20
      ? {
          summary: 'This content appears safe. No immediate action required.',
          actions: [
            'No significant threat signals were detected.',
            'Always verify sender identity through official channels.',
            'When in doubt, contact the organisation directly.',
            'Report genuine cyber crimes to cybercrime.gov.in or call 1930.',
          ],
        }
      : demoAnalysis.recommendation,
  }
}
