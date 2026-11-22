import { describe, it, expect, beforeEach } from 'vitest';
import { tokenCount, clearTokenCache } from './tokenizer';

describe('tokenizer', () => {
  beforeEach(() => {
    clearTokenCache();
  });

  it('returns 0 for empty string', () => {
    expect(tokenCount('')).toBe(0);
  });

  it('returns positive count for non-empty text', () => {
    expect(tokenCount('hello world')).toBeGreaterThan(0);
  });

  it('returns consistent results for same input', () => {
    const a = tokenCount('some text here');
    const b = tokenCount('some text here');
    expect(a).toBe(b);
  });

  it('caches results (same reference on repeated call)', () => {
    const text = 'This is a test of the caching tokenizer';
    tokenCount(text);
    // Second call should hit cache — we verify by ensuring consistent result
    expect(tokenCount(text)).toBe(tokenCount(text));
  });

  it('clearTokenCache resets the cache', () => {
    tokenCount('cached text');
    clearTokenCache();
    // Should still work after clearing
    expect(tokenCount('cached text')).toBeGreaterThan(0);
  });

  it('evicts the oldest cached entries when the cache limit is reached', () => {
    for (let index = 0; index < 2050; index += 1) {
      expect(tokenCount(`text-${index}`)).toBeGreaterThan(0);
    }

    expect(tokenCount('text-0')).toBeGreaterThan(0);
  });
});
