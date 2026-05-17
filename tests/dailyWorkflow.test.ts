import { describe, expect, it } from 'vitest';
import {
  renderProjectContext,
  renderSmartPrompt,
  runQuickCheck,
  type DailyContextBundle,
} from '../src/core/dailyWorkflow.js';

const bundle: DailyContextBundle = {
  cwd: '/repo',
  scan: {
    cwd: '/repo',
    totalFiles: 10,
    filesByExtension: { '.ts': 5 },
    fileTree: [
      'src/app/page.tsx',
      'src/app/api/auth/route.ts',
      'src/components/LoginForm.tsx',
      'src/lib/auth.ts',
      'tests/smartContext.test.ts',
    ],
    importantFiles: ['package.json', 'AGENTS.md'],
    directories: ['src', 'src/app', 'src/components', 'src/lib'],
    estimatedLinesOfCode: 400,
    languages: ['TypeScript'],
    hasGit: true,
    hasReadme: true,
    hasTests: true,
    hasDocker: false,
    hasCiCd: true,
  },
  framework: {
    framework: 'Next.js',
    language: 'TypeScript',
    packageManager: 'npm',
    confidence: 'high',
    additionalFrameworks: ['React', 'Vitest'],
  },
  architecture: {
    style: 'File-based Routing (Fullstack Framework)',
    layers: [],
    dataFlow: ['Client Request -> Routes'],
    weakPoints: [],
    suggestions: [],
  },
  files: [
    {
      path: 'src/lib/auth.ts',
      content: 'export function login() {} export function createSession() {}',
      lines: 1,
      imports: [],
      exports: ['export function login() {}'],
      functions: ['login', 'createSession'],
      classes: [],
      comments: [],
      todoFixmes: [],
    },
    {
      path: 'src/components/LoginForm.tsx',
      content: 'export function LoginForm() {}',
      lines: 1,
      imports: [],
      exports: ['export function LoginForm() {}'],
      functions: ['LoginForm'],
      classes: [],
      comments: [],
      todoFixmes: [],
    },
  ],
  summary: {
    totalLinesOfCode: 100,
    totalComments: 10,
    totalFunctions: 4,
    totalClasses: 0,
    totalImports: 3,
    totalExports: 3,
    totalTodoFixmes: 0,
    averageFileSize: 20,
    largestFiles: [],
    mostConnected: [],
  },
  smart: {
    commands: [
      { name: 'dev', command: 'npm run dev' },
      { name: 'test', command: 'npm run test' },
    ],
    envVars: [],
    conventions: ['TypeScript strict mode is enabled - no `any` types'],
    knownIssues: [],
    criticalFiles: [{ path: 'src/lib/auth.ts', reason: 'Auth logic' }],
    gotchas: ['Use next/navigation, not next/router'],
    dependencies: [],
    importPattern: 'esm',
    namingConventions: ['Functions use camelCase'],
    testingInfo: { hasTests: true, framework: 'vitest', command: 'npm test' },
  },
};

describe('daily workflow helpers', () => {
  it('renders paste-ready project context', () => {
    const context = renderProjectContext(bundle);

    expect(context).toContain('Project Context');
    expect(context).toContain('Next.js');
    expect(context).toContain('src/lib/auth.ts');
    expect(context).toContain('npm run test');
  });

  it('renders a project-aware prompt with related files', () => {
    const result = renderSmartPrompt(bundle, 'add login flow');

    expect(result.prompt).toContain('Project-Aware AI Coding Prompt');
    expect(result.prompt).toContain('add login flow');
    expect(result.prompt).toContain('Detected Intent');
    expect(result.prompt).toContain('Likely Files To Create Or Update');
    expect(result.prompt).toContain('Verification Plan');
    expect(result.prompt).toContain('src/lib/auth.ts');
    expect(result.plan.intent.id).toBe('auth');
    expect(result.relatedFiles).toContain('src/lib/auth.ts');
  });

  it('prioritizes implementation files over unrelated tests for auth prompts', () => {
    const result = renderSmartPrompt(bundle, 'add user authentication');

    expect(result.relatedFiles.slice(0, 4)).toContain('src/lib/auth.ts');
    expect(result.relatedFiles.slice(0, 4)).toContain('src/app/api/auth/route.ts');
    expect(result.relatedFiles.indexOf('tests/smartContext.test.ts')).toBe(-1);
    expect(result.prompt).toContain('Do not store raw passwords');
  });

  it('returns a warning when quick check runs outside git', () => {
    const result = runQuickCheck('/definitely/not/a/git/repo');

    expect(result.score).toBe(0);
    expect(result.issues[0].message).toMatch(/git repository/i);
  });
});
