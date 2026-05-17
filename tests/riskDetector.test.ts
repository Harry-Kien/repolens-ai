import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { detectRisks } from '../src/core/riskDetector.js';

function makeTempRepo(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeTempRepo(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('detectRisks', () => {
  it('detects real .env files but allows examples', async () => {
    const cwd = makeTempRepo('repolens-risk-env-');
    fs.writeFileSync(path.join(cwd, 'README.md'), '# Test');
    fs.mkdirSync(path.join(cwd, 'tests'));
    fs.writeFileSync(path.join(cwd, '.env'), 'SECRET_KEY=real-secret');
    fs.writeFileSync(path.join(cwd, '.env.example'), 'SECRET_KEY=');

    const report = await detectRisks(cwd);

    expect(report.risks.some((risk) => risk.file === '.env' && risk.level === 'high')).toBe(true);
    expect(report.risks.some((risk) => risk.file === '.env.example')).toBe(false);

    removeTempRepo(cwd);
  });

  it('detects hardcoded secrets in source files', async () => {
    const cwd = makeTempRepo('repolens-risk-secret-');
    fs.writeFileSync(path.join(cwd, 'README.md'), '# Test');
    fs.mkdirSync(path.join(cwd, 'tests'));
    fs.mkdirSync(path.join(cwd, 'src'));
    fs.writeFileSync(path.join(cwd, 'src', 'config.ts'), 'export const access_token = "abcdefghijklmnop";');

    const report = await detectRisks(cwd);

    expect(report.summary.high).toBeGreaterThan(0);
    expect(report.risks.some((risk) => risk.file === 'src/config.ts')).toBe(true);

    removeTempRepo(cwd);
  });

  it('reports missing README and tests as actionable risks', async () => {
    const cwd = makeTempRepo('repolens-risk-missing-');
    fs.mkdirSync(path.join(cwd, 'src'));
    fs.writeFileSync(path.join(cwd, 'src', 'index.ts'), 'export function ok() { return true; }');

    const report = await detectRisks(cwd);

    expect(report.risks.some((risk) => risk.message.includes('No README'))).toBe(true);
    expect(report.risks.some((risk) => risk.message.includes('No test files'))).toBe(true);

    removeTempRepo(cwd);
  });
});
