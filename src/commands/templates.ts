import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { getAllTemplates, getTemplateById, searchTemplates, detectBestTemplate } from '../templates/frameworkTemplates.js';
import { detectFramework } from '../core/frameworkDetector.js';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Templates command — Browse and apply curated AGENTS.md templates.
 * Pre-built templates with real tribal knowledge for 15+ frameworks.
 */

export async function templatesCommand(options: { search?: string; apply?: string; list?: boolean }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const allTemplates = getAllTemplates();

  // Mode 1: Apply a specific template
  if (options.apply) {
    const template = getTemplateById(options.apply);
    if (!template) {
      logger.error(`Template "${options.apply}" not found`);
      logger.blank();
      logger.indent('Available templates:');
      for (const t of allTemplates) {
        logger.indent(`  ${chalk.cyan(t.id.padEnd(18))} ${t.name}`, 1);
      }
      return;
    }

    const outputPath = path.join(cwd, 'AGENTS.md');
    if (fs.existsSync(outputPath)) {
      fs.copyFileSync(outputPath, outputPath + '.backup');
      logger.info('Existing AGENTS.md backed up to AGENTS.md.backup');
    }

    fs.writeFileSync(outputPath, template.content, 'utf-8');
    logger.success(`Applied template: ${chalk.bold(template.name)}`);
    logger.blank();
    logger.indent(chalk.bold('Next steps:'));
    logger.indent(`  ${chalk.cyan('repolens lint')}  — Check quality score`, 1);
    logger.indent(`  ${chalk.cyan('repolens sync')}  — Sync to CLAUDE.md & .cursorrules`, 1);
    logger.indent(chalk.dim('  Edit AGENTS.md to add your project-specific gotchas and decisions.'));
    return;
  }

  // Mode 2: Search templates
  if (options.search) {
    const results = searchTemplates(options.search);
    if (results.length === 0) {
      logger.warn(`No templates found for "${options.search}"`);
      logger.indent(chalk.dim(`Try: repolens templates --list`));
      return;
    }

    logger.section('🔎', `Search Results for "${options.search}"`);
    for (const t of results) {
      logger.blank();
      logger.indent(`${chalk.bold.cyan(t.id)} — ${chalk.bold(t.name)}`);
      logger.indent(chalk.dim(t.description), 2);
      logger.indent(chalk.dim(`Tags: ${t.tags.join(', ')}`), 2);
      logger.indent(chalk.dim(`Apply: repolens templates --apply ${t.id}`), 2);
    }
    return;
  }

  // Mode 3: List all (default) + auto-detect recommendation
  logger.section('📚', `Template Library (${allTemplates.length} templates)`);
  logger.indent(chalk.dim('Curated AGENTS.md templates with real tribal knowledge for popular frameworks.'));
  logger.blank();

  // Auto-detect framework and recommend
  const fw = detectFramework(cwd);
  const recommended = detectBestTemplate(fw.framework);

  if (recommended) {
    logger.indent(chalk.bold.green(`⭐ Recommended for your project (${fw.framework}):`));
    logger.indent(`   ${chalk.bold.cyan(recommended.id)} — ${recommended.name}`, 1);
    logger.indent(`   ${chalk.dim(`Apply: repolens templates --apply ${recommended.id}`)}`, 1);
    logger.blank();
    logger.indent(chalk.dim('─'.repeat(50)));
    logger.blank();
  }

  // List all
  const categories: Record<string, typeof allTemplates> = {};
  for (const t of allTemplates) {
    const cat = t.tags.includes('fullstack') ? '🌐 Fullstack' :
      t.tags.includes('frontend') || t.tags.includes('spa') ? '🎨 Frontend' :
      t.tags.includes('backend') || t.tags.includes('api') ? '⚙️ Backend' :
      t.tags.includes('mobile') ? '📱 Mobile' :
      t.tags.includes('static') || t.tags.includes('beginner') ? '📄 Static / Beginner' :
      '🔧 Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(t);
  }

  for (const [cat, templates] of Object.entries(categories)) {
    logger.indent(chalk.bold(cat));
    for (const t of templates) {
      const isRecommended = recommended && t.id === recommended.id;
      const prefix = isRecommended ? chalk.green('⭐') : ' ';
      logger.indent(`  ${prefix} ${chalk.cyan(t.id.padEnd(18))} ${t.name}`, 1);
      logger.indent(`    ${chalk.dim(t.description)}`, 2);
    }
    logger.blank();
  }

  logger.indent(chalk.bold('Usage:'));
  logger.indent(`  ${chalk.cyan('repolens templates --apply nextjs')}     Apply a template`, 1);
  logger.indent(`  ${chalk.cyan('repolens templates --search react')}     Search templates`, 1);
}
