import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import {
  detectKind,
  isGeneratedDependencyFile,
  normalizeFileName
} from '../../core/parser/languageDetector';

type IgnorePattern = {
  matchesBaseName: boolean;
  regex: RegExp;
};

type CachedIgnoreFile = {
  modifiedMs: number;
  patterns: IgnorePattern[];
};

type ScannableKind = 'markdown' | 'prompt' | 'yaml' | 'json' | 'typescript' | 'python';

const ignoreFileNames = ['.ai-securityignore', '.tokenlintignore'];
const workspaceScanGlob = '**/*.{md,prompt,yaml,yml,json,ts,tsx,py}';
const ignoreFileCache = new Map<string, CachedIgnoreFile>();
const scannableKinds = new Set<ScannableKind>([
  'markdown',
  'prompt',
  'yaml',
  'json',
  'typescript',
  'python'
]);

const relevantBaseNameRegex = /(?:^|[._-])(agent|agents|skill|skills|mcp|prompt|prompts|instruction|instructions)(?:[._-]|$)/i;
const relevantPathRegex =
  /(^|\/)(\.github\/agents|\.vscode\/prompts|agents|skills|prompts|mcp)(\/|$)/i;
const relevantSpecialFiles = new Set([
  'agents.md',
  'copilot-instructions.md',
  'skill.md',
  'skill.yaml',
  'skill.yml',
  'mcp.json',
  'mcp.yaml',
  'mcp.yml'
]);

function toPosix(value: string): string {
  return value.replace(/\\/g, '/');
}

function escapeForRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegExp(glob: string): RegExp {
  let pattern = '';

  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    const afterNext = glob[index + 2];

    if (char === '*') {
      if (next === '*') {
        if (afterNext === '/') {
          pattern += '(?:.*/)?';
          index += 2;
        } else {
          pattern += '.*';
          index += 1;
        }
      } else {
        pattern += '[^/]*';
      }

      continue;
    }

    if (char === '?') {
      pattern += '[^/]';
      continue;
    }

    pattern += escapeForRegex(char);
  }

  return new RegExp(`^${pattern}$`, 'i');
}

function readIgnorePatterns(rootPath: string): IgnorePattern[] {
  const ignorePath = ignoreFileNames
    .map(fileName => path.join(rootPath, fileName))
    .find(candidate => fs.existsSync(candidate));

  if (!ignorePath) {
    return [];
  }

  try {
    const stats = fs.statSync(ignorePath);
    const cached = ignoreFileCache.get(ignorePath);

    if (cached && cached.modifiedMs === stats.mtimeMs) {
      return cached.patterns;
    }

    const fileText = fs.readFileSync(ignorePath, 'utf8');
    const patterns = fileText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => {
        let normalized = toPosix(line).replace(/^\.\//, '').replace(/^\//, '');

        if (normalized.endsWith('/')) {
          normalized += '**';
        }

        return {
          matchesBaseName: !normalized.includes('/'),
          regex: globToRegExp(normalized)
        };
      });

    ignoreFileCache.set(ignorePath, {
      modifiedMs: stats.mtimeMs,
      patterns
    });

    return patterns;
  } catch {
    ignoreFileCache.delete(ignorePath);
    return [];
  }
}

function getWorkspaceFolder(fileName: string): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fileName));
}

function isRelevantArtifact(fileName: string): boolean {
  const normalized = toPosix(fileName).toLowerCase();
  const baseName = path.posix.basename(normalized);

  if (baseName.endsWith('.prompt')) {
    return true;
  }

  if (relevantSpecialFiles.has(baseName)) {
    return true;
  }

  if (/(?:^|\.)(?:agent|instructions|prompt)\.md$/i.test(baseName)) {
    return true;
  }

  if (relevantBaseNameRegex.test(baseName)) {
    return true;
  }

  return relevantPathRegex.test(normalized);
}

function isScannableKind(fileName: string): boolean {
  return scannableKinds.has(detectKind(fileName) as ScannableKind);
}

function isIgnoredByWorkspace(fileName: string): boolean {
  const workspaceFolder = getWorkspaceFolder(fileName);

  if (!workspaceFolder) {
    return false;
  }

  const patterns = readIgnorePatterns(workspaceFolder.uri.fsPath);
  if (patterns.length === 0) {
    return false;
  }

  const relativePath = toPosix(path.relative(workspaceFolder.uri.fsPath, fileName));
  const baseName = path.posix.basename(relativePath);

  return patterns.some(pattern => {
    if (pattern.regex.test(relativePath)) {
      return true;
    }

    return pattern.matchesBaseName && pattern.regex.test(baseName);
  });
}

export function shouldAnalyzeFile(fileName: string): boolean {
  if (isGeneratedDependencyFile(fileName)) {
    return false;
  }

  if (!isScannableKind(fileName)) {
    return false;
  }

  if (!isRelevantArtifact(fileName)) {
    return false;
  }

  return !isIgnoredByWorkspace(fileName);
}

export function getSkipReason(fileName: string): string {
  if (isGeneratedDependencyFile(fileName)) {
    return 'generated dependency lockfile';
  }

  if (!isScannableKind(fileName)) {
    return 'unsupported file type';
  }

  if (!isRelevantArtifact(fileName)) {
    return 'not a skill, agent, prompt, or MCP artifact';
  }

  if (isIgnoredByWorkspace(fileName)) {
    const workspaceFolder = getWorkspaceFolder(fileName);
    const relativePath = workspaceFolder
      ? toPosix(path.relative(workspaceFolder.uri.fsPath, fileName))
      : normalizeFileName(fileName);

    return `ignored by ${ignoreFileName}: ${relativePath}`;
  }

  return 'excluded file';
}

export { workspaceScanGlob };
