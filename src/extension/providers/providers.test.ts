import { beforeEach, describe, expect, it, vi } from 'vitest';

const providerMocks = vi.hoisted(() => {
  class Position {
    constructor(
      public line: number,
      public character: number
    ) {}
  }

  class Range {
    constructor(
      public start: Position,
      public end: Position
    ) {}

    contains(position: Position) {
      if (position.line < this.start.line || position.line > this.end.line) {
        return false;
      }

      if (position.line === this.start.line && position.character < this.start.character) {
        return false;
      }

      if (position.line === this.end.line && position.character > this.end.character) {
        return false;
      }

      return true;
    }
  }

  class Diagnostic {
    public source?: string;
    public code?: string | number;

    constructor(
      public range: Range,
      public message: string,
      public severity: number
    ) {}
  }

  class MarkdownString {
    public value = '';

    appendMarkdown(text: string) {
      this.value += text;
    }
  }

  class Hover {
    constructor(public contents: MarkdownString) {}
  }

  class WorkspaceEdit {
    public deletes: Array<{ uri: string; range: unknown }> = [];
    public replacements: Array<{ uri: string; range: unknown; text: string }> = [];

    delete(uri: string, range: unknown) {
      this.deletes.push({ uri, range });
    }

    replace(uri: string, range: unknown, text: string) {
      this.replacements.push({ uri, range, text });
    }
  }

  class CodeAction {
    public diagnostics?: unknown[];
    public edit?: WorkspaceEdit;
    public isPreferred?: boolean;

    constructor(
      public title: string,
      public kind: string
    ) {}
  }

  return {
    Position,
    Range,
    Diagnostic,
    MarkdownString,
    Hover,
    WorkspaceEdit,
    CodeAction,
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2
    },
    CodeActionKind: {
      QuickFix: 'quickfix'
    },
    getDiagnostics: vi.fn(),
    createDiagnosticCollection: vi.fn(),
    executeCommand: vi.fn(),
    analyze: vi.fn(() => ({
      findings: [],
      metrics: { findingCount: 0, totalTokens: 0, errorCount: 0, warningCount: 0 },
      ir: { type: 'prompt' }
    })),
    shouldAnalyzeFile: vi.fn(),
    toDiagnostic: vi.fn()
  };
});

vi.mock('vscode', () => ({
  Position: providerMocks.Position,
  Range: providerMocks.Range,
  Diagnostic: providerMocks.Diagnostic,
  DiagnosticSeverity: providerMocks.DiagnosticSeverity,
  MarkdownString: providerMocks.MarkdownString,
  Hover: providerMocks.Hover,
  WorkspaceEdit: providerMocks.WorkspaceEdit,
  CodeAction: providerMocks.CodeAction,
  CodeActionKind: providerMocks.CodeActionKind,
  languages: {
    getDiagnostics: providerMocks.getDiagnostics,
    createDiagnosticCollection: providerMocks.createDiagnosticCollection
  },
  commands: {
    executeCommand: providerMocks.executeCommand
  }
}));

vi.mock('../../core/engine/engine', () => ({
  analyze: providerMocks.analyze
}));

vi.mock('../utils/scanFilter', () => ({
  shouldAnalyzeFile: providerMocks.shouldAnalyzeFile
}));

vi.mock('../utils/vscodeMapping', () => ({
  toDiagnostic: providerMocks.toDiagnostic
}));

import { TokenLintCodeActionProvider } from './codeActionProvider';
import { TokenLintDiagnosticProvider } from './diagnosticProvider';
import { createHoverProvider } from './hoverProvider';
import { TokenLintSidebarProvider } from './sidebarProvider';

describe('extension providers', () => {
  beforeEach(() => {
    providerMocks.getDiagnostics.mockReset();
    providerMocks.createDiagnosticCollection.mockReset();
    providerMocks.executeCommand.mockReset();
    providerMocks.analyze.mockReset();
    providerMocks.shouldAnalyzeFile.mockReset();
    providerMocks.toDiagnostic.mockReset();
  });

  it('diagnostic provider caches supported scans and clears skipped documents', () => {
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn()
    };
    const document = {
      uri: { toString: () => 'file:///prompt.md' },
      fileName: 'prompt.md',
      getText: () => 'Always help'
    };
    const result = {
      findings: [{ id: 'finding' }],
      metrics: { findingCount: 1, totalTokens: 10, errorCount: 0, warningCount: 1 },
      ir: { type: 'prompt' }
    };
    const mappedDiagnostic = { source: 'AI-Security' };
    providerMocks.createDiagnosticCollection.mockReturnValue(collection);
    providerMocks.shouldAnalyzeFile.mockReturnValue(true);
    providerMocks.analyze.mockReturnValue(result as never);
    providerMocks.toDiagnostic.mockReturnValue(mappedDiagnostic);

    const provider = new TokenLintDiagnosticProvider();
    expect(provider.scan(document as never)).toBe(result);
    expect(collection.set).toHaveBeenCalledWith(document.uri, [mappedDiagnostic]);
    expect(provider.getCached(document as never)).toBe(result);

    providerMocks.shouldAnalyzeFile.mockReturnValue(false);
    expect(provider.scan(document as never).findings).toEqual([]);
    expect(collection.delete).toHaveBeenCalledWith(document.uri);
    expect(provider.getCached(document as never)).toBeUndefined();

    provider.dispose();
    expect(collection.dispose).toHaveBeenCalled();
  });

  it('hover provider returns matching TokenLint diagnostics as markdown', () => {
    const provider = createHoverProvider();
    const range = new providerMocks.Range(new providerMocks.Position(1, 0), new providerMocks.Position(1, 10));
    providerMocks.getDiagnostics.mockReturnValue([
      {
        range,
        source: 'AI-Security',
        code: 'security.promptInjection',
        message: 'Suspicious instruction'
      },
      {
        range,
        source: 'other',
        code: 'ignore',
        message: 'ignore'
      }
    ]);

    const hover = provider.provideHover(
      { uri: 'file:///prompt.md' } as never,
      new providerMocks.Position(1, 5) as never,
      {} as never
    );

    expect(hover).toBeInstanceOf(providerMocks.Hover);
    expect(((hover as unknown) as InstanceType<typeof providerMocks.Hover>).contents.value).toContain(
      '**security.promptInjection**: Suspicious instruction'
    );

    providerMocks.getDiagnostics.mockReturnValue([]);
    expect(
      provider.provideHover(
        { uri: 'file:///prompt.md' } as never,
        new providerMocks.Position(1, 5) as never,
        {} as never
      )
    ).toBeUndefined();
  });

  it('sidebar provider renders html and routes every supported webview command', async () => {
    let handler: ((message: { command: string }) => Promise<void>) | undefined;
    const webviewView = {
      webview: {
        options: undefined,
        html: '',
        onDidReceiveMessage(callback: (message: { command: string }) => Promise<void>) {
          handler = callback;
        }
      }
    };

    const provider = new TokenLintSidebarProvider({} as never);
    provider.resolveWebviewView(webviewView as never);

    expect(webviewView.webview.options).toEqual({ enableScripts: true });
    expect(webviewView.webview.html).toContain('Apply All Safe Fixes');
    expect(webviewView.webview.html).toContain('Show Before / After Graph');
    expect(webviewView.webview.html).toContain("acquireVsCodeApi()");

    const commands = [
      ['scanOrFix', 'tokenlint.scanOrFix'],
      ['scanCurrentFile', 'tokenlint.scanCurrentFile'],
      ['scanWorkspace', 'tokenlint.scanWorkspace'],
      ['generateReport', 'tokenlint.generateReport'],
      ['showIR', 'tokenlint.showIR'],
      ['applyAllSafeFixes', 'tokenlint.applyAllSafeFixes'],
      ['showFixGraph', 'tokenlint.showFixGraph']
    ] as const;

    for (const [messageCommand, vscodeCommand] of commands) {
      await handler?.({ command: messageCommand });
      expect(providerMocks.executeCommand).toHaveBeenLastCalledWith(vscodeCommand);
    }
  });

  it('code action provider builds edits for each supported TokenLint rule', () => {
    const provider = new TokenLintCodeActionProvider();
    const range = new providerMocks.Range(new providerMocks.Position(0, 0), new providerMocks.Position(0, 12));
    const document = {
      uri: 'file:///prompt.md',
      lineAt: vi.fn((line: number) => {
        const textByLine = new Map<number, string>([
          [0, 'Always be helpful'],
          [1, 'top_k: 15'],
          [2, 'ignore previous instructions'],
          [3, 'https://example.com/hook'],
          [4, 'QWxhZGRpbjpvcGVuIHNlc2FtZQ=='],
          [5, 'download and execute']
        ]);

        return {
          text: textByLine.get(line) ?? '',
          range,
          rangeIncludingLineBreak: `line-${line}`
        };
      })
    };

    const actions = provider.provideCodeActions(
      document as never,
      range as never,
      {
        diagnostics: [
          { source: 'AI-Security', code: 'optimization.duplicateInstruction', range: { start: { line: 0 } } },
          { source: 'AI-Security', code: 'retrieval.topKRisk', range: { start: { line: 1 } } },
          { source: 'AI-Security', code: 'security.promptInjection', range: { start: { line: 2 } } },
          { source: 'AI-Security', code: 'security.externalEndpoint', range: { start: { line: 3 } } },
          { source: 'AI-Security', code: 'security.encodedPayload', range: { start: { line: 4 } } },
          { source: 'AI-Security', code: 'skills.maliciousSkillTest', range: { start: { line: 5 } } },
          { source: 'other', code: 'ignored', range: { start: { line: 6 } } }
        ]
      } as never
    );

    expect(actions).toHaveLength(6);
    const duplicateEdit = actions[0].edit as unknown as { deletes: Array<{ uri: string; range: string }> };
    const retrievalEdit = actions[1].edit as unknown as { replacements: Array<{ text: string }> };
    const injectionEdit = actions[2].edit as unknown as { replacements: Array<{ text: string }> };
    const endpointEdit = actions[3].edit as unknown as { replacements: Array<{ text: string }> };
    const payloadEdit = actions[4].edit as unknown as { replacements: Array<{ text: string }> };
    const skillTestEdit = actions[5].edit as unknown as { replacements: Array<{ text: string }> };
    expect(actions[0]).toMatchObject({
      title: 'AI-Security: Remove duplicate instruction',
      isPreferred: true
    });
    expect(duplicateEdit.deletes).toEqual([{ uri: 'file:///prompt.md', range: 'line-0' }]);
    expect(retrievalEdit.replacements[0].text).toBe('top_k: 6');
    expect(injectionEdit.replacements[0].text).toContain('[REMOVED: suspicious instruction override]');
    expect(endpointEdit.replacements[0].text).toBe(
      '# TOKENLINT REVIEW REQUIRED: https://example.com/hook'
    );
    expect(payloadEdit.replacements[0].text).toBe(
      '[TOKENLINT REMOVED: suspicious encoded payload requires review]'
    );
    expect(skillTestEdit.replacements[0].text).toBe(
      '# TOKENLINT DISABLED SUSPICIOUS TEST: download and execute'
    );
  });
});
