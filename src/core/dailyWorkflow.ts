import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scanRepository } from './repoScanner.js';
import { detectFramework, type FrameworkInfo } from './frameworkDetector.js';
import { classifyFile, classifyFiles, type FileCategory } from './fileClassifier.js';
import { analyzeArchitecture, type ArchitectureResult } from './architectureAnalyzer.js';
import {
  readCodeContents,
  summarizeContents,
  type ContentSummary,
  type FileContent,
} from './contentReader.js';
import { extractSmartContext, type SmartContext } from './smartContext.js';
import { analyzeGitDiff } from './gitDiff.js';
import type { ScanResult } from './repoScanner.js';

export interface DailyContextBundle {
  cwd: string;
  scan: ScanResult;
  framework: FrameworkInfo;
  architecture: ArchitectureResult;
  files: FileContent[];
  summary: ContentSummary;
  smart: SmartContext;
}

export interface GeneratedPrompt {
  prompt: string;
  relatedFiles: string[];
  plan: PromptPlan;
}

export type PromptIntentId =
  | 'auth'
  | 'upload'
  | 'payment'
  | 'api'
  | 'ui'
  | 'database'
  | 'quality'
  | 'docs'
  | 'general';

export interface PromptIntent {
  id: PromptIntentId;
  label: string;
  keywords: string[];
  pathHints: string[];
  preferredCategories: FileCategory[];
  suggestedAreas: string[];
  guardrails: string[];
}

export interface PromptPlan {
  intent: PromptIntent;
  confidence: number;
  inspectFiles: string[];
  suggestedFiles: string[];
  guardrails: string[];
  verificationCommands: string[];
}

export interface QuickCheckIssue {
  level: 'error' | 'warning' | 'info';
  file: string;
  message: string;
  fix?: string;
}

export interface QuickCheckResult {
  changedFiles: string[];
  issues: QuickCheckIssue[];
  score: number;
  summary: string;
}

const IMPORTANT_DIRECTORIES = [
  'src/app',
  'src/pages',
  'src/components',
  'src/commands',
  'src/core',
  'src/lib',
  'src/utils',
  'app',
  'pages',
  'components',
  'lib',
];

const PROMPT_INTENTS: PromptIntent[] = [
  {
    id: 'auth',
    label: 'Authentication and access control',
    keywords: ['auth', 'login', 'signin', 'signup', 'register', 'session', 'jwt', 'oauth', 'password', 'permission', 'role', 'user'],
    pathHints: ['auth', 'login', 'signin', 'signup', 'session', 'user', 'middleware'],
    preferredCategories: ['route', 'service', 'middleware', 'component', 'model', 'type'],
    suggestedAreas: ['auth service or adapter', 'login/register UI', 'session middleware', 'user/session types', 'auth tests'],
    guardrails: [
      'Do not store raw passwords, tokens, or secrets in source code.',
      'Keep authentication state, validation, and UI concerns separated.',
      'Handle failed login, expired session, and unauthorized access paths explicitly.',
    ],
  },
  {
    id: 'upload',
    label: 'File upload, media, and storage',
    keywords: ['upload', 'file', 'image', 'avatar', 'media', 'storage', 's3', 'blob', 'attachment', 'photo'],
    pathHints: ['upload', 'file', 'image', 'avatar', 'media', 'storage', 'blob'],
    preferredCategories: ['route', 'service', 'component', 'util', 'type'],
    suggestedAreas: ['upload route or action', 'storage adapter', 'validation helper', 'upload UI', 'upload tests'],
    guardrails: [
      'Validate file size, MIME type, extension, and empty-file cases.',
      'Never trust client-provided filenames or paths.',
      'Keep storage provider details behind a small adapter.',
    ],
  },
  {
    id: 'payment',
    label: 'Payments, billing, and subscriptions',
    keywords: ['payment', 'stripe', 'checkout', 'billing', 'subscription', 'invoice', 'plan', 'price', 'webhook'],
    pathHints: ['payment', 'stripe', 'billing', 'checkout', 'subscription', 'webhook'],
    preferredCategories: ['route', 'service', 'model', 'type', 'test'],
    suggestedAreas: ['billing service', 'checkout route', 'webhook handler', 'subscription model/types', 'payment tests'],
    guardrails: [
      'Do not trust payment state from the client; verify it server-side.',
      'Make webhook handling idempotent.',
      'Keep provider keys and webhook secrets in environment variables.',
    ],
  },
  {
    id: 'api',
    label: 'API or backend workflow',
    keywords: ['api', 'endpoint', 'route', 'backend', 'handler', 'controller', 'server', 'action'],
    pathHints: ['api', 'route', 'routes', 'handler', 'controller', 'server', 'action'],
    preferredCategories: ['route', 'controller', 'service', 'type', 'test'],
    suggestedAreas: ['route/controller entrypoint', 'business service', 'request/response types', 'API tests'],
    guardrails: [
      'Validate inputs at the boundary before calling core logic.',
      'Keep business rules outside thin route/controller handlers.',
      'Return consistent error shapes.',
    ],
  },
  {
    id: 'ui',
    label: 'User interface and product flow',
    keywords: ['ui', 'screen', 'page', 'component', 'form', 'button', 'modal', 'dashboard', 'layout', 'view'],
    pathHints: ['component', 'components', 'page', 'pages', 'app', 'layout', 'ui', 'view'],
    preferredCategories: ['component', 'view', 'type', 'test'],
    suggestedAreas: ['page/view', 'reusable component', 'form state/validation', 'UI tests'],
    guardrails: [
      'Reuse the local component patterns before adding new UI primitives.',
      'Cover loading, empty, error, and success states.',
      'Keep copy concise and action-oriented.',
    ],
  },
  {
    id: 'database',
    label: 'Database, schema, and data model',
    keywords: ['database', 'db', 'schema', 'model', 'migration', 'prisma', 'drizzle', 'sql', 'table', 'data'],
    pathHints: ['db', 'database', 'schema', 'model', 'migration', 'prisma', 'drizzle'],
    preferredCategories: ['model', 'migration', 'service', 'type', 'test'],
    suggestedAreas: ['schema/model', 'migration', 'repository/service', 'seed or fixture', 'data tests'],
    guardrails: [
      'Plan migrations so existing data remains safe.',
      'Keep persistence details away from UI components.',
      'Add tests for required fields and edge-case records.',
    ],
  },
  {
    id: 'quality',
    label: 'Quality, tests, and release readiness',
    keywords: ['test', 'tests', 'coverage', 'lint', 'quality', 'benchmark', 'score', 'readiness', 'bug', 'fix'],
    pathHints: ['test', 'spec', 'lint', 'benchmark', 'quality', 'readiness'],
    preferredCategories: ['test', 'service', 'command', 'util'],
    suggestedAreas: ['focused regression test', 'core quality rule', 'CLI/report output', 'documentation update'],
    guardrails: [
      'Prefer a small regression test that proves the fix.',
      'Keep quality checks actionable: every warning should explain what to do next.',
      'Avoid hiding failures behind broad catch blocks.',
    ],
  },
  {
    id: 'docs',
    label: 'Documentation and onboarding',
    keywords: ['docs', 'readme', 'guide', 'documentation', 'onboarding', 'tutorial', 'example'],
    pathHints: ['readme', 'docs', 'guide', 'example', 'contributing'],
    preferredCategories: ['documentation', 'config', 'script'],
    suggestedAreas: ['README quick start', 'command reference', 'before/after example', 'troubleshooting note'],
    guardrails: [
      'Write docs for a first-time user, not only for maintainers.',
      'Show one copy-pasteable happy path before advanced options.',
      'Keep examples consistent with actual CLI commands.',
    ],
  },
  {
    id: 'general',
    label: 'General feature implementation',
    keywords: [],
    pathHints: [],
    preferredCategories: ['command', 'service', 'route', 'component', 'util', 'test'],
    suggestedAreas: ['entrypoint touched by the user flow', 'core logic module', 'focused test', 'short docs note'],
    guardrails: [
      'Start from existing project patterns and avoid a parallel architecture.',
      'Keep the smallest change that fully satisfies the user goal.',
      'Update tests or docs when behavior changes.',
    ],
  },
];

const STOP_WORDS = new Set([
  'add',
  'build',
  'create',
  'make',
  'implement',
  'feature',
  'flow',
  'page',
  'screen',
  'with',
  'from',
  'into',
  'cho',
  'them',
  'tao',
  'lam',
  'sua',
  'fix',
  'update',
  'new',
  'the',
  'and',
  'for',
]);

export async function buildDailyContext(cwd: string): Promise<DailyContextBundle> {
  const scan = await scanRepository(cwd);
  const framework = detectFramework(cwd);
  const { byCategory } = classifyFiles(scan.fileTree);
  const architecture = analyzeArchitecture(byCategory, framework.framework);
  const files = await readCodeContents(cwd);
  const summary = summarizeContents(files);
  const smart = extractSmartContext(cwd, scan, framework, architecture, files, summary);

  return { cwd, scan, framework, architecture, files, summary, smart };
}

export function renderProjectContext(bundle: DailyContextBundle): string {
  const { scan, framework, architecture, smart } = bundle;
  const lines: string[] = [];

  lines.push('## Project Context');
  lines.push(`Stack: ${framework.framework} + ${framework.language}`);
  lines.push(`Package manager: ${framework.packageManager}`);
  lines.push(`Architecture: ${architecture.style}`);
  if (framework.additionalFrameworks.length > 0) {
    lines.push(`Key libraries: ${framework.additionalFrameworks.slice(0, 8).join(', ')}`);
  }
  lines.push('');

  const dirs = scan.directories.filter((dir) =>
    IMPORTANT_DIRECTORIES.some((important) => dir === important || dir.startsWith(`${important}/`)),
  );
  if (dirs.length > 0) {
    lines.push('Structure:');
    for (const dir of dirs.slice(0, 12)) lines.push(`- ${dir}/`);
    lines.push('');
  }

  if (smart.criticalFiles.length > 0) {
    lines.push('Key files:');
    for (const file of smart.criticalFiles.slice(0, 8)) {
      lines.push(`- ${file.path}: ${file.reason}`);
    }
    lines.push('');
  }

  const rules = [...smart.namingConventions, ...smart.conventions, ...smart.gotchas]
    .filter(Boolean)
    .slice(0, 10);
  if (rules.length > 0) {
    lines.push('Rules for AI coding:');
    for (const rule of rules) lines.push(`- ${stripMarkdown(rule)}`);
    lines.push('');
  }

  if (smart.commands.length > 0) {
    const commandText = smart.commands
      .filter((cmd) => ['dev', 'build', 'test', 'lint', 'start'].some((name) => cmd.name.includes(name)))
      .slice(0, 6)
      .map((cmd) => cmd.command)
      .join(' | ');
    if (commandText) lines.push(`Commands: ${commandText}`);
  }

  lines.push('');
  lines.push('When changing this project: follow the existing structure, reuse nearby patterns, and run the listed checks before considering the work done.');

  return lines.join('\n').trim();
}

export function renderSmartPrompt(bundle: DailyContextBundle, request: string): GeneratedPrompt {
  const plan = buildPromptPlan(bundle, request);
  const relatedFiles = plan.inspectFiles;
  const context = renderProjectContext(bundle);
  const lines: string[] = [];

  lines.push('# Project-Aware AI Coding Prompt');
  lines.push('');
  lines.push('You are helping modify this existing project. Think like a senior engineer inside the existing codebase.');
  lines.push('Do not invent a new architecture. Follow the project context below and keep the change practical.');
  lines.push('');
  lines.push(context);
  lines.push('');
  lines.push('## User Goal');
  lines.push(request.trim());
  lines.push('');
  lines.push('## Detected Intent');
  lines.push(`- ${plan.intent.label}`);
  lines.push(`- Confidence: ${plan.confidence}/100`);
  lines.push('');

  if (plan.inspectFiles.length > 0) {
    lines.push('## Relevant Files To Inspect First');
    for (const file of plan.inspectFiles.slice(0, 10)) lines.push(`- ${file}`);
    lines.push('');
  }

  if (plan.suggestedFiles.length > 0) {
    lines.push('## Likely Files To Create Or Update');
    for (const file of plan.suggestedFiles.slice(0, 8)) lines.push(`- ${file}`);
    lines.push('');
  }

  if (plan.guardrails.length > 0) {
    lines.push('## Guardrails');
    for (const guardrail of plan.guardrails.slice(0, 8)) lines.push(`- ${guardrail}`);
    lines.push('');
  }

  lines.push('## Implementation Requirements');
  lines.push('- Explain the intended file changes before editing.');
  lines.push('- Reuse existing patterns, names, utilities, and error handling.');
  lines.push('- Keep changes focused on the requested goal.');
  lines.push('- Add or update tests when behavior changes.');
  lines.push('- After implementation, run the most relevant build/lint/test checks.');
  lines.push('');
  lines.push('## Verification Plan');
  if (plan.verificationCommands.length > 0) {
    for (const command of plan.verificationCommands) lines.push(`- ${command}`);
  } else {
    lines.push('- Run the project lint/test/build checks that are available in package scripts.');
  }
  lines.push('');
  lines.push('## Output Expected');
  lines.push('- List changed files.');
  lines.push('- Mention verification commands and results.');
  lines.push('- Call out any assumptions or manual follow-up.');

  return { prompt: lines.join('\n').trim(), relatedFiles, plan };
}

export function runQuickCheck(cwd: string): QuickCheckResult {
  const diff = analyzeGitDiff(cwd);
  const issues: QuickCheckIssue[] = [];

  if (!diff.isGitRepo) {
    return {
      changedFiles: [],
      issues: [{ level: 'warning', file: '.', message: 'Not a git repository, so changed files cannot be checked.' }],
      score: 0,
      summary: 'Git repository not detected.',
    };
  }

  for (const dangerous of diff.dangerousChanges) {
    if (isDocumentationFile(dangerous.file)) continue;

    issues.push({
      level: dangerous.level === 'high' ? 'error' : 'warning',
      file: dangerous.file,
      message: dangerous.message,
      fix: 'Review this change carefully before committing.',
    });
  }

  for (const file of diff.changedFiles) {
    const fullPath = path.join(cwd, file);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) continue;
    if (!isCodeFile(file)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    issues.push(...checkFileContent(file, content));
  }

  const errorCount = issues.filter((issue) => issue.level === 'error').length;
  const warningCount = issues.filter((issue) => issue.level === 'warning').length;
  const score = Math.max(0, Math.min(100, 100 - errorCount * 30 - warningCount * 10));
  const summary = diff.changedFiles.length === 0
    ? 'No uncommitted changes detected.'
    : `${diff.changedFiles.length} changed file(s), ${errorCount} error(s), ${warningCount} warning(s).`;

  return { changedFiles: diff.changedFiles, issues, score, summary };
}

export function copyToClipboard(text: string): boolean {
  const platform = process.platform;
  const command = platform === 'win32' ? 'clip'
    : platform === 'darwin' ? 'pbcopy'
      : findLinuxClipboardCommand();

  if (!command) return false;

  const result = spawnSync(command, [], {
    input: text,
    encoding: 'utf-8',
    shell: platform === 'win32',
    stdio: ['pipe', 'ignore', 'ignore'],
  });

  return result.status === 0;
}

function buildPromptPlan(bundle: DailyContextBundle, request: string): PromptPlan {
  const { intent, confidence } = detectPromptIntent(request);
  const inspectFiles = findRelatedFiles(bundle, request, intent);
  const suggestedFiles = suggestFiles(bundle, request, intent, inspectFiles);
  const guardrails = buildGuardrails(bundle, intent);
  const verificationCommands = buildVerificationCommands(bundle, intent);

  return { intent, confidence, inspectFiles, suggestedFiles, guardrails, verificationCommands };
}

function detectPromptIntent(request: string): { intent: PromptIntent; confidence: number } {
  const terms = extractTerms(request);
  const termSet = new Set(terms);
  let bestIntent = PROMPT_INTENTS[PROMPT_INTENTS.length - 1];
  let bestScore = 0;

  for (const intent of PROMPT_INTENTS) {
    if (intent.id === 'general') continue;
    const keywordHits = intent.keywords.filter((keyword) => termSet.has(keyword) || request.toLowerCase().includes(keyword)).length;
    const pathHintHits = intent.pathHints.filter((hint) => request.toLowerCase().includes(hint)).length;
    const score = keywordHits * 16 + pathHintHits * 8;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  const confidence = bestScore === 0 ? 45 : Math.min(96, 58 + bestScore);
  return { intent: bestIntent, confidence };
}

function findRelatedFiles(bundle: DailyContextBundle, request: string, intent: PromptIntent): string[] {
  const terms = extractTerms(request);
  const wantsTests = intent.id === 'quality' || terms.some((term) => ['test', 'tests', 'coverage', 'spec'].includes(term));
  const contentByPath = new Map(bundle.files.map((file) => [file.path, file]));
  const promptCandidateFiles = bundle.scan.fileTree.filter(isPromptCandidateFile);
  const criticalFiles = new Set(
    bundle.smart.criticalFiles
      .map((file) => file.path)
      .filter(isPromptCandidateFile),
  );
  const scored = promptCandidateFiles
    .map((file) => ({
      file,
      score: scoreFileForPrompt(file, contentByPath.get(file), terms, intent, wantsTests, criticalFiles.has(file)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

  const focused = scored.map((item) => item.file);
  const criticalMatches = bundle.smart.criticalFiles
    .map((file) => file.path)
    .filter(isPromptCandidateFile)
    .filter((file) => focused.includes(file) || matchesAnyPromptSignal(file, terms, intent));

  return Array.from(new Set([...criticalMatches, ...focused])).slice(0, 12);
}

function scoreFileForPrompt(
  file: string,
  content: FileContent | undefined,
  terms: string[],
  intent: PromptIntent,
  wantsTests: boolean,
  isCritical: boolean,
): number {
  const lower = file.toLowerCase();
  const category = classifyFile(file);
  let score = 0;
  let signal = 0;

  const pathHintHits = intent.pathHints.filter((hint) => lower.includes(hint)).length;
  const pathTermHits = terms.filter((term) => lower.includes(term)).length;
  const basenameHits = terms.filter((term) => basenameTokens(file).includes(term)).length;

  signal += pathHintHits + pathTermHits + basenameHits;
  score += pathHintHits * 22;
  score += pathTermHits * 18;
  score += basenameHits * 10;

  if (content) {
    const text = `${content.imports.join(' ')} ${content.exports.join(' ')} ${content.functions.join(' ')} ${content.classes.join(' ')}`.toLowerCase();
    const contentHits = terms.filter((term) => text.includes(term)).length;
    const intentHits = intent.keywords.filter((keyword) => text.includes(keyword)).length;
    signal += contentHits + intentHits;
    score += contentHits * 8 + intentHits * 6;
  }

  if (signal === 0 && intent.id !== 'general') return 0;
  if (isCritical) score += 8;
  if (intent.preferredCategories.includes(category)) score += 14;

  if (category === 'test' && !wantsTests) score -= 16;
  if (category === 'documentation' && intent.id !== 'docs') score -= 12;
  if (category === 'static') score -= 10;

  return score;
}

function matchesAnyPromptSignal(file: string, terms: string[], intent: PromptIntent): boolean {
  const lower = file.toLowerCase();
  return terms.some((term) => lower.includes(term)) || intent.pathHints.some((hint) => lower.includes(hint));
}

function suggestFiles(bundle: DailyContextBundle, request: string, intent: PromptIntent, inspectFiles: string[]): string[] {
  const existing = new Set(bundle.scan.fileTree);
  const suggested = new Set<string>();
  const slug = inferFeatureSlug(request, intent);
  const isCli = bundle.architecture.style.toLowerCase().includes('cli') || bundle.scan.fileTree.some((file) => file === 'src/cli.ts');
  const hasAppRouter = bundle.scan.fileTree.some((file) => file.startsWith('src/app/'));

  for (const file of inspectFiles.slice(0, 5)) {
    if (classifyFile(file) !== 'documentation') {
      suggested.add(`${file} (inspect/update if it owns the behavior)`);
    }
  }

  if (isCli) {
    suggested.add(`src/commands/${slug}.ts`);
    suggested.add(`src/core/${slug}.ts`);
    suggested.add(`tests/${slug}.test.ts`);
    suggested.add('src/cli.ts (register the command only if this is a new CLI flow)');
  } else if (hasAppRouter) {
    suggested.add(`src/app/${slug}/page.tsx`);
    suggested.add(`src/app/api/${slug}/route.ts`);
    suggested.add(`src/components/${toPascalCase(slug)}Form.tsx`);
    suggested.add(`src/lib/${slug}.ts`);
    suggested.add(`tests/${slug}.test.ts`);
  } else {
    for (const area of intent.suggestedAreas) suggested.add(`${area} (${slug})`);
  }

  return Array.from(suggested)
    .filter((entry) => !existing.has(entry))
    .slice(0, 10);
}

function buildGuardrails(bundle: DailyContextBundle, intent: PromptIntent): string[] {
  const guardrails = new Set<string>(intent.guardrails);
  const framework = bundle.framework.framework.toLowerCase();

  for (const rule of [...bundle.smart.conventions, ...bundle.smart.gotchas].slice(0, 4)) {
    guardrails.add(stripMarkdown(rule));
  }
  if (framework.includes('next')) {
    guardrails.add('For Next.js App Router, add `use client` only when a component truly needs client-side hooks.');
  }
  if (bundle.framework.language.toLowerCase().includes('typescript')) {
    guardrails.add('Keep TypeScript strict: avoid `any`, prefer explicit types or `unknown` with narrowing.');
  }

  return Array.from(guardrails).slice(0, 10);
}

function buildVerificationCommands(bundle: DailyContextBundle, intent: PromptIntent): string[] {
  const commands = new Set<string>();
  const commandText = bundle.smart.commands.map((command) => command.command);
  const preferredNames = intent.id === 'quality'
    ? ['test', 'coverage', 'lint', 'build']
    : ['lint', 'test', 'build'];

  for (const preferred of preferredNames) {
    const found = commandText.find((command) => command.toLowerCase().includes(preferred));
    if (found) commands.add(found);
  }

  if (bundle.scan.importantFiles.includes('AGENTS.md') || bundle.scan.fileTree.includes('src/commands/check.ts')) {
    commands.add('repolens check');
  }

  return Array.from(commands).slice(0, 5);
}

function extractTerms(request: string): string[] {
  return Array.from(new Set(
    request
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !STOP_WORDS.has(term)),
  ));
}

function basenameTokens(file: string): string[] {
  return path.basename(file).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function inferFeatureSlug(request: string, intent: PromptIntent): string {
  const terms = extractTerms(request)
    .filter((term) => !intent.keywords.includes(term))
    .slice(0, 3);
  const seed = terms.length > 0 ? terms.join('-') : intent.id;
  return seed.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'feature';
}

function toPascalCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
}

function checkFileContent(file: string, content: string): QuickCheckIssue[] {
  const issues: QuickCheckIssue[] = [];

  if (/(^|[(:<,]\s*)any\b|\bas\s+any\b/.test(content) && /\.(ts|tsx)$/.test(file) && file !== 'src/utils/errors.ts') {
    issues.push({
      level: 'warning',
      file,
      message: 'TypeScript `any` found.',
      fix: 'Replace `any` with a project-specific type or `unknown` plus narrowing.',
    });
  }

  if (/app\/.*\.(tsx|jsx)$/.test(file) && /use(State|Effect|Ref|Memo|Callback)\s*\(/.test(content)) {
    const firstMeaningfulLine = content.split('\n').find((line) => line.trim().length > 0)?.trim();
    if (firstMeaningfulLine !== "'use client';" && firstMeaningfulLine !== '"use client";') {
      issues.push({
        level: 'error',
        file,
        message: 'React client hook used without a `use client` directive.',
        fix: 'Add `"use client";` as the first statement or move hook logic to a client component.',
      });
    }
  }

  if (/console\.log\(/.test(content) && file.startsWith('src/') && !isAllowedConsoleFile(file)) {
    issues.push({
      level: 'warning',
      file,
      message: 'console.log found in source code.',
      fix: 'Use the project logger or remove debug output before committing.',
    });
  }

  return issues;
}

function isCodeFile(file: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);
}

function isDocumentationFile(file: string): boolean {
  return /\.(md|mdc|txt|docx|pdf)$/.test(file) || file.includes('.cursor/skills/');
}

function isPromptCandidateFile(file: string): boolean {
  const lower = file.toLowerCase();
  const basename = path.basename(lower);

  if (basename.startsWith('~$')) return false;
  if (lower.includes('/~$')) return false;
  if (/\.(docx|doc|pdf|png|jpg|jpeg|gif|webp|ico|zip|tar|gz|tgz|7z|exe|dll|so|dylib)$/i.test(lower)) return false;
  if (lower.endsWith('.lock') || lower.endsWith('package-lock.json')) return false;

  return true;
}

function isAllowedConsoleFile(file: string): boolean {
  return file === 'src/utils/logger.ts' || file === 'src/commands/lint.ts' || file.startsWith('src/reporters/');
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '');
}

function findLinuxClipboardCommand(): string | null {
  for (const command of ['wl-copy', 'xclip', 'xsel']) {
    const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) return command;
  }
  return null;
}
