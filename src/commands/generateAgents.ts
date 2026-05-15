import ora from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanRepository } from '../core/repoScanner.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { classifyFiles } from '../core/fileClassifier.js';
import { analyzeArchitecture } from '../core/architectureAnalyzer.js';
import { generateAgentsContent } from '../templates/agentsTemplate.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';

export async function generateAgentsCommand(): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Generating AGENTS.md...').start();

  try {
    const scan = await scanRepository(cwd);
    const framework = detectFramework(cwd);
    const { byCategory } = classifyFiles(scan.fileTree);
    const arch = analyzeArchitecture(byCategory, framework.framework);

    const content = generateAgentsContent(scan, framework, arch, byCategory);
    const outputPath = path.join(cwd, 'AGENTS.md');

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      const backupPath = outputPath + '.backup';
      fs.copyFileSync(outputPath, backupPath);
      logger.info(`Existing AGENTS.md backed up to AGENTS.md.backup`);
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
    spinner.succeed('AGENTS.md generated successfully');

    logger.blank();
    logger.success(`Created: ${outputPath}`);
    logger.info('This file instructs AI coding agents on how to work with your project.');
    logger.info('Commit it to your repo so tools like Codex, Claude, and Cursor can use it.');
  } catch (error) {
    spinner.fail('AGENTS.md generation failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
