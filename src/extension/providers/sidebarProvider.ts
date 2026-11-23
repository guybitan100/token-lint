import * as vscode from 'vscode';

export class TokenLintSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tokenlint.sidebar';

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async message => {
      switch (message.command) {
        case 'scanOrFix':
          await vscode.commands.executeCommand('tokenlint.scanOrFix');
          break;

        case 'scanCurrentFile':
          await vscode.commands.executeCommand('tokenlint.scanCurrentFile');
          break;

        case 'scanWorkspace':
          await vscode.commands.executeCommand('tokenlint.scanWorkspace');
          break;

        case 'generateReport':
          await vscode.commands.executeCommand('tokenlint.generateReport');
          break;

        case 'showIR':
          await vscode.commands.executeCommand('tokenlint.showIR');
          break;

        case 'applyAllSafeFixes':
          await vscode.commands.executeCommand('tokenlint.applyAllSafeFixes');
          break;

        case 'showFixGraph':
          await vscode.commands.executeCommand('tokenlint.showFixGraph');
          break;
      }
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = String(Date.now());

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      padding: 14px;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .subtitle {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      margin-bottom: 16px;
      line-height: 1.4;
    }

    button {
      width: 100%;
      margin-bottom: 8px;
      padding: 8px 10px;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      border-radius: 4px;
      text-align: left;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .section {
      margin-top: 18px;
      margin-bottom: 8px;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      letter-spacing: 0.08em;
    }

    .note {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="title">AI-Security</div>
  <div class="subtitle">
    Security analysis for prompts, skills, MCP workflows, and AI agent instructions.
  </div>

  <div class="section">Scan</div>
  <button class="secondary" data-command="scanOrFix">Scan / Fix...</button>
  <button data-command="scanCurrentFile">Scan Current File</button>
  <button data-command="scanWorkspace">Scan Workspace</button>

  <div class="section">Reports</div>
  <button class="secondary" data-command="generateReport">Generate Report</button>
  <button class="secondary" data-command="showIR">Show IR</button>

  <div class="section">Security actions</div>
  <button data-command="applyAllSafeFixes">Apply All Safe Fixes</button>
  <button class="secondary" data-command="showFixGraph">Show Before / After Graph</button>

  <div class="note">
    Review every proposed security action before applying it. Use the graph preview to inspect projected changes.
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('button[data-command]').forEach(btn => {
      btn.addEventListener('click', () => {
        vscode.postMessage({ command: btn.dataset.command });
      });
    });
  </script>
</body>
</html>`;
  }
}
