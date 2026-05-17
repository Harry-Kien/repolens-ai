import ora from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanRepository } from '../core/repoScanner.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { classifyFiles } from '../core/fileClassifier.js';
import { analyzeArchitecture } from '../core/architectureAnalyzer.js';
import { readCodeContents, summarizeContents } from '../core/contentReader.js';
import { detectContextFiles, scoreContextFile } from '../core/contextScorer.js';
import { createSyncPlan, executeSyncPlan } from '../core/contextSyncer.js';
import { extractSmartContext, generateSmartAgentsMd, type SmartContext } from '../core/smartContext.js';
import { analyzeAST, type ASTInsight } from '../core/astAnalyzer.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Setup command v3.0 — THE ONE COMMAND for vibe coders.
 *
 * Now powered by AST analysis (ts-morph) for deep code intelligence:
 * 1. AST-powered code analysis (dependency graph, complexity, naming)
 * 2. Extracts REAL commands from package.json scripts
 * 3. Extracts REAL env vars from .env.example
 * 4. Extracts REAL known issues from TODO/FIXME comments
 * 5. Detects REAL naming conventions via AST (not regex)
 * 6. Finds circular dependencies and critical hub files
 * 7. Merges framework-specific gotchas when available
 * 8. Syncs to 7 AI tools simultaneously
 * 9. Generates task-specific skill files
 * 10. Scores quality + detects drift
 */

interface SetupOptions {
  sync?: boolean;
  skills?: boolean;
}

export async function setupCommand(options: SetupOptions = {}): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  logger.section('🚀', 'One-Click AI Context Setup');
  logger.indent(chalk.dim('AST-powered analysis + cross-tool sync in one step.'));
  logger.blank();

  // ─── Step 1: Deep Analyze (with AST) ──────────────────
  const spinner = ora('Step 1/5 — Analyzing your project...').start();

  const scan = await scanRepository(cwd);
  const fw = detectFramework(cwd);
  const { byCategory } = classifyFiles(scan.fileTree);
  const arch = analyzeArchitecture(byCategory, fw.framework);

  spinner.text = 'Reading code contents...';
  const codeContents = await readCodeContents(cwd);
  const summary = summarizeContents(codeContents);

  // AST analysis — the v3.0 upgrade
  spinner.text = 'Running AST analysis (ts-morph)...';
  let astInsight: ASTInsight | null = null;
  try {
    astInsight = analyzeAST(cwd);
  } catch {
    // AST is a bonus — don't fail setup if it errors
  }

  spinner.text = 'Extracting smart context...';
  const smartCtx = extractSmartContext(cwd, scan, fw, arch, codeContents, summary);

  // Enrich smart context with AST data
  if (astInsight) {
    // Add circular dependencies as gotchas
    for (const [a, b] of astInsight.circularDeps) {
      smartCtx.gotchas.push(`Circular dependency between \`${a}\` and \`${b}\` — use lazy imports or refactor`);
    }
    // Add high-complexity functions as gotchas
    for (const cf of astInsight.complexFunctions.filter(f => f.complexity > 10).slice(0, 3)) {
      smartCtx.gotchas.push(`\`${cf.name}\` in \`${cf.file}\` has high complexity (${cf.complexity}) — refactor before modifying`);
    }
    // Add AST-detected naming conventions (more accurate than regex)
    const naming = astInsight.namingAnalysis;
    if (naming.dominant.functions !== 'unknown') {
      smartCtx.namingConventions = [
        `Functions use **${naming.dominant.functions}**`,
        `Types/Interfaces use **${naming.dominant.types}**`,
      ];
    }
  }

  const astInfo = astInsight ? `, ${astInsight.summary.totalFunctions} functions (AST), ${astInsight.circularDeps.length} circular deps` : '';
  spinner.succeed(`Step 1/5 — ${chalk.bold(fw.framework)} project (${scan.totalFiles} files${astInfo})`);

  // ─── Step 2: Smart AGENTS.md ──────────────────────────
  const spinner2 = ora('Step 2/5 — Generating smart AGENTS.md...').start();

  const agentsPath = path.join(cwd, 'AGENTS.md');

  if (fs.existsSync(agentsPath)) {
    const existing = fs.readFileSync(agentsPath, 'utf-8');
    const existingScore = scoreContextFile(existing, scan.fileTree);

    // Generate what a smart version would look like
    const smartContent = generateSmartAgentsMd(fw, arch, scan, summary, smartCtx);
    const smartScore = scoreContextFile(smartContent, scan.fileTree);

    if (smartScore.overall > existingScore.overall) {
      // Smart version is better — offer upgrade
      fs.copyFileSync(agentsPath, agentsPath + '.backup');
      fs.writeFileSync(agentsPath, smartContent, 'utf-8');
      spinner2.succeed(`Step 2/5 — Upgraded AGENTS.md (${chalk.red(`${existingScore.overall}`)} → ${chalk.green(`${smartScore.overall}/100`)} ${getGrade(smartScore.overall)})`);
    } else {
      spinner2.succeed(`Step 2/5 — AGENTS.md already high quality (${chalk.green(`${existingScore.overall}/100`)} — keeping it)`);
    }
  } else {
    const smartContent = generateSmartAgentsMd(fw, arch, scan, summary, smartCtx);
    fs.writeFileSync(agentsPath, smartContent, 'utf-8');
    const newScore = scoreContextFile(smartContent, scan.fileTree);
    spinner2.succeed(`Step 2/5 — Created smart AGENTS.md (${chalk.green(`${newScore.overall}/100`)} ${getGrade(newScore.overall)})`);
  }

  // Show what was extracted
  const insights: string[] = [];
  if (smartCtx.commands.length > 0) insights.push(`${smartCtx.commands.length} commands`);
  if (smartCtx.envVars.length > 0) insights.push(`${smartCtx.envVars.length} env vars`);
  if (smartCtx.gotchas.length > 0) insights.push(`${smartCtx.gotchas.length} gotchas`);
  if (smartCtx.criticalFiles.length > 0) insights.push(`${smartCtx.criticalFiles.length} critical files`);
  if (smartCtx.conventions.length > 0) insights.push(`${smartCtx.conventions.length} conventions`);
  if (smartCtx.knownIssues.length > 0) insights.push(`${smartCtx.knownIssues.length} TODOs`);
  if (insights.length > 0) {
    logger.indent(chalk.dim(`  Extracted: ${insights.join(' · ')}`));
  }

  // ─── Step 3: Sync to all AI tools ────────────────────
  const spinner3 = ora('Step 3/5 — Syncing to 6 AI tools...').start();

  let syncResult: ReturnType<typeof executeSyncPlan> = { written: [], skipped: [] };
  let plan: ReturnType<typeof createSyncPlan> | null = null;

  if (options.sync === false) {
    spinner3.succeed('Step 3/5 - Sync skipped (--no-sync)');
  } else {
    const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
    const contextFiles = detectContextFiles(cwd);
    const agentsFile = contextFiles.find(f => f.type === 'agents');
    if (agentsFile) {
      agentsFile.content = agentsContent;
      agentsFile.exists = true;
    }

    plan = createSyncPlan(
      agentsFile || { path: 'AGENTS.md', type: 'agents' as const, exists: true, content: agentsContent },
      contextFiles,
      cwd,
    );

    for (const target of plan.targets) {
      if (target.action === 'skip') target.action = 'update';
    }

    syncResult = executeSyncPlan(plan, cwd);
    spinner3.succeed(`Step 3/5 — Synced to ${chalk.bold(String(syncResult.written.length))} AI tools`);
  }

  // ─── Step 4: Generate skill files ────────────────────
  const spinner4 = ora('Step 4/5 — Creating skill files...').start();

  if (options.skills === false) {
    spinner4.succeed('Step 4/5 - Skill files skipped (--no-skills)');
  } else {
    const skillsDir = path.join(cwd, '.cursor', 'skills');
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }

    let skillCount = 0;
    const skillDefs = getSmartSkills(fw.framework, smartCtx);
    for (const skill of skillDefs) {
      const skillPath = path.join(skillsDir, skill.filename);
      if (!fs.existsSync(skillPath)) {
        fs.writeFileSync(skillPath, skill.content, 'utf-8');
        skillCount++;
      }
    }

    spinner4.succeed(`Step 4/5 — ${skillCount > 0 ? `${skillCount} skill files created` : 'Skill files ready'} in .cursor/skills/`);
  }

  // ─── Step 5: Score & Report ──────────────────────────

  const spinner5 = ora('Step 5/5 — Final scoring...').start();

  const finalContent = fs.readFileSync(agentsPath, 'utf-8');
  const finalScore = scoreContextFile(finalContent, scan.fileTree);
  spinner5.succeed(`Step 5/5 — Quality score: ${chalk.bold(getGradeColor(finalScore.overall, `${finalScore.overall}/100 ${getGrade(finalScore.overall)}`))}`);

  // ─── Final Report ────────────────────────────────────
  logger.blank();
  logger.section('✅', 'Setup Complete');
  logger.blank();

  // Show files
  logger.indent(chalk.bold('Files created/updated:'));
  logger.indent(`  ${chalk.green('✓')} AGENTS.md ${chalk.dim('— source of truth (edit this one)')}`);
  for (const written of syncResult.written) {
    const target = plan?.targets.find(t => t.path === written);
    logger.indent(`  ${chalk.green('✓')} ${written} ${chalk.dim(`— ${target?.label || ''}`)}`);
  }
  logger.blank();

  // Show AI tools status
  logger.indent(chalk.bold('Your AI tools are now configured:'));
  const tools = [
    { name: 'Cursor IDE', file: '.cursor/rules/project.mdc', icon: '🖥️' },
    { name: 'Claude Code', file: 'CLAUDE.md', icon: '🤖' },
    { name: 'GitHub Copilot', file: '.github/copilot-instructions.md', icon: '🐙' },
    { name: 'OpenAI Codex', file: 'CODEX.md', icon: '⚡' },
    { name: 'Windsurf', file: '.windsurfrules', icon: '🏄' },
    { name: 'Antigravity', file: 'AGENTS.md', icon: '🔍' },
  ];

  for (const tool of tools) {
    const exists = fs.existsSync(path.join(cwd, tool.file));
    logger.indent(`  ${tool.icon} ${exists ? chalk.green('✓') : chalk.red('✗')} ${tool.name}`);
  }

  // Show score breakdown for transparency
  logger.blank();
  logger.indent(chalk.bold('Score Breakdown:'));
  const bd = finalScore.breakdown;
  logger.indent(`  Specificity      ${scoreBar(bd.specificity)}  ${chalk.dim('Project-specific rules')}`);
  logger.indent(`  Coverage         ${scoreBar(bd.coverage)}  ${chalk.dim('Important areas covered')}`);
  logger.indent(`  Conciseness      ${scoreBar(bd.conciseness)}  ${chalk.dim('Optimal length for AI')}`);
  logger.indent(`  Freshness        ${scoreBar(bd.freshness)}  ${chalk.dim('References real files')}`);
  logger.indent(`  Tribal Knowledge ${scoreBar(bd.tribalKnowledge)}  ${chalk.dim('Info AI cannot infer')}`);

  // Next steps
  logger.blank();
  logger.indent(chalk.bold('Next steps:'));
  if (finalScore.overall < 80) {
    logger.indent(`  ${chalk.yellow('→')} Run ${chalk.cyan('repolens lint')} to see specific improvements`);
    logger.indent(`  ${chalk.yellow('→')} Run ${chalk.cyan('repolens fix')} to auto-fix issues`);
  }
  logger.indent(`  ${chalk.dim('1.')} Edit AGENTS.md to add your team's gotchas & decisions`);
  logger.indent(`  ${chalk.dim('2.')} Run ${chalk.cyan('repolens sync')} after editing to update all tools`);
  logger.indent(`  ${chalk.dim('3.')} Commit all generated files to git`);
}

// ─── Helpers ──────────────────────────────────────────

function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function getGradeColor(score: number, text: string): string {
  if (score >= 80) return chalk.green(text);
  if (score >= 60) return chalk.yellow(text);
  return chalk.red(text);
}

function scoreBar(score: number): string {
  const clamped = Math.min(100, Math.max(0, score));
  const filled = Math.min(10, Math.round(clamped / 10));
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const color = clamped >= 80 ? chalk.green : clamped >= 50 ? chalk.yellow : chalk.red;
  return `${color(`${String(clamped).padStart(3)}/100`)}  ${color(bar)}`;
}

/**
 * Generate smart, framework-aware skill files.
 */
function getSmartSkills(framework: string, ctx: SmartContext): { filename: string; content: string }[] {
  const skills: { filename: string; content: string }[] = [];

  // Universal: debugging (everyone needs this)
  skills.push({
    filename: 'debugging-guide.md',
    content: `# Skill: Debugging

When something doesn't work, follow this systematic process:

1. **Read the full error message** — the answer is usually in the stack trace.
2. **Check recent changes** — what did you change last? That's likely the cause.
3. **Check the terminal/console** — browser console AND server terminal.
4. **Check imports** — wrong paths are the #1 cause of "module not found".
5. **Check environment variables** — missing .env values cause most failures.

## Common Fixes
| Error | Fix |
|---|---|
| "Module not found" | Check import path, run \`npm install\` |
| "Cannot read property of undefined" | Add null/undefined check |
| "CORS error" | Add CORS middleware to backend |
| Blank page | Check browser console (F12) |
| "Hydration mismatch" | Server and client rendered different HTML |
| "EADDRINUSE" | Another process using the port, kill it or use different port |

## When AI Made a Mistake
1. Describe WHAT went wrong (not just "fix it").
2. Copy the EXACT error message.
3. If AI repeats the same mistake 3 times, revert and try a completely different approach.
4. Break the task into smaller steps.`,
  });

  // Universal: deployment
  skills.push({
    filename: 'deployment-checklist.md',
    content: `# Skill: Deployment Checklist

Before deploying, verify ALL of these:

## Pre-Deploy
- [ ] \`${ctx.commands.find((c) => c.name === 'build')?.command || 'npm run build'}\` completes without errors
- [ ] All environment variables are set in production
- [ ] No \`console.log\` debug statements in production code
- [ ] No hardcoded \`localhost\` or \`127.0.0.1\` — use environment variables
- [ ] HTTPS is configured
${ctx.testingInfo.hasTests ? `- [ ] All tests pass: \`${ctx.testingInfo.command || 'npm test'}\`` : '- [ ] Critical paths manually tested'}

## Platform-Specific
- **Vercel:** Set env vars in dashboard, auto-builds on push
- **Railway/Render:** Set PORT env var, add start script in package.json
- **Docker:** Use multi-stage builds, don't copy node_modules
- **VPS (nginx):** Configure reverse proxy, enable gzip, set up SSL`,
  });

  // Framework-specific skills
  const fwLower = framework.toLowerCase();
  if (fwLower.includes('next') || fwLower.includes('react')) {
    skills.push({
      filename: 'create-new-page.md',
      content: `# Skill: Create a New Page

When creating a new page/route, always include:

1. **SEO metadata** — title, description, og:image
2. **Loading state** — show skeleton or spinner while data loads
3. **Error boundary** — graceful error handling, not blank screen
4. **Responsive design** — test on mobile (375px) AND desktop (1440px)
5. **Accessibility** — semantic HTML, alt text, keyboard navigation

## Template${fwLower.includes('next') ? ` (Next.js App Router)
\`\`\`tsx
// app/my-page/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Title — My App',
  description: 'Clear description of this page',
};

export default function MyPage() {
  return (
    <main>
      <h1>Page Title</h1>
      {/* Content here */}
    </main>
  );
}
\`\`\`` : `
\`\`\`tsx
export default function MyPage() {
  return (
    <main>
      <h1>Page Title</h1>
    </main>
  );
}
\`\`\``}`,
    });
  }

  if (fwLower.includes('express') || fwLower.includes('nest') || fwLower.includes('fastapi') || fwLower.includes('django')) {
    skills.push({
      filename: 'create-api-endpoint.md',
      content: `# Skill: Create an API Endpoint

Every API endpoint MUST have:

1. **Input validation** — validate ALL user input before processing
2. **Error handling** — return proper HTTP status codes
3. **Authentication check** — verify user is authorized (if needed)
4. **Response format** — consistent JSON structure

## HTTP Status Codes
| Code | When to Use |
|---|---|
| 200 | Success |
| 201 | Created (POST success) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (logged in but no permission) |
| 404 | Not found |
| 500 | Server error (never expose details to client) |

## Security Rules
- NEVER trust user input
- NEVER expose internal error details
- ALWAYS use parameterized queries (prevent SQL injection)
- ALWAYS rate-limit sensitive endpoints`,
    });
  }

  return skills;
}
