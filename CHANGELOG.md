# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-05-15

### 🚀 Major Release — AI Context Intelligence Platform

#### Added
- **Smart Context Engine** — reads actual code (package.json, tsconfig, .env.example, imports, function names) to generate project-specific AGENTS.md automatically
- **`repolens setup`** — one-click command that configures 6 AI tools simultaneously
- **Cursor .mdc support** — modern format with YAML frontmatter (`alwaysApply`, `description`, `globs`)
- **6-tool sync** — AGENTS.md → Cursor .mdc + Cursor legacy + Claude Code + GitHub Copilot + Windsurf + OpenAI Codex
- **Quality scoring** — 5-dimension scoring (Specificity, Coverage, Conciseness, Freshness, Tribal Knowledge)
- **Auto-fix** — detects and removes generic rules that reduce AI performance
- **12 framework templates** — Next.js, React, Vue, Django, FastAPI, Laravel, Express, NestJS, Rails, Go, Rust, Flutter
- **Skill file generation** — `.cursor/skills/` for debugging, deployment, page creation, API endpoints
- **Interactive init** — 10-question interview for generating high-quality AGENTS.md
- **Web dashboard** — local visual dashboard for context quality overview
- **Doctor command** — health check for AI development setup
- **GitHub Actions CI** — automated testing on 3 OS × 3 Node versions
- **26 test cases** — covering contextScorer, contextSyncer, and smartContext engines

#### Architecture
- Node.js CLI (TypeScript, ESM)
- Single-file bundle via tsup (199KB)
- Zero-config, offline-first, privacy-first
- 5 runtime dependencies only

## [1.0.0] - 2026-05-14

### Initial Release
- Basic repo scanning and analysis
- Framework detection (15+ frameworks)
- Architecture analysis
- Risk detection
- AGENTS.md generation
- CLAUDE.md and .cursorrules sync (3 targets)
- Terminal and markdown reporters
