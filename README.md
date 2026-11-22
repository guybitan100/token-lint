# TokenLint VS Code Compiler MVP

TokenLint is a compiler-style VS Code extension for prompts, AI skills, MCP workflows, and cognitive security.

## What This MVP Includes

- Real VS Code extension entrypoint
- Compiler-style IR
- Parser from prompt/skill files into IR
- Optimization passes
- Retrieval passes
- Security passes
- Malicious skill test detection
- Prompt injection detection
- Encoded payload detection
- Unsafe permission detection
- External endpoint detection
- Diagnostics
- Hover provider
- Quick fixes
- Workspace scanner
- Markdown report generator
- Show IR command
- Before / after fix graph preview

## Activity Bar Sidebar

TokenLint now adds a dedicated Activity Bar icon in VS Code.

The sidebar includes:

- Scan / Fix... quick action
- Scan Current File
- Scan Workspace
- Generate Report
- Show IR
- Apply All Safe Fixes
- Show Before / After Graph

## Fix Engine

TokenLint includes a safe fix engine.

### Safe automatic fixes

- Remove exact duplicate instructions

`TokenLint: Apply All Safe Fixes` rescans the active editor before applying fixes, so duplicate-instruction removals work even if the file has not been scanned manually yet.

### Review-required fixes

- Reduce `top_k`
- Neutralize suspicious prompt-injection phrases
- Comment external endpoints for review
- Disable suspicious skill tests
- Replace suspicious encoded payloads with a review marker

## Commands

- `TokenLint: Scan / Fix...`
- `TokenLint: Scan Current File`
- `TokenLint: Scan Workspace`
- `TokenLint: Generate Report`
- `TokenLint: Show IR`
- `TokenLint: Apply All Safe Fixes`
- `TokenLint: Show Before / After Graph`

## Scan Scope

TokenLint analyzes prompt artifacts and skips known generated or ignored content.

- Workspace scans consider `.md`, `.prompt`, `.yaml`, `.yml`, `.json`, `.ts`, `.tsx`, and `.py`
- Files must also look like skill, agent, prompt, or MCP artifacts based on their path or file name, for example `AGENTS.md`, `copilot-instructions.md`, `.github/agents/**`, `skills/**`, or `mcp.json`
- Generated dependency lockfiles are skipped automatically: `bun.lockb`, `package-lock.json`, `pnpm-lock.yaml`, `pnpm-lock.yml`, `yarn.lock`
- Workspace exclusions are read from `.tokenlintignore`

## Testing And Coverage

TokenLint uses Vitest with V8 coverage.

```bash
npm test
npm run test:coverage
```

Coverage is enforced at 95% for statements, branches, functions, and lines.

The coverage run targets `src/**/*.ts` and excludes:

- test files
- type-only contracts such as IR and fix interfaces
- test utilities under `src/test-utils/**`

## Development

```bash
npm install
npm run compile
```

Then press F5 in VS Code to open the Extension Development Host.

## Architecture

```text
Source Files
  ↓
Parser
  ↓
IR - Intermediate Representation
  ↓
Optimization Passes
  ↓
Retrieval Passes
  ↓
Security Passes
  ↓
Diagnostics / Hover / Quick Fixes / Reports
```

## Test Fixture

Open:

```text
src/test-fixtures/unsafe-skill.yaml
```

Run:

```text
TokenLint: Scan Current File
```

You should see findings for:

- prompt injection
- unsafe permissions
- retrieval amplification
- malicious skill test behavior
- external endpoint

You can also run:

```text
TokenLint: Apply All Safe Fixes
```

to automatically remove exact duplicate instructions after the file is rescanned.

Or run:

```text
TokenLint: Show Before / After Graph
```

to open a visual preview of the current scan state, the safe automatic changes, and the findings that still need manual review.
