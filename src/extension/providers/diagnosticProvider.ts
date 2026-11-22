import * as vscode from 'vscode';
import { analyze, AnalysisResult } from '../../core/engine/engine';
import { shouldAnalyzeFile } from '../utils/scanFilter';
import { toDiagnostic } from '../utils/vscodeMapping';

const emptyResult: AnalysisResult = analyze('', 'unknown');

export class TokenLintDiagnosticProvider {
  private collection: vscode.DiagnosticCollection;
  private cache = new Map<string, AnalysisResult>();

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('tokenlint');
  }

  scan(document: vscode.TextDocument): AnalysisResult {
    if (!shouldAnalyzeFile(document.fileName)) {
      this.collection.delete(document.uri);
      this.cache.delete(document.uri.toString());
      return emptyResult;
    }

    const result = analyze(document.getText(), document.fileName);
    const diagnostics = result.findings.map(toDiagnostic);

    this.collection.set(document.uri, diagnostics);
    this.cache.set(document.uri.toString(), result);

    return result;
  }

  getCached(document: vscode.TextDocument): AnalysisResult | undefined {
    return this.cache.get(document.uri.toString());
  }

  dispose() {
    this.collection.dispose();
  }
}
