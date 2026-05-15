import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGlobIgnorePatterns, normalizePath } from '../utils/paths.js';

export interface ScanResult {
  cwd: string;
  totalFiles: number;
  filesByExtension: Record<string, number>;
  fileTree: string[];
  importantFiles: string[];
  directories: string[];
  estimatedLinesOfCode: number;
  languages: string[];
  hasGit: boolean;
  hasReadme: boolean;
  hasTests: boolean;
  hasDocker: boolean;
  hasCiCd: boolean;
}

const IMPORTANT_FILE_NAMES = [
  'package.json',
  'composer.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'Gemfile',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'README.md',
  'readme.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'LICENSE',
  '.env.example',
  'Makefile',
  'Procfile',
  'vercel.json',
  'netlify.toml',
  'next.config.js',
  'next.config.ts',
  'next.config.mjs',
  'vite.config.ts',
  'vite.config.js',
  'nuxt.config.ts',
  'tsconfig.json',
  'webpack.config.js',
  'tailwind.config.js',
  'tailwind.config.ts',
  'prisma/schema.prisma',
  '.github/workflows',
  '.gitlab-ci.yml',
];

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.mjs': 'JavaScript',
  '.py': 'Python',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.dart': 'Dart',
  '.sql': 'SQL',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.html': 'HTML',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.md': 'Markdown',
  '.xml': 'XML',
};

/**
 * Scan a repository directory and collect file statistics.
 */
export async function scanRepository(cwd: string): Promise<ScanResult> {
  const ignorePatterns = getGlobIgnorePatterns();

  const files = await fg('**/*', {
    cwd,
    ignore: ignorePatterns,
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  const filesByExtension: Record<string, number> = {};
  const languagesSet = new Set<string>();
  const importantFiles: string[] = [];
  const directoriesSet = new Set<string>();
  let estimatedLines = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();

    // Count by extension
    filesByExtension[ext || '(no ext)'] = (filesByExtension[ext || '(no ext)'] || 0) + 1;

    // Track language
    if (EXTENSION_TO_LANGUAGE[ext]) {
      languagesSet.add(EXTENSION_TO_LANGUAGE[ext]);
    }

    // Check important files
    const basename = path.basename(file);
    const relativePath = normalizePath(file, '');

    if (
      IMPORTANT_FILE_NAMES.includes(basename) ||
      IMPORTANT_FILE_NAMES.some((p) => relativePath.includes(p))
    ) {
      importantFiles.push(relativePath);
    }

    // Collect directories (top 2 levels)
    const parts = relativePath.split('/');
    if (parts.length > 1) {
      directoriesSet.add(parts[0]);
      if (parts.length > 2) {
        directoriesSet.add(`${parts[0]}/${parts[1]}`);
      }
    }

    // Estimate lines of code for code files
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.php', '.rb', '.go', '.rs', '.java', '.kt', '.cs', '.vue', '.svelte'];
    if (codeExtensions.includes(ext)) {
      try {
        const fullPath = path.join(cwd, file);
        const stat = fs.statSync(fullPath);
        // Rough estimate: ~25 bytes per line of code
        estimatedLines += Math.round(stat.size / 25);
      } catch {
        // skip files that can't be read
      }
    }
  }

  // Check for special directories/features
  const hasGit = fs.existsSync(path.join(cwd, '.git'));
  const hasReadme = files.some((f) => f.toLowerCase().includes('readme'));
  const hasTests = files.some(
    (f) =>
      f.includes('test') ||
      f.includes('spec') ||
      f.includes('__tests__') ||
      f.includes('.test.') ||
      f.includes('.spec.')
  );
  const hasDocker = files.some(
    (f) => f.toLowerCase().includes('dockerfile') || f.toLowerCase().includes('docker-compose')
  );
  const hasCiCd = files.some(
    (f) => f.includes('.github/workflows') || f.includes('.gitlab-ci') || f.includes('Jenkinsfile')
  );

  return {
    cwd,
    totalFiles: files.length,
    filesByExtension,
    fileTree: files.slice(0, 200), // Cap at 200 for display
    importantFiles,
    directories: Array.from(directoriesSet).sort(),
    estimatedLinesOfCode: estimatedLines,
    languages: Array.from(languagesSet),
    hasGit,
    hasReadme,
    hasTests,
    hasDocker,
    hasCiCd,
  };
}
