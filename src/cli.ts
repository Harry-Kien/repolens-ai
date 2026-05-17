import { Command } from 'commander';
import { withErrorHandler } from './utils/errors.js';

/**
 * RepoLens AI v3.1 - The Context Quality Guardian.
 *
 * Main commands:
 *   setup     - One-click AI context setup
 *   context   - Generate paste-ready context for any AI chat
 *   prompt    - Generate project-aware prompts from vague ideas
 *   check     - Sanity-check AI-generated changes
 *   vibe      - Score readiness for vibe coding and community launch
 *   lint      - Score context quality + detect drift
 *   sync      - Sync AGENTS.md to AI coding tools
 *   doctor    - Full health check
 */

const program = new Command();

program
  .name('repolens')
  .description(
    'RepoLens AI - The Context Quality Guardian\n\n' +
    '  Quick start:  repolens setup\n' +
    '  Daily use:    repolens context | repolens prompt "add login" | repolens check\n' +
    '  Score check:  repolens lint\n' +
    '  Visual UI:    repolens dashboard\n\n' +
    '  Your AI agents are only as good as the context you give them.'
  )
  .version('3.1.1');

program
  .command('setup')
  .description('One-click setup - AST analysis + AGENTS.md + sync to AI tools')
  .option('--no-sync', 'Skip syncing to other tools')
  .option('--no-skills', 'Skip generating skill files')
  .action(withErrorHandler(async (options) => {
    const { setupCommand } = await import('./commands/setup.js');
    await setupCommand({ sync: options.sync, skills: options.skills });
  }));

program
  .command('context')
  .description('Generate paste-ready project context for any AI chat')
  .option('--copy', 'Copy context to clipboard')
  .action(withErrorHandler(async (options) => {
    const { contextCommand } = await import('./commands/context.js');
    await contextCommand({ copy: options.copy });
  }));

program
  .command('prompt <request>')
  .description('Turn a vague idea into a project-aware AI coding prompt')
  .option('--copy', 'Copy prompt to clipboard')
  .action(withErrorHandler(async (request, options) => {
    const { promptCommand } = await import('./commands/prompt.js');
    await promptCommand(request, { copy: options.copy });
  }));

program
  .command('check')
  .description('Quick sanity check for AI-generated code changes')
  .action(withErrorHandler(async () => {
    const { checkCommand } = await import('./commands/check.js');
    checkCommand();
  }));

program
  .command('vibe')
  .alias('ready')
  .description('Score whether the repo is ready for vibe coding and community use')
  .action(withErrorHandler(async () => {
    const { vibeCommand } = await import('./commands/vibe.js');
    await vibeCommand();
  }));

program
  .command('lint')
  .alias('score')
  .description('Score context quality (0-100) + detect drift')
  .option('--json', 'Output as JSON')
  .option('--ci', 'CI mode - exit with code 1 if score < threshold')
  .option('--min-score <number>', 'Minimum acceptable score (default: 60)', '60')
  .action(withErrorHandler(async (options) => {
    const { lintCommand } = await import('./commands/lint.js');
    await lintCommand({
      json: options.json,
      ci: options.ci,
      minScore: parseInt(options.minScore, 10),
    });
  }));

program
  .command('sync')
  .description('Sync AGENTS.md to Cursor, Claude, Copilot, Windsurf, and Codex')
  .option('--force', 'Overwrite files with manual edits')
  .option('--dry-run', 'Preview without writing')
  .action(withErrorHandler(async (options) => {
    const { syncCommand } = await import('./commands/sync.js');
    await syncCommand({ force: options.force, dryRun: options.dryRun });
  }));

program
  .command('fix')
  .description('Auto-fix generic rules that hurt AI agent performance')
  .option('--dry-run', 'Preview fixes without writing')
  .action(withErrorHandler(async (options) => {
    const { fixCommand } = await import('./commands/fix.js');
    await fixCommand({ dryRun: options.dryRun });
  }));

program
  .command('init')
  .description('Create AGENTS.md through interactive interview + framework templates')
  .option('-y, --yes', 'Non-interactive mode (auto-detect only)')
  .action(withErrorHandler(async (options) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand({ yes: options.yes });
  }));

program
  .command('dashboard')
  .alias('ui')
  .description('Launch visual web dashboard with quality scores and drift analysis')
  .option('-p, --port <number>', 'Port number', '3141')
  .action(withErrorHandler(async (options) => {
    const { dashboardCommand } = await import('./commands/dashboard.js');
    await dashboardCommand({ port: parseInt(options.port, 10) });
  }));

program
  .command('doctor')
  .alias('health')
  .description('Full health check - context files, risks, sync status, setup')
  .action(withErrorHandler(async () => {
    const { doctorCommand } = await import('./commands/doctor.js');
    await doctorCommand();
  }));

program
  .command('templates')
  .alias('tpl')
  .description('Browse and apply curated framework templates')
  .option('-s, --search <query>', 'Search templates')
  .option('-a, --apply <id>', 'Apply a template')
  .action(withErrorHandler(async (options) => {
    const { templatesCommand } = await import('./commands/templates.js');
    await templatesCommand({ search: options.search, apply: options.apply, list: !options.search && !options.apply });
  }));

program
  .command('skills')
  .description('Generate .cursor/skills/ files for common AI coding tasks')
  .option('--list', 'List available skills')
  .option('--all', 'Generate all relevant skills')
  .action(withErrorHandler(async (options) => {
    const { skillsCommand } = await import('./commands/skills.js');
    await skillsCommand({ list: options.list, all: options.all });
  }));

program
  .command('analyze')
  .description('Full repository analysis')
  .option('-f, --format <format>', 'Output format: terminal or markdown', 'terminal')
  .option('--no-ai', 'Disable optional AI enhancement')
  .action(withErrorHandler(async (options) => {
    const { analyzeCommand } = await import('./commands/analyze.js');
    await analyzeCommand({ format: options.format, ai: options.ai });
  }));

program
  .command('arch')
  .alias('architecture')
  .description('Architecture deep-dive')
  .option('--no-ai', 'Disable optional AI enhancement')
  .action(withErrorHandler(async (options) => {
    const { architectureCommand } = await import('./commands/architecture.js');
    await architectureCommand({ ai: options.ai });
  }));

program
  .command('explain <topic>')
  .description('Explain a module or feature by searching code')
  .option('--no-ai', 'Disable optional AI enhancement')
  .action(withErrorHandler(async (topic, options) => {
    const { explainCommand } = await import('./commands/explain.js');
    await explainCommand(topic, { ai: options.ai });
  }));

program
  .command('review')
  .description('Review recent code changes')
  .option('--no-ai', 'Disable optional AI enhancement')
  .action(withErrorHandler(async (options) => {
    const { reviewCommand } = await import('./commands/review.js');
    await reviewCommand({ ai: options.ai });
  }));

program
  .command('risks')
  .description('Scan for security and architecture risks')
  .action(withErrorHandler(async () => {
    const { risksCommand } = await import('./commands/risks.js');
    await risksCommand();
  }));

program
  .command('onboard')
  .alias('onboarding')
  .description('Generate a developer onboarding guide')
  .action(withErrorHandler(async () => {
    const { onboardingCommand } = await import('./commands/onboarding.js');
    await onboardingCommand();
  }));

program.parse();
