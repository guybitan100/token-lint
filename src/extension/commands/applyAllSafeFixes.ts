import * as vscode from 'vscode';
import { fixesFromFindings } from '../../core/fixes/fixEngine';
import { TokenLintDiagnosticProvider } from '../providers/diagnosticProvider';
import { applySafeFixPreview, showFixGraphPreview } from './showFixGraph';
import { getSkipReason, shouldAnalyzeFile } from '../utils/scanFilter';

export async function applyAllSafeFixes(provider: TokenLintDiagnosticProvider) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage(
      'AI-Security: Open a file in the editor to apply safe fixes.'
    );
    return;
  }

  const document = editor.document;

  if (!shouldAnalyzeFile(document.fileName)) {
    vscode.window.showInformationMessage(
      `AI-Security skipped ${getSkipReason(document.fileName)}`
    );
    return;
  }

  const result = provider.scan(document);
  const fixes = fixesFromFindings(result.findings);
  const originalText = document.getText();

  const safeFixes = fixes
    .filter(fix => fix.safety === 'safe')
    .sort((a, b) => b.loc.startLine - a.loc.startLine);

  if (!safeFixes.length) {
    const reviewRequiredFixes = fixes
      .filter(fix => fix.safety === 'review_required');

    if (reviewRequiredFixes.length) {
      const suffix = reviewRequiredFixes.length === 1 ? '' : 'es';
      vscode.window.showInformationMessage(
        `AI-Security: No safe automatic fixes available. ${reviewRequiredFixes.length} review-required quick fix${suffix} available from Quick Fix.`
      );
      return;
    }

    vscode.window.showInformationMessage('AI-Security: No safe automatic fixes available.');
    return;
  }

  const previewText = applySafeFixPreview(originalText, safeFixes);
  const edit = new vscode.WorkspaceEdit();

  for (const fix of safeFixes) {
    const line = document.lineAt(fix.loc.startLine);
    edit.delete(document.uri, line.rangeIncludingLineBreak);
  }

  const success = await vscode.workspace.applyEdit(edit);

  if (success) {
    await document.save();
    vscode.window.showInformationMessage(
      `AI-Security applied ${safeFixes.length} safe fixes.`
    );
    showFixGraphPreview({
      fileName: document.fileName,
      beforeText: originalText,
      afterText: previewText,
      beforeResult: result,
      allFixes: fixes,
      safeFixes
    });
  }
}
