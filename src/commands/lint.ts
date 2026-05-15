import ora from 'ora';
import { scanRepository } from '../core/repoScanner.js';
import { detectContextFiles, scoreContextFile, getGrade, getScoreColor } from '../core/contextScorer.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Lint command — Score and analyze quality of AI context files.
 * Detects generic rules, missing tribal knowledge, and suggests improvements.
 */

export async function lintCommand(): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Scanning for AI context files...').start();

  try {
    const scan = await scanRepository(cwd);
    const contextFiles = detectContextFiles(cwd);
    const existingFiles = contextFiles.filter((f) => f.exists);

    if (existingFiles.length === 0) {
      spinner.fail('No AI context files found');
      logger.blank();
      logger.warn('No AGENTS.md, CLAUDE.md, or .cursorrules found');
      logger.blank();
      logger.indent(chalk.bold('Create one with:'));
      logger.indent(`  ${chalk.cyan('repolens init')}  — Interactive context creation`, 1);
      return;
    }

    spinner.succeed(`Found ${existingFiles.length} context file(s)`);

    // Score each file
    for (const file of existingFiles) {
      const score = scoreContextFile(file.content, scan.fileTree);
      const grade = getGrade(score.overall);
      const color = getScoreColor(score.overall);

      logger.section('📋', `${file.path}`);
      logger.blank();

      // Overall score with visual bar
      const scoreBar = '█'.repeat(Math.round(score.overall / 5)) + '░'.repeat(20 - Math.round(score.overall / 5));
      const colorFn = color === 'green' ? chalk.green : color === 'yellow' ? chalk.yellow : chalk.red;

      logger.indent(chalk.bold(`Overall: ${colorFn(`${score.overall}/100`)} ${colorFn(grade)}  ${colorFn(scoreBar)}`));
      logger.blank();

      // Breakdown
      logger.indent(chalk.bold('Breakdown:'));
      const metrics = [
        { name: 'Specificity', value: score.breakdown.specificity, desc: 'Project-specific vs generic rules' },
        { name: 'Coverage', value: score.breakdown.coverage, desc: 'Important areas covered' },
        { name: 'Conciseness', value: score.breakdown.conciseness, desc: 'Not too long, not too short' },
        { name: 'Freshness', value: score.breakdown.freshness, desc: 'References actual project files' },
        { name: 'Tribal Knowledge', value: score.breakdown.tribalKnowledge, desc: 'Non-inferable information' },
      ];

      for (const m of metrics) {
        const mColor = getScoreColor(m.value);
        const mFn = mColor === 'green' ? chalk.green : mColor === 'yellow' ? chalk.yellow : chalk.red;
        const bar = '█'.repeat(Math.round(m.value / 10)) + '░'.repeat(10 - Math.round(m.value / 10));
        logger.indent(`  ${m.name.padEnd(18)} ${mFn(`${String(m.value).padStart(3)}/100`)}  ${mFn(bar)}  ${chalk.dim(m.desc)}`, 1);
      }

      logger.blank();

      // Stats
      logger.indent(chalk.bold('Stats:'));
      logger.kv('Total Lines', String(score.totalLines));
      logger.kv('Generic Rules', chalk.red(String(score.genericRulesCount)));
      logger.kv('Specific Rules', chalk.green(String(score.specificRulesCount)));

      // Issues
      if (score.issues.length > 0) {
        logger.blank();
        logger.indent(chalk.bold('Issues:'));
        for (const issue of score.issues) {
          const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
          const issueFn = issue.severity === 'error' ? chalk.red : issue.severity === 'warning' ? chalk.yellow : chalk.blue;
          let msg = `${icon} ${issueFn(issue.message)}`;
          if (issue.line) msg += chalk.dim(` (line ${issue.line})`);
          logger.indent(msg, 1);
          if (issue.fix) {
            logger.indent(chalk.dim(`  Fix: ${issue.fix}`), 2);
          }
        }
      }

      // Suggestions
      if (score.suggestions.length > 0) {
        logger.blank();
        logger.indent(chalk.bold('Suggestions:'));
        for (const s of score.suggestions) {
          logger.indent(chalk.cyan(`  💡 ${s}`), 1);
        }
      }
    }

    // Missing files
    const missingFiles = contextFiles.filter((f) => !f.exists);
    if (missingFiles.length > 0) {
      logger.blank();
      logger.section('📭', 'Missing Context Files');
      for (const f of missingFiles) {
        const typeLabels: Record<string, string> = {
          agents: 'AGENTS.md (Universal standard)',
          claude: 'CLAUDE.md (Claude Code)',
          cursorrules: '.cursorrules (Cursor IDE)',
          copilot: 'copilot-instructions.md (GitHub Copilot)',
        };
        logger.indent(chalk.dim(`  ✗ ${typeLabels[f.type] || f.path}`));
      }
      logger.blank();
      logger.indent(`Sync all from AGENTS.md: ${chalk.cyan('repolens sync')}`);
    }

  } catch (error) {
    spinner.fail('Lint failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
