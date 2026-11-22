import * as vscode from 'vscode';

export function createHoverProvider(): vscode.HoverProvider {
  return {
    provideHover(document, position) {
      const diagnostics = vscode.languages
        .getDiagnostics(document.uri)
        .filter(d => d.range.contains(position) && d.source === 'TokenLint');

      if (!diagnostics.length) return;

      const markdown = new vscode.MarkdownString();
      markdown.appendMarkdown('### TokenLint Finding\n\n');

      for (const diagnostic of diagnostics) {
        markdown.appendMarkdown(`- **${diagnostic.code}**: ${diagnostic.message}\n`);
      }

      return new vscode.Hover(markdown);
    }
  };
}
