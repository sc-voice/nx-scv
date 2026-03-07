import { describe, it, expect } from '@sc-voice/vitest';
import { V7Generator } from 'uuidv7';
import { uuidToBase64, uuidToFilename, shortId } from '../src/uuid-utils.mjs';

describe('UUID Utilities', () => {
  it('should convert UUID to base64', () => {
    const uuid = '019cc867-ae0d-7000-8c04-d480ba029a0f';
    const base64 = uuidToBase64(uuid);

    // Should be URL-safe base64 (no padding, + → -, / → _)
    expect(base64).toBeTruthy();
    expect(base64).not.toContain('=');
    expect(base64).not.toContain('+');
    expect(base64).not.toContain('/');
    expect(base64.length).toBe(22); // 128 bits / 6 bits per char ≈ 22 chars
  });

  it('should convert UUID to filename', () => {
    const uuid = '019cc867-ae0d-7000-8c04-d480ba029a0f';
    const filename = uuidToFilename(uuid);

    expect(filename).toMatch(/^T_[A-Za-z0-9_-]{9}$/);
    expect(filename.substring(0, 2)).toBe('T_');
    expect(filename.length).toBe(11); // T_ + 9 chars
  });

  it('should generate unique short IDs', () => {
    const generator = new V7Generator();
    const uuid1 = String(generator.generate());
    const uuid2 = String(generator.generate());
    const id1 = shortId(uuid1);
    const id2 = shortId(uuid2);

    // verify non-duplication 
    expect(uuid1).not.toBe(uuid2);

    expect(uuid1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1.length).toBe(8);
    expect(id2.length).toBe(8);
    expect(id1).not.toBe(id2);
  });

  it('should generate short ID without UUID parameter', () => {
    const id = shortId();
    expect(id).toBeTruthy();
    expect(id.length).toBe(8);
  });

  it('should produce consistent results for same UUID', () => {
    const uuid = '019cc867-ae0d-7000-8c04-d480ba029a0f';
    const base64_1 = uuidToBase64(uuid);
    const base64_2 = uuidToBase64(uuid);
    const filename1 = uuidToFilename(uuid);
    const filename2 = uuidToFilename(uuid);
    const short1 = shortId(uuid);
    const short2 = shortId(uuid);

    expect(base64_1).toBe(base64_2);
    expect(filename1).toBe(filename2);
    expect(short1).toBe(short2);
  });
});
