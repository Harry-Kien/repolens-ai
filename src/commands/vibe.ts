import * as fs from 'node:fs';
import * as path from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { scanRepository } from '../core/repoScanner.js';
import { detectContextFiles, scoreContextFile } from '../core/contextScorer.js';
import { detectDrift } from '../core/driftDetector.js';
import { detectRisks } from '../core/riskDetector.js';
import { analyzeAST } from '../core/astAnalyzer.js';
import { calculateVibeReadiness } from '../core/vibeReadiness.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';

interface PackageScripts {
  dev?: string;
  build?: string;
  lint?: string;
  test?: string;
  [key: string]: string | undefined;
}

export async function vibeCommand(): Promise<void> {
  const cwd = process.cwd();
  reportBrand();
  logger.section('VIBE', 'Vibe Coding Readiness');
  logger.indent(chalk.dim('Checks whether this repo is easy for AI agents and human builders to use.'));
  logger.blank();

  const spinner = ora('Reading repository signals...').start();

  const scan = await scanRepository(cwd);
  const contextFiles = detectContextFiles(cwd);
  const existingContext = contextFiles.filter((file) => file.exists && file.type !== 'skill');
  const risks = await detectRisks(cwd);
  const scripts = readPackageScripts(cwd);

  let astInsight: ReturnType<typeof analyzeAST> | null = null;
  try {
    astInsight = analyzeAST(cwd);
  } catch {
    astInsight = null;
  }

  const contextScores: number[] = [];
  const driftScores: number[] = [];
  for (const file of existingContext) {
    const score = scoreContextFile(file.content, scan.fileTree);
    contextScores.push(score.overall);
    try {
      const drift = detectDrift(file.content, file.path, cwd, scan.fileTree);
      driftScores.push(drift.driftScore);
    } catch {
      // Drift is advisory; keep the readiness check resilient.
    }
  }

  const result = calculateVibeReadiness({
    contextScores,
    driftScores,
    toolCoverage: {
      agents: exists(cwd, 'AGENTS.md'),
      claudeOrCodex: exists(cwd, 'CLAUDE.md') || exists(cwd, 'CODEX.md'),
      cursor: exists(cwd, '.cursorrules') || exists(cwd, '.cursor/rules/project.mdc'),
      copilot: exists(cwd, '.github/copilot-instructions.md'),
      windsurf: exists(cwd, '.windsurfrules'),
      skills: exists(cwd, '.cursor/skills'),
    },
    workflow: {
      hasDevScript: Boolean(scripts.dev),
      hasBuildScript: Boolean(scripts.build),
      hasLintScript: Boolean(scripts.lint),
      hasTestScript: Boolean(scripts.test),
      hasReadme: scan.hasReadme,
      hasCi: scan.hasCiCd,
      hasLicense: exists(cwd, 'LICENSE'),
      hasContributing: exists(cwd, 'CONTRIBUTING.md'),
    },
    quality: {
      hasTests: scan.hasTests,
      highRisks: risks.summary.high,
      mediumRisks: risks.summary.medium,
      lowRisks: risks.summary.low,
      circularDeps: astInsight?.circularDeps.length ?? 0,
      avgComplexity: astInsight?.summary.avgComplexity,
      documentedPercentage: astInsight?.summary.documentedPercentage,
    },
  });

  spinner.succeed('Readiness check complete');
  logger.blank();

  logger.indent(`${chalk.bold('Score:')} ${colorScore(result.overall)(`${result.overall}/100 ${result.grade}`)}`);
  logger.indent(`${chalk.bold('Verdict:')} ${result.verdict}`);
  logger.blank();

  logger.indent(chalk.bold('Breakdown:'));
  printMetric('Context quality', result.breakdown.context);
  printMetric('AI tool coverage', result.breakdown.toolCoverage);
  printMetric('Workflow clarity', result.breakdown.workflow);
  printMetric('Code health', result.breakdown.codeHealth);

  if (result.strengths.length > 0) {
    logger.blank();
    logger.indent(chalk.bold('What is already working:'));
    for (const strength of result.strengths) {
      logger.indent(`${chalk.green('[ok]')} ${strength}`, 2);
    }
  }

  if (result.actions.length > 0) {
    logger.blank();
    logger.indent(chalk.bold('Highest-impact next moves:'));
    for (let i = 0; i < result.actions.length; i++) {
      logger.indent(`${i + 1}. ${result.actions[i]}`, 2);
    }
  }

  logger.blank();
  logger.indent(chalk.dim('Goal: reach 92+ before a large public launch.'));
}

function readPackageScripts(cwd: string): PackageScripts {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { scripts?: PackageScripts };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

function exists(cwd: string, relativePath: string): boolean {
  return fs.existsSync(path.join(cwd, relativePath));
}

function printMetric(label: string, score: number): void {
  const filled = Math.round(score / 10);
  const bar = '#'.repeat(filled) + '-'.repeat(10 - filled);
  logger.indent(`  ${label.padEnd(18)} ${colorScore(score)(String(score).padStart(3))}/100  ${bar}`);
}

function colorScore(score: number): (text: string) => string {
  if (score >= 85) return chalk.green;
  if (score >= 70) return chalk.yellow;
  return chalk.red;
}
