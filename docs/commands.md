# Commands Reference — RepoLens AI v2.0

## Quick Start

```bash
repolens setup    # One command — does everything
```

---

## All Commands

### ⭐ Primary

| Command | Description |
|---|---|
| `repolens setup` | One-click setup — analyzes project, creates AGENTS.md, syncs 6 AI tools |

### 🎯 Context Management

| Command | Alias | Description |
|---|---|---|
| `repolens init` | — | Create AGENTS.md through interactive interview |
| `repolens lint` | `score` | Score context files (0-100, 5 dimensions) |
| `repolens fix` | — | Auto-fix: remove generic rules, clean boilerplate |
| `repolens sync` | — | Sync AGENTS.md → 6 AI tools |
| `repolens templates` | `tpl` | Browse & apply 12 framework templates |
| `repolens skills` | — | Generate .cursor/skills/ for common tasks |
| `repolens doctor` | `check` | Health check for AI dev setup |
| `repolens dashboard` | `ui` | Local web dashboard |

### 🔍 Analysis

| Command | Description |
|---|---|
| `repolens analyze` | Full repo analysis |
| `repolens arch` | Architecture analysis |
| `repolens explain <topic>` | Explain any feature by searching code |
| `repolens review` | Review recent code changes |
| `repolens risks` | Security & risk scanner |
| `repolens onboard` | Developer onboarding guide |

---

## Command Details

### `repolens setup`

The **primary command**. Reads your actual code and configures all AI tools.

```bash
repolens setup
```

**What it does:**
1. Analyzes project (framework, architecture, code patterns)
2. Reads package.json, tsconfig.json, .env.example
3. Detects naming conventions, critical files, TODO/FIXME
4. Creates AGENTS.md with project-specific context
5. Syncs to 6 AI tools (Cursor .mdc, Cursor legacy, Claude, Copilot, Windsurf, Codex)
6. Generates skill files for Cursor
7. Scores quality (0-100)

### `repolens lint`

Score context files on 5 dimensions.

```bash
repolens lint
```

| Dimension | What it measures |
|---|---|
| Specificity | Project-specific vs generic rules |
| Coverage | Important areas covered |
| Conciseness | Optimal length for AI agents |
| Freshness | References real project files |
| Tribal Knowledge | Info AI cannot infer on its own |

### `repolens sync`

Sync AGENTS.md to all AI tools.

```bash
repolens sync            # Sync (asks on conflicts)
repolens sync --force    # Overwrite without asking
repolens sync --dry-run  # Preview only
```

**Creates 6 files:**
- `CLAUDE.md` — Claude Code / Codex CLI
- `.cursor/rules/project.mdc` — Cursor IDE (modern .mdc with YAML frontmatter)
- `.cursorrules` — Cursor IDE (legacy)
- `.github/copilot-instructions.md` — GitHub Copilot
- `.windsurfrules` — Windsurf / Codeium
- `CODEX.md` — OpenAI Codex

### `repolens fix`

```bash
repolens fix             # Fix and save (creates backup)
repolens fix --dry-run   # Preview without saving
```

### `repolens templates`

```bash
repolens templates                    # List all (with recommendation)
repolens templates --search react     # Search
repolens templates --apply nextjs     # Apply template
```

**12 templates:** Next.js, React+Vite, Vue/Nuxt, Express, NestJS, Django, FastAPI, Laravel, React Native, HTML/CSS/JS, T3 Stack, Supabase.

### `repolens dashboard`

```bash
repolens dashboard              # Open at http://localhost:3141
repolens dashboard --port 8080  # Custom port
```

---

## Global Options

| Option | Description |
|---|---|
| `--version`, `-V` | Show version |
| `--help`, `-h` | Show help |
| `--no-ai` | Disable AI enhancement |
