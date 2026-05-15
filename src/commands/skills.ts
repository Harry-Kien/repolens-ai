import * as fs from 'node:fs';
import * as path from 'node:path';
import ora from 'ora';
import { detectFramework } from '../core/frameworkDetector.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Skills command — Generate .cursor/skills/ files for common vibe coding tasks.
 * Skills are task-specific instructions that help AI agents perform complex tasks correctly.
 */

interface Skill {
  id: string;
  filename: string;
  name: string;
  description: string;
  frameworks: string[]; // Empty = universal
  content: string;
}

const SKILLS: Skill[] = [
  {
    id: 'new-page',
    filename: 'create-new-page.md',
    name: 'Create New Page',
    description: 'Instructions for creating a new page/route with proper structure',
    frameworks: ['nextjs', 'react', 'vue', 'nuxt'],
    content: `# Skill: Create New Page

When asked to create a new page or route:

1. **Check routing pattern:** Look at existing pages in \`app/\` or \`pages/\` to match the convention.
2. **Copy closest existing page** as a starting point — don't write from scratch.
3. **Include:** SEO metadata (title, description), loading state, error boundary.
4. **Use existing components** from \`components/\` — don't create new ones if similar exist.
5. **Add to navigation** if the page should be accessible from the menu.
6. **Mobile-responsive** by default — test at 375px width mentally.
7. **Keep server components** where possible (Next.js/Nuxt) — only add "use client" when needed.

## Checklist
- [ ] Page renders without errors
- [ ] SEO metadata is set
- [ ] Page is responsive
- [ ] Loading state exists
- [ ] Navigation is updated (if needed)`,
  },
  {
    id: 'new-api',
    filename: 'create-api-endpoint.md',
    name: 'Create API Endpoint',
    description: 'Instructions for creating a proper REST API endpoint',
    frameworks: ['express', 'nextjs', 'nestjs', 'fastapi', 'django'],
    content: `# Skill: Create API Endpoint

When asked to create a new API endpoint:

1. **Follow existing pattern:** Check other endpoints for the naming and structure convention.
2. **Input validation:** Always validate request body/params before processing.
3. **Error handling:** Wrap in try/catch, return proper HTTP status codes.
4. **Response format:** Match existing response format (usually \`{ success, data, error }\`).
5. **Authentication:** Apply auth middleware if the endpoint needs protection.
6. **HTTP methods:** GET for reads, POST for creates, PUT/PATCH for updates, DELETE for deletes.

## Status Codes
- 200: Success (GET, PUT)
- 201: Created (POST)
- 204: No Content (DELETE)
- 400: Bad Request (validation error)
- 401: Unauthorized (not logged in)
- 403: Forbidden (no permission)
- 404: Not Found
- 500: Server Error (never expose details)

## Checklist
- [ ] Input is validated
- [ ] Proper HTTP method and status codes
- [ ] Auth middleware applied if needed
- [ ] Error responses are user-friendly
- [ ] No sensitive data in response`,
  },
  {
    id: 'add-auth',
    filename: 'add-authentication.md',
    name: 'Add Authentication',
    description: 'Instructions for implementing user authentication safely',
    frameworks: [],
    content: `# Skill: Add Authentication

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
- [ ] Session expiration is configured`,
  },
  {
    id: 'add-db',
    filename: 'add-database.md',
    name: 'Add Database Integration',
    description: 'Instructions for adding database with proper ORM setup',
    frameworks: [],
    content: `# Skill: Add Database Integration

When asked to add or modify database integration:

1. **Check existing ORM/driver:** Is Prisma, TypeORM, Sequelize, Mongoose, or Drizzle already installed?
2. **Don't mix ORMs** — use the one already in the project.
3. **Migrations:** Always create a migration for schema changes (never modify DB manually).
4. **Connection pooling:** Use a connection pool, not individual connections.
5. **Environment variables:** Database URL goes in .env, never hardcoded.

## SQL Injection Prevention
- ALWAYS use parameterized queries or ORM methods
- NEVER concatenate user input into SQL strings
- NEVER use \`raw()\` or \`execute()\` with user-provided values

## Checklist
- [ ] Using existing ORM (not adding a new one)
- [ ] Migration created for schema changes
- [ ] Connection string in .env
- [ ] No raw SQL with user input
- [ ] Proper indexes on frequently queried columns`,
  },
  {
    id: 'responsive-ui',
    filename: 'responsive-design.md',
    name: 'Responsive UI Design',
    description: 'Instructions for building mobile-friendly responsive interfaces',
    frameworks: [],
    content: `# Skill: Responsive UI Design

When building or modifying UI components:

## Mobile-First Approach
1. **Design for mobile first** (375px), then expand for tablet (768px) and desktop (1024px+).
2. **Test at these breakpoints:** 375px, 768px, 1024px, 1440px.
3. **Touch targets:** Minimum 44x44px for buttons and links on mobile.
4. **Font sizes:** Minimum 16px body text (prevents iOS zoom on input focus).

## Layout Rules
- Use **flexbox** or **CSS Grid** — never use float for layout.
- Use **relative units** (rem, %, vh/vw) — avoid fixed pixel widths for containers.
- **Images:** Always set \`max-width: 100%\` and use proper aspect ratios.
- **Navigation:** Hamburger menu on mobile, horizontal nav on desktop.

## Common Mistakes to Avoid
- ❌ Fixed widths on containers (\`width: 500px\`)
- ❌ Horizontal scrolling on mobile
- ❌ Text too small to read on mobile
- ❌ Buttons too small to tap
- ❌ Hiding critical content on mobile
- ✅ Fluid widths (\`max-width: 500px; width: 100%\`)
- ✅ Stack columns on mobile, side-by-side on desktop
- ✅ Readable text at every breakpoint`,
  },
  {
    id: 'deploy',
    filename: 'deployment-guide.md',
    name: 'Deployment Guide',
    description: 'Instructions for deploying to production safely',
    frameworks: [],
    content: `# Skill: Deployment

When preparing for deployment or asked to deploy:

## Pre-Deploy Checklist
1. **Environment variables:** All secrets set in production env (not in code).
2. **Build succeeds:** \`npm run build\` completes without errors.
3. **No console.log:** Remove debug logs from production code.
4. **Error handling:** All API routes have proper error responses.
5. **HTTPS:** Ensure production uses HTTPS, not HTTP.

## Platform-Specific
- **Vercel:** Runs \`npm run build\` automatically. Set env vars in dashboard.
- **Railway/Render:** Set \`PORT\` env var. Add \`start\` script to package.json.
- **Docker:** Use multi-stage builds. Don't include node_modules in image.
- **VPS:** Use PM2 or systemd for process management. Set up Nginx reverse proxy.

## Things That Break in Production
- Hardcoded \`localhost\` URLs
- Missing environment variables
- CORS not configured for production domain
- Database connection limits exceeded
- Large file uploads without size limits
- Missing rate limiting on public APIs`,
  },
  {
    id: 'debug',
    filename: 'debugging-guide.md',
    name: 'Debugging Guide',
    description: 'Systematic approach to debugging issues in vibe-coded projects',
    frameworks: [],
    content: `# Skill: Debugging

When something doesn't work:

## Step-by-Step Debug Process
1. **Read the error message** — it usually tells you exactly what's wrong.
2. **Check the terminal/console** — errors appear in the terminal (backend) or browser console (frontend).
3. **Check recent changes** — what did you change last? That's likely the cause.
4. **Check environment variables** — missing .env values cause 90% of "works locally, fails in production" issues.
5. **Check imports** — wrong import paths are the #1 cause of "module not found" errors.
6. **Google the exact error message** — someone else has had this problem.

## Common Fixes
| Symptom | Likely Fix |
|---|---|
| "Module not found" | Check import path, run \`npm install\` |
| "Cannot read property of undefined" | The variable is null — add a null check |
| "CORS error" | Add CORS middleware to your backend |
| "Connection refused" | Backend server isn't running, or wrong port |
| "401 Unauthorized" | Auth token expired or missing |
| Blank page | Check browser console for errors |
| "Hydration mismatch" | Server and client render different HTML |

## When AI Made a Mistake
1. Don't ask AI to "fix it" without context — describe WHAT went wrong.
2. Share the EXACT error message.
3. Tell AI what you EXPECTED to happen vs what ACTUALLY happened.
4. If AI keeps making the same mistake, revert and try a different approach.`,
  },
];

/**
 * Generate skill files for the project.
 */
export async function skillsCommand(options: { list?: boolean; all?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const fw = detectFramework(cwd);
  const fwLower = fw.framework.toLowerCase();

  // Filter skills relevant to this project
  const relevant = SKILLS.filter((s) =>
    s.frameworks.length === 0 || // Universal skills
    s.frameworks.some((f) => fwLower.includes(f))
  );

  if (options.list) {
    logger.section('📝', `Available Skills (${relevant.length}/${SKILLS.length} relevant to your project)`);
    logger.blank();
    for (const skill of relevant) {
      const universal = skill.frameworks.length === 0;
      logger.indent(`  ${chalk.cyan(skill.id.padEnd(20))} ${skill.name} ${universal ? chalk.dim('(universal)') : chalk.dim(`(${skill.frameworks.join(', ')})`)}`);
      logger.indent(`  ${chalk.dim(' '.repeat(20) + skill.description)}`, 1);
    }
    logger.blank();
    logger.indent(`Generate all: ${chalk.cyan('repolens skills --all')}`);
    return;
  }

  // Generate skills
  const spinner = ora('Generating skill files...').start();

  const skillsDir = path.join(cwd, '.cursor', 'skills');
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  const toGenerate = options.all ? relevant : relevant.filter((s) => s.frameworks.length === 0); // Default: universal only
  let created = 0;

  for (const skill of toGenerate) {
    const filePath = path.join(skillsDir, skill.filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, skill.content, 'utf-8');
      created++;
    }
  }

  spinner.succeed(`Generated ${created} skill file(s) in .cursor/skills/`);
  logger.blank();

  for (const skill of toGenerate) {
    const filePath = path.join(skillsDir, skill.filename);
    const exists = fs.existsSync(filePath);
    const icon = exists ? chalk.green('✓') : chalk.yellow('⊘');
    logger.indent(`${icon} ${skill.filename.padEnd(30)} ${chalk.dim(skill.name)}`);
  }

  logger.blank();
  logger.indent(chalk.bold('How skills work:'));
  logger.indent(chalk.dim('  Cursor IDE reads .cursor/skills/ files to learn task-specific instructions.'), 1);
  logger.indent(chalk.dim('  AI agents use these skills when performing matching tasks.'), 1);
  logger.blank();
  logger.indent(`See all available: ${chalk.cyan('repolens skills --list')}`);
  logger.indent(`Generate all: ${chalk.cyan('repolens skills --all')}`);
}
