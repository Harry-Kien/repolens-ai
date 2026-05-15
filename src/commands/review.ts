import ora from 'ora';
import { analyzeGitDiff } from '../core/gitDiff.js';
import { reportBrand, reportReview } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import { isAiAvailable, enhance } from '../ai/aiClient.js';
import { getSystemPrompt, buildReviewPrompt } from '../ai/promptBuilder.js';
import chalk from 'chalk';

export async function reviewCommand(options: { ai?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Analyzing git changes...').start();

  try {
    const diff = analyzeGitDiff(cwd);
    spinner.succeed('Git analysis complete');

    reportReview(diff);

    if (!diff.isGitRepo || diff.changedFiles.length === 0) return;

    // Categorize changes
    const safeChanges = diff.changedFiles.filter(
      (f) => !diff.dangerousChanges.some((d) => d.file === f)
    );

    if (safeChanges.length > 0) {
      logger.section('✅', 'Safe Changes');
      for (const f of safeChanges) {
        logger.success(f);
      }
    }

    // Suggested fix plan
    if (diff.dangerousChanges.length > 0) {
      logger.section('🔧', 'Suggested Fix Plan');
      let step = 1;
      for (const d of diff.dangerousChanges) {
        logger.indent(`${step}. Review ${chalk.bold(d.file)} — ${d.message}`);
        step++;
      }
      logger.indent(`${step}. Run tests after addressing the above`);
    }

    // AI enhancement
    if (options.ai !== false && isAiAvailable() && diff.changedFiles.length > 0) {
      const aiSpinner = ora('Getting AI review...').start();
      const aiText = await enhance(
        getSystemPrompt(),
        buildReviewPrompt(
          diff.changedFiles,
          diff.diffStat,
          diff.dangerousChanges.length,
        ),
      );
      if (aiText) {
        aiSpinner.succeed('AI review complete');
        logger.section('🤖', 'AI Code Review');
        for (const line of aiText.split('\n')) logger.indent(line);
      } else {
        aiSpinner.info('AI not available');
      }
    }
  } catch (error) {
    spinner.fail('Review failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
