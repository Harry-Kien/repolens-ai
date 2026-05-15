import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { getGlobIgnorePatterns } from '../utils/paths.js';

export interface RiskItem {
  level: 'high' | 'medium' | 'low';
  category: 'security' | 'architecture' | 'maintainability' | 'testing';
  message: string;
  file?: string;
  line?: number;
}

export interface RiskReport {
  risks: RiskItem[];
  summary: { high: number; medium: number; low: number };
}

const DANGEROUS_PATTERNS: { pattern: RegExp; message: string; level: RiskItem['level']; category: RiskItem['category'] }[] = [
  { pattern: /(?:^|[;\s])eval\s*\(/gm, message: 'eval() usage detected — potential code injection', level: 'high', category: 'security' },
  { pattern: /(?:^|[;\s])(?:child_process|cp).*exec\s*\(/gm, message: 'exec() usage — possible command injection', level: 'medium', category: 'security' },
  { pattern: /(?:^|[;\s])shell_exec\s*\(/gm, message: 'shell_exec() usage — command injection risk', level: 'high', category: 'security' },
  { pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*(?:FROM|INTO|TABLE)\s/gi, message: 'Raw SQL detected — use parameterized queries', level: 'medium', category: 'security' },
  { pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9]{8,}/gi, message: 'Hardcoded API key or secret', level: 'high', category: 'security' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, message: 'OpenAI API key detected in source', level: 'high', category: 'security' },
  { pattern: /AKIA[0-9A-Z]{16}/g, message: 'AWS access key detected in source', level: 'high', category: 'security' },
  { pattern: /(?:TODO|FIXME|HACK|XXX|BUG)\b/gi, message: 'TODO/FIXME marker found', level: 'low', category: 'maintainability' },
  { pattern: /(?:password|passwd)\s*[:=]\s*["'][^"']+["']/gi, message: 'Hardcoded password detected', level: 'high', category: 'security' },
];

/** Files that are part of RepoLens itself — skip to avoid false positives */
const SELF_SKIP_PATTERNS = ['riskDetector', 'privacyFilter', 'masks', 'agentsTemplate', 'contextScorer', 'contentReader'];

const CODE_EXTENSIONS = ['.ts','.tsx','.js','.jsx','.py','.php','.rb','.go','.rs','.java','.kt','.cs','.vue','.svelte'];

/**
 * Scan repository for risky patterns.
 */
export async function detectRisks(cwd: string): Promise<RiskReport> {
  const risks: RiskItem[] = [];
  const ignore = getGlobIgnorePatterns();

  // 1. Check for .env files
  const envFiles = await fg('**/.env*', { cwd, ignore, dot: true });
  for (const f of envFiles) {
    if (!f.endsWith('.example') && !f.endsWith('.sample')) {
      risks.push({ level: 'high', category: 'security', message: `.env file found — may contain secrets`, file: f });
    }
  }

  // 2. Check for missing README
  const readmes = await fg('**/README*', { cwd, ignore, caseSensitiveMatch: false });
  if (readmes.length === 0) {
    risks.push({ level: 'medium', category: 'maintainability', message: 'No README file found' });
  }

  // 3. Check for missing tests
  const tests = await fg('**/*.{test,spec}.{ts,tsx,js,jsx,py,rb,php}', { cwd, ignore });
  const testDirs = await fg('**/tests/**', { cwd, ignore });
  if (tests.length === 0 && testDirs.length === 0) {
    risks.push({ level: 'medium', category: 'testing', message: 'No test files found in project' });
  }

  // 4. Scan code files for dangerous patterns
  const codeFiles = await fg('**/*', { cwd, ignore, onlyFiles: true });
  for (const file of codeFiles) {
    const ext = path.extname(file).toLowerCase();
    if (!CODE_EXTENSIONS.includes(ext)) continue;

    // Skip RepoLens own files to avoid false positives from pattern definitions
    if (SELF_SKIP_PATTERNS.some(p => file.includes(p))) continue;

    try {
      const fullPath = path.join(cwd, file);
      const stat = fs.statSync(fullPath);

      // Large file check
      const lineEstimate = Math.round(stat.size / 25);
      if (lineEstimate > 500 && (file.includes('controller') || file.includes('Controller'))) {
        risks.push({ level: 'medium', category: 'architecture', message: `Large controller file (~${lineEstimate} lines)`, file });
      }

      // Only scan files under 100KB for patterns
      if (stat.size > 100_000) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const { pattern, message, level, category } of DANGEROUS_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(content)) {
          risks.push({ level, category, message, file });
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  const summary = {
    high: risks.filter(r => r.level === 'high').length,
    medium: risks.filter(r => r.level === 'medium').length,
    low: risks.filter(r => r.level === 'low').length,
  };

  return { risks, summary };
}
