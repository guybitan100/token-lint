import * as vscode from 'vscode';
import { TokenLintDiagnosticProvider } from '../providers/diagnosticProvider';
import { getSkipReason, shouldAnalyzeFile } from '../utils/scanFilter';

export async function scanCurrentFile(provider: TokenLintDiagnosticProvider) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage(
      'AI-Security: Open a file in the editor to scan it.'
    );
    return;
  }

  if (!shouldAnalyzeFile(editor.document.fileName)) {
    vscode.window.showInformationMessage(
      `AI-Security skipped ${getSkipReason(editor.document.fileName)}`
    );
    return;
  }

  const result = provider.scan(editor.document);

  vscode.window.showInformationMessage(
    `AI-Security: ${result.metrics.findingCount} findings, ${result.metrics.totalTokens} tokens`
  );
}
