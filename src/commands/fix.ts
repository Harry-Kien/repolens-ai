import * as fs from 'node:fs';
import * as path from 'node:path';
import ora from 'ora';
import { detectContextFiles, scoreContextFile } from '../core/contextScorer.js';
import { scanRepository } from '../core/repoScanner.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Fix command — Auto-fix detected issues in AI context files.
 * Removes generic rules, adds missing sections, and improves quality.
 */

// Generic rules patterns to remove (exact line removals)
const GENERIC_LINE_PATTERNS: RegExp[] = [
  /^\d+\.\s*\*\*Analyze before editing\*\*/,
  /^\d+\.\s*\*\*Minimal safe changes\*\*/,
  /^\d+\.\s*\*\*No unnecessary rewrites\*\*/,
  /^\d+\.\s*\*\*Preserve architecture\*\*/,
  /^\d+\.\s*\*\*Keep files focused\*\*/,
  /^\d+\.\s*\*\*Follow \w+ conventions\*\*/,
  /^-\s*Never commit secrets/i,
  /^-\s*Protect \.?env files/i,
  /^-\s*Validate all input/i,
  /^-\s*Never trust user input/i,
  /^-\s*Use parameterized queries/i,
  /^-\s*No eval\(\)/i,
  /^-\s*Preserve auth middleware/i,
  /^\d+\.\s*Read relevant files before editing/,
  /^\d+\.\s*Check for existing patterns before/,
  /^\d+\.\s*Summarize all changes made/,
  /^\d+\.\s*Flag any potential breaking changes/,
  /^\d+\.\s*Do not modify configuration files/,
  /^-\s*\[\s*[x ]?\s*\]\s*Code compiles without errors/,
  /^-\s*\[\s*[x ]?\s*\]\s*Existing tests pass/,
  /^-\s*\[\s*[x ]?\s*\]\s*No secrets in source code/,
  /^-\s*\[\s*[x ]?\s*\]\s*Changes are minimal/,
  /^-\s*\[\s*[x ]?\s*\]\s*Architecture patterns are preserved/,
  /^-\s*\[\s*[x ]?\s*\]\s*Changes are summarized/,
  /^\d+\.\s*\*\*Never commit secrets\*\*/,
  /^\d+\.\s*\*\*Protect \.?env\*\*/i,
  /^\d+\.\s*\*\*Validate all input\*\*/i,
  /^\d+\.\s*\*\*No eval\(\)\*\*/i,
  /^\d+\.\s*\*\*Preserve auth middleware\*\*/i,
  /^\d+\.\s*\*\*Use parameterized queries\*\*/i,
];

// Sections to remove entirely (generic boilerplate)
const GENERIC_SECTIONS = [
  'Coding Rules',
  'Security Rules',
  'Workflow Rules',
  'Definition of Done',
];

export async function fixCommand(options: { dryRun?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Analyzing context files...').start();

  try {
    const scan = await scanRepository(cwd);
    const contextFiles = detectContextFiles(cwd);
    const existing = contextFiles.filter((f) => f.exists);

    if (existing.length === 0) {
      spinner.fail('No context files found');
      logger.indent(`Create one: ${chalk.cyan('repolens init')}`);
      return;
    }

    spinner.succeed(`Found ${existing.length} context file(s)`);

    let totalFixes = 0;

    for (const file of existing) {
      const scoreBefore = scoreContextFile(file.content, scan.fileTree);

      // Skip if already good
      if (scoreBefore.overall >= 80 && scoreBefore.genericRulesCount === 0) {
        logger.success(`${file.path} — Score ${scoreBefore.overall}/100 — No fixes needed`);
        continue;
      }

      logger.section('🔧', `Fixing: ${file.path}`);
      logger.indent(chalk.dim(`Current score: ${scoreBefore.overall}/100`));

      let lines = file.content.split('\n');
      let removedLines = 0;
      let removedSections = 0;

      // Step 1: Remove generic lines
      const filteredLines: string[] = [];
      let skipSection = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if this starts a generic section to remove
        if (line.startsWith('## ')) {
          const sectionName = line.replace('## ', '').trim();
          if (GENERIC_SECTIONS.includes(sectionName)) {
            skipSection = true;
            removedSections++;
            continue;
          } else {
            skipSection = false;
          }
        }

        // Skip lines in generic sections
        if (skipSection && !line.startsWith('## ')) continue;
        if (skipSection && line.startsWith('## ')) skipSection = false;

        // Check if line is a generic rule
        let isGeneric = false;
        for (const pattern of GENERIC_LINE_PATTERNS) {
          if (pattern.test(trimmed)) {
            isGeneric = true;
            removedLines++;
            break;
          }
        }

        if (!isGeneric) {
          filteredLines.push(line);
        }
      }

      // Step 2: Clean up empty sections (## Header with nothing after it)
      const cleanedLines: string[] = [];
      for (let i = 0; i < filteredLines.length; i++) {
        const line = filteredLines[i];
        // If this is a section header and next non-empty line is another header, skip
        if (line.startsWith('## ')) {
          let nextContentIndex = i + 1;
          while (nextContentIndex < filteredLines.length && filteredLines[nextContentIndex].trim() === '') {
            nextContentIndex++;
          }
          if (nextContentIndex < filteredLines.length && filteredLines[nextContentIndex].startsWith('## ')) {
            // Empty section — skip it
            removedSections++;
            continue;
          }
          if (nextContentIndex >= filteredLines.length) {
            // Section at end of file with no content — skip
            removedSections++;
            continue;
          }
        }
        cleanedLines.push(line);
      }

      // Step 3: Remove consecutive blank lines (more than 2)
      const finalLines: string[] = [];
      let blankCount = 0;
      for (const line of cleanedLines) {
        if (line.trim() === '') {
          blankCount++;
          if (blankCount <= 2) finalLines.push(line);
        } else {
          blankCount = 0;
          finalLines.push(line);
        }
      }

      const newContent = finalLines.join('\n');
      const scoreAfter = scoreContextFile(newContent, scan.fileTree);
      const fixes = removedLines + removedSections;
      totalFixes += fixes;

      if (fixes === 0) {
        logger.indent(chalk.dim('No auto-fixable issues found'));
        continue;
      }

      // Report
      logger.indent(`${chalk.green('✓')} Removed ${chalk.bold(String(removedLines))} generic rule lines`);
      logger.indent(`${chalk.green('✓')} Removed ${chalk.bold(String(removedSections))} boilerplate sections`);
      logger.indent(`Score: ${chalk.red(String(scoreBefore.overall))} → ${chalk.green(String(scoreAfter.overall))}/100`);

      // Write
      if (!options.dryRun) {
        const fullPath = path.join(cwd, file.path);
        fs.copyFileSync(fullPath, fullPath + '.backup');
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        logger.success('Fixed and saved (backup created)');
      } else {
        logger.info('Dry run — no files changed');
      }
    }

    logger.blank();
    if (totalFixes > 0) {
      logger.indent(chalk.bold(`Total fixes: ${totalFixes}`));
      logger.blank();
      logger.indent(chalk.bold('Next steps:'));
      logger.indent(`  ${chalk.cyan('repolens lint')}  — Verify improved scores`, 1);
      logger.indent(`  ${chalk.cyan('repolens sync')}  — Sync fixes to all context files`, 1);
      logger.indent(chalk.dim('  Add gotchas and tribal knowledge to boost your score further.'));
    } else {
      logger.success('All context files are clean — no fixes needed');
    }

  } catch (error) {
    spinner.fail('Fix failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
