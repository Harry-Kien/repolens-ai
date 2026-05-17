import { Project, SyntaxKind, SourceFile, Node } from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { logger } from '../utils/logger.js';
import { safely } from '../utils/errors.js';

/**
 * AST-Powered Code Intelligence Engine.
 *
 * Unlike regex-based analysis (which guesses), this module uses
 * TypeScript's actual compiler to understand code structure:
 *
 * - Real dependency graph (not just import counting)
 * - Circular dependency detection (actual gotcha for devs)
 * - Cyclomatic complexity per function
 * - Unused exports (dead code)
 * - True naming convention analysis
 * - Public API surface extraction
 *
 * This is RepoLens AI's core differentiator — no other context
 * quality tool does AST-level analysis.
 */

// ─── Types ──────────────────────────────────────────────

export interface ASTInsight {
  dependencyGraph: DependencyEdge[];
  circularDeps: [string, string][];
  publicAPI: APIEntry[];
  complexFunctions: ComplexFunction[];
  unusedExports: UnusedExport[];
  namingAnalysis: NamingAnalysis;
  fileMetrics: FileMetric[];
  summary: ASTSummary;
}

export interface DependencyEdge {
  from: string;
  to: string;
  imports: string[];
}

export interface APIEntry {
  file: string;
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'enum';
  params?: string[];
  returnType?: string;
  isAsync: boolean;
  jsdoc?: string;
}

export interface ComplexFunction {
  file: string;
  name: string;
  complexity: number;
  lines: number;
  hasJSDoc: boolean;
}

export interface UnusedExport {
  file: string;
  name: string;
  kind: string;
}

export interface NamingAnalysis {
  functions: { camelCase: number; snake_case: number; PascalCase: number; other: number };
  variables: { camelCase: number; snake_case: number; UPPER_CASE: number; other: number };
  types: { PascalCase: number; other: number };
  dominant: { functions: string; variables: string; types: string };
}

export interface FileMetric {
  path: string;
  lines: number;
  functions: number;
  classes: number;
  imports: number;
  exports: number;
  complexity: number;
  hasTests: boolean;
}

export interface ASTSummary {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  totalInterfaces: number;
  totalTypes: number;
  avgComplexity: number;
  maxComplexity: { file: string; name: string; value: number };
  circularDepCount: number;
  unusedExportCount: number;
  documentedPercentage: number;
}

// ─── Constants ──────────────────────────────────────────

const MAX_FILES = 300;
const MAX_FILE_SIZE = 200_000; // 200KB

// ─── Main Analysis ──────────────────────────────────────

/**
 * Perform deep AST analysis on a TypeScript/JavaScript project.
 */
export function analyzeAST(cwd: string): ASTInsight {
  const tsConfigPath = path.join(cwd, 'tsconfig.json');
  const hasTsConfig = fs.existsSync(tsConfigPath);

  let project: Project;

  if (hasTsConfig) {
    project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });
  } else {
    project = new Project({
      compilerOptions: {
        allowJs: true,
        checkJs: false,
        target: 99, // ESNext
        module: 99,  // ESNext
      },
    });
  }

  // Find and add source files
  const sourcePatterns = [
    'src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx',
    'lib/**/*.ts', 'app/**/*.ts', 'app/**/*.tsx',
    'pages/**/*.ts', 'pages/**/*.tsx',
    'server/**/*.ts', 'api/**/*.ts',
    '*.ts', '*.js',
  ];

  const addedFiles = new Set<string>();

  for (const pattern of sourcePatterns) {
    try {
      const files = project.addSourceFilesAtPaths(path.join(cwd, pattern));
      for (const f of files) {
        const relPath = path.relative(cwd, f.getFilePath()).replace(/\\/g, '/');
        // Skip node_modules, dist, tests in main analysis
        if (relPath.includes('node_modules') || relPath.includes('dist/') || relPath.includes('.d.ts')) {
          project.removeSourceFile(f);
          continue;
        }
        addedFiles.add(relPath);
      }
    } catch {
      // Pattern might not match anything
    }

    if (addedFiles.size >= MAX_FILES) break;
  }

  const sourceFiles = project.getSourceFiles().slice(0, MAX_FILES);

  // Run analyses
  const dependencyGraph = buildDependencyGraph(sourceFiles, cwd);
  const circularDeps = detectCircularDeps(dependencyGraph);
  const publicAPI = extractPublicAPI(sourceFiles, cwd);
  const complexFunctions = analyzeComplexity(sourceFiles, cwd);
  const namingAnalysis = analyzeNaming(sourceFiles);
  const fileMetrics = buildFileMetrics(sourceFiles, cwd);

  // Unused exports (only for non-entry-point files)
  const unusedExports = findUnusedExports(sourceFiles, cwd);

  // Summary
  const allComplexities = complexFunctions.map(f => f.complexity);
  const maxComplex = complexFunctions.sort((a, b) => b.complexity - a.complexity)[0];
  const documented = publicAPI.filter(a => a.jsdoc).length;

  const summary: ASTSummary = {
    totalFiles: sourceFiles.length,
    totalFunctions: fileMetrics.reduce((s, f) => s + f.functions, 0),
    totalClasses: fileMetrics.reduce((s, f) => s + f.classes, 0),
    totalInterfaces: publicAPI.filter(a => a.kind === 'interface').length,
    totalTypes: publicAPI.filter(a => a.kind === 'type').length,
    avgComplexity: allComplexities.length > 0
      ? Math.round((allComplexities.reduce((a, b) => a + b, 0) / allComplexities.length) * 10) / 10
      : 0,
    maxComplexity: maxComplex
      ? { file: maxComplex.file, name: maxComplex.name, value: maxComplex.complexity }
      : { file: '', name: '', value: 0 },
    circularDepCount: circularDeps.length,
    unusedExportCount: unusedExports.length,
    documentedPercentage: publicAPI.length > 0
      ? Math.round((documented / publicAPI.length) * 100)
      : 0,
  };

  return {
    dependencyGraph,
    circularDeps,
    publicAPI,
    complexFunctions,
    unusedExports,
    namingAnalysis,
    fileMetrics,
    summary,
  };
}

// ─── Dependency Graph ───────────────────────────────────

function buildDependencyGraph(files: SourceFile[], cwd: string): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const file of files) {
    const filePath = path.relative(cwd, file.getFilePath()).replace(/\\/g, '/');
    const imports = file.getImportDeclarations();

    for (const imp of imports) {
      const moduleSpec = imp.getModuleSpecifierValue();
      // Only track local imports (not node_modules)
      if (!moduleSpec.startsWith('.') && !moduleSpec.startsWith('/')) continue;

      const namedImports = imp.getNamedImports().map(n => n.getName());
      const defaultImport = imp.getDefaultImport()?.getText();
      const allImports = defaultImport ? [defaultImport, ...namedImports] : namedImports;

      // Resolve the target file
      const resolvedModule = safely(() => {
        const sourceFile = imp.getModuleSpecifierSourceFile();
        return sourceFile
          ? path.relative(cwd, sourceFile.getFilePath()).replace(/\\/g, '/')
          : moduleSpec;
      }, moduleSpec, 'resolveImport');

      edges.push({
        from: filePath,
        to: resolvedModule,
        imports: allImports,
      });
    }
  }

  return edges;
}

function detectCircularDeps(edges: DependencyEdge[]): [string, string][] {
  const graph = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!graph.has(edge.from)) graph.set(edge.from, new Set());
    graph.get(edge.from)!.add(edge.to);
  }

  const circular: [string, string][] = [];
  const seen = new Set<string>();

  for (const [from, tos] of graph) {
    for (const to of tos) {
      const key = [from, to].sort().join('↔');
      if (!seen.has(key) && graph.get(to)?.has(from)) {
        circular.push([from, to]);
        seen.add(key);
      }
    }
  }

  return circular;
}

// ─── Public API Extraction ──────────────────────────────

function extractPublicAPI(files: SourceFile[], cwd: string): APIEntry[] {
  const api: APIEntry[] = [];

  for (const file of files) {
    const filePath = path.relative(cwd, file.getFilePath()).replace(/\\/g, '/');

    // Exported functions
    for (const fn of file.getFunctions()) {
      if (!fn.isExported()) continue;
      const name = fn.getName();
      if (!name) continue;

      api.push({
        file: filePath,
        name,
        kind: 'function',
        params: fn.getParameters().map(p => `${p.getName()}: ${safely(() => p.getType().getText(p), 'unknown', 'paramType')}`),
        returnType: safely(() => fn.getReturnType().getText(fn), undefined, 'returnType'),
        isAsync: fn.isAsync(),
        jsdoc: fn.getJsDocs()[0]?.getDescription()?.trim() || undefined,
      });
    }

    // Exported classes
    for (const cls of file.getClasses()) {
      if (!cls.isExported()) continue;
      const name = cls.getName();
      if (!name) continue;

      api.push({
        file: filePath,
        name,
        kind: 'class',
        isAsync: false,
        jsdoc: cls.getJsDocs()[0]?.getDescription()?.trim() || undefined,
      });
    }

    // Exported interfaces
    for (const iface of file.getInterfaces()) {
      if (!iface.isExported()) continue;
      api.push({
        file: filePath,
        name: iface.getName(),
        kind: 'interface',
        isAsync: false,
        jsdoc: iface.getJsDocs()[0]?.getDescription()?.trim() || undefined,
      });
    }

    // Exported type aliases
    for (const ta of file.getTypeAliases()) {
      if (!ta.isExported()) continue;
      api.push({
        file: filePath,
        name: ta.getName(),
        kind: 'type',
        isAsync: false,
        jsdoc: ta.getJsDocs()[0]?.getDescription()?.trim() || undefined,
      });
    }

    // Exported enums
    for (const en of file.getEnums()) {
      if (!en.isExported()) continue;
      api.push({
        file: filePath,
        name: en.getName(),
        kind: 'enum',
        isAsync: false,
      });
    }
  }

  return api;
}

// ─── Complexity Analysis ────────────────────────────────

function analyzeComplexity(files: SourceFile[], cwd: string): ComplexFunction[] {
  const results: ComplexFunction[] = [];

  for (const file of files) {
    const filePath = path.relative(cwd, file.getFilePath()).replace(/\\/g, '/');

    for (const fn of file.getFunctions()) {
      const name = fn.getName() || '<anonymous>';
      const complexity = calculateComplexity(fn);
      const lines = fn.getEndLineNumber() - fn.getStartLineNumber() + 1;
      const hasJSDoc = fn.getJsDocs().length > 0;

      if (complexity > 3 || lines > 30) {
        results.push({ file: filePath, name, complexity, lines, hasJSDoc });
      }
    }

    // Also check arrow functions assigned to variables
    for (const varDecl of file.getVariableDeclarations()) {
      const init = varDecl.getInitializer();
      if (!init) continue;
      if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
        const name = varDecl.getName();
        const complexity = calculateComplexity(init);
        const lines = init.getEndLineNumber() - init.getStartLineNumber() + 1;
        const hasJSDoc = (varDecl.getVariableStatement()?.getJsDocs()?.length ?? 0) > 0;

        if (complexity > 3 || lines > 30) {
          results.push({ file: filePath, name, complexity, lines, hasJSDoc });
        }
      }
    }
  }

  return results.sort((a, b) => b.complexity - a.complexity);
}

function calculateComplexity(node: Node): number {
  let complexity = 1; // Base complexity

  node.forEachDescendant((child) => {
    switch (child.getKind()) {
      case SyntaxKind.IfStatement:
      case SyntaxKind.ConditionalExpression: // ternary
      case SyntaxKind.ForStatement:
      case SyntaxKind.ForInStatement:
      case SyntaxKind.ForOfStatement:
      case SyntaxKind.WhileStatement:
      case SyntaxKind.DoStatement:
      case SyntaxKind.CatchClause:
      case SyntaxKind.CaseClause:
        complexity++;
        break;
      case SyntaxKind.BinaryExpression:
        // Count && and || as decision points
        const op = child.getChildAtIndex(1)?.getText();
        if (op === '&&' || op === '||' || op === '??') {
          complexity++;
        }
        break;
    }
  });

  return complexity;
}

// ─── Naming Analysis ────────────────────────────────────

function analyzeNaming(files: SourceFile[]): NamingAnalysis {
  const funcs = { camelCase: 0, snake_case: 0, PascalCase: 0, other: 0 };
  const vars = { camelCase: 0, snake_case: 0, UPPER_CASE: 0, other: 0 };
  const types = { PascalCase: 0, other: 0 };

  for (const file of files) {
    // Functions
    for (const fn of file.getFunctions()) {
      const name = fn.getName();
      if (name) classifyName(name, funcs);
    }

    // Variables
    for (const v of file.getVariableDeclarations()) {
      const name = v.getName();
      if (name) {
        if (/^[A-Z][A-Z0-9_]+$/.test(name)) vars.UPPER_CASE++;
        else classifyName(name, vars);
      }
    }

    // Types & Interfaces
    for (const t of file.getInterfaces()) classifyName(t.getName(), types);
    for (const t of file.getTypeAliases()) classifyName(t.getName(), types);
    for (const c of file.getClasses()) {
      const name = c.getName();
      if (name) classifyName(name, types);
    }
  }

  return {
    functions: funcs,
    variables: vars,
    types,
    dominant: {
      functions: getDominant(funcs),
      variables: getDominant(vars),
      types: getDominant(types),
    },
  };
}

function classifyName(name: string, counter: Record<string, number>): void {
  if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) {
    counter.camelCase = (counter.camelCase || 0) + 1;
  } else if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) {
    counter.snake_case = (counter.snake_case || 0) + 1;
  } else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    counter.PascalCase = (counter.PascalCase || 0) + 1;
  } else {
    counter.other = (counter.other || 0) + 1;
  }
}

function getDominant(counts: Record<string, number>): string {
  const entries = Object.entries(counts).filter(([k]) => k !== 'other');
  if (entries.length === 0) return 'unknown';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][1] > 0 ? entries[0][0] : 'unknown';
}

// ─── Unused Exports Detection ───────────────────────────

function findUnusedExports(files: SourceFile[], cwd: string): UnusedExport[] {
  const unused: UnusedExport[] = [];

  // Build a set of all imported names from all files
  const allImported = new Map<string, Set<string>>(); // file -> imported names

  for (const file of files) {
    for (const imp of file.getImportDeclarations()) {
      const sourceFile = safely(() => imp.getModuleSpecifierSourceFile(), undefined, 'resolveSource');
      if (!sourceFile) continue;
      const targetPath = path.relative(cwd, sourceFile.getFilePath()).replace(/\\/g, '/');

      if (!allImported.has(targetPath)) allImported.set(targetPath, new Set());
      const set = allImported.get(targetPath)!;

      for (const named of imp.getNamedImports()) set.add(named.getName());
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) set.add('default');
    }
  }

  // Check each file's exports against imports
  const entryPatterns = ['cli.ts', 'index.ts', 'main.ts', 'app.ts'];

  for (const file of files) {
    const filePath = path.relative(cwd, file.getFilePath()).replace(/\\/g, '/');

    // Skip entry points — their exports are "used" by definition
    if (entryPatterns.some(p => filePath.endsWith(p))) continue;

    const importedFromThis = allImported.get(filePath) || new Set();

    // Check exported functions
    for (const fn of file.getFunctions()) {
      if (!fn.isExported()) continue;
      const name = fn.getName();
      if (name && !importedFromThis.has(name)) {
        unused.push({ file: filePath, name, kind: 'function' });
      }
    }

    // Check exported classes
    for (const cls of file.getClasses()) {
      if (!cls.isExported()) continue;
      const name = cls.getName();
      if (name && !importedFromThis.has(name)) {
        unused.push({ file: filePath, name, kind: 'class' });
      }
    }
  }

  return unused;
}

// ─── File Metrics ───────────────────────────────────────

function buildFileMetrics(files: SourceFile[], cwd: string): FileMetric[] {
  return files.map(file => {
    const filePath = path.relative(cwd, file.getFilePath()).replace(/\\/g, '/');

    const functions = file.getFunctions().length +
      file.getVariableDeclarations().filter(v => {
        const init = v.getInitializer();
        return init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init));
      }).length;

    const classes = file.getClasses().length;
    const imports = file.getImportDeclarations().length;
    const exports = file.getExportedDeclarations().size;

    // Average complexity of all functions in file
    const complexities = file.getFunctions().map(fn => calculateComplexity(fn));
    const avgComplexity = complexities.length > 0
      ? Math.round((complexities.reduce((a, b) => a + b, 0) / complexities.length) * 10) / 10
      : 0;

    return {
      path: filePath,
      lines: file.getEndLineNumber(),
      functions,
      classes,
      imports,
      exports,
      complexity: avgComplexity,
      hasTests: filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__'),
    };
  });
}
