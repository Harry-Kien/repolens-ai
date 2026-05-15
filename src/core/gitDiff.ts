import { execSync } from 'node:child_process';
import { maskSecrets } from '../utils/masks.js';

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

  try {
    // Check if git repo
    execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'pipe' });
    result.isGitRepo = true;
  } catch {
    result.summary = 'Not a git repository';
    return result;
  }

  try {
    // Get changed files (staged + unstaged)
    const namesOutput = execSync('git diff --name-only HEAD 2>nul || git diff --name-only', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    result.changedFiles = namesOutput ? namesOutput.split('\n').filter(Boolean) : [];

    // Also check staged
    const stagedOutput = execSync('git diff --cached --name-only', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const stagedFiles = stagedOutput ? stagedOutput.split('\n').filter(Boolean) : [];
    result.changedFiles = [...new Set([...result.changedFiles, ...stagedFiles])];

    if (result.changedFiles.length === 0) {
      result.summary = 'No uncommitted changes detected';
      return result;
    }

    // Get diff stat
    try {
      result.diffStat = maskSecrets(
        execSync('git diff --stat HEAD 2>nul || git diff --stat', {
          cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
        }).trim()
      );
    } catch { /* stat not critical */ }

    // Get full diff (limited to 50KB)
    try {
      const rawDiff = execSync('git diff HEAD 2>nul || git diff', {
        cwd, encoding: 'utf-8', maxBuffer: 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
      });
      result.fullDiff = maskSecrets(rawDiff.substring(0, 50_000));
    } catch { /* diff not critical */ }

    // Detect dangerous changes
    for (const file of result.changedFiles) {
      for (const { pattern, message } of DANGEROUS_FILE_PATTERNS) {
        if (pattern.test(file)) {
          result.dangerousChanges.push({ level: 'high', message, file });
        }
      }
    }

    // Check for deleted test files
    try {
      const deletedOutput = execSync('git diff --diff-filter=D --name-only HEAD 2>nul || git diff --diff-filter=D --name-only', {
        cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      const deleted = deletedOutput ? deletedOutput.split('\n').filter(Boolean) : [];
      for (const f of deleted) {
        if (/\.(test|spec)\./i.test(f)) {
          result.dangerousChanges.push({ level: 'high', message: 'Test file deleted', file: f });
        }
      }
    } catch { /* not critical */ }

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
  } catch {
    result.summary = 'Unable to read git diff';
  }

  return result;
}
