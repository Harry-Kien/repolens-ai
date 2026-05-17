import ora from 'ora';
import chalk from 'chalk';
import { buildDailyContext, copyToClipboard, renderSmartPrompt } from '../core/dailyWorkflow.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';

export interface PromptCommandOptions {
  copy?: boolean;
}

export async function promptCommand(request: string, options: PromptCommandOptions): Promise<void> {
  reportBrand();

  if (!request.trim()) {
    logger.error('Please describe what you want the AI agent to build.');
    process.exit(1);
  }

  const spinner = ora('Generating project-aware prompt...').start();
  const bundle = await buildDailyContext(process.cwd());
  const result = renderSmartPrompt(bundle, request);

  spinner.succeed('Smart prompt ready');
  logger.section('PROMPT', 'Project-Aware Prompt');
  logger.blank();
  for (const line of result.prompt.split('\n')) logger.indent(line);

  if (options.copy) {
    logger.blank();
    if (copyToClipboard(result.prompt)) {
      logger.success('Copied prompt to clipboard');
    } else {
      logger.warn('Could not copy to clipboard in this environment');
    }
  }

  if (result.relatedFiles.length > 0) {
    logger.blank();
    logger.indent(chalk.dim(`Matched ${result.relatedFiles.length} related project file(s).`));
  }
}
