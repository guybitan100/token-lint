import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisResult } from '../../core/engine/engine';

const vscodeMock = vi.hoisted(() => {
  const state = {
    activeTextEditor: undefined as { document: MockDocument } | undefined
  };

  return {
    state,
    showInformationMessage: vi.fn(),
    applyEdit: vi.fn(),
    getDiagnostics: vi.fn(),
    WorkspaceEdit: class {
      public deletes: Array<{ uri: string; range: string }> = [];

      delete(uri: string, range: string) {
        this.deletes.push({ uri, range });
      }
    }
  };
});

const scanFilterMock = vi.hoisted(() => ({
  shouldAnalyzeFile: vi.fn(),
  getSkipReason: vi.fn()
}));

const showFixGraphMock = vi.hoisted(() => ({
  applySafeFixPreview: vi.fn(),
  showFixGraphPreview: vi.fn()
}));

vi.mock('vscode', () => ({
  window: {
    get activeTextEditor() {
      return vscodeMock.state.activeTextEditor;
    },
    showInformationMessage: vscodeMock.showInformationMessage
  },
  languages: {
    getDiagnostics: vscodeMock.getDiagnostics
  },
  workspace: {
    applyEdit: vscodeMock.applyEdit
  },
  WorkspaceEdit: vscodeMock.WorkspaceEdit
}));

vi.mock('../utils/scanFilter', () => ({
  shouldAnalyzeFile: scanFilterMock.shouldAnalyzeFile,
  getSkipReason: scanFilterMock.getSkipReason
}));

vi.mock('./showFixGraph', () => ({
  applySafeFixPreview: showFixGraphMock.applySafeFixPreview,
  showFixGraphPreview: showFixGraphMock.showFixGraphPreview
}));

import { applyAllSafeFixes } from './applyAllSafeFixes';

type MockDiagnostic = {
  source?: string;
  code?: string | number;
  range: {
    start: {
      line: number;
    };
  };
};

type MockDocument = {
  fileName: string;
  uri: string;
  getText?: ReturnType<typeof vi.fn>;
  lineAt: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

describe('applyAllSafeFixes', () => {
  const emptyResult: AnalysisResult = {
    ir: {} as AnalysisResult['ir'],
    findings: [],
    metrics: {
      totalTokens: 0,
      findingCount: 0,
      errorCount: 0,
      warningCount: 0
    }
  };

  beforeEach(() => {
    vscodeMock.state.activeTextEditor = undefined;
    vscodeMock.showInformationMessage.mockReset();
    vscodeMock.applyEdit.mockReset();
    vscodeMock.getDiagnostics.mockReset();
    scanFilterMock.shouldAnalyzeFile.mockReset();
    scanFilterMock.getSkipReason.mockReset();
    showFixGraphMock.applySafeFixPreview.mockReset();
    showFixGraphMock.showFixGraphPreview.mockReset();
    scanFilterMock.shouldAnalyzeFile.mockReturnValue(true);
    showFixGraphMock.applySafeFixPreview.mockImplementation((text: string) => text);
  });

  it('shows a message when no editor is open', async () => {
    await applyAllSafeFixes({ scan: vi.fn() } as never);

    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      'AI-Security: Open a file in the editor to apply safe fixes.'
    );
  });

  it('reports when only review-required quick fixes are available', async () => {
    const document: MockDocument = {
      fileName: '/workspace/prompt.md',
      uri: 'file:///prompt.md',
      getText: vi.fn(() => 'prompt body'),
      lineAt: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined)
    };

    vscodeMock.state.activeTextEditor = { document };
    const provider = {
      scan: vi.fn(() => ({
        ...emptyResult,
        findings: [
          {
            ruleId: 'security.promptInjection',
            title: 'Suspicious override',
            message: 'Suspicious override',
            severity: 'warning' as const,
            loc: {
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 10
            },
            fix: {
              title: 'Neutralize suspicious instruction',
              replacement: '[REMOVED]'
            }
          }
        ]
      }))
    };
    vscodeMock.getDiagnostics.mockReturnValue([
      {
        source: 'AI-Security',
        code: 'security.promptInjection',
        range: { start: { line: 1 } }
      }
    ]);

    await applyAllSafeFixes(provider as never);

    expect(provider.scan).toHaveBeenCalledWith(document);
    expect(vscodeMock.applyEdit).not.toHaveBeenCalled();
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      'AI-Security: No safe automatic fixes available. 1 review-required quick fix available from Quick Fix.'
    );
  });

  it('reports when the refreshed diagnostics contain no automatic fixes at all', async () => {
    const document: MockDocument = {
      fileName: '/workspace/prompt.md',
      uri: 'file:///prompt.md',
      getText: vi.fn(() => 'prompt body'),
      lineAt: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined)
    };

    vscodeMock.state.activeTextEditor = { document };
    const provider = { scan: vi.fn(() => emptyResult) };
    vscodeMock.getDiagnostics.mockReturnValue([]);

    await applyAllSafeFixes(provider as never);

    expect(provider.scan).toHaveBeenCalledWith(document);
    expect(vscodeMock.applyEdit).not.toHaveBeenCalled();
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      'AI-Security: No safe automatic fixes available.'
    );
  });

  it('rescans the active document before deciding there are no safe fixes', async () => {
    let diagnostics: MockDiagnostic[] = [];
    const document: MockDocument = {
      fileName: '/workspace/prompt.md',
      uri: 'file:///prompt.md',
      getText: vi.fn(() => 'before text'),
      lineAt: vi.fn().mockReturnValue({
        rangeIncludingLineBreak: 'line-range'
      }),
      save: vi.fn().mockResolvedValue(undefined)
    };

    vscodeMock.state.activeTextEditor = { document };

    const provider = {
      scan: vi.fn(() => {
        diagnostics = [{
          source: 'AI-Security',
          code: 'optimization.duplicateInstruction',
          range: {
            start: {
              line: 3
            }
          }
        }];

        return {
          ...emptyResult,
          findings: [
            {
              ruleId: 'optimization.duplicateInstruction',
              title: 'Duplicate instruction',
              message: 'Duplicate instruction',
              severity: 'info' as const,
              loc: {
                startLine: 3,
                startColumn: 0,
                endLine: 3,
                endColumn: 10
              },
              fix: {
                title: 'Remove duplicate instruction'
              }
            }
          ]
        };
      })
    };

    vscodeMock.getDiagnostics.mockImplementation(() => diagnostics);
    vscodeMock.applyEdit.mockResolvedValue(true);
    showFixGraphMock.applySafeFixPreview.mockReturnValue('after text');

    await applyAllSafeFixes(provider as never);

    expect(provider.scan).toHaveBeenCalledWith(document);
    expect(showFixGraphMock.applySafeFixPreview).toHaveBeenCalledWith('before text', [
      expect.objectContaining({
        id: 'optimization.duplicateInstruction:3',
        title: 'Remove duplicate instruction',
        safety: 'safe'
      })
    ]);
    expect(document.lineAt).toHaveBeenCalledWith(3);
    expect(vscodeMock.applyEdit).toHaveBeenCalledTimes(1);
    expect((vscodeMock.applyEdit.mock.calls[0][0] as { deletes: Array<{ uri: string; range: string }> }).deletes).toEqual([
      {
        uri: 'file:///prompt.md',
        range: 'line-range'
      }
    ]);
    expect(document.save).toHaveBeenCalledTimes(1);
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith('AI-Security applied 1 safe fixes.');
    expect(showFixGraphMock.showFixGraphPreview).toHaveBeenCalledWith({
      fileName: '/workspace/prompt.md',
      beforeText: 'before text',
      afterText: 'after text',
      beforeResult: expect.objectContaining({
        findings: expect.any(Array)
      }),
      allFixes: [
        expect.objectContaining({
          id: 'optimization.duplicateInstruction:3',
          title: 'Remove duplicate instruction',
          safety: 'safe'
        })
      ],
      safeFixes: [
        expect.objectContaining({
          id: 'optimization.duplicateInstruction:3',
          title: 'Remove duplicate instruction',
          safety: 'safe'
        })
      ]
    });
  });

  it('does not save or report success when the workspace edit fails', async () => {
    const document: MockDocument = {
      fileName: '/workspace/prompt.md',
      uri: 'file:///prompt.md',
      getText: vi.fn(() => 'before text'),
      lineAt: vi.fn().mockReturnValue({
        rangeIncludingLineBreak: 'line-range'
      }),
      save: vi.fn().mockResolvedValue(undefined)
    };

    vscodeMock.state.activeTextEditor = { document };
    const provider = {
      scan: vi.fn(() => ({
        ...emptyResult,
        findings: [
          {
            ruleId: 'optimization.duplicateInstruction',
            title: 'Duplicate instruction',
            message: 'Duplicate instruction',
            severity: 'info' as const,
            loc: {
              startLine: 4,
              startColumn: 0,
              endLine: 4,
              endColumn: 10
            },
            fix: {
              title: 'Remove duplicate instruction'
            }
          }
        ]
      }))
    };
    vscodeMock.getDiagnostics.mockReturnValue([
      {
        source: 'AI-Security',
        code: 'optimization.duplicateInstruction',
        range: { start: { line: 4 } }
      }
    ]);
    vscodeMock.applyEdit.mockResolvedValue(false);

    await applyAllSafeFixes(provider as never);

    expect(document.save).not.toHaveBeenCalled();
    expect(showFixGraphMock.showFixGraphPreview).not.toHaveBeenCalled();
    expect(vscodeMock.showInformationMessage).not.toHaveBeenCalledWith(
      'AI-Security applied 1 safe fixes.'
    );
  });

  it('skips unsupported files before scanning for fixes', async () => {
    const document: MockDocument = {
      fileName: '/workspace/rewrite.txt',
      uri: 'file:///rewrite.txt',
      getText: vi.fn(() => 'ignored text'),
      lineAt: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined)
    };
    const provider = { scan: vi.fn(() => emptyResult) };

    vscodeMock.state.activeTextEditor = { document };
    scanFilterMock.shouldAnalyzeFile.mockReturnValue(false);
    scanFilterMock.getSkipReason.mockReturnValue('unsupported file type');

    await applyAllSafeFixes(provider as never);

    expect(provider.scan).not.toHaveBeenCalled();
    expect(vscodeMock.applyEdit).not.toHaveBeenCalled();
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      'AI-Security skipped unsupported file type'
    );
  });
});
