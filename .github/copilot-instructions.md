# Copilot Instructions

> Auto-synced from AGENTS.md by RepoLens AI.

## Project Overview

RepoLens AI is a CLI tool that helps developers manage AI context files
(AGENTS.md, CLAUDE.md, .cursorrules) for better AI coding agent performance.

- **Framework:** Node.js
- **Language:** TypeScript (strict, ESM)
- **Package Manager:** npm
- **Architecture:** Modular CLI Architecture (Commands → Core Services → Utilities)
- **Build Tool:** tsup (single-file bundle to `dist/cli.js`)

## Commands

- **Build:** `npm run build`
- **Dev:** `npm run dev` (tsup --watch)
- **Lint:** `npm run lint` (tsc --noEmit)
- **Test:** No tests yet — add vitest for `src/core/` modules

## Architecture Decisions

- **Offline-first**: Static analysis works without any API key.
  AI enhancement is optional and only sends summarized facts, never raw code.
- **Privacy-first**: All content goes through `privacyFilter.ts` before
  touching any external API. Secrets are masked via `utils/masks.ts`.
- **Single-bundle CLI**: tsup bundles everything into one `dist/cli.js`
  with `#!/usr/bin/env node` banner. No separate entry points.
- **No runtime dependencies for dashboard**: The dashboard HTML is generated
  inline in `commands/dashboard.ts` — no separate static file serving needed.

## Gotchas & Known Issues

- `riskDetector.ts` has a `SELF_SKIP_PATTERNS` array — always add new core
  files that contain regex patterns to this array to avoid false positives.
- The `contentReader.ts` module caps at 500 files and 200KB per file to avoid
  memory issues on large repos. Do NOT remove these limits.
- Reporter output MUST go through `utils/logger.ts` — do NOT use `console.log`
  directly, it breaks the `ora` spinner rendering.
- `contextScorer.ts` uses regex to detect generic vs specific rules. When
  adding new generic patterns, always use the `lastIndex = 0` reset because
  the regex flags include `/g` and state carries between calls.
- `fast-glob` has path normalization issues on Windows with backslashes.
  Always use `normalizePath()` from `utils/paths.ts`.

## Key Structure

```
src/
├── cli.ts                    # Entry point (12 commands via Commander.js)
├── commands/                 # One file per command (12 total)
├── core/                     # Analysis engines (9 modules)
│   ├── contentReader.ts      # Reads actual file content (functions, imports)
│   ├── contextScorer.ts      # Scores AGENTS.md quality (5 dimensions)
│   ├── contextSyncer.ts      # Syncs AGENTS.md → CLAUDE.md, .cursorrules
│   ├── repoScanner.ts        # File tree scanning & statistics
│   ├── frameworkDetector.ts   # Auto-detect 15+ frameworks
│   ├── architectureAnalyzer.ts # Architecture pattern inference
│   ├── riskDetector.ts        # Security & risk scanning
│   ├── gitDiff.ts             # Git change analysis
│   └── fileClassifier.ts      # File categorization by regex
├── ai/                       # Optional AI enhancement (OpenAI)
├── reporters/                # Terminal (chalk) and Markdown output
├── templates/                # AGENTS.md generation template
└── utils/                    # Logger, path utils, secret masking
```

## Critical Files (modify carefully)

- `src/cli.ts` — All 12 commands registered here. Changes affect every command.
- `src/core/contextScorer.ts` — The scoring algorithm. Changes affect `lint`,
  `dashboard`, and overall quality metrics.
- `src/core/contextSyncer.ts` — Template converters. Changes affect `sync` output
  for CLAUDE.md, .cursorrules, and copilot-instructions.

## Conventions

- All imports use `.js` extension (ESM requirement with TypeScript)
- All core modules export a primary async function matching the filename
- Interface types are co-located in the same file as their implementation
- Error handling: wrap in try/catch, show user-friendly message via `logger.error()`

## Rules

### Do Not
- Do not add heavyweight dependencies (keep the install lightweight)
- Do not send file contents to any external API without privacyFilter
- Do not use `console.log` — use `logger` from `utils/logger.ts`
- Do not modify `SELF_SKIP_PATTERNS` in riskDetector without reason

### Testing
- This project needs tests — add vitest tests for any new core/ modules
- Critical paths to test: `contextScorer.ts`, `contextSyncer.ts`, `contentReader.ts`

---
*Curated with [RepoLens AI](https://github.com/repolens/repolens-ai)*

<!-- Synced: 2026-05-15 -->