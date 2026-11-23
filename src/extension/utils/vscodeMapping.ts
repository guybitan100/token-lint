import * as vscode from 'vscode';
import { FindingSeverity, TokenLintFinding } from '../../core/engine/finding';

export function toVsCodeSeverity(severity: FindingSeverity): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

export function toRange(finding: TokenLintFinding): vscode.Range {
  return new vscode.Range(
    new vscode.Position(finding.loc.startLine, finding.loc.startColumn),
    new vscode.Position(finding.loc.endLine, finding.loc.endColumn)
  );
}

export function toDiagnostic(finding: TokenLintFinding): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    toRange(finding),
    finding.message,
    toVsCodeSeverity(finding.severity)
  );

  diagnostic.source = 'AI-Security';
  diagnostic.code = finding.ruleId;

  return diagnostic;
}
