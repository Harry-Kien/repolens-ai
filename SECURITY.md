# Security Policy

RepoLens is designed to be offline-first and privacy-first. Static analysis runs
locally, and optional AI enhancement must pass summarized, filtered data rather
than raw source code.

## Reporting a Vulnerability

Please report security issues privately by emailing the maintainer listed in
`package.json`.

Include:

- A clear description of the issue.
- Steps to reproduce.
- Affected versions or commit hash.
- Any relevant logs with secrets redacted.

Please do not open public issues for vulnerabilities involving secret exposure,
unsafe external API behavior, command execution, or path traversal.

## Security Expectations

- Do not send raw source files to external APIs.
- Do not read or print `.env` values.
- Mask secrets before displaying output.
- Treat generated context files as developer guidance, not a security boundary.
