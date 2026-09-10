// ─── Entity Extractor Unit Tests ──────────────────────────────────────────────

const { extractEntities } = require('../src/services/ocr.service');

describe('Entity Extraction', () => {
  test('extracts UPI IDs', () => {
    const text = 'Send money to fraud123@ybl or support@paytm for cashback';
    const result = extractEntities(text);
    expect(result.upiIds).toContain('fraud123@ybl');
    expect(result.upiIds).toContain('support@paytm');
  });

  test('extracts URLs', () => {
    const text = 'Click here: https://kyc-sbi.xyz/login and http://bit.ly/abc';
    const result = extractEntities(text);
    expect(result.urls).toContain('https://kyc-sbi.xyz/login');
    expect(result.urls).toContain('http://bit.ly/abc');
  });

  test('extracts Indian phone numbers', () => {
    const text = 'Call us at 9876543210 or +91 8765432109 for help';
    const result = extractEntities(text);
    expect(result.phoneNumbers.some(p => p.includes('9876543210'))).toBe(true);
  });

  test('extracts amounts in ₹', () => {
    const text = 'Pay ₹1,500 immediately. Rs.200 fine will be charged.';
    const result = extractEntities(text);
    expect(result.amounts.length).toBeGreaterThan(0);
  });

  test('extracts email addresses', () => {
    const text = 'Contact alerts@sbi-support.xyz for help';
    const result = extractEntities(text);
    expect(result.emails).toContain('alerts@sbi-support.xyz');
  });

  test('extracts sender domains from URLs', () => {
    const text = 'Visit https://fake-bank.xyz/login now';
    const result = extractEntities(text);
    expect(result.senderDomains).toContain('fake-bank.xyz');
  });

  test('handles empty string gracefully', () => {
    const result = extractEntities('');
    expect(result.urls).toEqual([]);
    expect(result.upiIds).toEqual([]);
  });

  test('deduplicates repeated URLs', () => {
    const text = 'https://scam.xyz https://scam.xyz https://scam.xyz';
    const result = extractEntities(text);
    expect(result.urls.length).toBe(1);
  });
});
