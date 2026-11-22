export type SupportedKind =
  | 'markdown'
  | 'yaml'
  | 'json'
  | 'typescript'
  | 'python'
  | 'prompt'
  | 'unknown';

const generatedDependencyFiles = new Set([
  'bun.lockb',
  'package-lock.json',
  'pnpm-lock.yaml',
  'pnpm-lock.yml',
  'yarn.lock'
]);

export function normalizeFileName(fileName: string): string {
  return fileName.replace(/\\/g, '/').toLowerCase();
}

export function isGeneratedDependencyFile(fileName: string): boolean {
  const normalized = normalizeFileName(fileName);
  const baseName = normalized.split('/').pop() ?? normalized;

  return generatedDependencyFiles.has(baseName);
}

export function detectKind(fileName: string): SupportedKind {
  const lower = normalizeFileName(fileName);

  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.prompt')) return 'prompt';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.py')) return 'python';

  return 'unknown';
}
