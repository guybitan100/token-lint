# AI-Security for VS Code

AI-Security is a compiler-style VS Code extension that finds security risks in prompts, AI skills, MCP workflows, and agent instructions before they reach production.

## What it detects

- Prompt injection and instruction hijacking
- Unsafe permissions and suspicious skill behavior
- Encoded payloads
- Unreviewed external endpoints
- Retrieval amplification and risky `top_k` settings
- Oversized prompts, duplicate instructions, and oversized examples

## Workflow

AI-Security parses supported artifacts into an intermediate representation, runs security analysis passes, and reports findings through VS Code diagnostics, hover details, quick fixes, and Markdown reports. Token counts are retained as scan metadata only; prompt-size optimization is intentionally outside this project’s scope.

The Activity Bar sidebar provides:

- Scan / Fix
- Scan Current File
- Scan Workspace
- Generate Report
- Show IR
- Apply All Safe Fixes
- Show Before / After Graph

## Safe fixes

Security fixes are review-oriented: they can neutralize suspicious instructions, annotate external endpoints, replace encoded payloads with review markers, and reduce risky retrieval settings. A human makes the final security decision.

## Scan scope

Workspace scans analyze `.md`, `.prompt`, `.yaml`, `.yml`, `.json`, `.ts`, `.tsx`, and `.py` files that look like AI artifacts, including `AGENTS.md`, `copilot-instructions.md`, `.github/agents/**`, `skills/**`, and `mcp.json`.

Generated lockfiles are skipped automatically. Workspace exclusions are read from `.ai-securityignore`; `.tokenlintignore` remains supported for existing workspaces.

## Commands

- `AI-Security: Scan / Fix...`
- `AI-Security: Scan Current File`
- `AI-Security: Scan Workspace`
- `AI-Security: Generate Report`
- `AI-Security: Show IR`
- `AI-Security: Apply All Safe Fixes`
- `AI-Security: Show Before / After Graph`

## Development

```bash
npm install
npm run compile
npm test
```

Press F5 in VS Code to open the Extension Development Host.

## Test fixture

Open `src/test-fixtures/unsafe-skill.yaml` and run `AI-Security: Scan Current File`. The fixture contains examples of prompt injection, unsafe permissions, retrieval amplification, malicious skill-test behavior, and external endpoints.

## Architecture

```text
AI Artifacts
  ↓
Parser → Intermediate Representation
  ↓
Optimization and retrieval analysis
  ↓
AI security analysis
  ↓
Diagnostics / quick fixes / reports
```
