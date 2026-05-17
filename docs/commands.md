# Commands Reference - RepoLens AI v3.1

## Quick Start

```bash
repolens setup
repolens context
repolens prompt "add login"
repolens check
```

## Primary Commands

| Command | Description |
|---|---|
| `repolens setup` | Analyze the repo, create AGENTS.md, sync AI tool files, generate skills |
| `repolens context` | Generate paste-ready project context for any AI chat |
| `repolens prompt "<request>"` | Turn a vague idea into a project-aware AI coding prompt |
| `repolens check` | Quick sanity check for AI-generated code changes |
| `repolens vibe` | Score readiness for vibe coding and community launch |

## Daily Vibe Coding Loop

### `repolens context`

Creates a compact project brief for ChatGPT, Claude, Gemini, Cursor,
Antigravity, Codex, or any AI coding assistant.

```bash
repolens context
repolens context --copy
```

Includes stack, architecture, important directories, critical files, rules,
commands, and gotchas.

### `repolens prompt <request>`

Generates a prompt that includes the real project context, detected task
intent, related files, likely files to create or update, feature guardrails, and
a verification plan.

```bash
repolens prompt "add customer avatar upload"
repolens prompt "add customer avatar upload" --copy
```

Use this whenever a normal prompt feels too vague and AI keeps producing code
that does not match the project structure.

### `repolens check`

Runs after AI edits and before commit.

```bash
repolens check
```

Checks changed files for risky edits, `any` usage, missing `use client` in React
hook files, and debug logging. It is a fast guardrail, not a replacement for
tests.

## Context Management

| Command | Alias | Description |
|---|---|---|
| `repolens vibe` | `ready` | Score AI context, workflow clarity, tool coverage, and code health |
| `repolens init` | - | Create AGENTS.md through interactive interview |
| `repolens lint` | `score` | Score context files and detect drift |
| `repolens fix` | - | Auto-fix generic context rules |
| `repolens sync` | - | Sync AGENTS.md to AI tool files |
| `repolens templates` | `tpl` | Browse and apply framework templates |
| `repolens skills` | - | Generate `.cursor/skills/` files |
| `repolens doctor` | `health` | Health check for AI dev setup |
| `repolens dashboard` | `ui` | Local web dashboard |

## Analysis

| Command | Description |
|---|---|
| `repolens analyze` | Full repo analysis |
| `repolens arch` | Architecture analysis |
| `repolens explain <topic>` | Explain a feature by searching code |
| `repolens review` | Review recent changes |
| `repolens risks` | Security and risk scanner |
| `repolens onboard` | Developer onboarding guide |
