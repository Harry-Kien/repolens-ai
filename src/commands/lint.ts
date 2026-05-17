import ora from 'ora';
import chalk from 'chalk';
import { scanRepository } from '../core/repoScanner.js';
import { detectContextFiles, scoreContextFile, getGrade, getScoreColor } from '../core/contextScorer.js';
import { analyzeAST } from '../core/astAnalyzer.js';
import { detectDrift } from '../core/driftDetector.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';

/**
 * Lint command v3.0 — AST-powered context quality scoring + drift detection.
 *
 * What's new:
 * - AST analysis provides real code intelligence (not regex guessing)
 * - Drift detection catches stale context files
 * - CI mode with exit codes for GitHub Actions
 * - JSON output for automation
 */

interface LintOptions {
  json?: boolean;
  ci?: boolean;
  minScore?: number;
}

export async function lintCommand(options: LintOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const minScore = options.minScore || 60;

  if (!options.json) {
    reportBrand();
    logger.section('📊', 'Context Quality Analysis');
    logger.blank();
  }

  // ─── Step 1: Scan & Score ────────────────────────────
  const spinner = !options.json ? ora('Analyzing project...').start() : null;

  const scan = await scanRepository(cwd);
  const contextFiles = detectContextFiles(cwd);
  const existing = contextFiles.filter(f => f.exists);
  const scorable = existing.filter(f => f.type !== 'skill');

  if (existing.length === 0) {
    spinner?.fail('No AI context files found');
    if (!options.json) {
      logger.blank();
      logger.indent(`Create one: ${chalk.cyan('repolens setup')}`);
    }
    if (options.ci) process.exit(1);
    return;
  }

  if (scorable.length === 0) {
    spinner?.fail('No AI context source files found');
    if (!options.json) {
      logger.blank();
      logger.indent(`Create one: ${chalk.cyan('repolens setup')}`);
    }
    if (options.ci) process.exit(1);
    return;
  }

  // ─── Step 2: AST Analysis ───────────────────────────
  spinner && (spinner.text = 'Running AST analysis...');
  let astInsight;
  try {
    astInsight = analyzeAST(cwd);
  } catch {
    // AST analysis is optional — don't fail the whole command
    astInsight = null;
  }

  spinner?.succeed(`Found ${existing.length} context file(s) · ${scan.totalFiles} project files${astInsight ? ` · ${astInsight.summary.totalFunctions} functions (AST)` : ''}`);

  // ─── Step 3: Score Each File ────────────────────────
  const results: {
    file: typeof existing[0];
    score: ReturnType<typeof scoreContextFile>;
    drift: ReturnType<typeof detectDrift> | null;
  }[] = [];

  for (const file of scorable) {
    const score = scoreContextFile(file.content, scan.fileTree);

    let drift = null;
    try {
      drift = detectDrift(file.content, file.path, cwd, scan.fileTree);
    } catch {
      // Drift detection is a bonus, not a blocker
    }

    results.push({ file, score, drift });
  }

  // ─── JSON Output ────────────────────────────────────
  if (options.json) {
    const output = {
      files: results.map(r => ({
        path: r.file.path,
        type: r.file.type,
        score: r.score.overall,
        grade: getGrade(r.score.overall),
        breakdown: r.score.breakdown,
        issues: r.score.issues,
        drift: r.drift ? {
          score: r.drift.driftScore,
          staleFiles: r.drift.staleFiles.length,
          staleCommands: r.drift.staleCommands.length,
          undocumented: r.drift.undocumentedFiles.length,
        } : null,
      })),
      skills: {
        count: existing.filter(file => file.type === 'skill').length,
      },
      ast: astInsight ? {
        functions: astInsight.summary.totalFunctions,
        classes: astInsight.summary.totalClasses,
        circularDeps: astInsight.circularDeps.length,
        avgComplexity: astInsight.summary.avgComplexity,
        documentedPercentage: astInsight.summary.documentedPercentage,
      } : null,
      pass: results.every(r => r.score.overall >= minScore),
    };
    console.log(JSON.stringify(output, null, 2));
    if (options.ci && !output.pass) process.exit(1);
    return;
  }

  // ─── Terminal Output ────────────────────────────────
  for (const { file, score, drift } of results) {
    logger.blank();
    logger.section('📄', `${file.path} — ${getGradeColor(score.overall, `${score.overall}/100 ${getGrade(score.overall)}`)}`);

    // Score breakdown
    logger.blank();
    logger.indent(chalk.bold('Score Breakdown:'));
    const bd = score.breakdown;
    printBar('Specificity', bd.specificity, 'Project-specific rules');
    printBar('Coverage', bd.coverage, 'Important areas covered');
    printBar('Conciseness', bd.conciseness, 'Optimal length for AI');
    printBar('Freshness', bd.freshness, 'References real files');
    printBar('Tribal Knowledge', bd.tribalKnowledge, 'Info AI cannot infer');

    // Drift report
    if (drift && drift.driftScore > 0) {
      logger.blank();
      logger.indent(chalk.bold('🔄 Context Drift:'));
      logger.indent(`  ${drift.summary}`);
      logger.indent(`  Drift score: ${getDriftColor(drift.driftScore, `${drift.driftScore}/100`)}`);

      if (drift.staleFiles.length > 0) {
        logger.blank();
        logger.indent(chalk.dim('  Stale file references:'));
        for (const sf of drift.staleFiles.slice(0, 5)) {
          logger.indent(`    ${chalk.red('✗')} \`${sf.mentioned}\` — ${sf.status}${sf.suggestion ? ` → ${chalk.green(sf.suggestion)}` : ''}`);
        }
      }

      if (drift.staleCommands.length > 0) {
        logger.indent(chalk.dim('  Stale commands:'));
        for (const sc of drift.staleCommands.slice(0, 3)) {
          logger.indent(`    ${chalk.red('✗')} \`${sc.documented}\` — ${sc.actualCommand ? `try \`${sc.actualCommand}\`` : 'script not found'}`);
        }
      }

      if (drift.undocumentedFiles.length > 0) {
        logger.indent(chalk.dim('  Undocumented critical files:'));
        for (const uf of drift.undocumentedFiles.slice(0, 5)) {
          logger.indent(`    ${chalk.yellow('+')} ${uf.file} — ${uf.reason}`);
        }
      }
    } else if (drift) {
      logger.blank();
      logger.indent(`${chalk.green('✓')} No context drift detected — context is in sync.`);
    }

    // Issues
    if (score.issues.length > 0) {
      logger.blank();
      logger.indent(chalk.bold('Issues:'));
      for (const issue of score.issues.slice(0, 8)) {
        const icon = issue.severity === 'error' ? chalk.red('✗') : issue.severity === 'warning' ? chalk.yellow('⚠') : chalk.blue('ℹ');
        logger.indent(`  ${icon} ${issue.message}${issue.line ? chalk.dim(` (line ${issue.line})`) : ''}`);
        if (issue.fix) logger.indent(chalk.dim(`    Fix: ${issue.fix}`));
      }
    }

    // Suggestions
    if (score.suggestions.length > 0) {
      logger.blank();
      logger.indent(chalk.bold('Suggestions:'));
      for (const s of score.suggestions.slice(0, 5)) {
        logger.indent(`  ${chalk.cyan('→')} ${s}`);
      }
    }
  }

  // ─── AST Intelligence Report ────────────────────────
  if (astInsight) {
    logger.blank();
    logger.section('🧠', 'Code Intelligence (AST)');
    logger.blank();

    logger.indent(chalk.bold('Codebase Metrics:'));
    logger.kv('  Functions', String(astInsight.summary.totalFunctions));
    logger.kv('  Classes', String(astInsight.summary.totalClasses));
    logger.kv('  Interfaces', String(astInsight.summary.totalInterfaces));
    logger.kv('  Avg Complexity', String(astInsight.summary.avgComplexity));
    logger.kv('  Documentation', `${astInsight.summary.documentedPercentage}%`);

    if (astInsight.circularDeps.length > 0) {
      logger.blank();
      logger.indent(`${chalk.red('⚠')} ${chalk.bold(`${astInsight.circularDeps.length} circular dependencies detected:`)}`);
      for (const [a, b] of astInsight.circularDeps.slice(0, 5)) {
        logger.indent(`  ${chalk.red('↻')} ${a} ↔ ${b}`);
      }
      logger.indent(chalk.dim('  These should be documented in AGENTS.md as gotchas.'));
    }

    const undocumentedComplex = astInsight.complexFunctions.find(
      (fn) => fn.complexity > 60 && !fn.hasJSDoc,
    );
    if (undocumentedComplex) {
      logger.blank();
      logger.indent(`${chalk.yellow('⚠')} High complexity: ${chalk.bold(undocumentedComplex.name)} in ${undocumentedComplex.file} (${undocumentedComplex.complexity})`);
    }

    // Naming conventions detected
    const naming = astInsight.namingAnalysis;
    if (naming.dominant.functions !== 'unknown') {
      logger.blank();
      logger.indent(chalk.bold('Naming Conventions Detected:'));
      logger.indent(`  Functions: ${chalk.green(naming.dominant.functions)}`);
      logger.indent(`  Variables: ${chalk.green(naming.dominant.variables)}`);
      logger.indent(`  Types: ${chalk.green(naming.dominant.types)}`);
    }
  }

  // ─── Summary ────────────────────────────────────────
  logger.blank();
  const bestScore = Math.max(...results.map(r => r.score.overall));
  const worstDrift = Math.max(...results.map(r => r.drift?.driftScore || 0));

  logger.section('📋', 'Summary');
  logger.indent(`Quality: ${getGradeColor(bestScore, `${bestScore}/100 ${getGrade(bestScore)}`)}`);
  if (worstDrift > 0) {
    logger.indent(`Drift: ${getDriftColor(worstDrift, `${worstDrift}/100`)}`);
  }

  if (bestScore < 80 || worstDrift > 15) {
    logger.blank();
    logger.indent(chalk.bold('Next steps:'));
    if (bestScore < 80) logger.indent(`  ${chalk.cyan('repolens fix')}    — Auto-fix generic rules`);
    if (worstDrift > 15) logger.indent(`  ${chalk.cyan('repolens setup')}  — Regenerate with latest code analysis`);
    logger.indent(`  ${chalk.cyan('repolens sync')}   — Sync fixes to all AI tools`);
  }

  // CI mode exit
  if (options.ci) {
    const pass = results.every(r => r.score.overall >= minScore);
    if (!pass) {
      logger.blank();
      logger.error(`Context quality below threshold (${minScore}). Failing CI.`);
      process.exit(1);
    } else {
      logger.blank();
      logger.success(`All context files meet quality threshold (${minScore}).`);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────

function getGradeColor(score: number, text: string): string {
  if (score >= 80) return chalk.green(text);
  if (score >= 60) return chalk.yellow(text);
  return chalk.red(text);
}

function getDriftColor(score: number, text: string): string {
  if (score <= 15) return chalk.green(text);
  if (score <= 40) return chalk.yellow(text);
  return chalk.red(text);
}

function printBar(label: string, score: number, desc: string): void {
  const clamped = Math.min(100, Math.max(0, score));
  const filled = Math.min(10, Math.round(clamped / 10));
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const color = clamped >= 80 ? chalk.green : clamped >= 50 ? chalk.yellow : chalk.red;
  logger.indent(`  ${label.padEnd(18)} ${color(`${String(clamped).padStart(3)}/100`)}  ${color(bar)}  ${chalk.dim(desc)}`);
}
