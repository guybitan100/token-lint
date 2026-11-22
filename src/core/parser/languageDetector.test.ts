import { describe, it, expect } from 'vitest';
import { detectKind, normalizeFileName, isGeneratedDependencyFile } from './languageDetector';

describe('detectKind', () => {
  it('detects markdown files', () => {
    expect(detectKind('README.md')).toBe('markdown');
    expect(detectKind('docs/guide.md')).toBe('markdown');
  });

  it('detects yaml files', () => {
    expect(detectKind('config.yaml')).toBe('yaml');
    expect(detectKind('skill.yml')).toBe('yaml');
  });

  it('detects json files', () => {
    expect(detectKind('package.json')).toBe('json');
  });

  it('detects typescript files', () => {
    expect(detectKind('index.ts')).toBe('typescript');
    expect(detectKind('App.tsx')).toBe('typescript');
  });

  it('detects python files', () => {
    expect(detectKind('main.py')).toBe('python');
  });

  it('detects prompt files', () => {
    expect(detectKind('system.prompt')).toBe('prompt');
  });

  it('returns unknown for unrecognized extensions', () => {
    expect(detectKind('data.csv')).toBe('unknown');
    expect(detectKind('image.png')).toBe('unknown');
  });

  it('is case-insensitive', () => {
    expect(detectKind('FILE.MD')).toBe('markdown');
    expect(detectKind('Config.YAML')).toBe('yaml');
  });
});

describe('normalizeFileName', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizeFileName('src\\core\\file.ts')).toBe('src/core/file.ts');
  });

  it('lowercases the path', () => {
    expect(normalizeFileName('Src/Core/File.TS')).toBe('src/core/file.ts');
  });
});

describe('isGeneratedDependencyFile', () => {
  it('identifies package-lock.json', () => {
    expect(isGeneratedDependencyFile('package-lock.json')).toBe(true);
  });

  it('identifies yarn.lock', () => {
    expect(isGeneratedDependencyFile('yarn.lock')).toBe(true);
  });

  it('identifies pnpm-lock.yaml', () => {
    expect(isGeneratedDependencyFile('pnpm-lock.yaml')).toBe(true);
  });

  it('identifies bun.lockb', () => {
    expect(isGeneratedDependencyFile('bun.lockb')).toBe(true);
  });

  it('returns false for regular files', () => {
    expect(isGeneratedDependencyFile('package.json')).toBe(false);
    expect(isGeneratedDependencyFile('index.ts')).toBe(false);
  });

  it('works with paths', () => {
    expect(isGeneratedDependencyFile('/project/package-lock.json')).toBe(true);
  });

  it('handles empty file names without crashing', () => {
    expect(isGeneratedDependencyFile('')).toBe(false);
  });
});
