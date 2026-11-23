import * as vscode from 'vscode';

type QuickAction = {
  label: string;
  description: string;
  command: string;
  requiresActiveEditor?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Scan Current File',
    description: 'Analyze the active editor and refresh AI-Security diagnostics.',
    command: 'tokenlint.scanCurrentFile',
    requiresActiveEditor: true
  },
  {
    label: 'Scan Workspace',
    description: 'Scan supported files across the current workspace.',
    command: 'tokenlint.scanWorkspace'
  },
  {
    label: 'Apply All Safe Fixes',
    description: 'Apply duplicate-instruction fixes in the active editor.',
    command: 'tokenlint.applyAllSafeFixes',
    requiresActiveEditor: true
  },
  {
    label: 'Show Before / After Graph',
    description: 'Preview how safe fixes change the active editor and what still needs review.',
    command: 'tokenlint.showFixGraph',
    requiresActiveEditor: true
  }
];

export async function scanOrFix() {
  const selected = await vscode.window.showQuickPick(QUICK_ACTIONS, {
    title: 'AI-Security: Scan / Fix...',
    matchOnDescription: true,
    placeHolder: 'Choose a scan, preview, or safe-fix action'
  });

  if (!selected) {
    return;
  }

  if (selected.requiresActiveEditor && !vscode.window.activeTextEditor) {
    vscode.window.showInformationMessage(
      'AI-Security: Open a file in the editor to run that action.'
    );
    return;
  }

  await vscode.commands.executeCommand(selected.command);
}
