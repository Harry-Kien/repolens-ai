import chalk from 'chalk';

/**
 * Consistent logging utilities with colored output.
 */
export const logger = {
  /** Section header with icon */
  section(icon: string, title: string): void {
    console.log('');
    console.log(chalk.bold(`${icon}  ${title}`));
    console.log(chalk.dim('─'.repeat(50)));
  },

  /** Success message */
  success(message: string): void {
    console.log(chalk.green(`  ✓ ${message}`));
  },

  /** Warning message */
  warn(message: string): void {
    console.log(chalk.yellow(`  ⚠ ${message}`));
  },

  /** Error message */
  error(message: string): void {
    console.log(chalk.red(`  ✗ ${message}`));
  },

  /** Info message */
  info(message: string): void {
    console.log(chalk.blue(`  ℹ ${message}`));
  },

  /** Key-value pair */
  kv(key: string, value: string): void {
    console.log(`  ${chalk.dim(key + ':')} ${value}`);
  },

  /** List item */
  item(text: string): void {
    console.log(`  ${chalk.dim('•')} ${text}`);
  },

  /** Indented text */
  indent(text: string, level: number = 1): void {
    console.log('  '.repeat(level) + text);
  },

  /** Blank line */
  blank(): void {
    console.log('');
  },

  /** Debug message — only shown when DEBUG=repolens */
  debug(message: string): void {
    if (process.env.DEBUG?.includes('repolens')) {
      console.log(chalk.dim(`  [debug] ${message}`));
    }
  },

  /** Branded header */
  brand(): void {
    console.log('');
    console.log(chalk.bold.cyan('  🔍 RepoLens AI') + chalk.dim(' v3.1'));
    console.log(chalk.dim('  The Context Quality Guardian for AI Coding Agents'));
    console.log(chalk.dim('  Your AI agents are only as good as the context you give them.'));
    console.log(chalk.dim('─'.repeat(60)));
  },

  /** Risk level colored */
  risk(level: 'high' | 'medium' | 'low', message: string): void {
    const colors = {
      high: chalk.red.bold,
      medium: chalk.yellow,
      low: chalk.green,
    };
    const icons = { high: '🔴', medium: '🟡', low: '🟢' };
    console.log(`  ${icons[level]} ${colors[level](message)}`);
  },

  /** Table-like row */
  row(cols: string[], widths: number[]): void {
    const formatted = cols.map((col, i) => col.padEnd(widths[i] || 20)).join('  ');
    console.log(`  ${formatted}`);
  },
};
