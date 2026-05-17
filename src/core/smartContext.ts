import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FileContent, ContentSummary } from './contentReader.js';
import type { ScanResult } from './repoScanner.js';
import type { FrameworkInfo } from './frameworkDetector.js';
import type { ArchitectureResult } from './architectureAnalyzer.js';
import { detectBestTemplate } from '../templates/frameworkTemplates.js';

/**
 * Smart Context Engine — The brain of RepoLens AI.
 *
 * Instead of generating generic AGENTS.md from templates,
 * this engine READS YOUR ACTUAL CODE and generates
 * project-specific context that AI agents can't infer.
 *
 * What makes this different:
 * 1. Reads package.json scripts → exact build/dev/test commands
 * 2. Reads .env.example → exact env vars needed
 * 3. Reads TODO/FIXME → real known issues
 * 4. Detects import patterns → actual conventions
 * 5. Finds largest/most-connected files → real critical files
 * 6. Detects actual naming conventions from code
 * 7. Merges framework template gotchas when available
 */

export interface SmartContext {
  commands: { name: string; command: string; description?: string }[];
  envVars: { name: string; description: string; required: boolean }[];
  conventions: string[];
  knownIssues: string[];
  criticalFiles: { path: string; reason: string }[];
  gotchas: string[];
  dependencies: { name: string; version: string; purpose?: string }[];
  importPattern: 'esm' | 'commonjs' | 'mixed' | 'unknown';
  namingConventions: string[];
  testingInfo: { hasTests: boolean; framework?: string; command?: string };
}

/**
 * Extract smart context by actually reading the project's code.
 */
export function extractSmartContext(
  cwd: string,
  scan: ScanResult,
  fw: FrameworkInfo,
  arch: ArchitectureResult,
  files: FileContent[],
  summary: ContentSummary,
): SmartContext {
  const ctx: SmartContext = {
    commands: [],
    envVars: [],
    conventions: [],
    knownIssues: [],
    criticalFiles: [],
    gotchas: [],
    dependencies: [],
    importPattern: 'unknown',
    namingConventions: [],
    testingInfo: { hasTests: scan.hasTests },
  };

  // ─── 1. Extract REAL commands from package.json ────────
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts) {
        for (const [name, cmd] of Object.entries(pkg.scripts)) {
          ctx.commands.push({
            name,
            command: `npm run ${name}`,
            description: describeScript(name, cmd as string),
          });
        }
      }
      // Extract dependencies for awareness
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(allDeps)) {
        ctx.dependencies.push({
          name,
          version: String(version),
          purpose: describeDependency(name),
        });
      }
      // Detect test framework
      if (allDeps['vitest']) ctx.testingInfo = { hasTests: true, framework: 'vitest', command: 'npx vitest' };
      else if (allDeps['jest']) ctx.testingInfo = { hasTests: true, framework: 'jest', command: 'npm test' };
      else if (allDeps['mocha']) ctx.testingInfo = { hasTests: true, framework: 'mocha', command: 'npm test' };
      else if (allDeps['pytest'] || allDeps['python']) ctx.testingInfo = { hasTests: scan.hasTests, framework: 'pytest', command: 'pytest' };
    } catch { /* skip */ }
  }

  // Python projects
  const reqPath = path.join(cwd, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    try {
      const reqs = fs.readFileSync(reqPath, 'utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
      for (const req of reqs.slice(0, 20)) {
        const [name] = req.split(/[=<>!]/);
        ctx.dependencies.push({ name: name.trim(), version: '', purpose: describeDependency(name.trim()) });
      }
    } catch { /* skip */ }
  }

  // ─── 2. Extract REAL env vars from .env.example ────────
  const envFiles = ['.env.example', '.env.sample', '.env.template', '.env.local.example'];
  for (const envFile of envFiles) {
    const envPath = path.join(cwd, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const match = line.match(/^([A-Z][A-Z0-9_]+)\s*=\s*(.*?)(?:\s*#\s*(.*))?$/);
          if (match) {
            ctx.envVars.push({
              name: match[1],
              description: match[3] || describeEnvVar(match[1]),
              required: !match[2] || match[2] === '',
            });
          }
        }
      } catch { /* skip */ }
      break;
    }
  }

  // ─── 3. Extract TODO/FIXME as known issues ─────────────
  const allTodos: { file: string; line: number; text: string }[] = [];
  for (const f of files) {
    for (const todo of f.todoFixmes) {
      allTodos.push({ file: f.path, line: todo.line, text: todo.text });
    }
  }
  if (allTodos.length > 0) {
    for (const todo of allTodos.slice(0, 8)) {
      ctx.knownIssues.push(`\`${todo.file}:${todo.line}\` — ${todo.text}`);
    }
  }

  // ─── 4. Detect import pattern ──────────────────────────
  let esmCount = 0;
  let cjsCount = 0;
  for (const f of files) {
    for (const imp of f.imports) {
      if (imp.includes('import ') || imp.includes('from ')) esmCount++;
      if (imp.includes('require(')) cjsCount++;
    }
  }
  if (esmCount > 0 && cjsCount > 0) ctx.importPattern = 'mixed';
  else if (esmCount > cjsCount) ctx.importPattern = 'esm';
  else if (cjsCount > 0) ctx.importPattern = 'commonjs';

  // ─── 5. Detect naming conventions from actual code ─────
  const funcNames = files.flatMap(f => f.functions);
  let camelCase = 0, snake_case = 0, PascalCase = 0;
  for (const name of funcNames.slice(0, 100)) {
    if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) camelCase++;
    else if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) snake_case++;
    else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) PascalCase++;
  }
  if (camelCase > snake_case && camelCase > PascalCase) {
    ctx.namingConventions.push('Functions use **camelCase** (e.g., `getUserById`)');
  } else if (snake_case > camelCase) {
    ctx.namingConventions.push('Functions use **snake_case** (e.g., `get_user_by_id`)');
  }
  if (PascalCase > 3) {
    ctx.namingConventions.push('Classes/Components use **PascalCase** (e.g., `UserProfile`)');
  }

  // Detect file extension conventions
  const tsFiles = files.filter(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  const jsFiles = files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
  if (tsFiles.length > jsFiles.length * 2) {
    ctx.namingConventions.push('Project uses **TypeScript** — all new files must be `.ts`/`.tsx`');
  }

  // Detect import extension pattern (.js extension in TS = ESM)
  if (ctx.importPattern === 'esm') {
    const hasJsExtensions = files.some(f =>
      f.imports.some(imp => /from\s+['"].*\.js['"]/.test(imp))
    );
    if (hasJsExtensions) {
      ctx.conventions.push('All imports use `.js` extension (ESM requirement with TypeScript)');
    }
  }

  // ─── 6. Find critical files by actual connectivity ─────
  for (const f of summary.mostConnected.slice(0, 5)) {
    if (f.imports > 3) {
      ctx.criticalFiles.push({
        path: f.path,
        reason: `${f.imports} imports — modify carefully, changes cascade widely`,
      });
    }
  }
  // Entry points are critical
  const entryFiles = ['src/cli.ts', 'src/index.ts', 'src/main.ts', 'src/app.ts', 'app.ts', 'index.ts',
    'src/main.py', 'manage.py', 'app.py', 'main.go', 'src/main.rs'];
  for (const entry of entryFiles) {
    if (files.some(f => f.path === entry)) {
      ctx.criticalFiles.push({ path: entry, reason: 'Entry point — changes affect entire application' });
    }
  }

  // ─── 7. Merge framework template gotchas ───────────────
  const template = detectBestTemplate(fw.framework);
  if (template) {
    const templateLines = template.content.split('\n');
    let inGotchas = false;
    for (const line of templateLines) {
      if (line.startsWith('## Gotchas')) { inGotchas = true; continue; }
      if (inGotchas && line.startsWith('## ')) break;
      if (inGotchas && line.startsWith('- ')) {
        ctx.gotchas.push(line.substring(2));
      }
    }
  }

  // ─── 8. Detect project-specific conventions ────────────
  // Detect if project uses strict TypeScript
  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      if (tsconfig.compilerOptions?.strict) {
        ctx.conventions.push('TypeScript strict mode is enabled — no `any` types');
      }
      if (tsconfig.compilerOptions?.noEmit) {
        ctx.conventions.push('TypeScript is used for type-checking only (`noEmit: true`)');
      }
    } catch { /* skip */ }
  }

  // Detect if project has ESLint/Prettier
  const lintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs'];
  for (const lc of lintConfigs) {
    if (fs.existsSync(path.join(cwd, lc))) {
      ctx.conventions.push(`ESLint is configured (\`${lc}\`) — run \`npm run lint\` before committing`);
      break;
    }
  }
  if (fs.existsSync(path.join(cwd, '.prettierrc')) || fs.existsSync(path.join(cwd, '.prettierrc.json'))) {
    ctx.conventions.push('Prettier is configured — code formatting is enforced');
  }

  return ctx;
}

/**
 * Generate a high-quality AGENTS.md from smart context.
 * This is the KEY DIFFERENTIATOR — every line is project-specific.
 */
export function generateSmartAgentsMd(
  fw: FrameworkInfo,
  arch: ArchitectureResult,
  scan: ScanResult,
  summary: ContentSummary,
  ctx: SmartContext,
): string {
  const s: string[] = [];

  s.push('# AGENTS.md');
  s.push('');
  s.push('> Instructions for AI coding agents working on this project.');
  s.push(`> Auto-generated by RepoLens AI on ${new Date().toISOString().split('T')[0]}.`);
  s.push('');

  // ─── Project Overview ──────────────────────────────────
  s.push('## Project Overview');
  s.push('');
  s.push(`- **Framework:** ${fw.framework}${fw.version ? ` (${fw.version})` : ''}`);
  s.push(`- **Language:** ${fw.language}`);
  s.push(`- **Package Manager:** ${fw.packageManager}`);
  s.push(`- **Architecture:** ${arch.style}`);
  if (ctx.importPattern !== 'unknown') {
    s.push(`- **Module System:** ${ctx.importPattern === 'esm' ? 'ES Modules (import/export)' : ctx.importPattern === 'commonjs' ? 'CommonJS (require)' : 'Mixed'}`);
  }
  if (fw.additionalFrameworks.length > 0) {
    s.push(`- **Key Libraries:** ${fw.additionalFrameworks.join(', ')}`);
  }
  s.push('');

  // ─── Commands (REAL, from package.json) ────────────────
  if (ctx.commands.length > 0) {
    s.push('## Commands');
    s.push('');
    const important = ['dev', 'build', 'start', 'test', 'lint', 'format', 'deploy', 'preview', 'generate', 'migrate'];
    const shown = ctx.commands.filter(c => important.some(i => c.name.includes(i)));
    const rest = ctx.commands.filter(c => !shown.includes(c));
    for (const cmd of shown) {
      s.push(`- **${capitalize(cmd.name)}:** \`${cmd.command}\`${cmd.description ? ` — ${cmd.description}` : ''}`);
    }
    if (rest.length > 0) {
      s.push(`- Other scripts: ${rest.map(c => `\`${c.name}\``).join(', ')}`);
    }
    s.push('');
  }

  // ─── Architecture ──────────────────────────────────────
  s.push('## Architecture');
  s.push('');
  if (arch.dataFlow.length > 0) {
    for (const flow of arch.dataFlow) s.push(`- ${flow}`);
    s.push('');
  }

  // ─── Key Structure ─────────────────────────────────────
  s.push('## Key Structure');
  s.push('');
  s.push('```');
  for (const dir of scan.directories.slice(0, 15)) s.push(dir + '/');
  s.push('```');
  s.push('');

  // ─── Critical Files (from REAL analysis) ───────────────
  if (ctx.criticalFiles.length > 0) {
    s.push('## Critical Files (modify carefully)');
    s.push('');
    for (const f of ctx.criticalFiles) {
      s.push(`- \`${f.path}\` — ${f.reason}`);
    }
    s.push('');
  }

  // ─── Environment Variables (from .env.example) ─────────
  if (ctx.envVars.length > 0) {
    s.push('## Environment Variables');
    s.push('');
    for (const v of ctx.envVars) {
      const req = v.required ? '**required**' : 'optional';
      s.push(`- \`${v.name}\` — ${v.description} (${req})`);
    }
    s.push('');
  }

  // ─── Gotchas (framework-specific + project-specific) ───
  if (ctx.gotchas.length > 0 || ctx.knownIssues.length > 0) {
    s.push('## Gotchas & Known Issues');
    s.push('');
    for (const g of ctx.gotchas) s.push(`- ${g}`);
    if (ctx.knownIssues.length > 0) {
      s.push('');
      s.push('### Active TODOs in code:');
      for (const issue of ctx.knownIssues) s.push(`- ${issue}`);
    }
    s.push('');
  }

  // ─── Conventions (from REAL code analysis) ─────────────
  if (ctx.conventions.length > 0 || ctx.namingConventions.length > 0) {
    s.push('## Conventions');
    s.push('');
    for (const c of ctx.namingConventions) s.push(`- ${c}`);
    for (const c of ctx.conventions) s.push(`- ${c}`);
    s.push('');
  }

  // ─── Testing ───────────────────────────────────────────
  s.push('## Testing');
  s.push('');
  if (ctx.testingInfo.hasTests && ctx.testingInfo.framework) {
    s.push(`- Framework: **${ctx.testingInfo.framework}**`);
    s.push(`- Run: \`${ctx.testingInfo.command}\``);
    s.push('- Always run tests before and after changes');
    s.push('- Add tests for new functionality');
  } else {
    s.push('- This project currently lacks tests');
    s.push('- Add tests for critical business logic when possible');
  }
  s.push('');

  // ─── Do Not ────────────────────────────────────────────
  if (arch.weakPoints.length > 0) {
    s.push('## Rules');
    s.push('');
    for (const wp of arch.weakPoints) s.push(`- ${wp}`);
    s.push('');
  }

  s.push('---');
  s.push('*Generated by [RepoLens AI](https://github.com/Harry-Kien/repolens-ai)*');
  return s.join('\n');
}

// ─── Helper functions ────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function describeScript(name: string, cmd: string): string {
  if (name === 'dev') return cmd.includes('--watch') ? 'Development mode with hot reload' : 'Development server';
  if (name === 'build') return 'Production build';
  if (name === 'start') return 'Production server';
  if (name === 'test') return 'Run tests';
  if (name === 'lint') return 'Type/lint checking';
  if (name === 'format') return 'Code formatting';
  if (name === 'preview') return 'Preview production build';
  if (name.includes('migrate')) return 'Database migrations';
  if (name.includes('seed')) return 'Database seeding';
  if (name.includes('generate')) return 'Code generation';
  return '';
}

function describeDependency(name: string): string {
  const known: Record<string, string> = {
    'react': 'UI library', 'next': 'Fullstack framework', 'vue': 'UI framework',
    'express': 'HTTP server', 'fastify': 'HTTP server', 'prisma': 'ORM',
    'drizzle-orm': 'ORM', 'typeorm': 'ORM', 'mongoose': 'MongoDB ODM',
    'tailwindcss': 'CSS utility framework', 'zod': 'Schema validation',
    'axios': 'HTTP client', 'commander': 'CLI framework', 'chalk': 'Terminal colors',
    'vitest': 'Test runner', 'jest': 'Test runner', 'eslint': 'Linter',
    'prettier': 'Code formatter', 'typescript': 'Type system',
    'tsup': 'Bundler', 'vite': 'Bundler/Dev server', 'webpack': 'Bundler',
  };
  return known[name] || '';
}

function describeEnvVar(name: string): string {
  if (name.includes('DATABASE') || name.includes('DB_')) return 'Database connection';
  if (name.includes('API_KEY') || name.includes('SECRET')) return 'API key (keep secret)';
  if (name.includes('PORT')) return 'Server port';
  if (name.includes('URL') || name.includes('HOST')) return 'Service URL';
  if (name.includes('JWT') || name.includes('AUTH')) return 'Authentication config';
  if (name.includes('REDIS')) return 'Redis connection';
  if (name.includes('SMTP') || name.includes('MAIL')) return 'Email service config';
  if (name.includes('AWS') || name.includes('S3')) return 'AWS config';
  if (name.includes('STRIPE')) return 'Payment provider';
  return 'Configuration value';
}
