import { describe, it, expect } from 'vitest';
import { buildMarkdownReport } from './markdownReport';
import { AnalysisResult } from '../core/engine/engine';

describe('buildMarkdownReport', () => {
  const makeResult = (findings: any[] = [], tokens = 100): AnalysisResult => ({
    ir: { id: 'root', type: 'prompt', raw: '', tokens, loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 1 }, children: [] },
    findings,
    metrics: {
      totalTokens: tokens,
      findingCount: findings.length,
      errorCount: findings.filter(f => f.severity === 'error').length,
      warningCount: findings.filter(f => f.severity === 'warning').length
    }
  });

  it('generates header with summary stats', () => {
    const report = buildMarkdownReport([
      { fileName: 'a.md', result: makeResult([], 50) },
      { fileName: 'b.md', result: makeResult([], 75) }
    ]);
    expect(report).toContain('# TokenLint Workspace Report');
    expect(report).toContain('Files scanned: 2');
    expect(report).toContain('Total tokens: 125');
  });

  it('shows "No findings" for clean files', () => {
    const report = buildMarkdownReport([
      { fileName: 'clean.md', result: makeResult() }
    ]);
    expect(report).toContain('No findings.');
  });

  it('lists findings with severity', () => {
    const findings = [{
      ruleId: 'test',
      title: 'Test Finding',
      message: 'Something is wrong',
      severity: 'error' as const,
      loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 1 }
    }];
    const report = buildMarkdownReport([
      { fileName: 'bad.md', result: makeResult(findings, 200) }
    ]);
    expect(report).toContain('**ERROR**');
    expect(report).toContain('Test Finding');
    expect(report).toContain('Something is wrong');
  });

  it('groups findings by file', () => {
    const report = buildMarkdownReport([
      { fileName: 'first.md', result: makeResult() },
      { fileName: 'second.md', result: makeResult() }
    ]);
    expect(report).toContain('### first.md');
    expect(report).toContain('### second.md');
  });
});
