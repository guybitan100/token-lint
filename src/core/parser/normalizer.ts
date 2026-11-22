export function normalizeInstruction(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`"'*_#>-]/g, '')
    .replace(/[.,;:!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeInstruction(line: string): boolean {
  const l = line.trim().toLowerCase();
  if (l.length < 8) return false;

  return (
    l.startsWith('- ') ||
    l.startsWith('* ') ||
    l.startsWith('always ') ||
    l.startsWith('never ') ||
    l.startsWith('do not ') ||
    l.startsWith('dont ') ||
    l.startsWith('you must ') ||
    l.startsWith('you are ') ||
    l.includes('instruction') ||
    l.includes('system prompt')
  );
}
