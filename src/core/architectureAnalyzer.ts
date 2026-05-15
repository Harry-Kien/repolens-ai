import type { FileCategory } from './fileClassifier.js';

export interface ArchitectureResult {
  style: string;
  layers: { name: string; files: number; examples: string[] }[];
  dataFlow: string[];
  weakPoints: string[];
  suggestions: string[];
}

/**
 * Infer architecture from classified file categories.
 */
export function analyzeArchitecture(
  byCategory: Record<FileCategory, string[]>,
  framework: string,
): ArchitectureResult {
  const layers: ArchitectureResult['layers'] = [];

  const layerMap: [string, FileCategory[]][] = [
    ['Presentation / UI', ['view', 'component']],
    ['Routing', ['route']],
    ['Commands / Handlers', ['command']],
    ['Controllers / Handlers', ['controller']],
    ['Middleware', ['middleware']],
    ['Business Logic / Services', ['service']],
    ['Data / Models', ['model']],
    ['Database / Migrations', ['migration']],
    ['Utilities / Helpers', ['util', 'type']],
    ['Configuration', ['config']],
    ['Testing', ['test']],
    ['Static Assets', ['static']],
    ['Documentation', ['documentation']],
  ];

  for (const [name, categories] of layerMap) {
    const files = categories.flatMap((c) => byCategory[c] || []);
    if (files.length > 0) {
      layers.push({
        name,
        files: files.length,
        examples: files.slice(0, 3),
      });
    }
  }

  // Detect architecture style
  const style = detectStyle(byCategory, framework);
  const dataFlow = inferDataFlow(byCategory, framework);
  const weakPoints = findWeakPoints(byCategory);
  const suggestions = generateSuggestions(byCategory, framework);

  return { style, layers, dataFlow, weakPoints, suggestions };
}

function detectStyle(cats: Record<FileCategory, string[]>, fw: string): string {
  const hasControllers = cats.controller.length > 0;
  const hasCommands = (cats.command?.length || 0) > 0;
  const hasServices = cats.service.length > 0;
  const hasModels = cats.model.length > 0;
  const hasViews = cats.view.length > 0 || cats.component.length > 0;
  const hasRoutes = cats.route.length > 0;

  // CLI tool pattern
  if (hasCommands && hasServices && !hasControllers && !hasRoutes) {
    return 'Modular CLI Architecture (Commands → Core Services → Utilities)';
  }
  if (hasCommands && !hasControllers && !hasRoutes) {
    return 'Command-based Architecture';
  }

  // Web patterns
  if (hasControllers && hasModels && hasViews) {
    return hasServices ? 'MVC + Service Layer' : 'MVC (Model-View-Controller)';
  }
  if (hasRoutes && hasServices && hasModels) {
    return 'Layered Architecture (Route → Service → Model)';
  }
  if (hasViews && hasRoutes && !hasControllers) {
    if (fw.includes('Next') || fw.includes('Nuxt') || fw.includes('Svelte')) {
      return 'File-based Routing (Fullstack Framework)';
    }
    return 'Component-based Architecture';
  }
  if (hasControllers && hasServices) {
    return 'Layered Architecture';
  }
  if (cats.component.length > 5) {
    return 'Component-based Architecture';
  }

  // General modular structure
  if (hasServices && cats.util.length > 0) {
    return 'Modular Architecture (Services → Utilities)';
  }

  return 'Flat / Script-based Structure';
}

function inferDataFlow(cats: Record<FileCategory, string[]>, fw: string): string[] {
  const flow: string[] = [];

  // CLI flow
  const hasCommands = (cats.command?.length || 0) > 0;
  if (hasCommands) {
    flow.push('CLI Input → Commands');
    if (cats.service.length > 0) flow.push('Commands → Core Services');
    if (cats.util.length > 0) flow.push('Services → Utilities');
    flow.push('Output → Terminal / Report');
    return flow;
  }

  // Web flow
  if (cats.route.length > 0) flow.push('Client Request → Routes');
  if (cats.middleware.length > 0) flow.push('Routes → Middleware');
  if (cats.controller.length > 0) flow.push('Middleware → Controllers');
  else if (cats.route.length > 0) flow.push('Routes → Handlers');
  if (cats.service.length > 0) flow.push('Controllers → Services');
  if (cats.model.length > 0) flow.push('Services → Models → Database');
  if (cats.view.length > 0 || cats.component.length > 0) {
    flow.push('Data → Views/Components → UI');
  }
  if (flow.length === 0) flow.push('Simple file-based execution');
  return flow;
}

function findWeakPoints(cats: Record<FileCategory, string[]>): string[] {
  const points: string[] = [];
  if (cats.test.length === 0) points.push('No test files detected — code quality is unverified');
  if (cats.middleware.length === 0 && cats.controller.length > 0) {
    points.push('No middleware layer — auth/validation may be missing');
  }
  if (cats.service.length === 0 && cats.controller.length > 3) {
    points.push('Controllers without service layer — business logic may be coupled to HTTP layer');
  }
  if (cats.type.length === 0 && (cats.controller.length + cats.service.length + (cats.command?.length || 0)) > 5) {
    points.push('No type definitions — lack of type safety');
  }
  if (cats.config.length === 0) points.push('No explicit configuration files found');
  if (cats.documentation.length === 0) points.push('No documentation found');
  return points;
}

function generateSuggestions(cats: Record<FileCategory, string[]>, fw: string): string[] {
  const s: string[] = [];
  if (cats.test.length === 0) s.push('Add unit tests for critical business logic');
  if (cats.middleware.length === 0 && cats.controller.length > 0) {
    s.push('Consider adding auth and validation middleware');
  }
  if (cats.service.length === 0 && cats.controller.length > 2) {
    s.push('Extract business logic into service classes');
  }
  if (cats.type.length === 0) s.push('Add TypeScript interfaces or type definitions');
  if (cats.documentation.length < 2) s.push('Add README and API documentation');
  if (cats.migration.length === 0 && cats.model.length > 0) {
    s.push('Consider using database migrations for schema management');
  }
  return s;
}
