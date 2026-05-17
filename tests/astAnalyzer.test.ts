import { describe, it, expect, beforeAll } from 'vitest';
import { analyzeAST, type ASTInsight } from '../src/core/astAnalyzer.js';
import * as path from 'node:path';

/**
 * AST Analyzer tests — runs analysis ONCE and shares results.
 * analyzeAST is expensive (~5-10s) so we cache the result.
 */
describe('astAnalyzer', () => {
  const cwd = path.resolve(__dirname, '..');
  let result: ASTInsight;

  beforeAll(() => {
    result = analyzeAST(cwd);
  }, 120_000); // AST analysis can take 30-60s on larger codebases

  it('analyzes the RepoLens project itself', () => {
    expect(result).toBeDefined();
    expect(result.summary.totalFiles).toBeGreaterThan(5);
    expect(result.summary.totalFunctions).toBeGreaterThan(10);
    expect(result.dependencyGraph.length).toBeGreaterThan(0);
    expect(result.fileMetrics.length).toBeGreaterThan(0);
  });

  it('detects dependency graph edges', () => {
    const edges = result.dependencyGraph;
    // cli.ts imports from commands — should be in graph
    const cliEdges = edges.filter(e => e.from.includes('cli.ts'));
    expect(cliEdges.length).toBeGreaterThan(0);
  });

  it('extracts public API entries', () => {
    const api = result.publicAPI;
    expect(api.length).toBeGreaterThan(5);
    expect(api.some(a => a.kind === 'function')).toBe(true);
    expect(api.some(a => a.kind === 'interface')).toBe(true);
  });

  it('analyzes naming conventions', () => {
    const naming = result.namingAnalysis;
    expect(naming.functions.camelCase).toBeGreaterThan(0);
    expect(naming.dominant.functions).toBe('camelCase');
  });

  it('produces file metrics for each source file', () => {
    for (const metric of result.fileMetrics) {
      expect(metric.path).toBeDefined();
      expect(metric.lines).toBeGreaterThan(0);
      expect(metric.imports).toBeGreaterThanOrEqual(0);
    }
  });

  it('calculates complexity for functions', () => {
    if (result.complexFunctions.length > 0) {
      expect(result.complexFunctions[0].complexity).toBeGreaterThan(1);
      expect(result.complexFunctions[0].file).toBeDefined();
      expect(result.complexFunctions[0].name).toBeDefined();
    }
  });

  it('computes summary statistics', () => {
    const summary = result.summary;
    expect(summary.totalFiles).toBeGreaterThan(0);
    expect(summary.avgComplexity).toBeGreaterThanOrEqual(0);
    expect(summary.documentedPercentage).toBeGreaterThanOrEqual(0);
    expect(summary.documentedPercentage).toBeLessThanOrEqual(100);
  });
});
