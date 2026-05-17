# Skill: Add Database Integration

When asked to add or modify database integration:

1. **Check existing ORM/driver:** Is Prisma, TypeORM, Sequelize, Mongoose, or Drizzle already installed?
2. **Don't mix ORMs** — use the one already in the project.
3. **Migrations:** Always create a migration for schema changes (never modify DB manually).
4. **Connection pooling:** Use a connection pool, not individual connections.
5. **Environment variables:** Database URL goes in .env, never hardcoded.

## SQL Injection Prevention
- ALWAYS use parameterized queries or ORM methods
- NEVER concatenate user input into SQL strings
- NEVER use `raw()` or `execute()` with user-provided values

## Checklist
- [ ] Using existing ORM (not adding a new one)
- [ ] Migration created for schema changes
- [ ] Connection string in .env
- [ ] No raw SQL with user input
- [ ] Proper indexes on frequently queried columns