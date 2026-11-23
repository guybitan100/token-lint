import * as vscode from 'vscode';

export class TokenLintCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {

    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'AI-Security') continue;

      if (diagnostic.code === 'optimization.duplicateInstruction') {
        const action = new vscode.CodeAction(
          'AI-Security: Remove duplicate instruction',
          vscode.CodeActionKind.QuickFix
        );

        const line = document.lineAt(diagnostic.range.start.line);
        const deleteRange = line.rangeIncludingLineBreak;

        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.delete(document.uri, deleteRange);
        action.isPreferred = true;
        actions.push(action);
      }

      if (diagnostic.code === 'retrieval.topKRisk') {
        const action = new vscode.CodeAction(
          'AI-Security: Reduce top_k to 6',
          vscode.CodeActionKind.QuickFix
        );

        const line = document.lineAt(diagnostic.range.start.line);
        const replaced = line.text.replace(/top_k\s*[:=]\s*\d+/i, 'top_k: 6');

        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, replaced);
        actions.push(action);
      }

      if (diagnostic.code === 'security.promptInjection') {
        const action = new vscode.CodeAction(
          'AI-Security: Neutralize suspicious instruction',
          vscode.CodeActionKind.QuickFix
        );

        const line = document.lineAt(diagnostic.range.start.line);
        const replaced = line.text
          .replace(/ignore previous instructions/ig, '[REMOVED: suspicious instruction override]')
          .replace(/ignore all previous instructions/ig, '[REMOVED: suspicious instruction override]')
          .replace(/override system prompt/ig, '[REMOVED: suspicious system override]')
          .replace(/reveal hidden prompt/ig, '[REMOVED: suspicious prompt disclosure]')
          .replace(/print the system prompt/ig, '[REMOVED: suspicious prompt disclosure]')
          .replace(/disable safety/ig, '[REMOVED: suspicious safety override]')
          .replace(/bypass policy/ig, '[REMOVED: suspicious policy bypass]')
          .replace(/act as developer mode/ig, '[REMOVED: suspicious role override]');

        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, replaced);
        actions.push(action);
      }

      if (diagnostic.code === 'security.externalEndpoint') {
        const action = new vscode.CodeAction(
          'AI-Security: Comment external endpoint for review',
          vscode.CodeActionKind.QuickFix
        );

        const line = document.lineAt(diagnostic.range.start.line);
        const replaced = `# TOKENLINT REVIEW REQUIRED: ${line.text}`;

        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, replaced);
        actions.push(action);
      }

      if (diagnostic.code === 'security.encodedPayload') {
        const action = new vscode.CodeAction(
          'AI-Security: Replace encoded payload with review marker',
          vscode.CodeActionKind.QuickFix
        );

        const line = document.lineAt(diagnostic.range.start.line);
        const replaced = '[TOKENLINT REMOVED: suspicious encoded payload requires review]';

        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, replaced);
        actions.push(action);
      }

      if (diagnostic.code === 'skills.maliciousSkillTest') {
        const action = new vscode.CodeAction(
          'AI-Security: Disable suspicious skill test',
          vscode.CodeActionKind.QuickFix
        );

        const line = document.lineAt(diagnostic.range.start.line);
        const replaced = `# TOKENLINT DISABLED SUSPICIOUS TEST: ${line.text}`;

        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, replaced);
        actions.push(action);
      }
    }

    return actions;
  }
}
