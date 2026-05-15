export type FileCategory =
  | 'controller' | 'service' | 'model' | 'route' | 'view' | 'component'
  | 'test' | 'config' | 'migration' | 'middleware' | 'util' | 'type'
  | 'static' | 'documentation' | 'script' | 'command' | 'unknown';

export interface ClassifiedFile { path: string; category: FileCategory; }

const PATTERNS: [RegExp, FileCategory][] = [
  // Tests — highest priority
  [/\.(test|spec)\.(ts|tsx|js|jsx|py|rb|php)$/i, 'test'],
  [/__tests__\//i, 'test'], [/\/tests?\//i, 'test'],

  // Commands / Handlers (CLI tools, bots, workers)
  [/commands?\//i, 'command'],
  [/\.command\.(ts|js)$/i, 'command'],
  [/handlers?\//i, 'command'],
  [/\.handler\.(ts|js)$/i, 'command'],

  // Controllers
  [/controllers?\//i, 'controller'],
  [/\.controller\.(ts|js|py|rb|php)$/i, 'controller'],
  [/\/Http\/Controllers\//i, 'controller'],

  // Routes / API endpoints
  [/routes?\//i, 'route'], [/\.routes?\.(ts|js)$/i, 'route'],
  [/\/app\/api\//i, 'route'], [/\/pages\/api\//i, 'route'],

  // Services / Business logic
  [/services?\//i, 'service'], [/\.service\.(ts|js)$/i, 'service'],
  [/\/use-?cases?\//i, 'service'],

  // Models / Entities / Schema
  [/models?\//i, 'model'], [/\.model\.(ts|js)$/i, 'model'],
  [/\/entities?\//i, 'model'], [/prisma\/schema\.prisma$/i, 'model'],
  [/\/schemas?\//i, 'model'],

  // Migrations / Seeds
  [/migrations?\//i, 'migration'], [/\/seeds?\//i, 'migration'],
  [/\/seeders?\//i, 'migration'],

  // Middleware
  [/middleware/i, 'middleware'],

  // Views / Pages
  [/views?\//i, 'view'], [/\/pages\//i, 'view'],
  [/\/app\/.*page\.(tsx|jsx)$/i, 'view'], [/\.blade\.php$/i, 'view'],
  [/\/app\/.*layout\.(tsx|jsx)$/i, 'view'],

  // Components / UI
  [/components?\//i, 'component'], [/\/ui\//i, 'component'],
  [/\/widgets?\//i, 'component'],

  // Types / Interfaces
  [/types?\//i, 'type'], [/\.d\.ts$/i, 'type'],
  [/interfaces?\//i, 'type'],

  // Utilities / Helpers / Lib
  [/utils?\//i, 'util'], [/helpers?\//i, 'util'], [/lib\//i, 'util'],

  // Core modules (engines, analyzers, detectors)
  [/core\//i, 'service'],
  [/engines?\//i, 'service'],

  // AI / ML modules
  [/\/ai\//i, 'service'],
  [/\/ml\//i, 'service'],

  // Reporters / Output
  [/reporters?\//i, 'util'],
  [/formatters?\//i, 'util'],

  // Templates
  [/templates?\//i, 'util'],

  // Config
  [/config\//i, 'config'], [/\.config\.(ts|js|mjs|cjs|json)$/i, 'config'],
  [/tsconfig/i, 'config'], [/\.eslintrc/i, 'config'], [/\.prettierrc/i, 'config'],

  // Documentation
  [/\.md$/i, 'documentation'], [/docs?\//i, 'documentation'],

  // Scripts
  [/scripts?\//i, 'script'], [/Makefile$/i, 'script'],

  // Static assets
  [/public\//i, 'static'], [/static\//i, 'static'],
  [/assets?\//i, 'static'],
  [/\.(png|jpg|jpeg|gif|svg|ico|webp|mp4|woff2?|ttf|eot)$/i, 'static'],
];

export function classifyFile(filePath: string): FileCategory {
  const p = filePath.replace(/\\/g, '/');
  for (const [re, cat] of PATTERNS) { if (re.test(p)) return cat; }
  return 'unknown';
}

export function classifyFiles(files: string[]) {
  const byCategory = Object.fromEntries(
    (['controller','service','model','route','view','component','test','config',
      'migration','middleware','util','type','static','documentation','script',
      'command','unknown'] as FileCategory[])
    .map(c => [c, [] as string[]])
  ) as Record<FileCategory, string[]>;
  const classified: ClassifiedFile[] = [];
  for (const f of files) {
    const cat = classifyFile(f);
    classified.push({ path: f, category: cat });
    byCategory[cat].push(f);
  }
  return { classified, byCategory };
}
