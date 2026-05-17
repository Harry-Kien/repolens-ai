import { execFileSync } from 'node:child_process';
import { maskSecrets } from '../utils/masks.js';
import { safely } from '../utils/errors.js';

export interface GitDiffResult {
  isGitRepo: boolean;
  changedFiles: string[];
  diffStat: string;
  fullDiff: string;
  dangerousChanges: DangerousChange[];
  summary: string;
}

export interface DangerousChange {
  level: 'high' | 'medium';
  message: string;
  file: string;
}

const DANGEROUS_FILE_PATTERNS = [
  { pattern: /auth/i, message: 'Auth-related file modified' },
  { pattern: /middleware/i, message: 'Middleware file modified' },
  { pattern: /\.env/i, message: 'Environment file modified' },
  { pattern: /security/i, message: 'Security-related file modified' },
  { pattern: /secret/i, message: 'Secret-related file modified' },
  { pattern: /migration/i, message: 'Database migration modified' },
  { pattern: /password/i, message: 'Password-related file modified' },
];

/**
 * Analyze git diff for recent changes.
 */
export function analyzeGitDiff(cwd: string): GitDiffResult {
  const result: GitDiffResult = {
    isGitRepo: false,
    changedFiles: [],
    diffStat: '',
    fullDiff: '',
    dangerousChanges: [],
    summary: '',
  };

  result.isGitRepo = safely(
    () => runGit(cwd, ['rev-parse', '--is-inside-work-tree']) === 'true',
    false,
    'gitDiff:isGitRepo',
  );

  if (!result.isGitRepo) {
    result.summary = 'Not a git repository';
    return result;
  }

  const diffRead = safely(() => {
    const namesOutput = runGitWithFallback(cwd, ['diff', '--name-only', 'HEAD'], ['diff', '--name-only'], 'gitDiff:names');
    result.changedFiles = namesOutput ? namesOutput.split('\n').filter(Boolean) : [];

    const stagedOutput = runGit(cwd, ['diff', '--cached', '--name-only']);
    const stagedFiles = stagedOutput ? stagedOutput.split('\n').filter(Boolean) : [];
    const untrackedOutput = runGit(cwd, ['ls-files', '--others', '--exclude-standard']);
    const untrackedFiles = untrackedOutput ? untrackedOutput.split('\n').filter(Boolean) : [];
    result.changedFiles = [...new Set([...result.changedFiles, ...stagedFiles, ...untrackedFiles])];

    if (result.changedFiles.length === 0) {
      result.summary = 'No uncommitted changes detected';
      return true;
    }

    // Get diff stat
    result.diffStat = maskSecrets(
      runGitWithFallback(cwd, ['diff', '--stat', 'HEAD'], ['diff', '--stat'], 'gitDiff:stat'),
    );

    // Get full diff (limited to 50KB)
    const rawDiff = runGitWithFallback(cwd, ['diff', 'HEAD'], ['diff'], 'gitDiff:full', 1024 * 1024);
    result.fullDiff = maskSecrets(rawDiff.substring(0, 50_000));

    // Detect dangerous changes
    for (const file of result.changedFiles) {
      for (const { pattern, message } of DANGEROUS_FILE_PATTERNS) {
        if (pattern.test(file)) {
          result.dangerousChanges.push({ level: 'high', message, file });
        }
      }
    }

    // Check for deleted test files
    const deletedOutput = runGitWithFallback(
      cwd,
      ['diff', '--diff-filter=D', '--name-only', 'HEAD'],
      ['diff', '--diff-filter=D', '--name-only'],
      'gitDiff:deleted',
    );
    const deleted = deletedOutput ? deletedOutput.split('\n').filter(Boolean) : [];
    for (const f of deleted) {
      if (/\.(test|spec)\./i.test(f)) {
        result.dangerousChanges.push({ level: 'high', message: 'Test file deleted', file: f });
      }
    }

    // Check diff content for dangerous patterns
    if (result.fullDiff) {
      if (/^\+.*\beval\s*\(/m.test(result.fullDiff)) {
        result.dangerousChanges.push({ level: 'high', message: 'eval() added in changes', file: '(in diff)' });
      }
      if (/^\-.*middleware/im.test(result.fullDiff)) {
        result.dangerousChanges.push({ level: 'high', message: 'Middleware possibly removed', file: '(in diff)' });
      }
    }

    result.summary = `${result.changedFiles.length} file(s) changed, ${result.dangerousChanges.length} potential risk(s)`;
    return true;
  }, false, 'gitDiff:read');

  if (!diffRead) {
    result.summary = 'Unable to read git diff';
  }

  return result;
}

function runGit(cwd: string, args: string[], maxBuffer = 1024 * 1024): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    maxBuffer,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runGitWithFallback(
  cwd: string,
  primaryArgs: string[],
  fallbackArgs: string[],
  context: string,
  maxBuffer?: number,
): string {
  const primary = safely(() => runGit(cwd, primaryArgs, maxBuffer), null, `${context}:primary`);
  if (primary !== null) return primary;

  return safely(() => runGit(cwd, fallbackArgs, maxBuffer), '', `${context}:fallback`);
}
