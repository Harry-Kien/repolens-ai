# Before and After: Better AI Context

Use this as a quick mental model for what RepoLens is trying to improve.

## Weak Context

```md
# AGENTS.md

- Write clean code.
- Follow TypeScript best practices.
- Never commit secrets.
- Validate all input.
- Keep files small.
```

Why this is weak:

- It is generic advice most AI agents already know.
- It does not mention the actual framework, commands, risks, or files.
- It gives no project-specific gotchas.
- It wastes context window on low-value rules.

## Strong Context

```md
# AGENTS.md

## Project Overview

- Framework: Node.js CLI, TypeScript strict, ESM.
- Build: `npm run build`
- Test: `npm test`
- Bundle: tsup writes one executable file to `dist/cli.js`.

## Gotchas

- All TypeScript imports use `.js` extensions because the package is ESM.
- Reporter output must go through `src/utils/logger.ts`; direct console output
  can break spinner rendering.
- `contentReader.ts` caps scanned files and file size to protect large repos.
- Use `normalizePath()` from `src/utils/paths.ts` for Windows-safe paths.

## Critical Files

- `src/cli.ts`: command registration; changes affect every user command.
- `src/core/contextScorer.ts`: scoring model used by lint, dashboard, and CI.
- `src/core/contextSyncer.ts`: writes Claude, Cursor, Copilot, Windsurf, Codex.
```

Why this works:

- It names real commands and files.
- It captures decisions and gotchas agents cannot infer reliably.
- It helps AI avoid expensive mistakes.
- It stays short enough to be useful inside an agent context window.
