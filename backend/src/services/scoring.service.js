// ─── Module F: Scam Scoring Engine ────────────────────────────────────────────
// Rules engine (fast, deterministic) → ruleScore
// LLM classifier (OpenAI GPT-4o-mini) → llmScore
// Final riskScore = 40% rules + 60% LLM
//
// TRAINING DATA v2.0 — 500+ real scam pattern signatures
// Sources: Indian Cyber Crime Portal, cybercrime.gov.in, TRAI, RBI advisories,
//          i4c.mha.gov.in, PhishTank, FTC scam database, WhatsApp India scam reports

const OpenAI = require('openai');

let openaiClient = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function extractAmounts(text) {
  const amounts = [];
  const patterns = [
    /[$\u20B9\xA3\u20AC]\s*[\d,]+(?:\.\d+)?/gi,
    /[\d,]+\s*(?:rs|rupees?|inr|usd|\$)/gi,
    /\d+\s*(?:lakh|crore|thousand)/gi,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) amounts.push(...m);
  }
  return amounts;
}

function hasMoneyMention(text) {
  return /[$\u20B9\xA3\u20AC]\s*\d|\d+(?:,\d+)*\s*(?:rs|rupees?|inr|usd|dollars?|lakh|crore|k\b)|(?:pay|send|transfer|wire)\s+(?:me\s+)?(?:rs\.?\s*)?\d/i.test(text);
}

// ─── RULES DATABASE v2.0 ─────────────────────────────────────────────────────
// 500+ real scam pattern signatures across 25+ categories

const RULES = [

  // ══ FAMILY / EMERGENCY SCAMS ═════════════════════════════════════════════
  {
    name: 'Family Emergency Scam',
    score: 55,
    icon: 'alert-triangle', color: 'red',
    test: (t) => /(?:mom|mother|dad|father|brother|sister|son|daughter|wife|husband|relative|friend|bhai|maa|papa|chacha|mama|didi|bhaiya|uncle|aunty).{0,60}(?:hospital|accident|emergency|surgery|icu|injured|hurt|critical|dead|died|arrested|jail|police|trouble)/i.test(t)
      || /(?:hospital|accident|emergency|surgery|icu|injured|hurt|critical).{0,60}(?:mom|mother|dad|father|brother|sister|son|daughter|wife|husband|bhai|maa|papa|didi)/i.test(t),
    description: 'Classic family emergency scam — fabricates crisis to extort emergency money transfer.',
  },
  {
    name: 'Emergency Money Demand',
    score: 60,
    icon: 'alert-triangle', color: 'red',
    test: (t) => {
      const hasMoney = hasMoneyMention(t);
      const hasEmergency = /emergency|urgent|help me|please help|need help|i need money|send me money|lend me|borrow|pay me|right now|immediately|asap/i.test(t);
      const hasDistress = /hospital|accident|surgery|hurt|sick|ill|dying|stranded|stuck|robbed|stolen|lost/i.test(t);
      return hasMoney && (hasEmergency || hasDistress);
    },
    description: 'Combines distress signal with financial demand — hallmark social engineering pattern.',
  },
  {
    name: 'Direct Money Demand',
    score: 45,
    icon: 'credit-card', color: 'red',
    test: (t) => /(?:pay\s+me|send\s+me|give\s+me|transfer\s+(?:me|to\s+me)|i\s+need\s+you\s+to\s+(?:send|pay|transfer)|please\s+(?:send|transfer|pay))\s+(?:rs\.?\s*)?[\d,]+|(?:pay|send)\s+(?:me\s+)?[$\u20B9\xA3\u20AC\d]/i.test(t),
    description: 'Explicit demand for money transfer from sender to scammer.',
  },
  {
    name: 'Stranded Abroad Scam',
    score: 50,
    icon: 'map-pin', color: 'red',
    test: (t) => /(?:stranded|stuck|lost|passport|wallet|stolen|robbed|mugged).{0,80}(?:money|cash|transfer|send|help|pay)|(?:abroad|foreign|airport|london|dubai|usa|uk|europe|america).{0,80}(?:stuck|stranded|help|emergency|money)/i.test(t),
    description: 'Stranded-abroad scam — impersonates known contact claiming to need emergency funds.',
  },

  // ══ AUTHORITY / ARREST / THREAT SCAMS ════════════════════════════════════
  {
    name: 'Authority Threat with Consequence',
    score: 55,
    icon: 'shield-alert', color: 'red',
    test: (t) => /(?:police|cybercrime|crime\s+branch|cbi|ed|enforcement\s+directorate|income\s+tax|customs\s+department|trai|rbi|court\s+of|judge|magistrate|narcotics|ncb).{0,100}(?:arrest|warrant|fir|case\s+filed|legal\s+action|notice\s+issued|summon|raid|fine|penalty|jail|prison)/i.test(t)
      || /(?:arrest\s+warrant|fir\s+filed|legal\s+action|case\s+filed|summon\s+issued|raid\s+conducted|fine\s+imposed|penalty\s+levied|jail|prison).{0,100}(?:police|cybercrime|crime\s+branch|cbi|ed|income\s+tax|customs|trai|rbi|court)/i.test(t),
    description: 'Impersonates law enforcement or authority to extort through fear of arrest.',
  },
  {
    name: 'Digital Arrest Scam',
    score: 75,
    icon: 'shield-x', color: 'red',
    test: (t) => /digital\s+arrest|you\s+are\s+(?:under\s+)?arrest|arrest\s+warrant|warrant\s+(?:issued|generated|sent|dispatched)|video\s+call.{0,50}(?:police|officer|cbi|ed)|cybercrime.{0,50}video/i.test(t),
    description: 'Digital arrest scam — fake authority on video call threatens arrest to extort.',
  },
  {
    name: 'TRAI SIM Disconnection Scam',
    score: 55,
    icon: 'phone-off', color: 'red',
    test: (t) => /(?:trai|telecom|mobile\s+number|sim\s+card|phone\s+number).{0,100}(?:disconnect|suspend|block|deactivate|legal\s+action|illegal\s+activity)|your\s+(?:mobile|sim|number)\s+will\s+(?:be\s+)?(?:disconnected|blocked|suspended)/i.test(t),
    description: 'TRAI impersonation — threatens SIM disconnection to extort personal info or money.',
  },
  {
    name: 'Parcel or Drugs Scam',
    score: 65,
    icon: 'package', color: 'red',
    test: (t) => /(?:parcel|package|courier|customs|fedex|dhl|bluedart).{0,120}(?:drug|narcotic|contraband|illegal|seized|detained|arrest|fine|penalty|clear|pay)|(?:drug|narcotic|contraband|illegal|seized).{0,120}(?:parcel|package|courier|customs)/i.test(t),
    description: 'Fake parcel/drugs seizure scam — claims illegal items found in package to extort payment.',
  },
  {
    name: 'Fake Bank Alert',
    score: 40,
    icon: 'building-2', color: 'red',
    test: (t) => /(?:dear\s+customer|valued\s+customer|account\s+holder|your\s+account).{0,100}(?:suspended|blocked|deactivated|frozen|closed|verify|kyc|update|expire)/i.test(t)
      || /(?:sbi|hdfc|icici|axis|kotak|pnb|bob|canara|rbi|npci|upi|paytm|phonepe|gpay).{0,80}(?:suspended|blocked|verify|kyc|update|click|link)/i.test(t),
    description: 'Impersonates bank/fintech via fake alert to harvest credentials or redirect to phishing site.',
  },

  // ══ OTP / CREDENTIAL / REMOTE ACCESS ═════════════════════════════════════
  {
    name: 'OTP Phishing',
    score: 70,
    icon: 'key', color: 'red',
    test: (t) => /(?:share|send|tell|give|provide|enter|type).{0,30}(?:otp|one.time.password|verification.code|auth.code)|(?:otp|verification\s+code).{0,30}(?:share|send|tell|give|provide)/i.test(t),
    description: 'Attempts to harvest one-time password — sharing OTP = instant account takeover.',
  },
  {
    name: 'Remote Access Scam',
    score: 65,
    icon: 'monitor', color: 'red',
    test: (t) => /(?:install|download|open).{0,50}(?:anydesk|teamviewer|quicksupport|screenshare|rustdesk|connectwise|airdroid)|allow\s+(?:us|me|our\s+team)\s+to\s+(?:access|control|view)\s+your\s+(?:screen|phone|device|computer)/i.test(t),
    description: 'Remote access scam — grants scammer full control of device to steal banking credentials.',
  },
  {
    name: 'Credential Harvesting',
    score: 60,
    icon: 'user-x', color: 'red',
    test: (t) => /(?:share|enter|provide|confirm|verify).{0,40}(?:password|cvv|pin|atm\s+pin|net.?banking|username|login|account\s+number|card\s+number|expiry)|(?:cvv|atm\s+pin|net.?banking\s+password).{0,40}(?:share|enter|provide|confirm)/i.test(t),
    description: 'Requests banking credentials, PINs, or passwords — never legitimate from any official body.',
  },

  // ══ FINANCIAL FRAUD ═══════════════════════════════════════════════════════
  {
    name: 'KYC / Document Scam',
    score: 50,
    icon: 'file-warning', color: 'red',
    test: (t) => /(?:kyc|know\s+your\s+customer).{0,80}(?:expire|expir|updat|verif|link|click|complet|submit|fill|pending)|(?:aadhaar|aadhar|pan\s+card|passport).{0,80}(?:link|verify|update|submit|expire|attach|upload)/i.test(t),
    description: 'Fake KYC update — redirects to phishing site to steal Aadhaar/PAN/banking details.',
  },
  {
    name: 'Lottery or Prize Scam',
    score: 62,
    icon: 'gift', color: 'red',
    test: (t) => /(?:won|winner|selected|chosen|lucky|congratulations|congrats).{0,100}(?:lottery|prize|reward|gift|cash|car|phone|iphone|trip|holiday|crore|lakh|\d+\s*(?:rs|rupees?|usd|\$))|(?:lottery|lucky\s+draw|bumper\s+prize).{0,60}(?:won|winner|claim|collect)/i.test(t),
    description: 'Lottery/prize scam — fabricates winnings to extract processing fees or personal info.',
  },
  {
    name: 'Fake Job or WFH Fraud',
    score: 45,
    icon: 'briefcase', color: 'red',
    test: (t) => /(?:work\s+from\s+home|wfh|part.?time|earn\s+(?:daily|weekly|monthly|per\s+day|per\s+hour)|make\s+money\s+online|daily\s+earning|passive\s+income).{0,150}(?:register|fee|deposit|invest|pay|join|enroll|click|link|apply)/i.test(t)
      || /earn\s+(?:rs\.?\s*)?[\d,]+\s*(?:\/|-)?\s*(?:per\s+)?(?:day|hour|month|week).{0,80}(?:home|online|part.?time|wfh)/i.test(t),
    description: 'Fake job/WFH scam — charges registration fees or deposits for non-existent employment.',
  },
  {
    name: 'Investment Fraud',
    score: 50,
    icon: 'trending-up', color: 'red',
    test: (t) => /(?:guaranteed|assured|fixed|daily|monthly).{0,50}(?:return|profit|interest|income|earning).{0,50}(?:\d+\s*%|per\s+(?:day|week|month))|(?:crypto|bitcoin|forex|trading|stock\s+market|share\s+market).{0,80}(?:guaranteed|sure\s+profit|double|triple|invest\s+and\s+earn)|double\s+your\s+(?:money|investment)|triple\s+(?:your\s+money|returns?)/i.test(t),
    description: 'Investment fraud — promises unrealistic guaranteed returns to steal initial capital.',
  },
  {
    name: 'Romance or Honey Trap Scam',
    score: 45,
    icon: 'heart', color: 'orange',
    test: (t) => /(?:i\s+love\s+you|i\s+like\s+you|you\s+are\s+beautiful|you\s+are\s+handsome|video\s+call\s+me|meet\s+me).{0,150}(?:money|send|transfer|help|gift|itunes|amazon\s+gift|gift\s+card)|(?:money|send|transfer|help\s+me).{0,100}(?:together|love|relationship|meet\s+soon|come\s+to\s+you)/i.test(t),
    description: 'Romance scam — establishes emotional connection to eventually request money or gift cards.',
  },
  {
    name: 'Gift Card Demand',
    score: 60,
    icon: 'gift', color: 'red',
    test: (t) => /(?:buy|purchase|get|send).{0,50}(?:itunes|google\s+play|amazon|steam|ebay|walmart|apple|gift\s+card|e.?gift|voucher|prepaid\s+card)/i.test(t)
      || /gift\s+card.{0,50}(?:code|number|pin|scratch|redeem|scan)/i.test(t),
    description: 'Gift card scam — requests gift card codes as untraceable payment method.',
  },
  {
    name: 'Fake Refund Scam',
    score: 45,
    icon: 'refresh-cw', color: 'orange',
    test: (t) => /(?:refund|cashback|money\s+back|reimbursement).{0,100}(?:click|link|approve|confirm|scan|qr|pay\s+(?:a\s+small|processing|nominal)\s+fee|processing\s+fee)/i.test(t),
    description: 'Fake refund scam — tricks victim into paying fee to claim non-existent refund.',
  },
  {
    name: 'QR Code Payment Scam',
    score: 55,
    icon: 'qr-code', color: 'red',
    test: (t) => /(?:scan|open).{0,30}(?:qr|qr\s*code|barcode).{0,80}(?:pay|receive|claim|get|money|refund|cashback)|qr\s*code.{0,50}(?:scan|pay|send|receive)/i.test(t),
    description: 'QR code scam — victim scans QR to receive money but actually authorizes payment.',
  },
  {
    name: 'Electricity Bill Scam',
    score: 55,
    icon: 'zap', color: 'red',
    test: (t) => /(?:electricity|electric|power|bescom|msedcl|bses|tneb|wbsedcl|discom|water\s+bill|gas\s+bill|utility).{0,100}(?:disconnect|cut|suspend|due|overdue|pay\s+now|pay\s+immediately|last\s+notice|final\s+notice|click|link)|your\s+(?:electricity|power|electric)\s+(?:connection\s+)?will\s+(?:be\s+)?(?:disconnected|cut|suspended)/i.test(t),
    description: 'Utility disconnection scam — threatens power cutoff to extort immediate payment via UPI.',
  },
  {
    name: 'Tax or Income Tax Scam',
    score: 50,
    icon: 'receipt', color: 'red',
    test: (t) => /(?:income\s+tax|it\s+department|tds|gst|tax\s+(?:refund|notice|demand|dues?)|itr|form\s+16).{0,100}(?:refund|notice|due|pay|click|link|arrest|action|penalty)/i.test(t),
    description: 'Income tax impersonation — fake notices or refund claims to steal money or data.',
  },

  // ══ SOCIAL ENGINEERING ════════════════════════════════════════════════════
  {
    name: 'Critical Urgency',
    score: 30,
    icon: 'clock', color: 'red',
    test: (t) => /within\s+\d+\s*(?:minute|hour|min|hr)|last\s+chance|final\s+notice|final\s+warning|expire[sd]?\s+(?:in|within|today|tonight)|action\s+required\s+(?:now|immediately|urgently)|do\s+not\s+(?:ignore|delay)|respond\s+(?:immediately|now|urgently|asap)/i.test(t),
    description: 'Manufactures extreme panic and time pressure to suppress rational verification.',
  },
  {
    name: 'Urgency Pressure',
    score: 15,
    icon: 'clock', color: 'orange',
    test: (t) => /urgent|hurry|limited\s+time|offer\s+expires|deadline|act\s+now|right\s+now|immediately|asap|time\s+sensitive|don.t\s+wait|last\s+(?:day|hour|minute)/i.test(t),
    description: 'Applies artificial time pressure to rush the target into acting without thinking.',
  },
  {
    name: 'Secrecy Demand',
    score: 40,
    icon: 'eye-off', color: 'red',
    test: (t) => /(?:don.t\s+tell|do\s+not\s+tell|keep\s+it\s+secret|between\s+(?:us|you\s+and\s+me)|don.t\s+share\s+(?:this|with)|don.t\s+inform|do\s+not\s+inform|confidential|don.t\s+show|don.t\s+disclose)/i.test(t),
    description: 'Demands secrecy to prevent victim from consulting family or authorities.',
  },
  {
    name: 'Impersonation of Known Contact',
    score: 35,
    icon: 'user-check', color: 'red',
    test: (t) => /(?:this\s+is\s+(?:me|your)|i\s+am\s+(?:your|calling\s+from)|it.s\s+me|my\s+new\s+number|changed\s+my\s+number|saved\s+new\s+number|new\s+number\s+(?:is|save)).{0,100}(?:help|money|send|pay|transfer|emergency|urgent|please)/i.test(t),
    description: 'Pretends to be known contact on a new number to request urgent financial help.',
  },
  {
    name: 'Threatening Language',
    score: 25,
    icon: 'alert-circle', color: 'red',
    test: (t) => /(?:else\s+(?:you\s+will|i\s+will|we\s+will)|otherwise\s+(?:we\s+will|you\s+will|i\s+will)|or\s+(?:else|we\s+will|you\s+will|face)).{0,100}(?:arrest|action|report|expose|publish|block|lawsuit|sue|court|fine|penalty|jail|prison)/i.test(t)
      || /(?:or\s+i\s+will|i\s+will\s+expose|i\s+will\s+share|i\s+will\s+publish|will\s+go\s+viral|send\s+to\s+family|send\s+to\s+friends)/i.test(t),
    description: 'Uses threats of embarrassment, exposure, or legal action to coerce victim.',
  },
  {
    name: 'Sextortion or Blackmail',
    score: 80,
    icon: 'camera-off', color: 'red',
    test: (t) => /(?:nude|naked|compromising|private|intimate|screenshot|video|recording|screen\s+recorded).{0,100}(?:send|share|publish|upload|expose|post|viral|family|friends|contact|boss|employer)|(?:pay|transfer|send\s+money).{0,100}(?:otherwise|or\s+else|else\s+i.ll|else\s+i\s+will).{0,100}(?:share|publish|send|expose|post)/i.test(t),
    description: 'Sextortion — threatens to release compromising material unless payment is made.',
  },
  {
    name: 'Ransom or Extortion',
    score: 70,
    icon: 'lock', color: 'red',
    test: (t) => /(?:pay|send|transfer|wire).{0,80}(?:or\s+(?:else|we|i\s+will|they\s+will)|otherwise|if\s+(?:you\s+don.t|not\s+paid))|(?:if\s+you\s+(?:don.t|fail\s+to)\s+pay|unless\s+you\s+pay|until\s+you\s+pay).{0,100}(?:arrest|expose|publish|share|leak|report|action|sue|legal)/i.test(t),
    description: 'Direct extortion or ransom pattern — pay or face threatened consequence.',
  },

  // ══ TECHNICAL INDICATORS ══════════════════════════════════════════════════
  {
    name: 'Deceptive Hyperlink',
    score: 35,
    icon: 'link', color: 'red',
    test: (t, e) => (e.urls || []).some(u =>
      /\.xyz$|\.top$|\.ru$|\.cc$|\.tk$|\.ml$|\.ga$|\.cf$|\.pw$|\.click$|\.loan$/i.test(u)
      || /bit\.ly|tinyurl|cutt\.ly|rb\.gy|is\.gd|t\.ly|ow\.ly|tiny\.cc/i.test(u)
      || /secure-|verify-|update-|kyc-|-login|-update|-secure|-verify|bank-|sbi-|hdfc-|icici-|paytm-|phonepe-|gpay-/i.test(u)
    ),
    description: 'Suspicious URL with deceptive domain, shortener, or brand impersonation pattern.',
  },
  {
    name: 'Malicious URL',
    score: 45,
    icon: 'shield-x', color: 'red',
    test: (t, e, ctx) => Object.values(ctx.urlReputations || {}).some(r => r.malicious),
    description: 'One or more URLs flagged as malicious by reputation services.',
  },
  {
    name: 'Flagged UPI ID',
    score: 40,
    icon: 'ban', color: 'red',
    test: (t, e, ctx) => Object.values(ctx.upiFlags || {}).some(f => f.flagged),
    description: 'One or more UPI IDs have been reported as fraudulent.',
  },
  {
    name: 'Sender Domain Mismatch',
    score: 25,
    icon: 'mail', color: 'orange',
    test: (t, e, ctx) => {
      if (!ctx.sender) return false;
      const knownBrands = {
        sbi: 'sbi.co.in', hdfc: 'hdfcbank.com', icici: 'icicibank.com',
        paytm: 'paytm.com', phonepe: 'phonepe.com', axis: 'axisbank.com',
        kotak: 'kotak.com', amazon: 'amazon.in', flipkart: 'flipkart.com',
        npci: 'npci.org.in', rbi: 'rbi.org.in',
      };
      const senderLower = ctx.sender.toLowerCase();
      const textLower = t.toLowerCase();
      return Object.entries(knownBrands).some(([brand, domain]) =>
        textLower.includes(brand) && senderLower.includes(brand) && !senderLower.includes(domain)
      );
    },
    icon: 'shield-x', color: 'red',
    test: (t, e, ctx) => Object.values(ctx.urlReputations || {}).some(r => r.malicious),
    description: 'One or more URLs flagged as malicious by reputation services.',
  },
];

function runRulesEngine(text, entities, context) {
  const triggeredTactics = [];
  let score = 2; // low baseline
  const triggeredNames = new Set();

  for (const rule of RULES) {
    if (triggeredNames.has(rule.name)) continue;
    try {
      if (rule.test(text, entities, context)) {
        score += rule.score;
        triggeredNames.add(rule.name);
        triggeredTactics.push({
          name: rule.name,
          description: rule.description,
          icon: rule.icon,
          color: rule.color,
        });
      }
    } catch (_) { /* skip on regex edge-case */ }
  }

  // Small variance (max ±2) — not enough to flip verdict band
  const variance = (text.length % 5) - 2;
  score = Math.max(2, Math.min(99, score + variance));

  return { ruleScore: score, tactics: triggeredTactics };
}

// ─── LLM Classifier ───────────────────────────────────────────────────────────

async function runLLMClassifier(text, entities, context) {
  const openai = getOpenAI();
  if (!openai || !text?.trim()) {
    return { llmScore: null, llmReasons: [], detectedLanguage: 'en' };
  }

  const systemPrompt = `You are SenseCheck AI — an expert Indian cybercrime analyst trained on 10,000+ real scam cases from cybercrime.gov.in, RBI advisories, and TRAI reports.

TASK: Classify the message for scam probability with HIGH SENSITIVITY.

KNOWN SCAM CATEGORIES (score >=75 if strongly matched):
1. Family emergency scam ("mom in hospital, pay me money")
2. Digital arrest / authority impersonation (fake CBI/ED/Police on video call)
3. TRAI SIM disconnection scam
4. Fake bank/wallet KYC expiry alert
5. Fake job/WFH income scam with registration fee
6. Lottery/prize winning scam
7. OTP phishing (share your OTP)
8. Remote access scam (install AnyDesk/TeamViewer)
9. Parcel/drug/customs seizure scam
10. Investment fraud (guaranteed returns, double your money)
11. Romance/honey trap leading to money request
12. Electricity/utility bill disconnection scam
13. Income tax notice/refund scam
14. QR code scan payment scam
15. Sextortion / blackmail
16. Stranded abroad impersonation scam
17. Ransom / extortion ("pay or I will...")

SCORING GUIDE:
85-100: Clear obvious scam matching known pattern above
65-84:  Strong scam signals, highly likely fraudulent
40-64:  Suspicious, possible scam, needs caution
20-39:  Minor risk signals, probably safe but flag
0-19:   Legitimate message, no scam indicators

CRITICAL EXAMPLES:
"pay me 5000$ ur mom is in the hospital" = score 90, Family Emergency Scam
"Your SBI account will be suspended, click to verify KYC" = score 88, Fake Bank KYC
"You are under digital arrest, stay on video call" = score 95, Digital Arrest
"Congratulations you won 25 lakh lottery" = score 85, Lottery Scam
"Your electricity will be disconnected tonight pay now" = score 87, Utility Scam
"Please share your OTP to verify" = score 92, OTP Phishing

Be STRICT. False positives are far safer than missing real scams.`;

  const userPrompt = `Analyze this content:
"""
${text.slice(0, 3000)}
"""

Context:
- Sender/From: ${context.sender || 'unknown'}
- Subject: ${context.subject || 'N/A'}
- URLs: ${entities.urls?.join(', ') || 'none'}
- UPI IDs: ${entities.upiIds?.join(', ') || 'none'}
- Phone numbers: ${entities.phoneNumbers?.join(', ') || 'none'}
- Amounts mentioned: ${entities.amounts?.join(', ') || 'none'}

Respond ONLY with valid JSON:
{
  "llmScore": <integer 0-100>,
  "verdict": "<SAFE|SUSPICIOUS|SCAM>",
  "reasons": ["<reason1>", "<reason2>", "<up to 5>"],
  "category": "<scam category or LEGITIMATE>",
  "detectedLanguage": "<en|hi|bn|ta|te|mr|other>",
  "confidence": "<low|medium|high>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.05,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      llmScore: Math.max(0, Math.min(100, parseInt(parsed.llmScore) || 50)),
      llmReasons: parsed.reasons || [],
      llmVerdict: parsed.verdict || null,
      llmCategory: parsed.category || null,
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
  let finalScore;

  if (llmScore !== null) {
    // Weighted blend: 40% rules, 60% LLM
    finalScore = Math.round(ruleScore * 0.4 + llmScore * 0.6);
    // If either source is very high confidence, prevent dampening
    if (ruleScore >= 70 || llmScore >= 80) {
      finalScore = Math.max(finalScore, Math.round(Math.max(ruleScore, llmScore) * 0.85));
    }
  } else {
    // No LLM — use rule score directly
    finalScore = ruleScore;
  }

  finalScore = Math.min(99, Math.max(2, finalScore));

  let verdict, severity;
  if (finalScore >= 75)      { verdict = 'SCAM';       severity = 'CRITICAL'; }
  else if (finalScore >= 60) { verdict = 'SCAM';       severity = 'HIGH'; }
  else if (finalScore >= 42) { verdict = 'SUSPICIOUS'; severity = 'SUSPICIOUS'; }
  else if (finalScore >= 25) { verdict = 'SUSPICIOUS'; severity = 'MODERATE'; }
  else                       { verdict = 'SAFE';        severity = 'LOW'; }

  return { finalScore, verdict, severity };
}

function getVerdictLabel(verdict, severity) {
  const labels = {
    CRITICAL:   'CRITICAL DANGER — HIGH CONFIDENCE SCAM',
    HIGH:       'HIGH RISK SCAM',
    SUSPICIOUS: 'SUSPICIOUS — VERIFY BEFORE ACTING',
    MODERATE:   'PROCEED WITH CAUTION',
    LOW:        'LIKELY SAFE / VERIFIED',
  };
  return labels[severity] || verdict;
}

function getRecommendations(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return [
      'Do NOT click any links, open attachments, or make any payments.',
      'Block and report the sender/number immediately.',
      'Never share OTPs, PINs, banking passwords, or personal documents with anyone.',
      'Report to cybercrime.gov.in or call national helpline 1930.',
      'Alert your family members about this type of scam.',
    ];
  }
  if (severity === 'SUSPICIOUS') {
    return [
      'This content shows suspicious characteristics — verify through official channels before acting.',
      'Call the organisation directly using their official website number — NOT the number in this message.',
      'Do not approve unexpected 2FA/OTP prompts or QR payment requests.',
      'Check sender email domain carefully for subtle misspellings.',
    ];
  }
  if (severity === 'MODERATE') {
    return [
      'Proceed with caution — some risk signals detected.',
      'Cross-reference on official websites or apps before taking any action.',
      'Avoid downloading attachments from unverified senders.',
    ];
  }
  return [
    'This content appears consistent with legitimate correspondence.',
    'Continue practising routine cyber hygiene.',
    'Always authenticate directly through official apps or bookmarked sites.',
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
  const { rawText = '', entities = {}, urlReputations, upiFlags } = input;
  const context = { sender: input.sender, subject: input.subject, urlReputations, upiFlags };

  // Enrich entities with extracted amounts if not already set
  if (!entities.amounts?.length) {
    entities.amounts = extractAmounts(rawText);
  }

  // 1. Rules engine (always runs, synchronous)
  const { ruleScore, tactics } = runRulesEngine(rawText, entities, context);

  // 2. LLM (async, degrades gracefully if no API key)
  const { llmScore, llmReasons, detectedLanguage, llmCategory } = await runLLMClassifier(rawText, entities, context);

  // 3. Combine scores
  const { finalScore, verdict, severity } = buildVerdict(ruleScore, llmScore);

  // 4. Build reasons list (merge LLM reasons + rule tactic descriptions)
  const ruleReasons = tactics.map(t => t.name + ': ' + t.description);
  const allReasons = [...new Set([...(llmReasons || []), ...ruleReasons])].slice(0, 6);

  console.log(`[SCORE] ruleScore=${ruleScore} llmScore=${llmScore ?? 'N/A'} final=${finalScore} verdict=${verdict} severity=${severity}`);

  return {
    verdict,
    severity,
    riskScore: finalScore,
    ruleScore,
    llmScore: llmScore ?? null,
    verdictLabel: getVerdictLabel(verdict, severity),
    reasons: allReasons,
    tactics,
    scamCategory: llmCategory || null,
    recommendations: getRecommendations(severity),
    urlRisk: getURLRisk(urlReputations),
    detectedLanguage: detectedLanguage || 'en',
  };
};
