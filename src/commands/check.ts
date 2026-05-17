import chalk from 'chalk';
import ora from 'ora';
import { runQuickCheck } from '../core/dailyWorkflow.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';

export function checkCommand(): void {
  reportBrand();
  const spinner = ora('Checking AI-generated changes...').start();
  const result = runQuickCheck(process.cwd());
  spinner.succeed('Quick check complete');

  logger.section('CHECK', 'AI Change Sanity Check');
  logger.indent(`${chalk.bold('Score:')} ${colorScore(result.score)(`${result.score}/100`)}`);
  logger.indent(result.summary);

  if (result.changedFiles.length > 0) {
    logger.blank();
    logger.indent(chalk.bold('Changed files:'));
    for (const file of result.changedFiles.slice(0, 20)) logger.indent(`- ${file}`, 2);
  }

  if (result.issues.length > 0) {
    logger.blank();
    logger.indent(chalk.bold('Issues to review:'));
    for (const issue of result.issues) {
      const label = issue.level === 'error'
        ? chalk.red('[error]')
        : issue.level === 'warning'
          ? chalk.yellow('[warn]')
          : chalk.blue('[info]');
      logger.indent(`${label} ${chalk.cyan(issue.file)} - ${issue.message}`, 2);
      if (issue.fix) logger.indent(chalk.dim(`Fix: ${issue.fix}`), 3);
    }
  } else {
    logger.blank();
    logger.success('No obvious AI-coding issues found in changed files');
  }

  logger.blank();
  logger.indent(chalk.dim('Run this after AI edits and before commit. It is a fast guardrail, not a replacement for tests.'));

  if (result.issues.some((issue) => issue.level === 'error')) {
    process.exitCode = 1;
  }
}

function colorScore(score: number): (text: string) => string {
  if (score >= 85) return chalk.green;
  if (score >= 70) return chalk.yellow;
  return chalk.red;
}
