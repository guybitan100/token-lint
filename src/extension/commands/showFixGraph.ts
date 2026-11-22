import * as vscode from 'vscode';
import { AnalysisResult, analyze } from '../../core/engine/engine';
import { TokenLintFix } from '../../core/fixes/fix';
import { fixesFromFindings } from '../../core/fixes/fixEngine';
import { getSkipReason, shouldAnalyzeFile } from '../utils/scanFilter';

type GraphStep = {
  title: string;
  explanation: string;
  lineNumber: number;
  before: string;
  after: string;
};

type FixCounts = {
  safe: number;
  reviewRequired: number;
  unsafe: number;
};

export async function showFixGraph() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage(
      'TokenLint: Open a file in the editor to visualize before/after changes.'
    );
    return;
  }

  const document = editor.document;

  if (!shouldAnalyzeFile(document.fileName)) {
    vscode.window.showInformationMessage(
      `TokenLint skipped ${getSkipReason(document.fileName)}`
    );
    return;
  }

  const originalText = document.getText();
  const before = analyze(originalText, document.fileName);
  const fixes = fixesFromFindings(before.findings);

  if (!fixes.length) {
    vscode.window.showInformationMessage('TokenLint: No fixes available to visualize.');
    return;
  }

  const safeFixes = fixes.filter(fix => fix.safety === 'safe');
  const previewText = applySafeFixPreview(originalText, safeFixes);
  showFixGraphPreview({
    fileName: document.fileName,
    beforeText: originalText,
    afterText: previewText,
    beforeResult: before,
    allFixes: fixes,
    safeFixes
  });
}

export function showFixGraphPreview(model: {
  fileName: string;
  beforeText: string;
  afterText: string;
  beforeResult?: AnalysisResult;
  allFixes: TokenLintFix[];
  safeFixes: TokenLintFix[];
}) {
  const before = model.beforeResult ?? analyze(model.beforeText, model.fileName);
  const after = analyze(model.afterText, model.fileName);
  const remainingFixes = fixesFromFindings(after.findings);
  const panel = vscode.window.createWebviewPanel(
    'tokenlint.fixGraph',
    'TokenLint: Before / After Graph',
    vscode.ViewColumn.Beside,
    {
      enableScripts: false
    }
  );

  panel.webview.html = buildFixGraphHtml({
    fileName: model.fileName,
    before,
    after,
    graphSteps: buildGraphSteps(model.beforeText, model.safeFixes),
    beforeFixCounts: countFixes(model.allFixes),
    afterFixCounts: countFixes(remainingFixes),
    manualReviewFixes: remainingFixes.filter(fix => fix.safety !== 'safe')
  });
}

export function applySafeFixPreview(text: string, safeFixes: TokenLintFix[]): string {
  if (!safeFixes.length) {
    return text;
  }

  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingLineBreak = text.endsWith('\n');
  const lines = text.split(/\r?\n/);
  const previewLines = [...lines];

  for (const fix of [...safeFixes].sort((left, right) => right.loc.startLine - left.loc.startLine)) {
    const deleteCount = Math.max(1, fix.loc.endLine - fix.loc.startLine + 1);
    const replacementLines = fix.replacement
      ? fix.replacement.split(/\r?\n/)
      : [];

    previewLines.splice(fix.loc.startLine, deleteCount, ...replacementLines);
  }

  const previewText = previewLines.join(lineEnding);
  return hadTrailingLineBreak ? `${previewText}${lineEnding}` : previewText;
}

function buildGraphSteps(
  sourceText: string,
  safeFixes: TokenLintFix[]
): GraphStep[] {
  return [...safeFixes]
    .sort((left, right) => left.loc.startLine - right.loc.startLine)
    .map(fix => ({
      title: fix.title,
      explanation: fix.explanation,
      lineNumber: fix.loc.startLine + 1,
      before: getOriginalSnippet(sourceText, fix),
      after: fix.replacement || 'Line removed'
    }));
}

function getOriginalSnippet(sourceText: string, fix: TokenLintFix): string {
  const lines = sourceText.split(/\r?\n/);
  const snippet = lines.slice(fix.loc.startLine, fix.loc.endLine + 1);

  return snippet.join('\n');
}

function countFixes(fixes: TokenLintFix[]): FixCounts {
  return fixes.reduce<FixCounts>(
    (counts, fix) => {
      if (fix.safety === 'safe') {
        counts.safe += 1;
        return counts;
      }

      if (fix.safety === 'review_required') {
        counts.reviewRequired += 1;
        return counts;
      }

      counts.unsafe += 1;
      return counts;
    },
    {
      safe: 0,
      reviewRequired: 0,
      unsafe: 0
    }
  );
}

function buildFixGraphHtml(model: {
  fileName: string;
  before: AnalysisResult;
  after: AnalysisResult;
  graphSteps: GraphStep[];
  beforeFixCounts: FixCounts;
  afterFixCounts: FixCounts;
  manualReviewFixes: TokenLintFix[];
}): string {
  const graphStepsHtml = model.graphSteps.length
    ? model.graphSteps.map(renderGraphStep).join('')
    : `
      <div class="step-card empty">
        <div class="step-title">No safe automatic changes</div>
        <div class="step-copy">This file only has review-required findings, so the preview keeps the document unchanged.</div>
      </div>
    `;

  const manualReviewHtml = model.manualReviewFixes.length
    ? model.manualReviewFixes.map(renderManualReviewFix).join('')
    : '<div class="review-empty">No manual review items in the current scan.</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      color-scheme: light dark;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 24px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-editor-foreground);
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--vscode-textLink-foreground) 14%, transparent), transparent 36%),
        linear-gradient(180deg, color-mix(in srgb, var(--vscode-editor-background) 82%, var(--vscode-sideBar-background) 18%), var(--vscode-editor-background));
    }

    .page {
      max-width: 1180px;
      margin: 0 auto;
    }

    .hero {
      margin-bottom: 20px;
    }

    .eyebrow {
      color: var(--vscode-textLink-foreground);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.15;
    }

    .subtitle {
      max-width: 760px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 10px;
    }

    .file-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--vscode-sideBar-background) 70%, transparent);
      border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 75%, transparent);
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 22px;
    }

    .summary-card,
    .state-card,
    .step-card,
    .review-card {
      border-radius: 16px;
      border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 75%, transparent);
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 84%, transparent);
      backdrop-filter: blur(8px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    }

    .summary-card {
      padding: 16px;
    }

    .summary-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 30px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .summary-copy {
      font-size: 12px;
      line-height: 1.5;
      color: var(--vscode-descriptionForeground);
    }

    .flow {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) 40px minmax(320px, 1.4fr) 40px minmax(220px, 1fr);
      align-items: start;
      gap: 12px;
      margin-bottom: 22px;
    }

    .state-card {
      padding: 18px;
      position: sticky;
      top: 24px;
    }

    .state-card.before {
      border-color: color-mix(in srgb, #d97706 40%, var(--vscode-panel-border) 60%);
    }

    .state-card.after {
      border-color: color-mix(in srgb, #059669 40%, var(--vscode-panel-border) 60%);
    }

    .state-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .state-subtitle {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 14px;
    }

    .state-metric {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-top: 1px solid color-mix(in srgb, var(--vscode-panel-border) 65%, transparent);
      font-size: 13px;
    }

    .connector {
      align-self: stretch;
      min-height: 180px;
      position: relative;
    }

    .connector::before {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      top: 84px;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--vscode-textLink-foreground), transparent);
    }

    .connector::after {
      content: '';
      position: absolute;
      right: 8px;
      top: 79px;
      width: 10px;
      height: 10px;
      border-top: 2px solid var(--vscode-textLink-foreground);
      border-right: 2px solid var(--vscode-textLink-foreground);
      transform: rotate(45deg);
    }

    .steps-column {
      display: grid;
      gap: 12px;
    }

    .step-card {
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    .step-card::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: linear-gradient(180deg, #0ea5e9, #22c55e);
    }

    .step-card.empty::before {
      background: linear-gradient(180deg, #64748b, #94a3b8);
    }

    .step-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vscode-textLink-foreground);
      margin-bottom: 6px;
    }

    .step-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .step-copy {
      font-size: 13px;
      line-height: 1.6;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 14px;
    }

    .code-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .code-block {
      padding: 12px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 82%, transparent);
      border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 65%, transparent);
    }

    .code-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      line-height: 1.6;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
    }

    .review-grid {
      display: grid;
      gap: 10px;
    }

    .review-card {
      padding: 14px 16px;
    }

    .review-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .review-copy,
    .review-line,
    .review-empty {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.6;
    }

    .review-line {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid color-mix(in srgb, var(--vscode-panel-border) 65%, transparent);
    }

    @media (max-width: 980px) {
      .flow {
        grid-template-columns: 1fr;
      }

      .connector {
        display: none;
      }

      .state-card {
        position: static;
      }
    }

    @media (max-width: 680px) {
      body {
        padding: 16px;
      }

      .code-grid {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="eyebrow">TokenLint Fix Preview</div>
      <h1>What changed, and what still needs review</h1>
      <div class="subtitle">
        This graph compares the active file against a safe-fix preview. The editor is unchanged until you run Apply All Safe Fixes.
      </div>
      <div class="file-chip">${escapeHtml(model.fileName)}</div>
    </section>

    <section class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Before findings</div>
        <div class="summary-value">${model.before.metrics.findingCount}</div>
        <div class="summary-copy">${model.before.metrics.totalTokens} tokens in the current file.</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Safe fixes available</div>
        <div class="summary-value">${model.beforeFixCounts.safe}</div>
        <div class="summary-copy">Automatic changes TokenLint can preview without editing the file.</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Review-required now</div>
        <div class="summary-value">${model.beforeFixCounts.reviewRequired}</div>
        <div class="summary-copy">Findings that still require human review before any edit.</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">After preview findings</div>
        <div class="summary-value">${model.after.metrics.findingCount}</div>
        <div class="summary-copy">${model.after.metrics.totalTokens} tokens after the safe-fix preview.</div>
      </div>
    </section>

    <section class="flow">
      <article class="state-card before">
        <div class="state-title">Before</div>
        <div class="state-subtitle">The current scan result from the active editor.</div>
        <div class="state-metric"><span>Findings</span><strong>${model.before.metrics.findingCount}</strong></div>
        <div class="state-metric"><span>Safe fixes</span><strong>${model.beforeFixCounts.safe}</strong></div>
        <div class="state-metric"><span>Review-required fixes</span><strong>${model.beforeFixCounts.reviewRequired}</strong></div>
        <div class="state-metric"><span>Tokens</span><strong>${model.before.metrics.totalTokens}</strong></div>
      </article>

      <div class="connector" aria-hidden="true"></div>

      <div class="steps-column">
        ${graphStepsHtml}
      </div>

      <div class="connector" aria-hidden="true"></div>

      <article class="state-card after">
        <div class="state-title">After Safe Preview</div>
        <div class="state-subtitle">Projected state if you apply the safe automatic fixes only.</div>
        <div class="state-metric"><span>Findings</span><strong>${model.after.metrics.findingCount}</strong></div>
        <div class="state-metric"><span>Safe fixes left</span><strong>${model.afterFixCounts.safe}</strong></div>
        <div class="state-metric"><span>Review-required fixes left</span><strong>${model.afterFixCounts.reviewRequired}</strong></div>
        <div class="state-metric"><span>Tokens</span><strong>${model.after.metrics.totalTokens}</strong></div>
      </article>
    </section>

    <section>
      <div class="section-title">Manual Review Still Required</div>
      <div class="review-grid">
        ${manualReviewHtml}
      </div>
    </section>
  </div>
</body>
</html>`;
}

function renderGraphStep(step: GraphStep): string {
  return `
    <article class="step-card">
      <div class="step-eyebrow">Line ${step.lineNumber}</div>
      <div class="step-title">${escapeHtml(step.title)}</div>
      <div class="step-copy">${escapeHtml(step.explanation)}</div>
      <div class="code-grid">
        <div class="code-block">
          <div class="code-label">Before</div>
          <pre>${escapeHtml(step.before)}</pre>
        </div>
        <div class="code-block">
          <div class="code-label">After</div>
          <pre>${escapeHtml(step.after)}</pre>
        </div>
      </div>
    </article>
  `;
}

function renderManualReviewFix(fix: TokenLintFix): string {
  return `
    <article class="review-card">
      <div class="review-title">${escapeHtml(fix.title)}</div>
      <div class="review-copy">${escapeHtml(fix.explanation)}</div>
      <div class="review-line">Line ${fix.loc.startLine + 1}</div>
    </article>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}