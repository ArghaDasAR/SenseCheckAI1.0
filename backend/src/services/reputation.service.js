// ─── Module E: Reputation & Threat Check Service ─────────────────────────────
// Checks URLs via VirusTotal + Google Safe Browsing
// Checks UPI IDs against our local ThreatBlocklist
// All results are cached in Redis to avoid re-hitting APIs

const axios = require('axios');
const prisma = require('../config/db');
const { cacheGet, cacheSet } = require('../config/redis');

const URL_CACHE_TTL = 60 * 60; // 1 hour
const UPI_CACHE_TTL = 30 * 60; // 30 minutes

// ─── URL Reputation ───────────────────────────────────────────────────────────

/**
 * Check an array of URLs for maliciousness.
 * Returns a map: { url -> { safe: bool, source: string, details: string } }
 */
exports.checkURLs = async (urls) => {
  if (!urls || urls.length === 0) return {};

  const results = {};
  await Promise.all(urls.map(url => checkSingleURL(url).then(r => { results[url] = r; })));
  return results;
};

async function checkSingleURL(url) {
  const cacheKey = `url:rep:${Buffer.from(url).toString('base64').slice(0, 80)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  let result = { safe: true, source: 'unknown', details: 'Not checked', malicious: false };

  // 1. Local blocklist check (fast, free)
  try {
    const domain = new URL(url).hostname.toLowerCase();
    const blocked = await prisma.threatBlocklist.findFirst({
      where: {
        OR: [
          { type: 'url', value: url.toLowerCase() },
          { type: 'domain', value: domain },
        ],
      },
    });

    if (blocked) {
      result = {
        safe: false,
        malicious: true,
        source: 'sensecheck-ai_blocklist',
        details: `Reported ${blocked.reportedCount} time(s) by the community`,
        reportedCount: blocked.reportedCount,
      };
      await cacheSet(cacheKey, result, UPI_CACHE_TTL);
      return result;
    }
  } catch { /* DB unavailable — continue */ }

  // 2. Google Safe Browsing
  if (process.env.GOOGLE_SAFE_BROWSING_API_KEY) {
    try {
      const sbResult = await checkGoogleSafeBrowsing(url);
      if (sbResult.malicious) {
        result = sbResult;
        await cacheSet(cacheKey, result, URL_CACHE_TTL);
        return result;
      }
    } catch (err) {
      console.warn('[SafeBrowsing] Error:', err.message);
    }
  }

  // 3. VirusTotal
  if (process.env.VIRUSTOTAL_API_KEY) {
    try {
      const vtResult = await checkVirusTotal(url);
      result = vtResult;
    } catch (err) {
      console.warn('[VirusTotal] Error:', err.message);
    }
  }

  await cacheSet(cacheKey, result, URL_CACHE_TTL);
  return result;
}

async function checkGoogleSafeBrowsing(url) {
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_API_KEY}`;
  const body = {
    client: { clientId: 'sensecheck-ai', clientVersion: '2.0' },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }],
    },
  };

  const res = await axios.post(endpoint, body, { timeout: 5000 });
  const matches = res.data?.matches || [];

  if (matches.length > 0) {
    return {
      safe: false,
      malicious: true,
      source: 'google_safe_browsing',
      details: `Flagged as: ${matches.map(m => m.threatType).join(', ')}`,
      threatTypes: matches.map(m => m.threatType),
    };
  }

  return { safe: true, malicious: false, source: 'google_safe_browsing', details: 'No threats found' };
}

async function checkVirusTotal(url) {
  const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');

  // First try a GET for existing analysis
  try {
    const res = await axios.get(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY },
      timeout: 8000,
    });

    const stats = res.data?.data?.attributes?.last_analysis_stats || {};
    const maliciousCount = (stats.malicious || 0) + (stats.suspicious || 0);
    const totalEngines = Object.values(stats).reduce((a, b) => a + b, 0);

    return {
      safe: maliciousCount === 0,
      malicious: maliciousCount > 2,
      source: 'virustotal',
      details: `${maliciousCount}/${totalEngines} engines flagged`,
      maliciousCount,
      totalEngines,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      // URL not in VT database — submit for scanning
      try {
        await axios.post('https://www.virustotal.com/api/v3/urls',
          new URLSearchParams({ url }),
          { headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY }, timeout: 5000 }
        );
      } catch { /* submission failed — non-critical */ }
    }
    return { safe: true, malicious: false, source: 'virustotal', details: 'Not in database' };
  }
}

// ─── UPI ID Reputation ────────────────────────────────────────────────────────

/**
 * Check an array of UPI IDs against our blocklist.
 * Returns a map: { upiId -> { flagged: bool, reportedCount: int } }
 */
exports.checkUPIIds = async (upiIds) => {
  if (!upiIds || upiIds.length === 0) return {};

  const results = {};
  await Promise.all(upiIds.map(async (upiId) => {
    results[upiId] = await checkSingleUPI(upiId);
  }));
  return results;
};

async function checkSingleUPI(upiId) {
  const normalised = upiId.toLowerCase().trim();
  const cacheKey = `upi:rep:${normalised}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const blocked = await prisma.threatBlocklist.findFirst({
      where: { type: 'upi', value: normalised },
    });

    const result = blocked
      ? { flagged: true, reportedCount: blocked.reportedCount, verified: blocked.verified, source: blocked.source }
      : { flagged: false, reportedCount: 0 };

    await cacheSet(cacheKey, result, UPI_CACHE_TTL);
    return result;
  } catch {
    return { flagged: false, reportedCount: 0 };
  }
}

/**
 * Quick heuristic UPI risk check (no DB needed)
 * Returns risk description string or null
 */
exports.upiHeuristicCheck = (upiId) => {
  if (!upiId) return null;
  const lower = upiId.toLowerCase();

  // Suspiciously generic names
  if (/^(help|support|pay|refund|cashback|prize|winner|lucky)\d*@/.test(lower)) {
    return 'Generic high-risk UPI prefix (support/help/refund/cashback)';
  }
  // Known scam VPAs
  if (/ybl|paytm|okaxis/.test(lower) && /scam|fraud|fake/.test(lower)) {
    return 'Known scam-pattern VPA';
  }
  return null;
};
