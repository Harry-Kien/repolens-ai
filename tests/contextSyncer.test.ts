import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createSyncPlan, executeSyncPlan } from '../src/core/contextSyncer.js';
import type { ContextFile } from '../src/core/contextScorer.js';

const SAMPLE_AGENTS = `# AGENTS.md

> Instructions for AI coding agents.

## Project Overview
- **Framework:** Next.js
- **Language:** TypeScript

## Commands
- **Build:** \`npm run build\`

## Gotchas
- Always use \`normalizePath()\` because fast-glob has issues on Windows.
`;

describe('createSyncPlan', () => {
  it('creates sync plan with 6 targets from AGENTS.md', () => {
    const source: ContextFile = {
      type: 'agents',
      path: 'AGENTS.md',
      content: SAMPLE_AGENTS,
      exists: true,
    };

    const plan = createSyncPlan(source, [], '/test-project');

    expect(plan.targets.length).toBe(6);
    expect(plan.targets.map(t => t.type)).toContain('claude');
    expect(plan.targets.map(t => t.type)).toContain('mdc');
    expect(plan.targets.map(t => t.type)).toContain('cursorrules');
    expect(plan.targets.map(t => t.type)).toContain('copilot');
    expect(plan.targets.map(t => t.type)).toContain('windsurf');
    expect(plan.targets.map(t => t.type)).toContain('codex');
  });

  it('generates correct CLAUDE.md content', () => {
    const source: ContextFile = { type: 'agents', path: 'AGENTS.md', content: SAMPLE_AGENTS, exists: true };
    const plan = createSyncPlan(source, [], '/test');
    const claude = plan.targets.find(t => t.type === 'claude');

    expect(claude).toBeDefined();
    expect(claude!.content).toContain('# CLAUDE.md');
    expect(claude!.content).toContain('RepoLens AI');
    expect(claude!.content).toContain('normalizePath');
  });

  it('generates .mdc with YAML frontmatter', () => {
    const source: ContextFile = { type: 'agents', path: 'AGENTS.md', content: SAMPLE_AGENTS, exists: true };
    const plan = createSyncPlan(source, [], '/my-project');
    const mdc = plan.targets.find(t => t.type === 'mdc');

    expect(mdc).toBeDefined();
    expect(mdc!.content).toMatch(/^---/);
    expect(mdc!.content).toContain('description:');
    expect(mdc!.content).toContain('alwaysApply: true');
    expect(mdc!.content).toContain('my-project');
  });

  it('rejects non-AGENTS.md as source', () => {
    const source: ContextFile = { type: 'claude', path: 'CLAUDE.md', content: '# Claude', exists: true };
    const plan = createSyncPlan(source, [], '/test');
    
    expect(plan.targets.length).toBe(0);
    expect(plan.conflicts.length).toBe(1);
  });

  it('detects manual edits as conflicts', () => {
    const source: ContextFile = { type: 'agents', path: 'AGENTS.md', content: SAMPLE_AGENTS, exists: true };
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-sync-'));
    
    // Create a CLAUDE.md with manual edits (no "RepoLens AI" marker)
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My manual Claude rules');
    
    const existing: ContextFile = { type: 'claude', path: 'CLAUDE.md', content: '# My manual Claude rules', exists: true };
    const plan = createSyncPlan(source, [existing], tmpDir);
    
    expect(plan.conflicts.length).toBeGreaterThan(0);
    
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('executeSyncPlan', () => {
  it('writes target files to disk', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-exec-'));
    const source: ContextFile = { type: 'agents', path: 'AGENTS.md', content: SAMPLE_AGENTS, exists: true };
    const plan = createSyncPlan(source, [], tmpDir);

    // Force all to create
    for (const t of plan.targets) t.action = 'create';

    const result = executeSyncPlan(plan, tmpDir);

    expect(result.written.length).toBe(6);
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.windsurfrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'CODEX.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'project.mdc'))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('skips files marked as skip', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-skip-'));
    const source: ContextFile = { type: 'agents', path: 'AGENTS.md', content: SAMPLE_AGENTS, exists: true };
    const plan = createSyncPlan(source, [], tmpDir);

    // Set all to skip
    for (const t of plan.targets) t.action = 'skip';

    const result = executeSyncPlan(plan, tmpDir);

    expect(result.written.length).toBe(0);
    expect(result.skipped.length).toBe(6);

    fs.rmSync(tmpDir, { recursive: true });
  });
});
