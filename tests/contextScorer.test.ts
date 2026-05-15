import { describe, it, expect } from 'vitest';
import {
  scoreContextFile,
  getGrade,
  getScoreColor,
  detectContextFiles,
} from '../src/core/contextScorer.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('scoreContextFile', () => {
  it('scores empty content very low', () => {
    const result = scoreContextFile('', []);
    expect(result.overall).toBeLessThan(30);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('detects generic rules and penalizes them', () => {
    const genericContent = `# AGENTS.md
## Security Rules
- Never commit secrets
- Validate all input
- No eval()
- Never trust user input
- Use parameterized queries
`;
    const result = scoreContextFile(genericContent, []);
    expect(result.genericRulesCount).toBeGreaterThanOrEqual(4);
    expect(result.breakdown.specificity).toBeLessThan(50);
  });

  it('rewards specific tribal knowledge', () => {
    const specificContent = `# AGENTS.md
## Project Overview
- **Framework:** Next.js 15
- **Language:** TypeScript

## Commands
- **Build:** \`npm run build\`
- **Test:** \`npx vitest\`

## Gotchas & Known Issues
- The \`contentReader.ts\` module caps at 500 files because we decided
  to avoid memory issues on large repos. Do NOT remove this limit.
- Always use \`normalizePath()\` from \`utils/paths.ts\` instead of
  raw path.join on Windows — there's a bug in fast-glob with backslashes.
- Reporter output MUST go through \`utils/logger.ts\` — do NOT use
  console.log directly, it breaks the ora spinner rendering.

## Conventions
- All imports use \`.js\` extension (ESM requirement with TypeScript)
- Error handling: wrap in try/catch, show user-friendly message via \`logger.error()\`
`;
    const result = scoreContextFile(specificContent, ['contentReader.ts', 'logger.ts', 'paths.ts']);
    expect(result.breakdown.tribalKnowledge).toBeGreaterThan(50);
    expect(result.specificRulesCount).toBeGreaterThan(0);
    expect(result.overall).toBeGreaterThan(60);
  });

  it('penalizes very long files', () => {
    const longContent = '# AGENTS.md\n' + '- Rule line\n'.repeat(600);
    const result = scoreContextFile(longContent, []);
    expect(result.breakdown.conciseness).toBeLessThanOrEqual(20);
    expect(result.issues.some(i => i.severity === 'error')).toBe(true);
  });

  it('rewards freshness when referencing real project files', () => {
    const content = `# AGENTS.md
## Critical Files
- \`cli.ts\` is the entry point
- \`repoScanner.ts\` handles file scanning
- \`contextScorer.ts\` scores quality
`;
    const projectFiles = ['src/cli.ts', 'src/core/repoScanner.ts', 'src/core/contextScorer.ts', 'src/core/riskDetector.ts'];
    const result = scoreContextFile(content, projectFiles);
    expect(result.breakdown.freshness).toBeGreaterThan(30);
  });

  it('scores all 5 dimensions', () => {
    const result = scoreContextFile('# AGENTS.md\n## Test\n- test', []);
    expect(result.breakdown).toHaveProperty('specificity');
    expect(result.breakdown).toHaveProperty('coverage');
    expect(result.breakdown).toHaveProperty('conciseness');
    expect(result.breakdown).toHaveProperty('freshness');
    expect(result.breakdown).toHaveProperty('tribalKnowledge');
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});

describe('getGrade', () => {
  it('returns correct grades', () => {
    expect(getGrade(95)).toBe('A+');
    expect(getGrade(85)).toBe('A');
    expect(getGrade(75)).toBe('B');
    expect(getGrade(65)).toBe('C');
    expect(getGrade(55)).toBe('D');
    expect(getGrade(30)).toBe('F');
  });
});

describe('getScoreColor', () => {
  it('returns green for high scores', () => {
    expect(getScoreColor(80)).toBe('green');
  });
  it('returns yellow for medium scores', () => {
    expect(getScoreColor(50)).toBe('yellow');
  });
  it('returns red for low scores', () => {
    expect(getScoreColor(20)).toBe('red');
  });
});

describe('detectContextFiles', () => {
  it('detects files in a directory with AGENTS.md', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-test-'));
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# Test AGENTS.md');
    
    const files = detectContextFiles(tmpDir);
    const agents = files.find(f => f.type === 'agents');
    
    expect(agents).toBeDefined();
    expect(agents!.exists).toBe(true);
    expect(agents!.content).toContain('# Test AGENTS.md');
    
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns exists=false for missing files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repolens-test-'));
    
    const files = detectContextFiles(tmpDir);
    const agents = files.find(f => f.type === 'agents');
    
    expect(agents).toBeDefined();
    expect(agents!.exists).toBe(false);
    
    fs.rmSync(tmpDir, { recursive: true });
  });
});
