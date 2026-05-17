# Changelog

All notable changes to RepoLens AI are documented here.

## [3.1.0] - 2026-05-17

### Added

- Daily vibe-coding workflow:
  - `repolens context` for paste-ready project briefs.
  - `repolens prompt "<request>"` for intent-aware AI coding prompts.
  - `repolens check` for fast post-AI-edit sanity checks.
  - `repolens vibe` for community and AI-readiness scoring.
- Prompt intent detection for auth, upload, payment, API, UI, database,
  quality, and documentation work.
- Vibe readiness scoring across context quality, AI tool coverage, workflow
  clarity, and code health.
- Public repo polish: issue templates, PR template, contributing guide,
  security policy, and clearer command docs.

### Changed

- CLI entrypoint now highlights the daily context/prompt/check workflow.
- `lint` is backed by `typecheck` for clearer npm script semantics.
- AI-generated change checks now include untracked files so pre-commit review is
  harder to bypass by accident.

### Fixed

- Reduced false positives in quick checks and risk scanning.
- Improved Windows path handling and dotfile scanning for AI tool files.

## [3.0.0] - 2026-05-16

### Added

- AST-powered analysis through `ts-morph`.
- Dependency graph and circular dependency detection.
- Complexity, naming convention, and unused export signals.
- Context drift detection between source changes and AI context files.

## [2.0.0] - 2026-05-15

### Added

- One-command setup for AGENTS.md and AI tool sync.
- Cursor MDC, Cursor legacy, Claude Code, GitHub Copilot, Windsurf, and Codex
  context outputs.
- Five-dimension context quality scoring.
- Auto-fix for generic rules and boilerplate.
- Framework templates and Cursor skill file generation.
- Interactive init, web dashboard, doctor command, and CI workflow.

## [1.0.0] - 2026-05-14

### Added

- Repository scanning and analysis.
- Framework and architecture detection.
- Risk scanning and git diff review.
- Initial AGENTS.md generation and basic context sync.
