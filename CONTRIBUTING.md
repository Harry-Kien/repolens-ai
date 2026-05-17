# Contributing to RepoLens AI

Thanks for helping make AI coding context less noisy and more useful.

RepoLens is built for developers who use AI coding agents every day, so the bar
for a contribution is simple: make the CLI easier to trust, easier to run, or
better at producing project-specific context.

## Quick Start

```bash
npm install
npm run typecheck
npm test
npm run build
node dist/cli.js --help
```

## Good First Contributions

- Add tests for `src/core/` modules.
- Improve framework templates with real gotchas and project-specific guidance.
- Improve command output clarity without adding noise.
- Add examples that show before/after AGENTS.md quality.
- Fix Windows path handling by using `normalizePath()` from `src/utils/paths.ts`.

## Development Rules

- Use TypeScript strict mode and ESM imports with `.js` extensions.
- Keep the CLI offline-first and privacy-first.
- Do not send raw file contents to external APIs.
- Do not use `console.log` directly in commands or reporters; use `logger`.
- Keep dependencies lightweight. Add a package only when it removes real complexity.

## Testing

Run the full local check before opening a PR:

```bash
npm run lint
npm test
npm run build
```

When changing a core module, add or update focused Vitest coverage in `tests/`.

## Pull Request Checklist

- [ ] The change is scoped and easy to review.
- [ ] Typecheck, tests, and build pass.
- [ ] User-facing command output is clear.
- [ ] Docs or examples are updated when behavior changes.
- [ ] Privacy-sensitive paths still go through masking/filtering utilities.

## Product Direction

RepoLens should help AI agents learn what they cannot infer from source alone:
gotchas, conventions, architecture decisions, risky files, setup steps, and
workflow rules. Avoid generic advice that every agent already knows.
