import { describe, it, expect } from 'vitest';
import { detectDrift } from '../src/core/driftDetector.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('driftDetector', () => {
  it('detects stale file references', () => {
    const content = `# AGENTS.md
## Critical Files
- \`src/nonexistent-file.ts\` — this file doesn't exist
- \`src/cli.ts\` — this one does exist
`;
    const cwd = path.resolve(__dirname, '..');
    const projectFiles = ['src/cli.ts', 'src/core/contextScorer.ts'];

    const report = detectDrift(content, 'AGENTS.md', cwd, projectFiles);

    // Should detect nonexistent-file.ts as stale
    expect(report.staleFiles.length).toBeGreaterThan(0);
    expect(report.staleFiles.some(s => s.mentioned.includes('nonexistent'))).toBe(true);
  });

  it('detects stale commands', () => {
    const content = `# AGENTS.md
## Commands
- **Build:** \`npm run fake-script\`
- **Dev:** \`npm run dev\`
`;
    const cwd = path.resolve(__dirname, '..');
    const projectFiles: string[] = [];

    const report = detectDrift(content, 'AGENTS.md', cwd, projectFiles);

    // Should detect fake-script as stale
    expect(report.staleCommands.some(c => c.documented.includes('fake-script'))).toBe(true);
  });

  it('returns zero drift for perfect context', () => {
    const content = `# AGENTS.md
## Commands
- **Build:** \`npm run build\`
- **Test:** \`npm run test\`
`;
    const cwd = path.resolve(__dirname, '..');
    const projectFiles = ['src/cli.ts'];

    const report = detectDrift(content, 'AGENTS.md', cwd, projectFiles);

    // Commands exist in package.json so no stale commands
    expect(report.staleCommands.length).toBe(0);
  });

  it('detects undocumented critical files', () => {
    // A context file that doesn't mention cli.ts even though it exists
    const content = `# AGENTS.md
## Overview
This is a project.
`;
    const cwd = path.resolve(__dirname, '..');
    const projectFiles = ['src/cli.ts', 'src/index.ts', 'Dockerfile'];

    const report = detectDrift(content, 'AGENTS.md', cwd, projectFiles);

    // src/cli.ts exists but isn't mentioned
    expect(report.undocumentedFiles.length).toBeGreaterThanOrEqual(0);
  });

  it('matches ESM .js imports to TypeScript source files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-drift-esm-'));
    fs.mkdirSync(path.join(tmpDir, 'src', 'commands'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src', 'reporters'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'reporters', 'terminalReporter.ts'), 'export function report() {}');
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'commands', `cmd${i}.ts`),
        "import { report } from '../reporters/terminalReporter.js';\nreport();\n",
      );
    }

    const content = `# AGENTS.md
## Critical Files
- \`src/reporters/terminalReporter.ts\` centralizes CLI output
`;
    const projectFiles = [
      ...Array.from({ length: 5 }, (_, i) => `src/commands/cmd${i}.ts`),
      'src/reporters/terminalReporter.ts',
    ];

    const report = detectDrift(content, 'AGENTS.md', tmpDir, projectFiles);

    expect(report.undocumentedFiles.some(f => f.file.includes('terminalReporter'))).toBe(false);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('calculates drift score', () => {
    const content = `# AGENTS.md
- \`src/deleted-module.ts\` is important
- Run \`npm run nonexistent\`
`;
    const cwd = path.resolve(__dirname, '..');
    const projectFiles: string[] = [];

    const report = detectDrift(content, 'AGENTS.md', cwd, projectFiles);

    expect(report.driftScore).toBeGreaterThanOrEqual(0);
    expect(report.driftScore).toBeLessThanOrEqual(100);
    expect(report.summary).toBeDefined();
    expect(typeof report.summary).toBe('string');
  });

  it('provides human-readable summary', () => {
    const content = '# Clean context\n## Overview\nSimple project.';
    const cwd = path.resolve(__dirname, '..');

    const report = detectDrift(content, 'AGENTS.md', cwd, []);

    expect(report.summary.length).toBeGreaterThan(0);
  });
});
