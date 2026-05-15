import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import type { ScanResult } from '../core/repoScanner.js';
import type { FrameworkInfo } from '../core/frameworkDetector.js';
import type { ArchitectureResult } from '../core/architectureAnalyzer.js';
import type { RiskReport } from '../core/riskDetector.js';
import type { GitDiffResult } from '../core/gitDiff.js';
import type { FileCategory } from '../core/fileClassifier.js';

/**
 * Terminal reporter — beautiful CLI output with icons and colors.
 */

export function reportBrand(): void {
  logger.brand();
}

export function reportSummary(scan: ScanResult, fw: FrameworkInfo): void {
  logger.section('✨', 'Project Summary');
  logger.kv('Directory', scan.cwd);
  logger.kv('Framework', `${fw.framework} ${fw.version ? `(${fw.version})` : ''}`);
  logger.kv('Language', fw.language);
  logger.kv('Package Manager', fw.packageManager);
  logger.kv('Total Files', String(scan.totalFiles));
  logger.kv('Est. Lines of Code', String(scan.estimatedLinesOfCode.toLocaleString()));
  logger.kv('Languages', scan.languages.join(', ') || 'N/A');

  if (fw.additionalFrameworks.length > 0) {
    logger.kv('Libraries', fw.additionalFrameworks.join(', '));
  }

  const features: string[] = [];
  if (scan.hasGit) features.push('Git');
  if (scan.hasDocker) features.push('Docker');
  if (scan.hasCiCd) features.push('CI/CD');
  if (scan.hasTests) features.push('Tests');
  if (scan.hasReadme) features.push('README');
  logger.kv('Features', features.join(', ') || 'None detected');
}

export function reportFileStats(filesByExt: Record<string, number>): void {
  logger.section('📊', 'File Statistics');
  const sorted = Object.entries(filesByExt)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);
  
  for (const [ext, count] of sorted) {
    const bar = chalk.cyan('█'.repeat(Math.min(count, 30)));
    logger.indent(`${ext.padEnd(12)} ${String(count).padStart(4)}  ${bar}`);
  }
}

export function reportFolderStructure(directories: string[]): void {
  logger.section('📁', 'Folder Structure');
  for (const dir of directories.slice(0, 20)) {
    logger.item(dir);
  }
}

export function reportImportantFiles(files: string[]): void {
  logger.section('📌', 'Important Files');
  if (files.length === 0) {
    logger.warn('No important files detected');
    return;
  }
  for (const f of files) {
    logger.item(f);
  }
}

export function reportArchitecture(arch: ArchitectureResult): void {
  logger.section('🧠', 'Architecture Overview');
  logger.kv('Style', arch.style);
  logger.blank();

  if (arch.layers.length > 0) {
    logger.indent(chalk.bold('Layers:'));
    for (const layer of arch.layers) {
      logger.indent(`${layer.name} (${layer.files} files)`, 2);
      for (const ex of layer.examples) {
        logger.indent(chalk.dim(ex), 3);
      }
    }
  }

  if (arch.dataFlow.length > 0) {
    logger.blank();
    logger.indent(chalk.bold('Data Flow:'));
    for (let i = 0; i < arch.dataFlow.length; i++) {
      logger.indent(chalk.cyan(`${i + 1}. ${arch.dataFlow[i]}`), 2);
    }
  }
}

export function reportRisks(report: RiskReport): void {
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
}

export function reportWeakPoints(points: string[]): void {
  if (points.length === 0) return;
  logger.section('🔍', 'Weak Points');
  for (const p of points) {
    logger.warn(p);
  }
}

export function reportSuggestions(suggestions: string[]): void {
  if (suggestions.length === 0) return;
  logger.section('🚀', 'Recommended Next Steps');
  for (const s of suggestions) {
    logger.success(s);
  }
}

export function reportReview(diff: GitDiffResult): void {
  logger.section('📝', 'Code Review');

  if (!diff.isGitRepo) {
    logger.warn('Not a git repository — cannot review changes');
    return;
  }

  if (diff.changedFiles.length === 0) {
    logger.success('No uncommitted changes');
    return;
  }

  logger.kv('Changed Files', String(diff.changedFiles.length));
  logger.blank();

  logger.indent(chalk.bold('Changed Files:'));
  for (const f of diff.changedFiles) {
    const isDangerous = diff.dangerousChanges.some(d => d.file === f);
    logger.indent(isDangerous ? chalk.red(`! ${f}`) : chalk.dim(`  ${f}`), 2);
  }

  if (diff.dangerousChanges.length > 0) {
    logger.blank();
    logger.indent(chalk.bold.red('⚠ High Risk Changes:'));
    for (const d of diff.dangerousChanges) {
      logger.risk('high', `${d.message} — ${d.file}`);
    }
  }

  if (diff.diffStat) {
    logger.blank();
    logger.indent(chalk.bold('Diff Stats:'));
    logger.indent(chalk.dim(diff.diffStat), 2);
  }
}

export function reportModules(byCategory: Record<FileCategory, string[]>): void {
  logger.section('📦', 'Main Modules');
  const display: [string, FileCategory][] = [
    ['Commands', 'command'], ['Controllers', 'controller'], ['Services', 'service'],
    ['Models', 'model'], ['Routes', 'route'], ['Views/Pages', 'view'],
    ['Components', 'component'], ['Middleware', 'middleware'], ['Tests', 'test'],
    ['Utilities', 'util'],
  ];

  for (const [label, cat] of display) {
    const files = byCategory[cat];
    if (files.length > 0) {
      logger.indent(`${chalk.bold(label)} (${files.length})`);
      for (const f of files.slice(0, 5)) {
        logger.indent(chalk.dim(f), 2);
      }
      if (files.length > 5) {
        logger.indent(chalk.dim(`... and ${files.length - 5} more`), 2);
      }
    }
  }
}

export function reportAiEnhancement(text: string | null): void {
  if (!text) return;
  logger.section('🤖', 'AI Analysis');
  for (const line of text.split('\n')) {
    logger.indent(line);
  }
}

export function reportOnboarding(
  scan: ScanResult, fw: FrameworkInfo, arch: ArchitectureResult,
  byCategory: Record<FileCategory, string[]>
): void {
  logger.section('👋', 'Welcome to this Project');
  logger.blank();

  logger.indent(chalk.bold('What is this project?'));
  logger.indent(`A ${fw.framework} (${fw.language}) project with ${scan.totalFiles} files.`, 2);
  if (fw.additionalFrameworks.length > 0) {
    logger.indent(`Uses: ${fw.additionalFrameworks.join(', ')}`, 2);
  }
  logger.blank();

  logger.indent(chalk.bold('Where to start:'));
  for (const f of scan.importantFiles.slice(0, 5)) {
    logger.indent(chalk.cyan(f), 2);
  }
  logger.blank();

  logger.indent(chalk.bold('Architecture:'));
  logger.indent(arch.style, 2);
  logger.blank();

  if (arch.dataFlow.length > 0) {
    logger.indent(chalk.bold('Main data flow:'));
    for (const step of arch.dataFlow) {
      logger.indent(`  ${step}`, 2);
    }
    logger.blank();
  }

  logger.indent(chalk.bold('Things to be careful with:'));
  for (const wp of arch.weakPoints.slice(0, 5)) {
    logger.warn(wp);
  }
  logger.blank();

  logger.indent(chalk.bold('Recommended learning path:'));
  const order = ['config', 'command', 'model', 'route', 'controller', 'service', 'component', 'view', 'util', 'test'];
  let step = 1;
  for (const cat of order) {
    const files = byCategory[cat as FileCategory];
    if (files && files.length > 0) {
      logger.indent(`${step}. Explore ${cat} files (${files.length} files)`, 2);
      step++;
    }
  }
}
