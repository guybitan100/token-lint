import { beforeEach, describe, expect, it, vi } from 'vitest';

const scanFilterMocks = vi.hoisted(() => ({
  statSync: vi.fn(),
  readFileSync: vi.fn(),
  getWorkspaceFolder: vi.fn(),
  uriFile: vi.fn((fileName: string) => ({ fsPath: fileName })),
  detectKind: vi.fn(),
  isGeneratedDependencyFile: vi.fn(),
  normalizeFileName: vi.fn((fileName: string) => fileName.replace(/^.*\//, ''))
}));

vi.mock('fs', () => ({
  statSync: scanFilterMocks.statSync,
  readFileSync: scanFilterMocks.readFileSync
}));

vi.mock('vscode', () => ({
  workspace: {
    getWorkspaceFolder: scanFilterMocks.getWorkspaceFolder
  },
  Uri: {
    file: scanFilterMocks.uriFile
  }
}));

vi.mock('../../core/parser/languageDetector', () => ({
  detectKind: scanFilterMocks.detectKind,
  isGeneratedDependencyFile: scanFilterMocks.isGeneratedDependencyFile,
  normalizeFileName: scanFilterMocks.normalizeFileName
}));

describe('scanFilter', () => {
  beforeEach(() => {
    vi.resetModules();
    scanFilterMocks.statSync.mockReset();
    scanFilterMocks.readFileSync.mockReset();
    scanFilterMocks.getWorkspaceFolder.mockReset();
    scanFilterMocks.uriFile.mockClear();
    scanFilterMocks.detectKind.mockReset();
    scanFilterMocks.isGeneratedDependencyFile.mockReset();
    scanFilterMocks.normalizeFileName.mockReset();
    scanFilterMocks.normalizeFileName.mockImplementation((fileName: string) => fileName.replace(/^.*\//, ''));
  });

  it('skips generated dependency files and unsupported files', async () => {
    const { getSkipReason, shouldAnalyzeFile } = await import('./scanFilter');
    scanFilterMocks.isGeneratedDependencyFile.mockReturnValue(true);

    expect(shouldAnalyzeFile('/workspace/package-lock.json')).toBe(false);
    expect(getSkipReason('/workspace/package-lock.json')).toBe('generated dependency lockfile');

    scanFilterMocks.isGeneratedDependencyFile.mockReturnValue(false);
    scanFilterMocks.detectKind.mockReturnValue('unknown');
    expect(shouldAnalyzeFile('/workspace/file.exe')).toBe(false);
    expect(getSkipReason('/workspace/file.exe')).toBe('unsupported file type');

    scanFilterMocks.detectKind.mockReturnValue('python');
    expect(shouldAnalyzeFile('/workspace/mcp_server.py')).toBe(true);

    scanFilterMocks.detectKind.mockReturnValue('typescript');
    expect(shouldAnalyzeFile('/workspace/agents/release-agent.ts')).toBe(true);

    scanFilterMocks.detectKind.mockReturnValue('markdown');
    expect(shouldAnalyzeFile('/workspace/README.md')).toBe(false);
    expect(getSkipReason('/workspace/README.md')).toBe(
      'not a skill, agent, prompt, or MCP artifact'
    );
  });

  it('applies ignore patterns from the workspace root and reuses the cached ignore file', async () => {
    const { shouldAnalyzeFile } = await import('./scanFilter');
    scanFilterMocks.isGeneratedDependencyFile.mockReturnValue(false);
    scanFilterMocks.detectKind.mockReturnValue('markdown');
    scanFilterMocks.getWorkspaceFolder.mockReturnValue({
      uri: { fsPath: '/workspace' }
    });
    scanFilterMocks.statSync.mockReturnValue({ mtimeMs: 1000 });
    scanFilterMocks.readFileSync.mockReturnValue('copilot-instructions.md\nlogs/\n');

    expect(shouldAnalyzeFile('/workspace/copilot-instructions.md')).toBe(false);
    expect(shouldAnalyzeFile('/workspace/logs/nested/prompt.md')).toBe(false);
    expect(shouldAnalyzeFile('/workspace/.github/agents/release.md')).toBe(true);
    expect(scanFilterMocks.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('describes ignored and otherwise excluded files', async () => {
    const { getSkipReason, shouldAnalyzeFile } = await import('./scanFilter');
    scanFilterMocks.isGeneratedDependencyFile.mockReturnValue(false);
    scanFilterMocks.detectKind.mockReturnValue('markdown');
    scanFilterMocks.getWorkspaceFolder.mockReturnValue({
      uri: { fsPath: '/workspace' }
    });
    scanFilterMocks.statSync.mockReturnValue({ mtimeMs: 1 });
    scanFilterMocks.readFileSync.mockReturnValue('.github/agents/*.md\n');

    expect(shouldAnalyzeFile('/workspace/.github/agents/todo.md')).toBe(false);
    expect(getSkipReason('/workspace/.github/agents/todo.md')).toBe(
      'ignored by .tokenlintignore: .github/agents/todo.md'
    );

    scanFilterMocks.getWorkspaceFolder.mockReturnValue(undefined);
    scanFilterMocks.statSync.mockImplementation(() => {
      throw new Error('missing');
    });
    expect(shouldAnalyzeFile('/other/place/AGENTS.md')).toBe(true);
    expect(getSkipReason('/other/place/README.md')).toBe('not a skill, agent, prompt, or MCP artifact');
  });

  it('matches basename-only ignores and treats empty ignore files as no-op', async () => {
    const { shouldAnalyzeFile } = await import('./scanFilter');
    scanFilterMocks.isGeneratedDependencyFile.mockReturnValue(false);
    scanFilterMocks.detectKind.mockReturnValue('markdown');
    scanFilterMocks.getWorkspaceFolder.mockReturnValue({
      uri: { fsPath: '/workspace' }
    });
    scanFilterMocks.statSync.mockReturnValue({ mtimeMs: 2 });
    scanFilterMocks.readFileSync.mockReturnValue('AGENTS.md\n');

    expect(shouldAnalyzeFile('/workspace/nested/AGENTS.md')).toBe(false);

    vi.resetModules();
    scanFilterMocks.isGeneratedDependencyFile.mockReturnValue(false);
    scanFilterMocks.detectKind.mockReturnValue('markdown');
    scanFilterMocks.getWorkspaceFolder.mockReturnValue({
      uri: { fsPath: '/workspace' }
    });
    scanFilterMocks.statSync.mockReturnValue({ mtimeMs: 3 });
    scanFilterMocks.readFileSync.mockReturnValue('# only comments\n\n');

    const reloaded = await import('./scanFilter');
    expect(reloaded.shouldAnalyzeFile('/workspace/nested/copilot-instructions.md')).toBe(true);
  });

  it('only analyzes files that look like agent, skill, prompt, or MCP artifacts', async () => {
    const { shouldAnalyzeFile, workspaceScanGlob } = await import('./scanFilter');
    scanFilterMocks.isGeneratedDependencyFile.mockReturnValue(false);
    scanFilterMocks.getWorkspaceFolder.mockReturnValue(undefined);
    scanFilterMocks.statSync.mockImplementation(() => {
      throw new Error('missing');
    });

    scanFilterMocks.detectKind.mockReturnValue('yaml');
    expect(shouldAnalyzeFile('/workspace/skills/reviewer/skill.yaml')).toBe(true);

    scanFilterMocks.detectKind.mockReturnValue('json');
    expect(shouldAnalyzeFile('/workspace/config/mcp.json')).toBe(true);

    scanFilterMocks.detectKind.mockReturnValue('markdown');
    expect(shouldAnalyzeFile('/workspace/.github/agents/release.md')).toBe(true);
    expect(shouldAnalyzeFile('/workspace/docs/overview.md')).toBe(false);

    scanFilterMocks.detectKind.mockReturnValue('typescript');
    expect(shouldAnalyzeFile('/workspace/mcp/server.ts')).toBe(true);
    expect(shouldAnalyzeFile('/workspace/src/index.ts')).toBe(false);

    expect(workspaceScanGlob).toBe('**/*.{md,prompt,yaml,yml,json,ts,tsx,py}');
  });
});