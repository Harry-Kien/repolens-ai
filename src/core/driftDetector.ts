import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { safely } from '../utils/errors.js';

const FILE_REF_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.php', '.rb', '.go', '.rs',
  '.java', '.kt', '.cs', '.vue', '.svelte', '.json', '.md', '.mdc', '.yml', '.yaml',
  '.toml', '.env', '.css', '.scss', '.html', '.sql',
]);

/**
 * Context Drift Detector — Unique to RepoLens AI.
 *
 * Detects when AGENTS.md (or any context file) has become
 * out of sync with the actual codebase. This is the #1 reason
 * why context files hurt AI performance over time.
 *
 * Checks:
 * 1. File references → do mentioned files still exist?
 * 2. Command references → do mentioned scripts still exist?
 * 3. Dependency references → are they still installed?
 * 4. New critical files → added but not documented?
 * 5. Temporal drift → how old is the context vs latest code change?
 */

// ─── Types ──────────────────────────────────────────────

export interface DriftReport {
  /** Files mentioned in context but deleted/renamed */
  staleFiles: StaleReference[];
  /** Commands documented but not in package.json */
  staleCommands: StaleCommand[];
  /** Dependencies mentioned but not installed */
  staleDependencies: StaleDependency[];
  /** New important files not mentioned anywhere */
  undocumentedFiles: UndocumentedFile[];
  /** Temporal analysis */
  temporal: TemporalDrift;
  /** Overall drift score (0 = perfect, 100 = completely stale) */
  driftScore: number;
  /** Human-readable summary */
  summary: string;
}

export interface StaleReference {
  mentioned: string;
  line: number;
  status: 'deleted' | 'likely-renamed';
  suggestion?: string;
}

export interface StaleCommand {
  documented: string;
  actualCommand: string | null;
  line: number;
}

export interface StaleDependency {
  name: string;
  line: number;
  status: 'removed' | 'version-mismatch';
  documentedVersion?: string;
  actualVersion?: string;
}

export interface UndocumentedFile {
  file: string;
  reason: string;
  importance: 'high' | 'medium';
}

export interface TemporalDrift {
  contextLastModified: Date | null;
  codeLastModified: Date | null;
  daysSinceContextUpdate: number;
  daysSinceCodeChange: number;
  driftDays: number;
}

// ─── Main Detection ─────────────────────────────────────

/**
 * Detect context drift between AGENTS.md and the actual codebase.
 */
export function detectDrift(
  contextContent: string,
  contextPath: string,
  cwd: string,
  projectFiles: string[],
): DriftReport {
  const lines = contextContent.split('\n');

  const staleFiles = detectStaleFileRefs(lines, cwd, projectFiles);
  const staleCommands = detectStaleCommands(lines, cwd);
  const staleDependencies = detectStaleDeps(lines, cwd);
  const undocumentedFiles = detectUndocumented(contextContent, cwd, projectFiles);
  const temporal = analyzeTemporalDrift(contextPath, cwd);

  // Calculate drift score
  const driftScore = calculateDriftScore(
    staleFiles, staleCommands, staleDependencies,
    undocumentedFiles, temporal,
  );

  const summary = generateSummary(driftScore, staleFiles, staleCommands, staleDependencies, undocumentedFiles);

  return {
    staleFiles,
    staleCommands,
    staleDependencies,
    undocumentedFiles,
    temporal,
    driftScore,
    summary,
  };
}

// ─── Stale File References ──────────────────────────────

function detectStaleFileRefs(
  lines: string[],
  cwd: string,
  projectFiles: string[],
): StaleReference[] {
  const stale: StaleReference[] = [];
  // Match backtick-quoted file references like `src/utils/foo.ts`
  const fileRefPattern = /`([a-zA-Z0-9_\-./]+\.[a-zA-Z]{1,5})`/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    fileRefPattern.lastIndex = 0;
    while ((match = fileRefPattern.exec(line)) !== null) {
      const ref = match[1];
      const ext = path.extname(ref).toLowerCase();

      // Skip common non-file patterns
      if (ref.includes('npm') || ref.includes('http') || ref.startsWith('.env')) continue;
      if (!FILE_REF_EXTENSIONS.has(ext)) continue;

      // Check if file exists (directly or as basename match)
      const fullPath = path.join(cwd, ref);
      const existsDirect = fs.existsSync(fullPath);
      const existsByBasename = projectFiles.some(f =>
        f === ref || f.endsWith('/' + ref) || path.basename(f) === path.basename(ref),
      );

      if (!existsDirect && !existsByBasename) {
        // Try to suggest renamed file
        const basename = path.basename(ref, path.extname(ref));
        const similar = projectFiles.find(f => {
          const fb = path.basename(f, path.extname(f));
          return fb.toLowerCase() === basename.toLowerCase() && fb !== basename;
        });

        stale.push({
          mentioned: ref,
          line: i + 1,
          status: similar ? 'likely-renamed' : 'deleted',
          suggestion: similar || undefined,
        });
      }
    }
  }

  return stale;
}

// ─── Stale Commands ─────────────────────────────────────

function detectStaleCommands(lines: string[], cwd: string): StaleCommand[] {
  const stale: StaleCommand[] = [];
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return stale;

  const pkg = safely(() => JSON.parse(fs.readFileSync(pkgPath, 'utf-8')), null, 'parsePkg');
  if (!pkg?.scripts) return stale;

  const cmdPattern = /`(npm\s+run\s+(\w[\w:-]*))`|`(npx\s+(\S+))`/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    cmdPattern.lastIndex = 0;
    while ((match = cmdPattern.exec(line)) !== null) {
      const fullCmd = match[1] || match[3];
      const scriptName = match[2]; // from npm run X

      if (scriptName && !pkg.scripts[scriptName]) {
        // Find closest matching script
        const closest = Object.keys(pkg.scripts).find(s =>
          s.includes(scriptName) || scriptName.includes(s),
        );

        stale.push({
          documented: fullCmd,
          actualCommand: closest ? `npm run ${closest}` : null,
          line: i + 1,
        });
      }
    }
  }

  return stale;
}

// ─── Stale Dependencies ─────────────────────────────────

function detectStaleDeps(lines: string[], cwd: string): StaleDependency[] {
  const stale: StaleDependency[] = [];
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return stale;

  const pkg = safely(() => JSON.parse(fs.readFileSync(pkgPath, 'utf-8')), null, 'parsePkg');
  if (!pkg) return stale;

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Find dependency mentions in context: **Framework:** Next.js, or `prisma`, etc.
  const depMentionPattern = /\*\*(?:Framework|ORM|Database|Library|Styling)\*\*:?\s*(\w[\w.]*)/gi;
  const backtickDepPattern = /`([@a-z][\w./-]*)`/gi;

  const knownPackageNames = new Set([
    'react', 'next', 'vue', 'nuxt', 'angular', 'svelte', 'express', 'fastify',
    'hono', 'nestjs', 'prisma', 'drizzle', 'mongoose', 'sequelize', 'typeorm',
    'tailwindcss', 'jest', 'vitest', 'playwright', 'cypress', 'webpack', 'vite',
    'tsup', 'esbuild', 'zod', 'trpc', 'supabase', 'firebase', 'axios',
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check framework/tool mentions
    let match: RegExpExecArray | null;
    backtickDepPattern.lastIndex = 0;
    while ((match = backtickDepPattern.exec(line)) !== null) {
      const name = match[1].toLowerCase();
      if (knownPackageNames.has(name) && !allDeps[name] && !allDeps[`@${name}/core`]) {
        stale.push({
          name: match[1],
          line: i + 1,
          status: 'removed',
        });
      }
    }
  }

  return stale;
}

// ─── Undocumented Critical Files ────────────────────────

function detectUndocumented(
  contextContent: string,
  cwd: string,
  projectFiles: string[],
): UndocumentedFile[] {
  const undocumented: UndocumentedFile[] = [];
  const contentLower = contextContent.toLowerCase();

  // Entry points that should be documented
  const criticalPatterns: [string, string, 'high' | 'medium'][] = [
    ['src/index.ts', 'Entry point', 'high'],
    ['src/main.ts', 'Entry point', 'high'],
    ['src/app.ts', 'Entry point', 'high'],
    ['src/cli.ts', 'CLI entry point', 'high'],
    ['manage.py', 'Django management', 'high'],
    ['app.py', 'Application entry', 'high'],
    ['main.go', 'Go entry point', 'high'],
    ['Dockerfile', 'Container config', 'medium'],
    ['docker-compose.yml', 'Container orchestration', 'medium'],
    ['.env.example', 'Environment template', 'medium'],
  ];

  for (const [pattern, reason, importance] of criticalPatterns) {
    const exists = projectFiles.some(f => f.endsWith(pattern) || f === pattern);
    const mentioned = contentLower.includes(path.basename(pattern).toLowerCase());

    if (exists && !mentioned) {
      undocumented.push({ file: pattern, reason, importance });
    }
  }

  // Check for files with many imports (hub files) not documented
  // This is a heuristic — files imported by 5+ other files are "critical"
  const importCounts = new Map<string, number>();
  for (const file of projectFiles) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
    const fullPath = path.join(cwd, file);
    if (!fs.existsSync(fullPath)) continue;

    const content = safely(() => fs.readFileSync(fullPath, 'utf-8'), '', 'readFile');
    const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
    for (const imp of importMatches) {
      const target = imp.replace(/from\s+['"]/, '').replace(/['"]/, '');
      if (target.startsWith('.')) {
        const resolved = resolveLocalImport(projectFiles, file, target);
        importCounts.set(resolved, (importCounts.get(resolved) || 0) + 1);
      }
    }
  }

  for (const [file, count] of importCounts) {
    if (count >= 5) {
      const basename = path.basename(file);
      const stem = path.basename(file, path.extname(file));
      if (!contentLower.includes(basename.toLowerCase()) && !contentLower.includes(stem.toLowerCase())) {
        undocumented.push({
          file,
          reason: `Imported by ${count} files — hub module`,
          importance: 'high',
        });
      }
    }
  }

  return undocumented.slice(0, 10);
}

function resolveLocalImport(projectFiles: string[], fromFile: string, target: string): string {
  const cleanTarget = target.split('?')[0].split('#')[0];
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), cleanTarget));
  const candidates = getImportCandidates(base);

  return candidates.find((candidate) => projectFiles.includes(candidate)) || base;
}

function getImportCandidates(base: string): string[] {
  const ext = path.extname(base);

  if (ext) {
    const stem = base.slice(0, -ext.length);
    return [
      base,
      `${stem}.ts`,
      `${stem}.tsx`,
      `${stem}.js`,
      `${stem}.jsx`,
      `${stem}.mjs`,
      `${stem}.cjs`,
    ];
  }

  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ];
}

// ─── Temporal Analysis ──────────────────────────────────

function analyzeTemporalDrift(contextPath: string, cwd: string): TemporalDrift {
  const now = new Date();

  // Context file last modified
  const contextFullPath = path.join(cwd, contextPath);
  const contextLastModified = safely(() => {
    const stat = fs.statSync(contextFullPath);
    return stat.mtime;
  }, null, 'contextStat');

  // Latest code change (via git or file stats)
  const codeLastModified = safely(() => {
    const result = execSync('git log -1 --format=%ci -- "src/" "app/" "lib/" "*.ts" "*.js" "*.py"', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    }).trim();
    return result ? new Date(result) : null;
  }, null, 'gitLog');

  const daysSinceContext = contextLastModified
    ? Math.floor((now.getTime() - contextLastModified.getTime()) / 86400000)
    : -1;

  const daysSinceCode = codeLastModified
    ? Math.floor((now.getTime() - codeLastModified.getTime()) / 86400000)
    : -1;

  const driftDays = (daysSinceContext >= 0 && daysSinceCode >= 0)
    ? Math.max(0, daysSinceContext - daysSinceCode)
    : 0;

  return {
    contextLastModified,
    codeLastModified,
    daysSinceContextUpdate: daysSinceContext,
    daysSinceCodeChange: daysSinceCode,
    driftDays,
  };
}

// ─── Scoring ────────────────────────────────────────────

function calculateDriftScore(
  staleFiles: StaleReference[],
  staleCommands: StaleCommand[],
  staleDeps: StaleDependency[],
  undocumented: UndocumentedFile[],
  temporal: TemporalDrift,
): number {
  let score = 0;

  // Stale file references: 8 points each (max 40)
  score += Math.min(40, staleFiles.length * 8);

  // Stale commands: 10 points each (max 30)
  score += Math.min(30, staleCommands.length * 10);

  // Stale dependencies: 5 points each (max 15)
  score += Math.min(15, staleDeps.length * 5);

  // Undocumented critical files: 3 points each (max 15)
  score += Math.min(15, undocumented.filter(u => u.importance === 'high').length * 5);
  score += Math.min(10, undocumented.filter(u => u.importance === 'medium').length * 2);

  // Temporal drift: up to 20 points
  if (temporal.driftDays > 30) score += 20;
  else if (temporal.driftDays > 14) score += 10;
  else if (temporal.driftDays > 7) score += 5;

  return Math.min(100, score);
}

// ─── Summary ────────────────────────────────────────────

function generateSummary(
  score: number,
  staleFiles: StaleReference[],
  staleCommands: StaleCommand[],
  staleDeps: StaleDependency[],
  undocumented: UndocumentedFile[],
): string {
  if (score === 0) return '✅ Context is perfectly in sync with codebase.';
  if (score <= 15) return '🟢 Minor drift detected — context is mostly current.';
  if (score <= 40) return `⚠️ Moderate drift — ${staleFiles.length} stale refs, ${undocumented.length} undocumented files.`;
  if (score <= 70) return `🟠 Significant drift — context is falling behind the codebase.`;
  return `🔴 Critical drift — context file is severely outdated and may hurt AI agent performance.`;
}
