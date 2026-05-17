# CODEX.md

> Instructions for OpenAI Codex agent.
> Synced from AGENTS.md by RepoLens AI.

## Project Overview

RepoLens AI is a CLI tool — The Context Quality Guardian for AI Coding Agents.
It helps developers manage AI context files (AGENTS.md, CLAUDE.md, .cursorrules)
using **AST-powered analysis**, **drift detection**, and **cross-tool sync**.

- **Framework:** Node.js
- **Language:** TypeScript (strict, ESM)
- **Package Manager:** npm
- **Architecture:** Modular CLI Architecture (Commands → Core Services → Utilities)
- **Build Tool:** tsup (single-file bundle to `dist/cli.js`)
- **Key Dependencies:** ts-morph (AST analysis), commander, chalk, ora

## Commands

- **Build:** `npm run build`
- **Dev:** `npm run dev` (tsup --watch)
- **Lint:** `npm run lint` (tsc --noEmit)
- **Test:** `npm test` (vitest — 5 test files, 39 test cases)
- **Test with coverage:** `npm run test:coverage`
- **Daily context:** `node dist/cli.js context`
- **Smart prompt:** `node dist/cli.js prompt "add feature"`
- **AI change check:** `node dist/cli.js check`

## Architecture Decisions

- **Offline-first**: Static analysis works without any API key.
  AI enhancement is optional (openai is an optionalDependency).
- **AST-powered**: v3.1 uses ts-morph for real code intelligence instead of regex.
  This provides: dependency graph, circular dep detection, complexity analysis,
  naming convention detection, and unused export tracking.
- **Privacy-first**: All content goes through `privacyFilter.ts` before
  touching any external API. Secrets are masked via `utils/masks.ts`.
- **Single-bundle CLI**: tsup bundles everything into one `dist/cli.js`
  with `#!/usr/bin/env node` banner. Do NOT add shebang in `src/cli.ts`.
- **Error handling**: Use `safely()` and `safelyAsync()` from `utils/errors.ts`
  instead of empty catch blocks. All commands use `withErrorHandler()`.

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
- `astAnalyzer.ts` is expensive (~5-10s on large projects). Always run AST
  analysis with a try/catch fallback — never let it crash the main workflow.
- The shebang `#!/usr/bin/env node` is added by tsup banner config. Do NOT
  add it in the source `cli.ts` or it will be duplicated and crash on Node v24+.

## Key Structure

```
src/
├── cli.ts                     # Entry point (18 commands via Commander.js)
├── commands/                  # One file per command
│   ├── setup.ts               # ⭐ Flagship one-click setup (AST-powered)
│   ├── context.ts             # Paste-ready context for any AI chat
│   ├── prompt.ts              # Project-aware prompt generator
│   ├── check.ts               # AI-generated change sanity check
│   ├── lint.ts                # Quality scoring + drift detection + CI mode
│   ├── sync.ts                # Cross-tool sync (6 AI tools)
│   ├── fix.ts                 # Auto-fix generic rules
│   ├── init.ts                # Interactive AGENTS.md creation
│   ├── dashboard.ts           # Visual web dashboard
│   └── doctor.ts              # Full health check
├── core/                      # Analysis engines (11 modules)
│   ├── astAnalyzer.ts         # 🆕 AST-powered code intelligence (ts-morph)
│   ├── driftDetector.ts       # 🆕 Context drift detection
│   ├── contextScorer.ts       # Scores AGENTS.md quality (5 dimensions)
│   ├── contextSyncer.ts       # Syncs AGENTS.md → CLAUDE.md, .cursorrules
│   ├── dailyWorkflow.ts       # Daily vibe workflow: context, prompt, check
│   ├── smartContext.ts        # Extracts real project context
│   ├── contentReader.ts       # Reads actual file content (functions, imports)
│   ├── repoScanner.ts         # File tree scanning & statistics
│   ├── frameworkDetector.ts   # Auto-detect 15+ frameworks
│   ├── architectureAnalyzer.ts # Architecture pattern inference
│   ├── riskDetector.ts        # Security & risk scanning
│   └── fileClassifier.ts      # File categorization by regex
├── ai/                        # Optional AI enhancement (OpenAI)
├── reporters/                 # Terminal (chalk) output
├── templates/                 # Framework templates (15+ frameworks)
└── utils/
    ├── logger.ts              # Colored logging (no console.log!)
    ├── errors.ts              # 🆕 Centralized error handling
    ├── paths.ts               # Path utilities & ignore patterns
    └── masks.ts               # Secret masking
```

## Critical Files (modify carefully)

- `src/cli.ts` — All 18 commands registered here. Changes affect every command.
- `src/core/dailyWorkflow.ts` — Daily-use context/prompt/check engine. Changes
  affect the most user-visible vibe-coding workflow.
- `src/core/astAnalyzer.ts` — AST engine using ts-morph. Changes affect
  setup, lint, and all code intelligence features.
- `src/core/driftDetector.ts` — Drift detection. Changes affect lint output.
- `src/core/contextScorer.ts` — The scoring algorithm. Changes affect `lint`,
  `dashboard`, and overall quality metrics.
- `src/core/contextSyncer.ts` — Template converters. Changes affect `sync` output
  for CLAUDE.md, .cursorrules, and copilot-instructions.
- `src/reporters/terminalReporter.ts` — Shared CLI output surface used by most
  commands. Changes affect user-facing messages, spinner behavior, and reports.

## Conventions

- All imports use `.js` extension (ESM requirement with TypeScript)
- All core modules export a primary function matching the filename
- Interface types are co-located in the same file as their implementation
- Error handling: use `safely()` from `utils/errors.ts` (never empty catch)
- Naming: camelCase functions, PascalCase types/interfaces, UPPER_CASE constants

## Rules

### Do Not
- Do not add heavyweight dependencies (keep the install lightweight)
- Do not send file contents to any external API without privacyFilter
- Do not use `console.log` — use `logger` from `utils/logger.ts`
- Do not use empty `catch {}` blocks — use `safely()` from `utils/errors.ts`
- Do not add shebang in `src/cli.ts` — tsup adds it via banner config
- Do not modify `SELF_SKIP_PATTERNS` in riskDetector without reason

### Testing
- Tests use vitest — run with `npm test`
- All new core/ modules MUST have corresponding test files in `tests/`
- AST tests should use `beforeAll` to avoid expensive re-analysis
- Critical paths: `contextScorer.ts`, `astAnalyzer.ts`, `driftDetector.ts`

---
*Curated with [RepoLens AI](https://github.com/Harry-Kien/repolens-ai)*


---
*Synced from AGENTS.md by [RepoLens AI](https://github.com/repolens/repolens-ai) on 2026-05-16*