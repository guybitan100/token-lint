import { beforeEach, describe, expect, it, vi } from 'vitest';

const extensionMocks = vi.hoisted(() => {
  const commandHandlers = new Map<string, () => Promise<void>>();
  const state = {
    activeTextEditor: undefined as
      | {
          document: {
            fileName: string;
          };
        }
      | undefined,
    saveHandler: undefined as ((document: { fileName: string }) => void) | undefined
  };

  const diagnosticsInstance = {
    scan: vi.fn(),
    getCached: vi.fn(),
    dispose: vi.fn()
  };
  const statusBar = {
    text: '',
    show: vi.fn()
  };

  class MockTokenLintDiagnosticProvider {
    scan = diagnosticsInstance.scan;
    getCached = diagnosticsInstance.getCached;
    dispose = diagnosticsInstance.dispose;
  }

  class MockTokenLintSidebarProvider {
    static readonly viewType = 'tokenlint.sidebar';

    constructor(public extensionUri: unknown) {}
  }

  class MockTokenLintCodeActionProvider {
    static readonly providedCodeActionKinds = ['quickfix'];
  }

  return {
    state,
    commandHandlers,
    diagnosticsInstance,
    statusBar,
    registerWebviewViewProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerCommand: vi.fn((command: string, handler: () => Promise<void>) => {
      commandHandlers.set(command, handler);
      return { dispose: vi.fn() };
    }),
    registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerCodeActionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
    onDidSaveTextDocument: vi.fn((handler: (document: { fileName: string }) => void) => {
      state.saveHandler = handler;
      return { dispose: vi.fn() };
    }),
    createStatusBarItem: vi.fn(() => statusBar),
    scanCurrentFile: vi.fn(),
    scanWorkspace: vi.fn(),
    generateReport: vi.fn(),
    showIR: vi.fn(),
    applyAllSafeFixes: vi.fn(),
    showFixGraph: vi.fn(),
    scanOrFix: vi.fn(),
    createHoverProvider: vi.fn(() => 'hover-provider'),
    shouldAnalyzeFile: vi.fn(),
    MockTokenLintDiagnosticProvider,
    MockTokenLintSidebarProvider,
    MockTokenLintCodeActionProvider,
    StatusBarAlignment: { Left: 1 }
  };
});

vi.mock('vscode', () => ({
  window: {
    get activeTextEditor() {
      return extensionMocks.state.activeTextEditor;
    },
    createStatusBarItem: extensionMocks.createStatusBarItem,
    registerWebviewViewProvider: extensionMocks.registerWebviewViewProvider
  },
  commands: {
    registerCommand: extensionMocks.registerCommand
  },
  languages: {
    registerHoverProvider: extensionMocks.registerHoverProvider,
    registerCodeActionsProvider: extensionMocks.registerCodeActionsProvider
  },
  workspace: {
    onDidSaveTextDocument: extensionMocks.onDidSaveTextDocument
  },
  StatusBarAlignment: extensionMocks.StatusBarAlignment
}));

vi.mock('./providers/diagnosticProvider', () => ({
  TokenLintDiagnosticProvider: extensionMocks.MockTokenLintDiagnosticProvider
}));

vi.mock('./providers/hoverProvider', () => ({
  createHoverProvider: extensionMocks.createHoverProvider
}));

vi.mock('./providers/codeActionProvider', () => ({
  TokenLintCodeActionProvider: extensionMocks.MockTokenLintCodeActionProvider
}));

vi.mock('./providers/sidebarProvider', () => ({
  TokenLintSidebarProvider: extensionMocks.MockTokenLintSidebarProvider
}));

vi.mock('./utils/scanFilter', () => ({
  shouldAnalyzeFile: extensionMocks.shouldAnalyzeFile
}));

vi.mock('./commands/scanCurrentFile', () => ({
  scanCurrentFile: extensionMocks.scanCurrentFile
}));

vi.mock('./commands/scanWorkspace', () => ({
  scanWorkspace: extensionMocks.scanWorkspace
}));

vi.mock('./commands/generateReport', () => ({
  generateReport: extensionMocks.generateReport
}));

vi.mock('./commands/showIR', () => ({
  showIR: extensionMocks.showIR
}));

vi.mock('./commands/applyAllSafeFixes', () => ({
  applyAllSafeFixes: extensionMocks.applyAllSafeFixes
}));

vi.mock('./commands/showFixGraph', () => ({
  showFixGraph: extensionMocks.showFixGraph
}));

vi.mock('./commands/scanOrFix', () => ({
  scanOrFix: extensionMocks.scanOrFix
}));

import { activate, deactivate } from './extension';

describe('extension activation', () => {
  beforeEach(() => {
    extensionMocks.commandHandlers.clear();
    extensionMocks.state.activeTextEditor = undefined;
    extensionMocks.state.saveHandler = undefined;
    extensionMocks.statusBar.text = '';
    extensionMocks.statusBar.show.mockReset();
    extensionMocks.registerWebviewViewProvider.mockClear();
    extensionMocks.registerCommand.mockClear();
    extensionMocks.registerHoverProvider.mockClear();
    extensionMocks.registerCodeActionsProvider.mockClear();
    extensionMocks.onDidSaveTextDocument.mockClear();
    extensionMocks.createStatusBarItem.mockClear();
    extensionMocks.scanCurrentFile.mockReset();
    extensionMocks.scanWorkspace.mockReset();
    extensionMocks.generateReport.mockReset();
    extensionMocks.showIR.mockReset();
    extensionMocks.applyAllSafeFixes.mockReset();
    extensionMocks.showFixGraph.mockReset();
    extensionMocks.scanOrFix.mockReset();
    extensionMocks.createHoverProvider.mockClear();
    extensionMocks.shouldAnalyzeFile.mockReset();
    extensionMocks.diagnosticsInstance.scan.mockReset();
    extensionMocks.diagnosticsInstance.getCached.mockReset();
    extensionMocks.diagnosticsInstance.dispose.mockReset();
  });

  it('registers providers, commands, and status bar wiring', async () => {
    const context = { extensionUri: 'ext-uri', subscriptions: [] as unknown[] };
    extensionMocks.diagnosticsInstance.getCached.mockReturnValue({
      metrics: { findingCount: 3, totalTokens: 30 }
    });
    extensionMocks.state.activeTextEditor = {
      document: {
        fileName: 'prompt.md'
      }
    };

    activate(context as never);

    expect(extensionMocks.statusBar.text).toBe('TokenLint: Ready');
    expect(extensionMocks.statusBar.show).toHaveBeenCalled();
    expect(extensionMocks.registerWebviewViewProvider).toHaveBeenCalledWith(
      'tokenlint.sidebar',
      expect.any(extensionMocks.MockTokenLintSidebarProvider)
    );
    expect(extensionMocks.registerCommand).toHaveBeenCalledTimes(7);
    expect(extensionMocks.registerHoverProvider).toHaveBeenCalledWith(
      expect.arrayContaining([
        { scheme: 'file', language: 'markdown' },
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'python' },
        { scheme: 'file', pattern: '**/*.prompt' }
      ]),
      'hover-provider'
    );
    expect(extensionMocks.registerCodeActionsProvider).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(extensionMocks.MockTokenLintCodeActionProvider),
      { providedCodeActionKinds: ['quickfix'] }
    );

    await extensionMocks.commandHandlers.get('tokenlint.scanCurrentFile')?.();
    expect(extensionMocks.scanCurrentFile).toHaveBeenCalledWith(extensionMocks.diagnosticsInstance);
    expect(extensionMocks.statusBar.text).toBe('TokenLint: 3 findings | 30 tokens');

    extensionMocks.state.activeTextEditor = undefined;
    await extensionMocks.commandHandlers.get('tokenlint.scanCurrentFile')?.();

    await extensionMocks.commandHandlers.get('tokenlint.scanWorkspace')?.();
    expect(extensionMocks.scanWorkspace).toHaveBeenCalledWith(extensionMocks.diagnosticsInstance);

    await extensionMocks.commandHandlers.get('tokenlint.scanOrFix')?.();
    expect(extensionMocks.scanOrFix).toHaveBeenCalled();

    await extensionMocks.commandHandlers.get('tokenlint.generateReport')?.();
    expect(extensionMocks.generateReport).toHaveBeenCalled();

    await extensionMocks.commandHandlers.get('tokenlint.showIR')?.();
    expect(extensionMocks.showIR).toHaveBeenCalled();

    await extensionMocks.commandHandlers.get('tokenlint.applyAllSafeFixes')?.();
    expect(extensionMocks.applyAllSafeFixes).toHaveBeenCalledWith(extensionMocks.diagnosticsInstance);

    await extensionMocks.commandHandlers.get('tokenlint.showFixGraph')?.();
    expect(extensionMocks.showFixGraph).toHaveBeenCalled();

    expect(context.subscriptions.length).toBe(12);
  });

  it('updates diagnostics on save for both ignored and analyzable files', () => {
    const context = { extensionUri: 'ext-uri', subscriptions: [] as unknown[] };
    const ignoredDocument = { fileName: 'ignored.tmp' };
    const analyzedDocument = { fileName: 'prompt.md' };

    activate(context as never);

    extensionMocks.shouldAnalyzeFile.mockReturnValue(false);
    extensionMocks.state.saveHandler?.(ignoredDocument);
    expect(extensionMocks.diagnosticsInstance.scan).toHaveBeenCalledWith(ignoredDocument);

    extensionMocks.shouldAnalyzeFile.mockReturnValue(true);
    extensionMocks.diagnosticsInstance.scan.mockReturnValue({
      metrics: { findingCount: 4, totalTokens: 44 }
    });
    extensionMocks.state.saveHandler?.(analyzedDocument);

    expect(extensionMocks.diagnosticsInstance.scan).toHaveBeenCalledWith(analyzedDocument);
    expect(extensionMocks.statusBar.text).toBe('TokenLint: 4 findings | 44 tokens');
  });

  it('deactivate is a no-op', () => {
    expect(deactivate()).toBeUndefined();
  });
});