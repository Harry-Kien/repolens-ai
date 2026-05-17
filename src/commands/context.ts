import ora from 'ora';
import chalk from 'chalk';
import { buildDailyContext, copyToClipboard, renderProjectContext } from '../core/dailyWorkflow.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';

export interface ContextCommandOptions {
  copy?: boolean;
}

export async function contextCommand(options: ContextCommandOptions): Promise<void> {
  reportBrand();
  const spinner = ora('Building paste-ready project context...').start();

  const bundle = await buildDailyContext(process.cwd());
  const context = renderProjectContext(bundle);

  spinner.succeed('Project context ready');
  logger.section('CTX', 'Paste-Ready Project Context');
  logger.blank();
  for (const line of context.split('\n')) logger.indent(line);

  if (options.copy) {
    logger.blank();
    if (copyToClipboard(context)) {
      logger.success('Copied context to clipboard');
    } else {
      logger.warn('Could not copy to clipboard in this environment');
    }
  }

  logger.blank();
  logger.indent(chalk.dim('Use this at the start of a new ChatGPT, Claude, Gemini, Cursor, or Antigravity session.'));
}
