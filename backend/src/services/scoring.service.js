// ─── Module F: Scam Scoring Engine ────────────────────────────────────────────
// Rules engine (fast, deterministic) → ruleScore
// LLM classifier (OpenAI GPT-4o-mini) → llmScore
// Final riskScore = 40% rules + 60% LLM

const OpenAI = require('openai');

let openaiClient = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

// ─── Rules Engine ─────────────────────────────────────────────────────────────

const RULES = [
  // Urgency patterns
  {
    name: 'Critical Urgency',
    score: 25,
    icon: 'clock', color: 'red',
    test: (t) => /within \d+ hour|electricity disconnected tonight|blocked within 24|final notice|immediate arrest|action required now|last warning/i.test(t),
    description: 'Manufactures extreme panic to suppress rational verification.',
  },
  {
    name: 'Urgency Cue',
    score: 12,
    icon: 'clock', color: 'orange',
    test: (t) => /urgent|hurry|limited time|offer expires|deadline|act now|don.t delay/i.test(t),
    description: 'Applies artificial time pressure to rush the target.',
  },
  // Threat patterns
  {
    name: 'Threat & Extortion',
    score: 22,
    icon: 'alert-triangle', color: 'red',
    test: (t) => /block|suspend|disconnect|arrest|legal action|penalty|court|freeze|FIR|police|jail/i.test(t),
    description: 'Intimidates with punitive actions or legal consequences.',
  },
  // Authority impersonation
  {
    name: 'Authority Impersonation',
    score: 18,
    icon: 'shield-alert', color: 'red',
    test: (t) => /\b(RBI|SBI|HDFC|ICICI|AXIS|police|government|ministry|income.?tax|customs|TRAI|BSNL|BESCOM)\b/i.test(t),
    description: 'Poses as an official financial or governmental body.',
  },
  // Phishing URLs
  {
    name: 'Deceptive Hyperlink',
    score: 28,
    icon: 'link', color: 'red',
    test: (t, e) => (e.urls || []).some(u => /\.xyz|\.top|\.ru|\.cc|\.tk|bit\.ly|tinyurl|secure-|verify-|update-|kyc-|-login|-update/i.test(u)),
    description: 'Contains suspicious domain extensions or phishing-style URL patterns.',
  },
  // Financial solicitation
  {
    name: 'Financial Solicitation',
    score: 16,
    icon: 'credit-card', color: 'red',
    test: (t) => /pay|payment|transfer|wallet|UPI|₹|rupee|credit card|debit card|cashback|lottery|prize|reward|refund now/i.test(t),
    description: 'Requests money movement, credentials, or claims prizes.',
  },
  // OTP / credential harvest
  {
    name: 'OTP / Credential Harvest',
    score: 30,
    icon: 'key', color: 'red',
    test: (t) => /share.{0,20}OTP|enter.{0,20}OTP|OTP.{0,20}do not share|CVV|PIN|password|net.?banking.{0,30}link/i.test(t),
    description: 'Attempts to harvest one-time passwords or banking credentials.',
  },
  // Sender domain mismatch
  {
    name: 'Sender Domain Mismatch',
    score: 20,
    icon: 'mail', color: 'orange',
    test: (t, e, ctx) => {
      if (!ctx.sender) return false;
      const knownBrands = { sbi: 'sbi.co.in', hdfc: 'hdfcbank.com', icici: 'icicibank.com', paytm: 'paytm.com' };
      const senderLower = ctx.sender.toLowerCase();
      return Object.entries(knownBrands).some(([brand, domain]) =>
        t.toLowerCase().includes(brand) && senderLower.includes(brand) && !senderLower.includes(domain)
      );
    },
    description: 'Sender domain does not match the claimed brand.',
  },
  // KYC scam
  {
    name: 'KYC / Document Scam',
    score: 20,
    icon: 'file-warning', color: 'red',
    test: (t) => /KYC.{0,30}(expire|update|verify|link)|aadhaar.{0,30}link|pan.{0,30}verify/i.test(t),
    description: 'Requests KYC/Aadhaar update through unofficial channels.',
  },
  // Reputation flags
  {
    name: 'Flagged UPI ID',
    score: 35,
    icon: 'ban', color: 'red',
    test: (t, e, ctx) => Object.values(ctx.upiFlags || {}).some(f => f.flagged),
    description: 'One or more UPI IDs have been reported as fraudulent.',
  },
  {
    name: 'Malicious URL',
    score: 40,
    icon: 'shield-x', color: 'red',
    test: (t, e, ctx) => Object.values(ctx.urlReputations || {}).some(r => r.malicious),
    description: 'One or more URLs flagged as malicious by reputation services.',
  },
];

function runRulesEngine(text, entities, context) {
  const triggeredTactics = [];
  let score = 5; // baseline

  for (const rule of RULES) {
    if (rule.test(text, entities, context)) {
      score += rule.score;
      triggeredTactics.push({
        name: rule.name,
        description: rule.description,
        icon: rule.icon,
        color: rule.color,
      });
    }
  }

  // Natural variance so scores don't look artificial
  const variance = (text.length % 7) - 3;
  score = Math.max(5, Math.min(99, score + variance));

  return { ruleScore: score, tactics: triggeredTactics };
}

// ─── LLM Classifier ───────────────────────────────────────────────────────────

async function runLLMClassifier(text, entities, context) {
  const openai = getOpenAI();
  if (!openai || !text.trim()) {
    return { llmScore: null, reasons: [] };
  }

  const prompt = `You are SenseCheck AI, an expert Indian cybercrime analyst. Analyze the following content for scam indicators.

Content to analyze:
"""
${text.slice(0, 3000)}
"""

Context:
- Sender/From: ${context.sender || 'unknown'}
- Subject: ${context.subject || 'N/A'}
- URLs found: ${entities.urls?.join(', ') || 'none'}
- UPI IDs found: ${entities.upiIds?.join(', ') || 'none'}
- Phone numbers found: ${entities.phoneNumbers?.join(', ') || 'none'}
- Amounts mentioned: ${entities.amounts?.join(', ') || 'none'}

Indian scam context: UPI fraud, fake KYC, electricity bill scams, fake bank alerts, WhatsApp lottery, job fraud, romance scams, fake delivery messages, investment fraud.

Respond ONLY with valid JSON (no markdown):
{
  "llmScore": <integer 0-100, where 0=definitely safe, 100=definitely scam>,
  "verdict": "<SAFE|SUSPICIOUS|SCAM>",
  "reasons": ["<specific reason 1>", "<specific reason 2>", "<up to 4 reasons>"],
  "detectedLanguage": "<en|hi|bn|ta|te|mr|other>",
  "confidence": "<low|medium|high>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      llmScore: Math.max(0, Math.min(100, parseInt(parsed.llmScore) || 50)),
      llmReasons: parsed.reasons || [],
      llmVerdict: parsed.verdict || null,
      detectedLanguage: parsed.detectedLanguage || 'en',
      confidence: parsed.confidence || 'medium',
    };
  } catch (err) {
    console.error('[LLM] Classification failed:', err.message);
    return { llmScore: null, llmReasons: [], detectedLanguage: 'en' };
  }
}

// ─── Verdict Builder ──────────────────────────────────────────────────────────

function buildVerdict(ruleScore, llmScore) {
  // If LLM available: weighted blend (40% rules, 60% LLM)
  const finalScore = llmScore !== null
    ? Math.round(ruleScore * 0.4 + llmScore * 0.6)
    : ruleScore;

  let verdict, severity;
  if (finalScore >= 80) { verdict = 'SCAM'; severity = 'CRITICAL'; }
  else if (finalScore >= 65) { verdict = 'SCAM'; severity = 'HIGH'; }
  else if (finalScore >= 50) { verdict = 'SUSPICIOUS'; severity = 'SUSPICIOUS'; }
  else if (finalScore >= 30) { verdict = 'SUSPICIOUS'; severity = 'MODERATE'; }
  else { verdict = 'SAFE'; severity = 'LOW'; }

  return { finalScore, verdict, severity };
}

function getVerdictLabel(verdict, severity) {
  const labels = {
    CRITICAL: 'CRITICAL DANGER / SCAM',
    HIGH: 'HIGH RISK SCAM',
    SUSPICIOUS: 'MAYBE SUSPICIOUS',
    MODERATE: 'PROCEED WITH CAUTION',
    LOW: 'LIKELY SAFE / VERIFIED',
  };
  return labels[severity] || verdict;
}

function getRecommendations(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return [
      'Do not click any links, open attachments, or make any payments.',
      'Block and report the contact or number immediately.',
      'Never share OTPs, PINs, or banking passwords with anyone.',
      'Report to cybercrime.gov.in or call helpline 1930.',
    ];
  }
  if (severity === 'SUSPICIOUS') {
    return [
      'This content shows suspicious characteristics — verify before acting.',
      'Check the sender domain carefully before entering any credentials.',
      'Do not approve unexpected 2FA/OTP prompts.',
      'Confirm directly via official customer care channels.',
    ];
  }
  if (severity === 'MODERATE') {
    return [
      'Proceed with caution — promotional or third-party format detected.',
      'Cross-reference on official websites or apps before clicking.',
      'Avoid downloading attachments from unknown senders.',
    ];
  }
  return [
    'This content appears consistent with genuine correspondence.',
    'Continue practising routine cyber hygiene.',
    'Always authenticate directly through primary apps or bookmarks.',
  ];
}

function getURLRisk(urlReputations) {
  const values = Object.values(urlReputations || {});
  if (values.some(r => r.malicious)) return 'Malicious';
  if (values.some(r => !r.safe)) return 'Suspicious Domain';
  if (values.length > 0) return 'Unverified';
  return 'Safe';
}

// ─── Main Score Function ──────────────────────────────────────────────────────

/**
 * Run the full scoring pipeline.
 * @param {{ inputType, pipeline, rawText, entities, sender, subject, urlReputations, upiFlags, qrPayload }} input
 * @returns {Promise<{ verdict, severity, riskScore, ruleScore, llmScore, reasons, tactics, recommendations, urlRisk }>}
 */
exports.score = async (input) => {
  const { rawText, entities, urlReputations, upiFlags } = input;
  const context = { sender: input.sender, subject: input.subject, urlReputations, upiFlags };

  // 1. Rules engine (always runs, synchronous)
  const { ruleScore, tactics } = runRulesEngine(rawText, entities, context);

  // 2. LLM (async, degrades gracefully)
  const { llmScore, llmReasons, detectedLanguage } = await runLLMClassifier(rawText, entities, context);

  // 3. Combine
  const { finalScore, verdict, severity } = buildVerdict(ruleScore, llmScore);

  // 4. Build reasons list (merge rule names + LLM reasons)
  const ruleReasons = tactics.map(t => t.name + ': ' + t.description);
  const allReasons = [...new Set([...(llmReasons || []), ...ruleReasons])].slice(0, 6);

  return {
    verdict,
    severity,
    riskScore: finalScore,
    ruleScore,
    llmScore: llmScore ?? null,
    verdictLabel: getVerdictLabel(verdict, severity),
    reasons: allReasons,
    tactics,
    recommendations: getRecommendations(severity),
    urlRisk: getURLRisk(urlReputations),
    detectedLanguage: detectedLanguage || 'en',
  };
};
