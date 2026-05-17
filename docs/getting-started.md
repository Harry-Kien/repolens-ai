# Getting Started

## Install

```bash
npm install -g repolens-ai
```

Requires Node.js 18 or newer.

## Setup

```bash
cd your-project
repolens setup
repolens vibe
```

`setup` creates and syncs the AI context files your coding agents need:

| File | For |
|---|---|
| `AGENTS.md` | Universal source of truth |
| `.cursor/rules/project.mdc` | Cursor |
| `.cursorrules` | Cursor legacy |
| `CLAUDE.md` | Claude Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.windsurfrules` | Windsurf |
| `CODEX.md` | OpenAI Codex |

## Daily Workflow

```text
Day 1:          repolens setup -> commit context files
New AI chat:    repolens context -> paste into ChatGPT/Claude/Gemini/Antigravity
New feature:    repolens prompt "describe the feature" -> paste into your AI coder
After AI edits: repolens check -> fix obvious issues before commit
After refactor: Edit AGENTS.md -> repolens sync -> commit
Health check:   repolens lint
```

## Commands To Remember

```bash
repolens setup             # First time - creates everything
repolens context           # Paste-ready project context for any AI chat
repolens prompt "add X"    # Generate an intent-aware prompt from a vague idea
repolens check             # Check AI-generated changes
repolens vibe              # Check readiness for AI-assisted work
repolens sync              # After editing AGENTS.md
repolens lint              # Check quality score and drift
```

For community users, the most important loop is:

```bash
repolens context
repolens prompt "what you want to build"
repolens check
```
