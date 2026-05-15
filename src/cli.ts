import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { architectureCommand } from './commands/architecture.js';
import { explainCommand } from './commands/explain.js';
import { reviewCommand } from './commands/review.js';
import { risksCommand } from './commands/risks.js';
import { onboardingCommand } from './commands/onboarding.js';
import { generateAgentsCommand } from './commands/generateAgents.js';
import { initCommand } from './commands/init.js';
import { lintCommand } from './commands/lint.js';
import { syncCommand } from './commands/sync.js';
import { doctorCommand } from './commands/doctor.js';
import { dashboardCommand } from './commands/dashboard.js';
import { templatesCommand } from './commands/templates.js';
import { fixCommand } from './commands/fix.js';
import { skillsCommand } from './commands/skills.js';
import { setupCommand } from './commands/setup.js';

const program = new Command();

program
  .name('repolens')
  .description('🔍 RepoLens AI — AI Context Intelligence for Vibe Coders\n\n  Quick start:  repolens setup\n  Score check:  repolens lint\n  Dashboard:    repolens dashboard')
  .version('2.0.0');

// ─── THE ONE COMMAND ───────────────────────────────────
// This is what 90% of users need. Everything else is optional.

program
  .command('setup')
  .description('⭐ One-click setup — creates AGENTS.md + syncs to 6 AI tools + generates skills')
  .action(async () => {
    await setupCommand();
  });

// ─── CORE COMMANDS ─────────────────────────────────────
// For users who want more control.

program
  .command('init')
  .description('Create AGENTS.md through interactive interview')
  .option('-y, --yes', 'Non-interactive mode')
  .action(async (options) => {
    await initCommand({ yes: options.yes });
  });

program
  .command('lint')
  .alias('score')
  .description('Score your AI context files (0-100)')
  .action(async () => {
    await lintCommand();
  });

program
  .command('sync')
  .description('Sync AGENTS.md → 6 AI tools (Cursor, Claude, Copilot, Windsurf, Codex)')
  .option('--force', 'Overwrite files with manual edits')
  .option('--dry-run', 'Preview without writing')
  .action(async (options) => {
    await syncCommand({ force: options.force, dryRun: options.dryRun });
  });

program
  .command('fix')
  .description('Auto-fix issues in context files')
  .option('--dry-run', 'Preview fixes')
  .action(async (options) => {
    await fixCommand({ dryRun: options.dryRun });
  });

program
  .command('templates')
  .alias('tpl')
  .description('Browse & apply framework templates (Next.js, React, Django, etc.)')
  .option('-s, --search <query>', 'Search templates')
  .option('-a, --apply <id>', 'Apply a template')
  .action(async (options) => {
    await templatesCommand({ search: options.search, apply: options.apply, list: !options.search && !options.apply });
  });

program
  .command('skills')
  .description('Generate .cursor/skills/ for common tasks')
  .option('-l, --list', 'List available skills')
  .option('-a, --all', 'Generate all relevant skills')
  .action(async (options) => {
    await skillsCommand({ list: options.list, all: options.all });
  });

program
  .command('doctor')
  .alias('check')
  .description('Health check for your AI dev setup')
  .action(async () => {
    await doctorCommand();
  });

program
  .command('dashboard')
  .alias('ui')
  .description('Visual web dashboard (localhost)')
  .option('-p, --port <number>', 'Port', '3141')
  .action(async (options) => {
    await dashboardCommand({ port: parseInt(options.port, 10) });
  });

// ─── ANALYSIS COMMANDS ─────────────────────────────────

program
  .command('analyze')
  .description('Full repo analysis')
  .option('--format <type>', 'Output: terminal or md', 'terminal')
  .option('--no-ai', 'Disable AI')
  .action(async (options) => {
    await analyzeCommand({ format: options.format, ai: options.ai });
  });

program
  .command('explain <topic>')
  .description('Explain any feature by searching code content')
  .option('--no-ai', 'Disable AI')
  .action(async (topic, options) => {
    await explainCommand(topic, { ai: options.ai });
  });

program
  .command('review')
  .description('Review recent code changes')
  .option('--no-ai', 'Disable AI')
  .action(async (options) => {
    await reviewCommand({ ai: options.ai });
  });

program
  .command('risks')
  .description('Security & risk scanner')
  .action(async () => {
    await risksCommand();
  });

program
  .command('arch')
  .description('Architecture analysis')
  .option('--no-ai', 'Disable AI')
  .action(async (options) => {
    await architectureCommand({ ai: options.ai });
  });

program
  .command('onboard')
  .description('Developer onboarding guide')
  .action(async () => {
    await onboardingCommand();
  });

program
  .command('agents')
  .description('Generate AGENTS.md (legacy — use setup)')
  .action(async () => {
    await generateAgentsCommand();
  });

program.parse();
