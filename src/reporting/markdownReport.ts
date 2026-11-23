import { AnalysisResult } from '../core/engine/engine';

export function buildMarkdownReport(results: Array<{ fileName: string; result: AnalysisResult }>): string {
  const totalFiles = results.length;
  const totalFindings = results.reduce((sum, r) => sum + r.result.metrics.findingCount, 0);
  const totalTokens = results.reduce((sum, r) => sum + r.result.metrics.totalTokens, 0);
  const errors = results.reduce((sum, r) => sum + r.result.metrics.errorCount, 0);
  const warnings = results.reduce((sum, r) => sum + r.result.metrics.warningCount, 0);

  const lines: string[] = [
    '# AI-Security Workspace Report',
    '',
    `Files scanned: ${totalFiles}`,
    `Total tokens: ${totalTokens}`,
    `Total findings: ${totalFindings}`,
    `Errors: ${errors}`,
    `Warnings: ${warnings}`,
    '',
    '## Findings by File',
    ''
  ];

  for (const { fileName, result } of results) {
    lines.push(`### ${fileName}`);
    lines.push('');
    if (!result.findings.length) {
      lines.push('No findings.');
      lines.push('');
      continue;
    }

    for (const finding of result.findings) {
      lines.push(`- **${finding.severity.toUpperCase()}** ${finding.title}: ${finding.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
