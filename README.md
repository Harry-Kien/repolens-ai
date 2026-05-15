<div align="center">

# 🔍 RepoLens AI

### The AI Context Intelligence Platform

**Your AI agents are only as good as the context you give them.**

[![npm version](https://img.shields.io/npm/v/repolens-ai.svg?style=flat-square)](https://www.npmjs.com/package/repolens-ai)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

*Stop auto-generating garbage AGENTS.md. Start curating context that actually works.*

</div>

---

## The Problem

Auto-generated `AGENTS.md` files **reduce** AI agent performance by 2-3% (ETH Zurich, 2025). They waste tokens, add noise, and contain only information AI agents can already infer on their own.

Meanwhile, **hand-curated context files** with tribal knowledge improve performance by ~4%.

The problem isn't missing context files — it's **bad** context files.

## What RepoLens AI Does

RepoLens AI is a **context quality platform** that helps you:

- ⭐ **Setup** AI context for 6 tools with ONE command
- 📊 **Score** your context files quality (0-100, 5 dimensions)
- 🔄 **Sync** AGENTS.md → Cursor (.mdc) → Claude → Copilot → Windsurf → Codex
- 📚 **Templates** — 12 curated framework templates with real gotchas
- 🔧 **Fix** — auto-remove generic rules that hurt AI performance

### Supported AI Tools

| Tool | File Generated | Format |
|---|---|---|
| **Cursor IDE** | `.cursor/rules/project.mdc` | MDC (modern, YAML frontmatter) |
| **Cursor IDE** | `.cursorrules` | Legacy format |
| **Claude Code** | `CLAUDE.md` | Markdown |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Markdown |
| **OpenAI Codex** | `CODEX.md` | Markdown |
| **Windsurf** | `.windsurfrules` | Rules format |
| **Antigravity / All** | `AGENTS.md` | Universal (source of truth) |

## Install

```bash
npm install -g repolens-ai
repolens --version
```

> **Requires:** Node.js ≥ 18. Download at [nodejs.org](https://nodejs.org).

## Quick Start

```bash
cd my-project

# ONE COMMAND — sets up everything
repolens setup
```

That's it. `repolens setup` will:
1. ✅ Analyze your project (framework, architecture, code)
2. ✅ Create AGENTS.md (with framework-specific template if available)
3. ✅ Sync to 6 AI tools (Cursor .mdc, Claude, Copilot, Windsurf, Codex)
4. ✅ Generate skill files for Cursor
5. ✅ Score your context quality

**Want more control?** Use individual commands:

```bash
repolens init          # Interactive AGENTS.md creation (10 questions)
repolens lint          # Score your context quality (0-100)
repolens fix           # Auto-fix generic rules
repolens sync          # Sync to all AI tools
repolens templates     # Browse 12 framework templates
repolens dashboard     # Visual web dashboard
```

## Commands

### 🆕 Context Intelligence (New in v2.0)

#### `repolens init`

Interactive AGENTS.md creation through developer interview. Extracts **tribal knowledge** — gotchas, architecture decisions, specific commands — the stuff AI agents can't figure out on their own.

```bash
repolens init       # Interactive mode (recommended)
repolens init -y    # Auto-detect only, no questions
```

**Asks smart questions like:**
- "Any gotchas or pitfalls a developer should know?"
- "Key architecture decisions?"
- "Files that should NEVER be modified?"

#### `repolens lint`

Score and analyze your AI context files. Measures 5 dimensions:

```bash
repolens lint
```

**Scores:**
| Metric | What It Measures |
|---|---|
| **Specificity** | Project-specific vs generic rules |
| **Coverage** | Important areas covered |
| **Conciseness** | Not too long (agents struggle with >200 lines) |
| **Freshness** | References actual project files |
| **Tribal Knowledge** | Non-inferable information (gotchas, decisions) |

**Detects anti-patterns like:**
- `"Never commit secrets"` → Generic, AI already knows this
- `"Follow TypeScript conventions"` → Generic, wastes tokens
- `"Validate all input"` → Generic, provides zero value

#### `repolens sync`

Keep all your AI context files in sync from a single source of truth.

```bash
repolens sync            # Sync AGENTS.md → all targets
repolens sync --dry-run  # Preview without writing
repolens sync --force    # Overwrite files with manual edits
```

**Syncs to:**
- `CLAUDE.md` (Claude Code)
- `.cursorrules` (Cursor IDE)
- `.github/copilot-instructions.md` (GitHub Copilot)

#### `repolens doctor`

Health check for your AI development setup.

```bash
repolens doctor
```

**Checks:** Context files · Git · .gitignore · Environment security · Scripts · Sync status

#### `repolens dashboard`

Launch a beautiful local web dashboard for visual context management.

```bash
repolens dashboard           # Open at http://localhost:3141
repolens dashboard -p 8080   # Custom port
```

**Dashboard shows:**
- Context quality scores with ring charts
- Risk analysis with severity breakdown
- Code intelligence (functions, classes, LOC)
- Context files sync status
- Largest files analysis

#### `repolens templates`

Browse and apply curated AGENTS.md templates for 12+ popular frameworks — each containing **real tribal knowledge** (gotchas, pitfalls, conventions) written by experienced developers.

```bash
repolens templates                    # Browse all templates
repolens templates --search react     # Search by keyword
repolens templates --apply nextjs     # Apply a template to your project
```

**Available templates:** Next.js, React+Vite, Vue/Nuxt, Express, NestJS, Django, FastAPI, Laravel, React Native, HTML/CSS/JS, T3 Stack, Supabase, and more.

#### `repolens fix`

Auto-fix detected issues — removes generic rules that hurt AI performance, cleans up boilerplate, and improves quality scores automatically.

```bash
repolens fix             # Fix and save (creates backups)
repolens fix --dry-run   # Preview fixes without writing
```

#### `repolens skills`

Generate `.cursor/skills/` files — task-specific instructions that help AI agents perform complex tasks correctly (authentication, database, deployment, debugging, responsive UI).

```bash
repolens skills --list   # See available skills
repolens skills --all    # Generate all relevant skill files
```

### Analysis & Review (Upgraded)

```bash
repolens analyze             # Full repo analysis (now reads code content)
repolens arch                # Architecture deep-dive
repolens explain auth        # Explain a module (now searches code, not just filenames)
repolens review              # Review recent changes
repolens risks               # Security & architecture risks
repolens onboard             # Generate onboarding guide
```

## Why Not Just Write AGENTS.md Manually?

You should! But RepoLens AI helps you write **better** ones:

| Without RepoLens | With RepoLens |
|---|---|
| You forget to add gotchas | Interactive interview extracts tribal knowledge |
| You don't know if your rules are generic | Lint scores specificity and detects anti-patterns |
| You maintain 4 separate context files | Sync keeps everything in sync automatically |
| You don't know if context is outdated | Freshness scoring detects stale references |
| You can't visualize context quality | Dashboard shows scores and issues visually |

## Privacy First

- ✅ **Never uploads code** — everything runs locally
- ✅ **Never reads .env values** — detects existence only
- ✅ **Masks all secrets** in output
- ✅ **Works fully offline** — AI is optional
- ✅ **No telemetry** — zero tracking

## Supported Frameworks

Auto-detects 15+ frameworks: Next.js, React, Vue, Angular, SvelteKit, NestJS, Express, Fastify, Hono, Laravel, Django, FastAPI, Flask, Rails, Go, Rust, Odoo, and more.

## AI Enhancement (Optional)

Works **perfectly without any API key**. For AI-enhanced explanations:

```bash
export OPENAI_API_KEY=your-key-here
repolens analyze
```

## Roadmap

- [x] 12 CLI commands
- [x] Interactive knowledge extraction
- [x] Context quality scoring (5 dimensions)
- [x] Cross-tool sync (AGENTS.md → CLAUDE.md → .cursorrules → Copilot)
- [x] Local web dashboard
- [x] Code-content-aware analysis
- [x] Privacy-first design
- [ ] VSCode extension
- [ ] GitHub PR review bot
- [ ] Team collaboration dashboard
- [ ] Custom scoring rules
- [ ] Multi-repo analysis
- [ ] CI/CD integration (fail PR if context is stale)

## Contributing

```bash
git clone https://github.com/repolens/repolens-ai.git
cd repolens-ai
npm install
npm run build
npm link

# Test locally
repolens doctor
repolens lint
```

## License

MIT © RepoLens AI Contributors

---

<div align="center">

**Built for the AI coding era.**

*Stop guessing. Start curating.*

[Get Started](#install) · [Report Bug](https://github.com/repolens/repolens-ai/issues) · [Request Feature](https://github.com/repolens/repolens-ai/issues)

</div>
