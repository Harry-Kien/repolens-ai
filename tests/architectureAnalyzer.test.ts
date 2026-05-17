import { describe, expect, it } from 'vitest';
import { analyzeArchitecture } from '../src/core/architectureAnalyzer.js';
import type { FileCategory } from '../src/core/fileClassifier.js';

function emptyCategories(): Record<FileCategory, string[]> {
  return Object.fromEntries(
    ([
      'controller', 'service', 'model', 'route', 'view', 'component',
      'test', 'config', 'migration', 'middleware', 'util', 'type',
      'static', 'documentation', 'script', 'command', 'unknown',
    ] as FileCategory[]).map((category) => [category, []]),
  ) as Record<FileCategory, string[]>;
}

describe('analyzeArchitecture', () => {
  it('does not report missing type definitions for typed TypeScript sources', () => {
    const cats = emptyCategories();
    cats.command = ['src/cli.ts', 'src/commands/setup.ts'];
    cats.service = ['src/core/astAnalyzer.ts', 'src/core/contextScorer.ts'];
    cats.util = ['src/utils/errors.ts'];
    cats.config = ['tsconfig.json'];
    cats.documentation = ['README.md'];
    cats.test = ['tests/architectureAnalyzer.test.ts'];

    const result = analyzeArchitecture(cats, 'Node.js');

    expect(result.weakPoints).not.toContain('No type definitions — lack of type safety');
    expect(result.suggestions).not.toContain('Add TypeScript interfaces or type definitions');
  });
});
