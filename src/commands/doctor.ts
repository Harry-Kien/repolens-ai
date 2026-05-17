import ora from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { detectContextFiles } from '../core/contextScorer.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Doctor command — Health check for your AI development setup.
 * Like `brew doctor` but for AI coding environments.
 */

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

/**
 * Run the full local health check for AI context, verification scripts, sync
 * status, and common repository hygiene signals.
 */
export async function doctorCommand(): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  logger.section('🩺', 'AI Development Health Check');
  logger.blank();

  const checks: CheckResult[] = [];

  // 1. Check context files
  const contextFiles = detectContextFiles(cwd);
  const hasAgents = contextFiles.some((f) => f.type === 'agents' && f.exists);
  const hasClaude = contextFiles.some((f) => f.type === 'claude' && f.exists);
  const hasCursor = contextFiles.some((f) => f.type === 'cursorrules' && f.exists);
  const hasCopilot = contextFiles.some((f) => f.type === 'copilot' && f.exists);
  const hasSkills = contextFiles.some((f) => f.type === 'skill' && f.exists);

  checks.push({
    name: 'AGENTS.md',
    status: hasAgents ? 'pass' : 'fail',
    message: hasAgents ? 'Found — universal AI context file' : 'Missing — no universal context file',
    fix: hasAgents ? undefined : 'Run: repolens init',
  });

  checks.push({
    name: 'CLAUDE.md',
    status: hasClaude ? 'pass' : 'warn',
    message: hasClaude ? 'Found — Claude Code instructions' : 'Missing — Claude Code will use defaults',
    fix: hasClaude ? undefined : 'Run: repolens sync',
  });

  checks.push({
    name: '.cursorrules',
    status: hasCursor ? 'pass' : 'warn',
    message: hasCursor ? 'Found — Cursor IDE rules' : 'Missing — Cursor will use defaults',
    fix: hasCursor ? undefined : 'Run: repolens sync',
  });

  checks.push({
    name: 'Copilot Instructions',
    status: hasCopilot ? 'pass' : 'warn',
    message: hasCopilot ? 'Found — GitHub Copilot instructions' : 'Missing — Copilot will use defaults',
    fix: hasCopilot ? undefined : 'Run: repolens sync',
  });

  // 2. Check Git
  const hasGit = fs.existsSync(path.join(cwd, '.git'));
  checks.push({
    name: 'Git Repository',
    status: hasGit ? 'pass' : 'warn',
    message: hasGit ? 'Initialized' : 'Not a git repository',
    fix: hasGit ? undefined : 'Run: git init',
  });

  // 3. Check .gitignore
  const hasGitignore = fs.existsSync(path.join(cwd, '.gitignore'));
  let gitignoreHasEnv = false;
  if (hasGitignore) {
    const content = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf-8');
    gitignoreHasEnv = content.includes('.env');
  }
  checks.push({
    name: '.gitignore',
    status: hasGitignore ? (gitignoreHasEnv ? 'pass' : 'warn') : 'warn',
    message: hasGitignore
      ? (gitignoreHasEnv ? 'Found — .env is excluded' : 'Found but .env not in ignore list')
      : 'Missing',
    fix: gitignoreHasEnv ? undefined : 'Add .env to .gitignore',
  });

  // 4. Check for .env files
  const envFiles = fs.readdirSync(cwd).filter((f) => f.startsWith('.env') && !f.endsWith('.example'));
  checks.push({
    name: 'Environment Files',
    status: envFiles.length === 0 ? 'pass' : 'warn',
    message: envFiles.length === 0 ? 'No .env files in root (good)' : `${envFiles.length} .env file(s) found — ensure they are gitignored`,
  });

  // 5. Check for README
  const hasReadme = fs.existsSync(path.join(cwd, 'README.md')) || fs.existsSync(path.join(cwd, 'readme.md'));
  checks.push({
    name: 'README.md',
    status: hasReadme ? 'pass' : 'warn',
    message: hasReadme ? 'Found' : 'Missing — add project documentation',
  });

  // 6. Check package.json scripts
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const hasTest = pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1';
      const hasLint = pkg.scripts?.lint;
      checks.push({
        name: 'Test Script',
        status: hasTest ? 'pass' : 'warn',
        message: hasTest ? `Configured: ${pkg.scripts.test}` : 'No test script configured',
      });
      checks.push({
        name: 'Lint Script',
        status: hasLint ? 'pass' : 'warn',
        message: hasLint ? `Configured: ${pkg.scripts.lint}` : 'No lint script configured',
      });
    } catch { /* skip */ }
  }

  // 7. Check for context file sync status
  if (hasAgents && (hasClaude || hasCursor)) {
    const agentsFile = contextFiles.find((f) => f.type === 'agents' && f.exists);
    const claudeFile = contextFiles.find((f) => f.type === 'claude' && f.exists);
    const cursorFile = contextFiles.find((f) => f.type === 'cursorrules' && f.exists);

    let inSync = true;
    if (claudeFile?.exists && !isSyncedFromAgents(claudeFile.content)) {
      inSync = false;
    }
    if (cursorFile?.exists && !isSyncedFromAgents(cursorFile.content)) {
      inSync = false;
    }

    checks.push({
      name: 'Context Sync',
      status: inSync ? 'pass' : 'warn',
      message: inSync ? 'Context files appear to be in sync' : 'Context files may be out of sync',
      fix: inSync ? undefined : 'Run: repolens sync',
    });
  }

  // Display results
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const icon = check.status === 'pass' ? chalk.green('✓') : check.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
    const statusFn = check.status === 'pass' ? chalk.green : check.status === 'warn' ? chalk.yellow : chalk.red;

    logger.indent(`${icon} ${chalk.bold(check.name.padEnd(22))} ${statusFn(check.message)}`);
    if (check.fix) {
      logger.indent(chalk.dim(`   Fix: ${check.fix}`), 2);
    }

    if (check.status === 'pass') passCount++;
    else if (check.status === 'warn') warnCount++;
    else failCount++;
  }

  // Summary
  logger.blank();
  logger.indent(chalk.bold('Summary:'));
  logger.indent(`  ${chalk.green(`${passCount} passed`)}  ${chalk.yellow(`${warnCount} warnings`)}  ${chalk.red(`${failCount} failed`)}`);

  const healthScore = Math.round((passCount / checks.length) * 100);
  const healthBar = chalk.green('█'.repeat(Math.round(healthScore / 5))) +
    chalk.dim('░'.repeat(20 - Math.round(healthScore / 5)));
  logger.indent(`  Health: ${healthBar} ${healthScore}%`);

  if (failCount > 0) {
    logger.blank();
    logger.indent(chalk.bold('Quick fix:'));
    logger.indent(`  ${chalk.cyan('repolens init')}  — Create AGENTS.md with tribal knowledge`);
    logger.indent(`  ${chalk.cyan('repolens sync')}  — Sync to all AI tools`);
  }
}

function isSyncedFromAgents(content: string): boolean {
  return content.includes('Synced from AGENTS.md') ||
    content.includes('Auto-synced from AGENTS.md');
}
