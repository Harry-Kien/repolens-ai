import ora from 'ora';
import { scanRepository } from '../core/repoScanner.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { classifyFiles } from '../core/fileClassifier.js';
import { analyzeArchitecture } from '../core/architectureAnalyzer.js';
import { detectRisks } from '../core/riskDetector.js';
import { isAiAvailable, enhance } from '../ai/aiClient.js';
import { getSystemPrompt, buildAnalyzePrompt } from '../ai/promptBuilder.js';
import {
  reportBrand, reportSummary, reportFileStats, reportFolderStructure,
  reportImportantFiles, reportArchitecture, reportModules, reportRisks,
  reportWeakPoints, reportSuggestions, reportAiEnhancement,
} from '../reporters/terminalReporter.js';
import { generateMarkdownReport } from '../reporters/markdownReporter.js';
import { logger } from '../utils/logger.js';

export async function analyzeCommand(options: { format?: string; ai?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora('Scanning repository...').start();

  try {
    // Step 1: Scan
    const scan = await scanRepository(cwd);
    spinner.text = 'Detecting framework...';

    // Step 2: Detect framework
    const framework = detectFramework(cwd);
    spinner.text = 'Classifying files...';

    // Step 3: Classify files
    const { byCategory } = classifyFiles(scan.fileTree);
    spinner.text = 'Analyzing architecture...';

    // Step 4: Architecture
    const architecture = analyzeArchitecture(byCategory, framework.framework);
    spinner.text = 'Scanning for risks...';

    // Step 5: Risk detection
    const risks = await detectRisks(cwd);
    spinner.succeed('Analysis complete');

    // Step 6: AI enhancement (optional)
    let aiText: string | null = null;
    if (options.ai !== false && isAiAvailable()) {
      const aiSpinner = ora('Enhancing with AI...').start();
      aiText = await enhance(
        getSystemPrompt(),
        buildAnalyzePrompt({
          framework: framework.framework,
          language: framework.language,
          totalFiles: scan.totalFiles,
          languages: scan.languages,
          directories: scan.directories,
          importantFiles: scan.importantFiles,
          architectureStyle: architecture.style,
          riskCount: risks.risks.length,
        }),
      );
      aiSpinner.succeed(aiText ? 'AI analysis complete' : 'AI unavailable, using static analysis');
    }

    // Output
    if (options.format === 'md') {
      const outputPath = generateMarkdownReport({
        scan, framework, architecture, risks, byCategory, aiText,
      });
      logger.success(`Report saved to ${outputPath}`);
    } else {
      reportSummary(scan, framework);
      reportFileStats(scan.filesByExtension);
      reportFolderStructure(scan.directories);
      reportImportantFiles(scan.importantFiles);
      reportArchitecture(architecture);
      reportModules(byCategory);
      reportRisks(risks);
      reportWeakPoints(architecture.weakPoints);
      reportSuggestions(architecture.suggestions);
      reportAiEnhancement(aiText);
    }
  } catch (error) {
    spinner.fail('Analysis failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
