import ora from 'ora';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanRepository } from '../core/repoScanner.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { classifyFiles } from '../core/fileClassifier.js';
import { analyzeArchitecture } from '../core/architectureAnalyzer.js';
import { readCodeContents, summarizeContents } from '../core/contentReader.js';
import { detectBestTemplate } from '../templates/frameworkTemplates.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Interactive AGENTS.md creation through developer interview.
 * Extracts tribal knowledge that AI cannot infer on its own.
 */

interface InterviewAnswers {
  projectDescription: string;
  keyGotchas: string;
  architectureDecisions: string;
  buildCommands: string;
  testCommands: string;
  deployCommands: string;
  conventions: string;
  knownIssues: string;
  criticalFiles: string;
  doNotTouch: string;
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(chalk.cyan('  ? ') + chalk.bold(question) + '\n    ' + chalk.dim('> '), (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function initCommand(options: { yes?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  logger.section('🚀', 'Initialize AI Context');
  logger.blank();
  logger.indent(chalk.dim('This will create a high-quality AGENTS.md by combining'));
  logger.indent(chalk.dim('automated analysis with your tribal knowledge.'));
  logger.blank();

  // Step 1: Auto-scan
  const spinner = ora('Analyzing your codebase...').start();
  const scan = await scanRepository(cwd);
  const framework = detectFramework(cwd);
  const { byCategory } = classifyFiles(scan.fileTree);
  const architecture = analyzeArchitecture(byCategory, framework.framework);

  spinner.text = 'Reading code contents...';
  const codeContents = await readCodeContents(cwd);
  const contentSummary = summarizeContents(codeContents);
  spinner.succeed('Codebase analysis complete');

  // Show what was found
  logger.blank();
  logger.indent(chalk.bold('📊 What we found:'));
  logger.kv('Framework', `${framework.framework} (${framework.language})`);
  logger.kv('Architecture', architecture.style);
  logger.kv('Files', String(scan.totalFiles));
  logger.kv('Functions', String(contentSummary.totalFunctions));
  logger.kv('Classes', String(contentSummary.totalClasses));
  if (framework.additionalFrameworks.length > 0) {
    logger.kv('Libraries', framework.additionalFrameworks.join(', '));
  }
  logger.blank();

  let answers: InterviewAnswers;

  if (options.yes) {
    // Non-interactive mode — use empty answers
    answers = {
      projectDescription: '', keyGotchas: '', architectureDecisions: '',
      buildCommands: '', testCommands: '', deployCommands: '',
      conventions: '', knownIssues: '', criticalFiles: '', doNotTouch: '',
    };
  } else {
    // Step 2: Interactive interview
    logger.section('💬', 'Knowledge Interview');
    logger.indent(chalk.dim('Answer these questions to create a high-quality context file.'));
    logger.indent(chalk.dim('Press Enter to skip any question.'));
    logger.blank();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    answers = {
      projectDescription: await ask(rl, 'What does this project do? (1-2 sentences)'),
      keyGotchas: await ask(rl, 'Any gotchas or pitfalls a developer should know?'),
      architectureDecisions: await ask(rl, 'Key architecture decisions? (why you chose this stack/pattern)'),
      buildCommands: await ask(rl, 'Build command? (e.g., npm run build)'),
      testCommands: await ask(rl, 'Test command? (e.g., npm test)'),
      deployCommands: await ask(rl, 'Deploy command? (e.g., npm run deploy)'),
      conventions: await ask(rl, 'Any naming conventions or code style rules?'),
      knownIssues: await ask(rl, 'Known bugs or workarounds?'),
      criticalFiles: await ask(rl, 'Most important files to understand?'),
      doNotTouch: await ask(rl, 'Files or patterns that should NEVER be modified?'),
    };

    rl.close();
  }

  // Step 3: Generate smart AGENTS.md
  const spinner2 = ora('Generating AGENTS.md...').start();
  const content = generateSmartAgents(scan, framework, architecture, contentSummary, answers, codeContents);

  const outputPath = path.join(cwd, 'AGENTS.md');

  // Backup if exists
  if (fs.existsSync(outputPath)) {
    fs.copyFileSync(outputPath, outputPath + '.backup');
    logger.info('Existing AGENTS.md backed up to AGENTS.md.backup');
  }

  fs.writeFileSync(outputPath, content, 'utf-8');
  spinner2.succeed('AGENTS.md generated successfully');

  logger.blank();
  logger.success(`Created: ${outputPath}`);
  logger.blank();
  logger.indent(chalk.bold('Next steps:'));
  logger.indent(`  ${chalk.cyan('repolens lint')}     — Score your context quality`, 1);
  logger.indent(`  ${chalk.cyan('repolens sync')}     — Sync to CLAUDE.md & .cursorrules`, 1);
  logger.indent(`  ${chalk.cyan('repolens dashboard')} — Visual context management`, 1);
}

function generateSmartAgents(
  scan: any, fw: any, arch: any, summary: any, answers: InterviewAnswers, contents: any[],
): string {
  const s: string[] = [];

  s.push('# AGENTS.md');
  s.push('');
  s.push('> Instructions for AI coding agents working on this project.');
  s.push(`> Generated by RepoLens AI v2.0 on ${new Date().toISOString().split('T')[0]}.`);
  s.push('');

  // --- Project Overview (combines auto + manual) ---
  s.push('## Project Overview');
  s.push('');
  if (answers.projectDescription) {
    s.push(answers.projectDescription);
    s.push('');
  }
  s.push(`- **Framework:** ${fw.framework} ${fw.version || ''}`);
  s.push(`- **Language:** ${fw.language}`);
  s.push(`- **Package Manager:** ${fw.packageManager}`);
  s.push(`- **Architecture:** ${arch.style}`);
  if (fw.additionalFrameworks.length > 0) {
    s.push(`- **Key Libraries:** ${fw.additionalFrameworks.join(', ')}`);
  }
  s.push('');

  // --- Commands (specific, not generic) ---
  s.push('## Commands');
  s.push('');
  if (answers.buildCommands) s.push(`- **Build:** \`${answers.buildCommands}\``);
  else {
    // Auto-detect from package.json
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.scripts) {
          if (pkg.scripts.build) s.push(`- **Build:** \`npm run build\``);
          if (pkg.scripts.dev) s.push(`- **Dev:** \`npm run dev\``);
          if (pkg.scripts.lint) s.push(`- **Lint:** \`npm run lint\``);
        }
      } catch { /* skip */ }
    }
  }
  if (answers.testCommands) s.push(`- **Test:** \`${answers.testCommands}\``);
  else if (!scan.hasTests) s.push('- **Test:** No tests configured yet');
  if (answers.deployCommands) s.push(`- **Deploy:** \`${answers.deployCommands}\``);
  s.push('');

  // --- Architecture (auto-detected with data flow) ---
  s.push('## Architecture');
  s.push('');
  if (answers.architectureDecisions) {
    s.push(answers.architectureDecisions);
    s.push('');
  }
  s.push('### Data Flow');
  for (const flow of arch.dataFlow) {
    s.push(`- ${flow}`);
  }
  s.push('');

  // --- Key Structure ---
  s.push('## Key Structure');
  s.push('');
  s.push('```');
  for (const dir of scan.directories.slice(0, 15)) {
    s.push(dir + '/');
  }
  s.push('```');
  s.push('');

  // --- Critical Files ---
  s.push('## Critical Files');
  s.push('');
  if (answers.criticalFiles) {
    s.push(answers.criticalFiles);
    s.push('');
  }
  // Auto-detect top files by connectivity
  if (summary.mostConnected.length > 0) {
    s.push('Most interconnected files (modify carefully):');
    for (const f of summary.mostConnected.slice(0, 5)) {
      s.push(`- \`${f.path}\` (${f.imports} imports)`);
    }
  }
  s.push('');

  // --- Gotchas & Pitfalls (HIGH VALUE — tribal knowledge) ---
  if (answers.keyGotchas || answers.knownIssues) {
    s.push('## Gotchas & Known Issues');
    s.push('');
    if (answers.keyGotchas) s.push(answers.keyGotchas);
    if (answers.knownIssues) s.push(answers.knownIssues);
    s.push('');
  }

  // --- Conventions ---
  if (answers.conventions) {
    s.push('## Conventions');
    s.push('');
    s.push(answers.conventions);
    s.push('');
  }

  // --- Do Not Touch ---
  if (answers.doNotTouch) {
    s.push('## Do Not Modify');
    s.push('');
    s.push(answers.doNotTouch);
    s.push('');
  }

  // --- Framework-Specific Gotchas (from template library) ---
  const template = detectBestTemplate(fw.framework);
  if (template && !answers.keyGotchas) {
    // Extract gotchas section from the template
    const templateLines = template.content.split('\n');
    let inGotchas = false;
    const gotchaLines: string[] = [];
    for (const line of templateLines) {
      if (line.startsWith('## Gotchas')) { inGotchas = true; continue; }
      if (inGotchas && line.startsWith('## ')) break;
      if (inGotchas) gotchaLines.push(line);
    }
    if (gotchaLines.length > 0) {
      s.push(`## Gotchas & Known Issues (${template.name})`);
      s.push('');
      for (const gl of gotchaLines) s.push(gl);
      s.push('');
    }
  }

  // --- Smart Rules (only project-specific ones) ---
  s.push('## Rules');
  s.push('');

  // Only add rules that are specific to this project
  if (arch.weakPoints.length > 0) {
    s.push('### Architecture Constraints');
    for (const wp of arch.weakPoints) {
      s.push(`- ${wp}`);
    }
    s.push('');
  }

  // Add testing rule only if relevant
  if (!scan.hasTests) {
    s.push('### Testing');
    s.push('- This project lacks tests — add tests for any new critical logic');
    s.push('');
  }

  s.push('---');
  s.push('*Generated by [RepoLens AI](https://github.com/Harry-Kien/repolens-ai)*');

  return s.join('\n');
}
