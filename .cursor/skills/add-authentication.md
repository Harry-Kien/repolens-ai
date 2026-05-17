# Skill: Add Authentication

When asked to add or modify authentication:

## Critical Rules (NEVER break these)
1. **NEVER store passwords in plain text** — always hash with bcrypt/argon2.
2. **NEVER put secrets in frontend code** — API keys go in .env, not in source.
3. **NEVER disable CSRF protection** without understanding the implications.
4. **NEVER trust client-side auth state** — always verify on the server.

## Implementation Steps
1. Check if an auth library is already installed (NextAuth, Passport, etc.).
2. If yes — extend the existing setup, don't create a parallel system.
3. If no — recommend a battle-tested library, don't roll your own.
4. Store session/JWT secrets in environment variables.
5. Add auth middleware to ALL protected routes.
6. Implement proper logout (clear session/token on BOTH client and server).

## Checklist
- [ ] Passwords are hashed (never plain text)
- [ ] Secrets are in .env (not in code)
- [ ] Protected routes require authentication
- [ ] Login/logout flows are complete
- [ ] Session expiration is configured