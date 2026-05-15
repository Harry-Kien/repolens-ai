import ora from 'ora';
import { scanRepository } from '../core/repoScanner.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { classifyFiles } from '../core/fileClassifier.js';
import { analyzeArchitecture } from '../core/architectureAnalyzer.js';
import { reportBrand, reportArchitecture, reportWeakPoints, reportSuggestions } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import { isAiAvailable, enhance } from '../ai/aiClient.js';
import { getSystemPrompt } from '../ai/promptBuilder.js';
import chalk from 'chalk';

export async function architectureCommand(options: { ai?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Analyzing architecture...').start();

  try {
    const scan = await scanRepository(cwd);
    const framework = detectFramework(cwd);
    const { byCategory } = classifyFiles(scan.fileTree);
    const arch = analyzeArchitecture(byCategory, framework.framework);
    spinner.succeed('Architecture analysis complete');

    // Report
    reportArchitecture(arch);

    // Dependencies
    logger.section('📦', 'Important Dependencies');
    if (framework.additionalFrameworks.length > 0) {
      for (const lib of framework.additionalFrameworks) {
        logger.item(lib);
      }
    } else {
      logger.info('No significant dependencies detected beyond the core framework');
    }

    // Data flow detail
    if (arch.dataFlow.length > 0) {
      logger.section('🔄', 'Data Flow');
      for (let i = 0; i < arch.dataFlow.length; i++) {
        logger.indent(`${i + 1}. ${arch.dataFlow[i]}`);
      }
    }

    reportWeakPoints(arch.weakPoints);
    reportSuggestions(arch.suggestions);

    // AI enhancement
    if (options.ai !== false && isAiAvailable()) {
      const aiSpinner = ora('Getting AI architecture insights...').start();
      const aiText = await enhance(
        getSystemPrompt(),
        `Explain this ${framework.framework} project's architecture in detail.\n\nArchitecture style: ${arch.style}\nLayers: ${arch.layers.map(l => l.name).join(', ')}\nData flow: ${arch.dataFlow.join(' → ')}\nWeak points: ${arch.weakPoints.join('; ')}\n\nProvide a senior engineer assessment of this architecture.`,
      );
      if (aiText) {
        aiSpinner.succeed('AI insights ready');
        logger.section('🤖', 'AI Architecture Assessment');
        for (const line of aiText.split('\n')) {
          logger.indent(line);
        }
      } else {
        aiSpinner.info('AI not available');
      }
    }
  } catch (error) {
    spinner.fail('Architecture analysis failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
