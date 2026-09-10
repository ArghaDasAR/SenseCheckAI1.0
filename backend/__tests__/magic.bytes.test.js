// ─── Magic Bytes Validator Unit Tests ─────────────────────────────────────────

const { validateMagicBytes } = require('../src/services/upload.service');

const JPEG_MAGIC = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
const PNG_MAGIC  = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const WEBP_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const EXE_MAGIC  = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ — Windows executable
const PDF_MAGIC  = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

describe('Magic Bytes Validator', () => {
  test('accepts JPEG', async () => {
    const result = await validateMagicBytes(JPEG_MAGIC);
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe('image/jpeg');
  });

  test('accepts PNG', async () => {
    const result = await validateMagicBytes(PNG_MAGIC);
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe('image/png');
  });

  test('accepts WEBP', async () => {
    const result = await validateMagicBytes(WEBP_MAGIC);
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe('image/webp');
  });

  test('rejects Windows EXE disguised as image', async () => {
    const result = await validateMagicBytes(EXE_MAGIC);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/image/i);
  });

  test('rejects PDF disguised as image', async () => {
    const result = await validateMagicBytes(PDF_MAGIC);
    expect(result.valid).toBe(false);
  });

  test('rejects empty buffer', async () => {
    const result = await validateMagicBytes(Buffer.alloc(2));
    expect(result.valid).toBe(false);
  });

  test('rejects null', async () => {
    const result = await validateMagicBytes(null);
    expect(result.valid).toBe(false);
  });
});

