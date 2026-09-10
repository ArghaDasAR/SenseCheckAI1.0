// ─── Scoring Engine Unit Tests ────────────────────────────────────────────────

// Mock OpenAI and DB so tests run without API keys
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ llmScore: 85, verdict: 'SCAM', reasons: ['Test LLM reason'], detectedLanguage: 'en', confidence: 'high' }) } }],
        }),
      },
    },
  }));
});

jest.mock('../src/config/db', () => ({ threatBlocklist: { findFirst: jest.fn().mockResolvedValue(null) } }));
jest.mock('../src/config/redis', () => ({ cacheGet: jest.fn().mockResolvedValue(null), cacheSet: jest.fn() }));

const scoringService = require('../src/services/scoring.service');

const mockInput = {
  inputType: 'message',
  pipeline: 'text_thread',
  rawText: 'Your SBI account will be blocked. Update KYC now at kyc-update-sbi.in/verify. Share OTP to verify.',
  entities: {
    urls: ['http://kyc-update-sbi.in/verify'],
    upiIds: [],
    phoneNumbers: [],
    amounts: [],
    emails: [],
    senderDomains: ['kyc-update-sbi.in'],
  },
  sender: 'alerts@sbi-support.xyz',
  subject: 'URGENT: KYC Update Required',
  urlReputations: { 'http://kyc-update-sbi.in/verify': { malicious: true, source: 'virustotal', details: '24/86 engines' } },
  upiFlags: {},
  qrPayload: null,
};

describe('Scoring Engine', () => {
  test('returns verdict with all required fields', async () => {
    const result = await scoringService.score(mockInput);
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('severity');
    expect(result).toHaveProperty('ruleScore');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('tactics');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('urlRisk');
  });

  test('riskScore is within 0-100', async () => {
    const result = await scoringService.score(mockInput);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  test('KYC scam text scores HIGH or CRITICAL', async () => {
    const result = await scoringService.score(mockInput);
    expect(['HIGH', 'CRITICAL', 'SUSPICIOUS']).toContain(result.severity);
    expect(result.riskScore).toBeGreaterThan(50);
  });

  test('safe text scores LOW', async () => {
    const safeInput = {
      ...mockInput,
      rawText: 'Your order #12345 has been shipped. Expected delivery: Tomorrow.',
      entities: { urls: [], upiIds: [], phoneNumbers: [], amounts: [], emails: [], senderDomains: [] },
      urlReputations: {},
      sender: 'orders@amazon.in',
      subject: 'Order Shipped',
    };
    // Override LLM to return safe score
    const openai = require('openai');
    openai.mock.instances[0].chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ llmScore: 5, verdict: 'SAFE', reasons: [], detectedLanguage: 'en', confidence: 'high' }) } }],
    });
    const result = await scoringService.score(safeInput);
    expect(result.riskScore).toBeLessThan(55);
  });

  test('malicious URL sets urlRisk to Malicious', async () => {
    const result = await scoringService.score(mockInput);
    expect(result.urlRisk).toBe('Malicious');
  });

  test('tactics array is non-empty for scam content', async () => {
    const result = await scoringService.score(mockInput);
    expect(result.tactics.length).toBeGreaterThan(0);
  });

  test('reasons array is non-empty', async () => {
    const result = await scoringService.score(mockInput);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
