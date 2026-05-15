import ora from 'ora';
import { detectRisks } from '../core/riskDetector.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export async function risksCommand(): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Scanning for risks...').start();

  try {
    const report = await detectRisks(cwd);
    const total = report.risks.length;
    spinner.succeed(`Risk scan complete — found ${total} issue(s)`);

    // Report risks
    logger.section('⚠️', 'Risk Analysis');
    logger.indent(
      `${chalk.red.bold(String(report.summary.high))} high  ` +
      `${chalk.yellow(String(report.summary.medium))} medium  ` +
      `${chalk.green(String(report.summary.low))} low`
    );
    logger.blank();

    if (report.risks.length === 0) {
      logger.success('No significant risks detected');
      return;
    }

    const byCategory = new Map<string, typeof report.risks>();
    for (const r of report.risks) {
      const list = byCategory.get(r.category) || [];
      list.push(r);
      byCategory.set(r.category, list);
    }

    for (const [cat, risks] of byCategory) {
      logger.indent(chalk.bold(cat.charAt(0).toUpperCase() + cat.slice(1) + ':'));
      for (const r of risks) {
        logger.risk(r.level, `${r.message}${r.file ? chalk.dim(` — ${r.file}`) : ''}`);
      }
      logger.blank();
    }

    // Priority fixes
    logger.section('🎯', 'Priority Fixes');
    const highRisks = report.risks.filter((r) => r.level === 'high');
    const medRisks = report.risks.filter((r) => r.level === 'medium');

    if (highRisks.length > 0) {
      logger.indent(chalk.red.bold('Immediate (High Priority):'));
      for (const r of highRisks) {
        logger.indent(`  • ${r.message}${r.file ? chalk.dim(` — ${r.file}`) : ''}`, 1);
      }
      logger.blank();
    }

    if (medRisks.length > 0) {
      logger.indent(chalk.yellow('Soon (Medium Priority):'));
      for (const r of medRisks) {
        logger.indent(`  • ${r.message}${r.file ? chalk.dim(` — ${r.file}`) : ''}`, 1);
      }
    }

  } catch (error) {
    spinner.fail('Risk scan failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
