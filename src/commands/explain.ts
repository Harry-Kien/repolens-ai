import ora from 'ora';
import { scanRepository } from '../core/repoScanner.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { classifyFiles } from '../core/fileClassifier.js';
import { readCodeContents, findRelatedByContent } from '../core/contentReader.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import { isAiAvailable, enhance } from '../ai/aiClient.js';
import { getSystemPrompt, buildExplainPrompt } from '../ai/promptBuilder.js';
import chalk from 'chalk';

export async function explainCommand(topic: string, options: { ai?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const spinner = ora(`Searching for "${topic}" in codebase...`).start();

  try {
    const scan = await scanRepository(cwd);
    const framework = detectFramework(cwd);
    const { classified } = classifyFiles(scan.fileTree);

    // NEW v2.0: Read actual file contents for deeper search
    spinner.text = `Reading code contents for "${topic}"...`;
    const codeContents = await readCodeContents(cwd);
    const contentMatches = findRelatedByContent(codeContents, topic);

    // Also keep legacy filename matching as fallback
    const topicLower = topic.toLowerCase();
    const fileNameMatches = classified.filter((f) => {
      const pathLower = f.path.toLowerCase();
      return pathLower.includes(topicLower);
    });

    // Expand with common aliases
    const aliases: Record<string, string[]> = {
      auth: ['auth', 'login', 'register', 'session', 'token', 'jwt', 'oauth', 'passport'],
      payment: ['payment', 'stripe', 'billing', 'invoice', 'checkout', 'subscription'],
      user: ['user', 'profile', 'account', 'member'],
      api: ['api', 'endpoint', 'route', 'controller', 'handler'],
      database: ['database', 'db', 'migration', 'schema', 'model', 'prisma', 'sequelize'],
      email: ['email', 'mail', 'notification', 'smtp'],
      upload: ['upload', 'file', 'storage', 'media', 's3'],
      cache: ['cache', 'redis', 'memcached'],
      queue: ['queue', 'job', 'worker', 'bull'],
      search: ['search', 'elastic', 'algolia', 'index'],
      context: ['context', 'agent', 'claude', 'cursor', 'copilot', 'skill'],
      score: ['score', 'lint', 'quality', 'grade'],
      sync: ['sync', 'syncer', 'convert'],
    };

    const expandedTerms = aliases[topicLower] || [topicLower];
    const expandedFiles = classified.filter((f) => {
      const pathLower = f.path.toLowerCase();
      return expandedTerms.some((term) => pathLower.includes(term));
    });

    // Merge all matches (content-based first, then filename)
    const allRelatedPaths = new Set<string>();
    const allRelated: typeof fileNameMatches = [];

    // Content matches are higher priority
    for (const cm of contentMatches) {
      if (!allRelatedPaths.has(cm.path)) {
        allRelatedPaths.add(cm.path);
        const classifiedMatch = classified.find((f) => f.path === cm.path);
        if (classifiedMatch) allRelated.push(classifiedMatch);
        else allRelated.push({ path: cm.path, category: 'unknown' });
      }
    }

    // Then filename matches
    for (const fm of [...fileNameMatches, ...expandedFiles]) {
      if (!allRelatedPaths.has(fm.path)) {
        allRelatedPaths.add(fm.path);
        allRelated.push(fm);
      }
    }

    spinner.succeed(`Found ${allRelated.length} related file(s) (${contentMatches.length} by content, ${fileNameMatches.length} by name)`);

    if (allRelated.length === 0) {
      logger.warn(`No files found related to "${topic}"`);
      logger.info('Try a different topic or check the folder structure with: repolens analyze');
      return;
    }

    // Report findings
    logger.section('🔍', `Explaining: ${topic}`);

    // NEW v2.0: Show functions and classes found by content reader
    const matchedContents = contentMatches.slice(0, 10);
    if (matchedContents.length > 0) {
      logger.blank();
      logger.indent(chalk.bold('📦 Related Functions & Classes:'));
      for (const mc of matchedContents) {
        const relFunctions = mc.functions.filter((fn) =>
          fn.toLowerCase().includes(topicLower)
        );
        const relClasses = mc.classes.filter((cls) =>
          cls.toLowerCase().includes(topicLower)
        );

        if (relFunctions.length > 0 || relClasses.length > 0) {
          logger.indent(chalk.cyan(mc.path), 2);
          for (const fn of relFunctions) {
            logger.indent(chalk.dim(`  ƒ ${fn}()`), 3);
          }
          for (const cls of relClasses) {
            logger.indent(chalk.dim(`  ◆ class ${cls}`), 3);
          }
        }
      }
    }

    logger.blank();
    logger.indent(chalk.bold('What this feature likely does:'));
    const categoryBreakdown = new Map<string, string[]>();
    for (const f of allRelated) {
      const list = categoryBreakdown.get(f.category) || [];
      list.push(f.path);
      categoryBreakdown.set(f.category, list);
    }

    // Infer purpose from file categories
    const hasCtrls = categoryBreakdown.has('controller') || categoryBreakdown.has('route');
    const hasSvc = categoryBreakdown.has('service');
    const hasModel = categoryBreakdown.has('model');
    const hasView = categoryBreakdown.has('view') || categoryBreakdown.has('component');
    const hasTest = categoryBreakdown.has('test');
    const hasCmd = categoryBreakdown.has('command');

    if (hasCmd && hasSvc) {
      logger.indent(`This is a CLI ${topic} feature with command handlers and core services.`, 2);
    } else if (hasCtrls && hasSvc && hasModel) {
      logger.indent(`This appears to be a full-stack ${topic} feature with API endpoints, business logic, and data models.`, 2);
    } else if (hasCtrls && hasModel) {
      logger.indent(`This is a ${topic} module with HTTP handling and database operations.`, 2);
    } else if (hasView) {
      logger.indent(`This is a ${topic} UI module with frontend components.`, 2);
    } else {
      logger.indent(`This contains ${topic}-related files across ${categoryBreakdown.size} layer(s).`, 2);
    }

    // Important files
    logger.blank();
    logger.indent(chalk.bold('Important Files:'));
    for (const f of allRelated.slice(0, 15)) {
      const icon = f.category === 'controller' ? '🎯' : f.category === 'service' ? '⚙️' :
        f.category === 'model' ? '📊' : f.category === 'test' ? '🧪' :
        f.category === 'command' ? '🖥️' :
        f.category === 'view' || f.category === 'component' ? '🖼️' : '📄';
      logger.indent(`${icon} ${chalk.cyan(f.path)} ${chalk.dim(`(${f.category})`)}`, 2);
    }
    if (allRelated.length > 15) {
      logger.indent(chalk.dim(`... and ${allRelated.length - 15} more files`), 2);
    }

    // Flow explanation
    logger.blank();
    logger.indent(chalk.bold('Flow:'));
    const flowParts: string[] = [];
    if (categoryBreakdown.has('route')) flowParts.push('Routes');
    if (categoryBreakdown.has('middleware')) flowParts.push('Middleware');
    if (categoryBreakdown.has('controller')) flowParts.push('Controllers');
    if (categoryBreakdown.has('command')) flowParts.push('Commands');
    if (categoryBreakdown.has('service')) flowParts.push('Services');
    if (categoryBreakdown.has('model')) flowParts.push('Models');
    if (categoryBreakdown.has('view') || categoryBreakdown.has('component')) flowParts.push('UI');
    if (flowParts.length > 0) {
      logger.indent(chalk.cyan(flowParts.join(' → ')), 2);
    } else {
      logger.indent('Unable to determine flow — files may not follow standard patterns', 2);
    }

    // Risks
    logger.blank();
    logger.indent(chalk.bold('Potential Risks:'));
    if (!hasTest) logger.warn(`No tests found for ${topic}`);
    if (!hasSvc && hasCtrls) logger.warn('Business logic may be coupled to HTTP layer (no service layer)');
    if (allRelated.length > 20) logger.warn(`Large module (${allRelated.length} files) — may need decomposition`);
    if (allRelated.length <= 2) logger.info('Small module — relatively easy to maintain');

    // TODOs in related files
    const relatedTodos = contentMatches.flatMap((mc) => mc.todoFixmes.map((t) => ({ file: mc.path, ...t })));
    if (relatedTodos.length > 0) {
      logger.blank();
      logger.indent(chalk.bold('TODOs in related files:'));
      for (const todo of relatedTodos.slice(0, 5)) {
        logger.indent(chalk.yellow(`  📝 ${todo.text}`) + chalk.dim(` — ${todo.file}:${todo.line}`), 1);
      }
    }

    // AI enhancement
    if (options.ai !== false && isAiAvailable()) {
      const aiSpinner = ora('Getting AI explanation...').start();
      const aiText = await enhance(
        getSystemPrompt(),
        buildExplainPrompt(topic, allRelated.map(f => f.path), framework.framework),
      );
      if (aiText) {
        aiSpinner.succeed('AI explanation ready');
        logger.section('🤖', 'AI Explanation');
        for (const line of aiText.split('\n')) logger.indent(line);
      } else {
        aiSpinner.info('AI not available');
      }
    }
  } catch (error) {
    spinner.fail('Explain failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
