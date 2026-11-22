import * as vscode from 'vscode';
import { parseToIR } from '../../core/parser/parser';

export async function showIR() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const ir = parseToIR(editor.document.getText(), editor.document.fileName);

  const doc = await vscode.workspace.openTextDocument({
    language: 'json',
    content: JSON.stringify(ir, null, 2)
  });

  vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}
