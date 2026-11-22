import * as vscode from 'vscode';
import { TokenLintDiagnosticProvider } from '../providers/diagnosticProvider';
import { getSkipReason, shouldAnalyzeFile } from '../utils/scanFilter';

export async function scanCurrentFile(provider: TokenLintDiagnosticProvider) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage(
      'TokenLint: Open a file in the editor to scan it.'
    );
    return;
  }

  if (!shouldAnalyzeFile(editor.document.fileName)) {
    vscode.window.showInformationMessage(
      `TokenLint skipped ${getSkipReason(editor.document.fileName)}`
    );
    return;
  }

  const result = provider.scan(editor.document);

  vscode.window.showInformationMessage(
    `TokenLint: ${result.metrics.findingCount} findings, ${result.metrics.totalTokens} tokens`
  );
}
