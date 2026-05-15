# Privacy & Security

RepoLens AI is designed with privacy as a **core architectural principle**, not an afterthought.

## What We Never Do

- ❌ Never upload your entire repository
- ❌ Never read .env file contents
- ❌ Never send full secret values to AI
- ❌ Never store your code on external servers
- ❌ Never share data between projects

## What We Do

### Static Analysis (Default Mode)
When running without an API key, RepoLens AI:
- Runs entirely locally on your machine
- Makes zero network requests
- Analyzes file structure, patterns, and metadata only
- Never reads file contents except for pattern matching

### AI Enhancement (Optional)
When `OPENAI_API_KEY` is set, RepoLens AI:
- Sends only **summarized facts** (file counts, detected patterns, architecture style)
- **Never sends file contents** — only file names and statistical summaries
- Masks all detected secrets before any network call
- Sanitizes file paths (removes home directory)
- Truncates context to prevent data leaks
- Allows you to disable AI anytime with `--no-ai`

## Default Ignore Patterns

These directories and files are **always excluded** from scanning:

```
node_modules/    .git/         dist/          build/
vendor/          storage/      .cache/        .next/
.nuxt/           .env          .env.*         coverage/
logs/            __pycache__/  .pytest_cache/ venv/
.venv/           .idea/        .vscode/
```

## Secret Detection & Masking

RepoLens AI detects and masks:
- OpenAI API keys (`sk-...`)
- AWS access keys (`AKIA...`)
- Generic API keys and tokens
- Database connection strings
- Hardcoded passwords
- Environment variable values

All detected secrets are replaced with `[MASKED]` in output.

## Reporting Security Issues

If you find a security vulnerability in RepoLens AI, please report it responsibly by emailing security@repolens.dev.
