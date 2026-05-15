/**
 * Default ignore patterns for repository scanning.
 * These directories/files are never sent to AI or included in analysis.
 */
export const DEFAULT_IGNORE_PATTERNS: string[] = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'vendor',
  'storage',
  '.cache',
  '.next',
  '.nuxt',
  '.env',
  '.env.*',
  'coverage',
  'logs',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  'venv',
  '.venv',
  '.idea',
  '.vscode',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
];

/**
 * Convert ignore patterns to fast-glob ignore format.
 */
export function getGlobIgnorePatterns(): string[] {
  return DEFAULT_IGNORE_PATTERNS.map((p) => `**/${p}/**`);
}

/**
 * Normalize a file path to use forward slashes and be relative to CWD.
 */
export function normalizePath(filePath: string, cwd: string): string {
  return filePath.replace(cwd, '').replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Strip the user's home directory from paths for privacy.
 */
export function sanitizePath(filePath: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (home) {
    return filePath.replace(home, '~');
  }
  return filePath;
}
