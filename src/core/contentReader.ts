import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { getGlobIgnorePatterns } from '../utils/paths.js';
import { safely } from '../utils/errors.js';

/**
 * Content-aware file reader.
 * Actually reads file contents to extract meaningful information,
 * instead of just relying on filenames.
 */

export interface FileContent {
  path: string;
  content: string;
  lines: number;
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  comments: string[];
  todoFixmes: { line: number; text: string }[];
}

export interface ContentSummary {
  totalLinesOfCode: number;
  totalComments: number;
  totalFunctions: number;
  totalClasses: number;
  totalImports: number;
  totalExports: number;
  totalTodoFixmes: number;
  averageFileSize: number;
  largestFiles: { path: string; lines: number }[];
  mostConnected: { path: string; imports: number }[];
}

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.php', '.rb', '.go', '.rs', '.java', '.kt',
  '.cs', '.cpp', '.c', '.swift', '.vue', '.svelte', '.dart',
]);

const MAX_FILE_SIZE = 200_000; // 200KB max per file
const MAX_FILES_TO_READ = 500; // Cap for large repos

/**
 * Read and analyze content of code files in a repository.
 */
export async function readCodeContents(cwd: string): Promise<FileContent[]> {
  const ignore = getGlobIgnorePatterns();
  const files = await fg('**/*', {
    cwd,
    ignore,
    onlyFiles: true,
    dot: false,
    followSymbolicLinks: false,
  });

  const codeFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return CODE_EXTENSIONS.has(ext);
  });

  const results: FileContent[] = [];

  for (const file of codeFiles.slice(0, MAX_FILES_TO_READ)) {
    const parsed = safely(() => {
      const fullPath = path.join(cwd, file);
      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_FILE_SIZE) return null;

      const content = fs.readFileSync(fullPath, 'utf-8');
      return parseFileContent(file, content);
    }, null, `contentReader:${file}`);

    if (parsed) results.push(parsed);
  }

  return results;
}

/**
 * Parse a single file's content to extract structural information.
 */
function parseFileContent(filePath: string, content: string): FileContent {
  const lines = content.split('\n');
  const ext = path.extname(filePath).toLowerCase();

  const result: FileContent = {
    path: filePath,
    content: content.substring(0, 10_000), // Keep first 10KB for context
    lines: lines.length,
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    comments: [],
    todoFixmes: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Extract imports
    if (/^import\s/.test(line) || /^from\s/.test(line) || /require\(/.test(line)) {
      result.imports.push(line);
    }

    // Extract exports
    if (/^export\s/.test(line)) {
      result.exports.push(line.substring(0, 100));
    }

    // Extract function declarations
    const funcMatch = line.match(
      /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(|=>))/
    );
    if (funcMatch) {
      result.functions.push(funcMatch[1] || funcMatch[2]);
    }

    // Extract class declarations
    const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
    if (classMatch) {
      result.classes.push(classMatch[1]);
    }

    // Extract single-line comments
    if (/^\/\//.test(line) || /^#(?!!)/.test(line)) {
      result.comments.push(line);
    }

    // Extract TODO/FIXME — only match actual comment markers
    // Must be preceded by comment syntax (// or # or *) to avoid false positives
    if (/(?:\/\/|#|^\s*\*)\s*/.test(line)) {
      const todoMatch = line.match(/(?:\/\/|#|\*)\s*(TODO|FIXME|HACK|XXX|BUG)[\s:]+(.+)/i);
      if (todoMatch) {
        result.todoFixmes.push({ line: i + 1, text: `${todoMatch[1]}: ${todoMatch[2].trim()}` });
      }
    }

    // Python function/class detection
    if (ext === '.py') {
      const pyFuncMatch = line.match(/^(?:async\s+)?def\s+(\w+)/);
      if (pyFuncMatch) result.functions.push(pyFuncMatch[1]);
      const pyClassMatch = line.match(/^class\s+(\w+)/);
      if (pyClassMatch) result.classes.push(pyClassMatch[1]);
    }

    // Go function detection
    if (ext === '.go') {
      const goFuncMatch = line.match(/^func\s+(?:\(.*?\)\s+)?(\w+)/);
      if (goFuncMatch) result.functions.push(goFuncMatch[1]);
    }

    // Rust function detection
    if (ext === '.rs') {
      const rsFuncMatch = line.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
      if (rsFuncMatch) result.functions.push(rsFuncMatch[1]);
    }
  }

  return result;
}

/**
 * Summarize content analysis results.
 */
export function summarizeContents(files: FileContent[]): ContentSummary {
  const totalLinesOfCode = files.reduce((s, f) => s + f.lines, 0);
  const totalComments = files.reduce((s, f) => s + f.comments.length, 0);
  const totalFunctions = files.reduce((s, f) => s + f.functions.length, 0);
  const totalClasses = files.reduce((s, f) => s + f.classes.length, 0);
  const totalImports = files.reduce((s, f) => s + f.imports.length, 0);
  const totalExports = files.reduce((s, f) => s + f.exports.length, 0);
  const totalTodoFixmes = files.reduce((s, f) => s + f.todoFixmes.length, 0);

  const largestFiles = [...files]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .map((f) => ({ path: f.path, lines: f.lines }));

  const mostConnected = [...files]
    .sort((a, b) => b.imports.length - a.imports.length)
    .slice(0, 10)
    .map((f) => ({ path: f.path, imports: f.imports.length }));

  return {
    totalLinesOfCode,
    totalComments,
    totalFunctions,
    totalClasses,
    totalImports,
    totalExports,
    totalTodoFixmes,
    averageFileSize: files.length > 0 ? Math.round(totalLinesOfCode / files.length) : 0,
    largestFiles,
    mostConnected,
  };
}

/**
 * Find files related to a topic by searching content, not just filenames.
 */
export function findRelatedByContent(
  files: FileContent[],
  topic: string,
): FileContent[] {
  const topicLower = topic.toLowerCase();
  const scored = files.map((f) => {
    let score = 0;
    const pathLower = f.path.toLowerCase();

    // Path match (weight: 3)
    if (pathLower.includes(topicLower)) score += 3;

    // Function name match (weight: 2)
    if (f.functions.some((fn) => fn.toLowerCase().includes(topicLower))) score += 2;

    // Class name match (weight: 2)
    if (f.classes.some((cls) => cls.toLowerCase().includes(topicLower))) score += 2;

    // Import match (weight: 1)
    if (f.imports.some((imp) => imp.toLowerCase().includes(topicLower))) score += 1;

    // Content match (weight: 1)
    if (f.content.toLowerCase().includes(topicLower)) score += 1;

    return { file: f, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.file);
}
