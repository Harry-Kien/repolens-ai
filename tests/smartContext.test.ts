import { describe, it, expect } from 'vitest';
import { extractSmartContext, generateSmartAgentsMd } from '../src/core/smartContext.js';
import type { ScanResult } from '../src/core/repoScanner.js';
import type { FrameworkInfo } from '../src/core/frameworkDetector.js';
import type { ArchitectureResult } from '../src/core/architectureAnalyzer.js';
import type { FileContent, ContentSummary } from '../src/core/contentReader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ─── Test fixtures ──────────────────────────────────────

const mockFw: FrameworkInfo = {
  framework: 'Next.js',
  language: 'TypeScript',
  packageManager: 'npm',
  confidence: 'high',
  version: '15',
  additionalFrameworks: ['React', 'Tailwind'],
};

const mockArch: ArchitectureResult = {
  style: 'Component-based',
  layers: [],
  dataFlow: ['User → Page → API Route → Database'],
  weakPoints: ['No test files detected'],
  suggestions: [],
};

const mockScan: ScanResult = {
  cwd: '/test',
  totalFiles: 50,
  filesByExtension: { '.ts': 30, '.tsx': 15, '.css': 5 },
  fileTree: ['src/app/page.tsx', 'src/lib/db.ts'],
  importantFiles: ['package.json'],
  directories: ['src', 'src/app', 'src/lib', 'src/components', 'public'],
  estimatedLinesOfCode: 5000,
  languages: ['TypeScript'],
  hasGit: true,
  hasReadme: true,
  hasTests: false,
  hasDocker: false,
  hasCiCd: false,
};

const mockFiles: FileContent[] = [
  {
    path: 'src/app/page.tsx',
    content: 'import { getData } from "../lib/db"',
    lines: 30,
    imports: ['import { getData } from "../lib/db.js"'],
    exports: ['export default function Page()'],
    functions: ['Page', 'getData'],
    classes: [],
    comments: [],
    todoFixmes: [],
  },
  {
    path: 'src/lib/db.ts',
    content: 'import { prisma } from "./prisma"',
    lines: 50,
    imports: ['import { prisma } from "./prisma"', 'import { z } from "zod"'],
    exports: ['export function getData()'],
    functions: ['getData', 'createUser'],
    classes: [],
    comments: [],
    todoFixmes: [{ line: 15, text: 'TODO: Add pagination' }],
  },
];

const mockSummary: ContentSummary = {
  totalLinesOfCode: 500,
  totalComments: 20,
  totalFunctions: 10,
  totalClasses: 0,
  totalImports: 30,
  totalExports: 15,
  totalTodoFixmes: 1,
  averageFileSize: 50,
  largestFiles: [{ path: 'src/lib/db.ts', lines: 50 }],
  mostConnected: [
    { path: 'src/lib/db.ts', imports: 5 },
    { path: 'src/app/page.tsx', imports: 3 },
  ],
};

// ─── Tests ──────────────────────────────────────────────

describe('extractSmartContext', () => {
  it('extracts commands from package.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-smart-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { dev: 'next dev', build: 'next build', test: 'vitest' },
      dependencies: { next: '^15.0.0', react: '^19.0.0' },
      devDependencies: { vitest: '^2.0.0' },
    }));

    const ctx = extractSmartContext(tmpDir, mockScan, mockFw, mockArch, mockFiles, mockSummary);

    expect(ctx.commands.length).toBeGreaterThanOrEqual(3);
    expect(ctx.commands.some(c => c.name === 'dev')).toBe(true);
    expect(ctx.commands.some(c => c.name === 'build')).toBe(true);
    expect(ctx.testingInfo.framework).toBe('vitest');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('extracts env vars from .env.example', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-env-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"scripts":{}}');
    fs.writeFileSync(path.join(tmpDir, '.env.example'), `DATABASE_URL=
API_KEY=your-key-here # Your API key
PORT=3000
`);

    const ctx = extractSmartContext(tmpDir, mockScan, mockFw, mockArch, mockFiles, mockSummary);

    expect(ctx.envVars.length).toBe(3);
    expect(ctx.envVars.find(v => v.name === 'DATABASE_URL')).toBeDefined();
    expect(ctx.envVars.find(v => v.name === 'API_KEY')).toBeDefined();

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('detects TODO/FIXME as known issues', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-todo-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"scripts":{}}');

    const ctx = extractSmartContext(tmpDir, mockScan, mockFw, mockArch, mockFiles, mockSummary);

    expect(ctx.knownIssues.length).toBe(1);
    expect(ctx.knownIssues[0]).toContain('pagination');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('detects naming conventions from function names', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-naming-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"scripts":{}}');

    const ctx = extractSmartContext(tmpDir, mockScan, mockFw, mockArch, mockFiles, mockSummary);

    expect(ctx.namingConventions.length).toBeGreaterThan(0);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('finds critical files by connectivity', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-crit-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"scripts":{}}');

    const ctx = extractSmartContext(tmpDir, mockScan, mockFw, mockArch, mockFiles, mockSummary);

    expect(ctx.criticalFiles.length).toBeGreaterThan(0);
    expect(ctx.criticalFiles.some(f => f.path === 'src/lib/db.ts')).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('generateSmartAgentsMd', () => {
  it('generates valid AGENTS.md with project-specific content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-gen-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { dev: 'next dev', build: 'next build' },
      dependencies: { next: '^15.0.0' },
    }));

    const ctx = extractSmartContext(tmpDir, mockScan, mockFw, mockArch, mockFiles, mockSummary);
    const md = generateSmartAgentsMd(mockFw, mockArch, mockScan, mockSummary, ctx);

    expect(md).toContain('# AGENTS.md');
    expect(md).toContain('Next.js');
    expect(md).toContain('TypeScript');
    expect(md).toContain('npm run');
    expect(md).toContain('Key Structure');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('includes environment variables when present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-envgen-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"scripts":{}}');
    fs.writeFileSync(path.join(tmpDir, '.env.example'), 'DATABASE_URL=\nSECRET_KEY=');

    const ctx = extractSmartContext(tmpDir, mockScan, mockFw, mockArch, mockFiles, mockSummary);
    const md = generateSmartAgentsMd(mockFw, mockArch, mockScan, mockSummary, ctx);

    expect(md).toContain('Environment Variables');
    expect(md).toContain('DATABASE_URL');

    fs.rmSync(tmpDir, { recursive: true });
  });
});
