import ora from 'ora';
import { detectContextFiles } from '../core/contextScorer.js';
import { createSyncPlan, executeSyncPlan } from '../core/contextSyncer.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Sync command — Sync AGENTS.md to CLAUDE.md, .cursorrules, and copilot-instructions.
 * Solves the fragmentation problem.
 */

export async function syncCommand(options: { force?: boolean; dryRun?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Detecting context files...').start();

  try {
    const contextFiles = detectContextFiles(cwd);
    const agentsFile = contextFiles.find((f) => f.type === 'agents' && f.exists);

    if (!agentsFile) {
      spinner.fail('No AGENTS.md found');
      logger.blank();
      logger.warn('AGENTS.md is the source of truth for syncing.');
      logger.indent(`Create one with: ${chalk.cyan('repolens init')}`);
      return;
    }

    spinner.succeed('Found AGENTS.md as source');

    // Create sync plan
    const plan = createSyncPlan(agentsFile, contextFiles, cwd);

    // Show plan
    logger.section('📋', 'Sync Plan');
    logger.indent(chalk.bold(`Source: ${chalk.cyan(agentsFile.path)}`));
    logger.blank();

    for (const target of plan.targets) {
      const icon = target.action === 'create' ? '🆕' : target.action === 'update' ? '♻️' : '⏭️';
      const actionLabel = target.action === 'create' ? chalk.green('CREATE') :
        target.action === 'update' ? chalk.yellow('UPDATE') : chalk.dim('SKIP');
      logger.indent(`${icon} ${actionLabel} ${target.path} ${chalk.dim(`— ${target.label}`)}`);
    }

    if (plan.conflicts.length > 0) {
      logger.blank();
      logger.indent(chalk.bold.yellow('⚠ Conflicts:'));
      for (const conflict of plan.conflicts) {
        logger.indent(chalk.yellow(`  ${conflict.file}: ${conflict.reason}`));
        if (options.force) {
          logger.indent(chalk.dim('  → Will overwrite (--force flag set)'));
        } else {
          logger.indent(chalk.dim('  → Skipping. Use --force to overwrite'));
        }
      }
    }

    // Execute if not dry-run
    if (options.dryRun) {
      logger.blank();
      logger.info('Dry run — no files were written');
      return;
    }

    // If force mode, change skip targets to update
    if (options.force) {
      for (const target of plan.targets) {
        if (target.action === 'skip') target.action = 'update';
      }
    }

    logger.blank();
    const syncSpinner = ora('Syncing files...').start();
    const result = executeSyncPlan(plan, cwd);
    syncSpinner.succeed('Sync complete');

    logger.blank();
    if (result.written.length > 0) {
      logger.indent(chalk.bold('Written:'));
      for (const f of result.written) {
        logger.success(f);
      }
    }
    if (result.skipped.length > 0) {
      logger.indent(chalk.bold('Skipped (has manual edits):'));
      for (const f of result.skipped) {
        logger.warn(`${f} — use --force to overwrite`);
      }
    }

    logger.blank();
    logger.indent(chalk.dim('Tip: Commit these files to your repo so all AI tools use the same context.'));

  } catch (error) {
    spinner.fail('Sync failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
