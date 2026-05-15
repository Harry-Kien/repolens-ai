# Getting Started

## Install

```bash
npm install -g repolens-ai
```

> Requires Node.js ≥ 18. Check: `node -v`. Download: [nodejs.org](https://nodejs.org)

## Setup (30 seconds)

```bash
cd your-project
repolens setup
```

Done. All 6 AI tools are now configured with your project's context.

## What happened?

`repolens setup` analyzed your code and created these files:

| File | For | Format |
|---|---|---|
| `AGENTS.md` | Universal (source of truth) | Markdown |
| `.cursor/rules/project.mdc` | Cursor IDE | MDC + YAML frontmatter |
| `.cursorrules` | Cursor IDE (legacy) | Plain text |
| `CLAUDE.md` | Claude Code | Markdown |
| `.github/copilot-instructions.md` | GitHub Copilot | Markdown |
| `.windsurfrules` | Windsurf / Codeium | Plain text |
| `CODEX.md` | OpenAI Codex | Markdown |

## Daily Workflow

```
Day 1:          repolens setup → commit files
Every day:      Code normally with AI (no extra commands needed)
After refactor: Edit AGENTS.md → repolens sync → commit
Health check:   repolens lint
```

## Commands to Remember

```bash
repolens setup     # First time — creates everything
repolens sync      # After editing AGENTS.md
repolens lint      # Check quality score
```

That's it. Everything else is optional.
