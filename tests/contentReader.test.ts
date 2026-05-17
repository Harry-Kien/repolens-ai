import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { findRelatedByContent, readCodeContents, summarizeContents } from '../src/core/contentReader.js';

function makeTempRepo(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeTempRepo(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('contentReader', () => {
  it('reads code files and extracts structure', async () => {
    const cwd = makeTempRepo('repolens-content-');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'README.md'), '# Not code');
    fs.writeFileSync(
      path.join(cwd, 'src', 'auth.ts'),
      [
        "import { db } from './db.js';",
        '// TODO: add lockout after repeated failures',
        'export class AuthService {}',
        'export async function loginUser() { return db; }',
      ].join('\n'),
    );

    const files = await readCodeContents(cwd);
    const authFile = files.find((file) => file.path === 'src/auth.ts');

    expect(authFile).toBeDefined();
    expect(authFile?.imports).toContain("import { db } from './db.js';");
    expect(authFile?.classes).toContain('AuthService');
    expect(authFile?.functions).toContain('loginUser');
    expect(authFile?.todoFixmes[0].text).toContain('lockout');
    expect(files.some((file) => file.path === 'README.md')).toBe(false);

    removeTempRepo(cwd);
  });

  it('summarizes content and finds related files', async () => {
    const cwd = makeTempRepo('repolens-content-summary-');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'billing.ts'), 'export function createInvoice() { return "ok"; }');
    fs.writeFileSync(path.join(cwd, 'src', 'auth.ts'), 'export function login() { return true; }');

    const files = await readCodeContents(cwd);
    const summary = summarizeContents(files);
    const related = findRelatedByContent(files, 'invoice');

    expect(summary.totalFunctions).toBe(2);
    expect(summary.largestFiles.length).toBeGreaterThan(0);
    expect(related[0].path).toBe('src/billing.ts');

    removeTempRepo(cwd);
  });

  it('skips files over the configured size limit', async () => {
    const cwd = makeTempRepo('repolens-content-large-');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'small.ts'), 'export function ok() {}');
    fs.writeFileSync(path.join(cwd, 'src', 'large.ts'), `export const large = "${'x'.repeat(210_000)}";`);

    const files = await readCodeContents(cwd);

    expect(files.some((file) => file.path === 'src/small.ts')).toBe(true);
    expect(files.some((file) => file.path === 'src/large.ts')).toBe(false);

    removeTempRepo(cwd);
  });
});
