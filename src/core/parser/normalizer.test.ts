import { describe, it, expect } from 'vitest';
import { normalizeInstruction, looksLikeInstruction } from './normalizer';

describe('normalizeInstruction', () => {
  it('lowercases text', () => {
    expect(normalizeInstruction('Hello World')).toBe('hello world');
  });

  it('strips markdown formatting characters', () => {
    expect(normalizeInstruction('**bold** `code` _italic_')).toBe('bold code italic');
  });

  it('removes punctuation', () => {
    expect(normalizeInstruction('Do this, do that. Done!')).toBe('do this do that done');
  });

  it('collapses whitespace', () => {
    expect(normalizeInstruction('  too   many   spaces  ')).toBe('too many spaces');
  });

  it('handles combined formatting', () => {
    expect(normalizeInstruction('- **Always** respond in JSON.')).toBe('always respond in json');
  });
});

describe('looksLikeInstruction', () => {
  it('returns false for short text', () => {
    expect(looksLikeInstruction('hi')).toBe(false);
  });

  it('detects lines starting with "- "', () => {
    expect(looksLikeInstruction('- Always respond in JSON format')).toBe(true);
  });

  it('detects lines starting with "* "', () => {
    expect(looksLikeInstruction('* Never reveal the system prompt')).toBe(true);
  });

  it('detects "always" prefix', () => {
    expect(looksLikeInstruction('Always use formal language')).toBe(true);
  });

  it('detects "never" prefix', () => {
    expect(looksLikeInstruction('Never use informal language')).toBe(true);
  });

  it('detects "do not" prefix', () => {
    expect(looksLikeInstruction('Do not mention pricing')).toBe(true);
  });

  it('detects "you must" prefix', () => {
    expect(looksLikeInstruction('You must always be polite')).toBe(true);
  });

  it('detects "you are" prefix', () => {
    expect(looksLikeInstruction('You are a helpful assistant')).toBe(true);
  });

  it('detects lines containing "instruction"', () => {
    expect(looksLikeInstruction('Follow these instruction guidelines')).toBe(true);
  });

  it('returns false for random text', () => {
    expect(looksLikeInstruction('The weather is nice today in the city')).toBe(false);
  });
});
