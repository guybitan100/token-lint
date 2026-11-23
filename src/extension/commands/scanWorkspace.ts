import * as vscode from 'vscode';
import { TokenLintDiagnosticProvider } from '../providers/diagnosticProvider';
import { shouldAnalyzeFile, workspaceScanGlob } from '../utils/scanFilter';

export async function scanWorkspace(provider: TokenLintDiagnosticProvider) {
  const files = await vscode.workspace.findFiles(workspaceScanGlob, '**/node_modules/**');
  const analyzableFiles = files.filter(file => shouldAnalyzeFile(file.fsPath));
  const skippedFiles = files.length - analyzableFiles.length;

  let findingCount = 0;
  let tokenCount = 0;

  for (const file of analyzableFiles) {
    const document = await vscode.workspace.openTextDocument(file);
    const result = provider.scan(document);
    findingCount += result.metrics.findingCount;
    tokenCount += result.metrics.totalTokens;
  }

  vscode.window.showInformationMessage(
    `AI-Security workspace scan complete: ${analyzableFiles.length} files, ${findingCount} findings, ${tokenCount} tokens${
      skippedFiles > 0 ? `, ${skippedFiles} ignored` : ''
    }`
  );
}
