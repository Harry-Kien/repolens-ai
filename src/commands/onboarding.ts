import ora from 'ora';
import { scanRepository } from '../core/repoScanner.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { classifyFiles } from '../core/fileClassifier.js';
import { analyzeArchitecture } from '../core/architectureAnalyzer.js';
import { reportBrand, reportOnboarding } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';

export async function onboardingCommand(): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Generating onboarding guide...').start();

  try {
    const scan = await scanRepository(cwd);
    const framework = detectFramework(cwd);
    const { byCategory } = classifyFiles(scan.fileTree);
    const arch = analyzeArchitecture(byCategory, framework.framework);
    spinner.succeed('Onboarding guide ready');

    reportOnboarding(scan, framework, arch, byCategory);
  } catch (error) {
    spinner.fail('Onboarding generation failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
