import { describe, it, expect } from '@sc-voice/vitest';
import { Reference } from '../src/reference.mjs';

describe('Reference', () => {
  it('should create reference with text', () => {
    const ref = new Reference({ text: 'This is a note' });
    expect(ref.text).toBe('This is a note');
    expect(ref.url).toBe(null);
    expect(ref.relevance).toBe(0.5);
  });

  it('should create reference with URL', () => {
    const url = new URL('https://example.com/doc');
    const ref = new Reference({ url });
    expect(ref.text).toBe(null);
    expect(ref.url).toEqual(url);
    expect(ref.relevance).toBe(0.5);
  });

  it('should create reference with text and URL', () => {
    const url = new URL('https://example.com');
    const ref = new Reference({ text: 'Link to example', url, relevance: 0.8 });
    expect(ref.text).toBe('Link to example');
    expect(ref.url).toEqual(url);
    expect(ref.relevance).toBe(0.8);
  });

  it('should clamp relevance to 0-1 range', () => {
    const refTooHigh = new Reference({ relevance: 1.5 });
    expect(refTooHigh.relevance).toBe(1.0);

    const refTooLow = new Reference({ relevance: -0.5 });
    expect(refTooLow.relevance).toBe(0.0);

    const refValid = new Reference({ relevance: 0.75 });
    expect(refValid.relevance).toBe(0.75);
  });

  it('should have default relevance of 0.5', () => {
    const ref = new Reference();
    expect(ref.relevance).toBe(0.5);
  });

  it('should serialize and deserialize via JSON', () => {
    const url = new URL('https://example.com/ref');
    const ref = new Reference({ text: 'Example', url, relevance: 0.7 });

    const json = JSON.stringify(ref);
    const data = JSON.parse(json);
    const decoded = Reference.fromJSON(data);

    expect(decoded.text).toBe('Example');
    expect(decoded.url.href).toBe(url.href);
    expect(decoded.relevance).toBe(0.7);
  });

  it('should generate id from MD5 hash', () => {
    const ref = new Reference({ text: 'Test' });
    expect(ref.id).toBeTruthy();
    expect(ref.id.length).toBe(4); // First 4 chars of MD5 hash
  });
});
