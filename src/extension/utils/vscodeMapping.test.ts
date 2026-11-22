import { describe, expect, it, vi } from 'vitest';

const mappingMocks = vi.hoisted(() => {
  class Position {
    constructor(
      public line: number,
      public character: number
    ) {}
  }

  class Range {
    constructor(
      public start: Position,
      public end: Position
    ) {}
  }

  class Diagnostic {
    public source?: string;
    public code?: string | number;

    constructor(
      public range: Range,
      public message: string,
      public severity: number
    ) {}
  }

  return {
    Position,
    Range,
    Diagnostic,
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2
    }
  };
});

vi.mock('vscode', () => ({
  Position: mappingMocks.Position,
  Range: mappingMocks.Range,
  Diagnostic: mappingMocks.Diagnostic,
  DiagnosticSeverity: mappingMocks.DiagnosticSeverity
}));

import { toDiagnostic, toRange, toVsCodeSeverity } from './vscodeMapping';

describe('vscodeMapping', () => {
  it('maps severities, ranges, and diagnostics into VS Code objects', () => {
    const finding = {
      ruleId: 'security.promptInjection',
      message: 'Suspicious instruction',
      severity: 'error',
      loc: {
        startLine: 2,
        startColumn: 1,
        endLine: 2,
        endColumn: 8
      }
    };

    expect(toVsCodeSeverity('error')).toBe(mappingMocks.DiagnosticSeverity.Error);
    expect(toVsCodeSeverity('warning')).toBe(mappingMocks.DiagnosticSeverity.Warning);
    expect(toVsCodeSeverity('info')).toBe(mappingMocks.DiagnosticSeverity.Information);

    const range = toRange(finding as never);
    expect(range).toEqual(
      new mappingMocks.Range(new mappingMocks.Position(2, 1), new mappingMocks.Position(2, 8))
    );

    const diagnostic = toDiagnostic(finding as never);
    expect(diagnostic).toMatchObject({
      message: 'Suspicious instruction',
      severity: mappingMocks.DiagnosticSeverity.Error,
      source: 'TokenLint',
      code: 'security.promptInjection'
    });
  });
});