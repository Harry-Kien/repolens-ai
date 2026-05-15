import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FrameworkInfo {
  framework: string;
  language: string;
  packageManager: string;
  confidence: 'high' | 'medium' | 'low';
  version?: string;
  additionalFrameworks: string[];
}

/**
 * Detect the primary framework and tech stack of a project.
 */
export function detectFramework(cwd: string): FrameworkInfo {
  const result: FrameworkInfo = {
    framework: 'Unknown',
    language: 'Unknown',
    packageManager: 'Unknown',
    confidence: 'low',
    additionalFrameworks: [],
  };

  // Check for Node.js / JavaScript ecosystem
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      result.packageManager = 'npm';
      if (fs.existsSync(path.join(cwd, 'yarn.lock'))) result.packageManager = 'yarn';
      if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) result.packageManager = 'pnpm';
      if (fs.existsSync(path.join(cwd, 'bun.lockb'))) result.packageManager = 'bun';

      // Detect TypeScript
      const isTypeScript = allDeps?.typescript || fs.existsSync(path.join(cwd, 'tsconfig.json'));

      // Framework detection (order matters — most specific first)
      if (allDeps?.next) {
        result.framework = 'Next.js';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
        result.version = allDeps.next;
      } else if (allDeps?.nuxt) {
        result.framework = 'Nuxt.js';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
        result.version = allDeps.nuxt;
      } else if (allDeps?.['@nestjs/core']) {
        result.framework = 'NestJS';
        result.language = 'TypeScript';
        result.confidence = 'high';
        result.version = allDeps['@nestjs/core'];
      } else if (allDeps?.['@angular/core']) {
        result.framework = 'Angular';
        result.language = 'TypeScript';
        result.confidence = 'high';
        result.version = allDeps['@angular/core'];
      } else if (allDeps?.svelte || allDeps?.['@sveltejs/kit']) {
        result.framework = allDeps?.['@sveltejs/kit'] ? 'SvelteKit' : 'Svelte';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
      } else if (allDeps?.vue) {
        result.framework = 'Vue.js';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
        result.version = allDeps.vue;
      } else if (allDeps?.react) {
        result.framework = 'React';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
        result.version = allDeps.react;
      } else if (allDeps?.express) {
        result.framework = 'Express.js';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
      } else if (allDeps?.fastify) {
        result.framework = 'Fastify';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
      } else if (allDeps?.hono) {
        result.framework = 'Hono';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'high';
      } else {
        result.framework = 'Node.js';
        result.language = isTypeScript ? 'TypeScript' : 'JavaScript';
        result.confidence = 'medium';
      }

      // Detect additional libraries
      if (allDeps?.prisma || allDeps?.['@prisma/client']) result.additionalFrameworks.push('Prisma');
      if (allDeps?.drizzle) result.additionalFrameworks.push('Drizzle ORM');
      if (allDeps?.mongoose) result.additionalFrameworks.push('Mongoose');
      if (allDeps?.sequelize) result.additionalFrameworks.push('Sequelize');
      if (allDeps?.tailwindcss) result.additionalFrameworks.push('Tailwind CSS');
      if (allDeps?.['styled-components']) result.additionalFrameworks.push('Styled Components');
      if (allDeps?.jest) result.additionalFrameworks.push('Jest');
      if (allDeps?.vitest) result.additionalFrameworks.push('Vitest');
      if (allDeps?.playwright || allDeps?.['@playwright/test']) result.additionalFrameworks.push('Playwright');
      if (allDeps?.cypress) result.additionalFrameworks.push('Cypress');
      if (allDeps?.docker || fs.existsSync(path.join(cwd, 'Dockerfile'))) result.additionalFrameworks.push('Docker');
      if (allDeps?.supabase || allDeps?.['@supabase/supabase-js']) result.additionalFrameworks.push('Supabase');
      if (allDeps?.firebase) result.additionalFrameworks.push('Firebase');

      return result;
    } catch {
      // JSON parse failed, continue
    }
  }

  // Check for Laravel (PHP)
  const composerPath = path.join(cwd, 'composer.json');
  if (fs.existsSync(composerPath)) {
    try {
      const composer = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
      const require = composer.require || {};

      if (require['laravel/framework']) {
        result.framework = 'Laravel';
        result.language = 'PHP';
        result.packageManager = 'composer';
        result.confidence = 'high';
        result.version = require['laravel/framework'];
        return result;
      }

      result.framework = 'PHP';
      result.language = 'PHP';
      result.packageManager = 'composer';
      result.confidence = 'medium';
      return result;
    } catch {
      // continue
    }
  }

  // Check for Python
  const requirementsTxt = path.join(cwd, 'requirements.txt');
  const pyprojectToml = path.join(cwd, 'pyproject.toml');
  const setupPy = path.join(cwd, 'setup.py');

  if (fs.existsSync(pyprojectToml) || fs.existsSync(requirementsTxt) || fs.existsSync(setupPy)) {
    result.language = 'Python';
    result.packageManager = 'pip';
    result.confidence = 'medium';

    // Try to detect specific framework
    const reqFile = fs.existsSync(requirementsTxt)
      ? fs.readFileSync(requirementsTxt, 'utf-8')
      : '';

    if (reqFile.includes('fastapi') || reqFile.includes('FastAPI')) {
      result.framework = 'FastAPI';
      result.confidence = 'high';
    } else if (reqFile.includes('django') || reqFile.includes('Django')) {
      result.framework = 'Django';
      result.confidence = 'high';
    } else if (reqFile.includes('flask') || reqFile.includes('Flask')) {
      result.framework = 'Flask';
      result.confidence = 'high';
    } else {
      result.framework = 'Python';
    }

    return result;
  }

  // Check for Go
  if (fs.existsSync(path.join(cwd, 'go.mod'))) {
    result.framework = 'Go';
    result.language = 'Go';
    result.packageManager = 'go modules';
    result.confidence = 'high';
    return result;
  }

  // Check for Rust
  if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
    result.framework = 'Rust';
    result.language = 'Rust';
    result.packageManager = 'cargo';
    result.confidence = 'high';
    return result;
  }

  // Check for Ruby / Rails
  if (fs.existsSync(path.join(cwd, 'Gemfile'))) {
    const gemfile = fs.readFileSync(path.join(cwd, 'Gemfile'), 'utf-8');
    result.language = 'Ruby';
    result.packageManager = 'bundler';

    if (gemfile.includes('rails')) {
      result.framework = 'Ruby on Rails';
      result.confidence = 'high';
    } else {
      result.framework = 'Ruby';
      result.confidence = 'medium';
    }
    return result;
  }

  // Check for Odoo
  const manifestPath = path.join(cwd, '__manifest__.py');
  if (fs.existsSync(manifestPath)) {
    result.framework = 'Odoo';
    result.language = 'Python';
    result.packageManager = 'pip';
    result.confidence = 'high';
    return result;
  }

  return result;
}
