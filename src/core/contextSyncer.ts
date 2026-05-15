import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ContextFile } from './contextScorer.js';

/**
 * Cross-tool Context Syncer v2.
 * Syncs AGENTS.md to ALL major AI coding tools:
 * - CLAUDE.md (Claude Code / Codex)
 * - .cursorrules (Cursor legacy)
 * - .cursor/rules/project.mdc (Cursor modern — MDC format with YAML frontmatter)
 * - .github/copilot-instructions.md (GitHub Copilot)
 * - .windsurfrules (Windsurf / Codeium)
 * - CODEX.md (OpenAI Codex)
 */

export interface SyncPlan {
  source: ContextFile;
  targets: SyncTarget[];
  conflicts: SyncConflict[];
}

export interface SyncTarget {
  type: ContextFile['type'] | 'mdc' | 'windsurf' | 'codex';
  path: string;
  action: 'create' | 'update' | 'skip';
  exists: boolean;
  content: string;
  label: string;
}

export interface SyncConflict {
  file: string;
  reason: string;
  sourceSnippet: string;
  targetSnippet: string;
}

// ─── Converters ─────────────────────────────────────────

/**
 * Convert AGENTS.md content to CLAUDE.md format.
 */
function toClaudeMd(agentsContent: string): string {
  const sections: string[] = [];
  sections.push(`# CLAUDE.md`);
  sections.push('');
  sections.push(`> Project-specific instructions for Claude Code.`);
  sections.push(`> Synced from AGENTS.md by RepoLens AI.`);
  sections.push('');

  const lines = agentsContent.split('\n');
  let skipHeader = true;

  for (const line of lines) {
    if (skipHeader && (line.startsWith('# AGENTS') || line.startsWith('> '))) continue;
    if (skipHeader && line.trim() === '') continue;
    skipHeader = false;
    sections.push(line);
  }

  sections.push('');
  sections.push('---');
  sections.push(`*Synced from AGENTS.md by [RepoLens AI](https://github.com/repolens/repolens-ai) on ${new Date().toISOString().split('T')[0]}*`);

  return sections.join('\n');
}

/**
 * Convert AGENTS.md content to .cursorrules format (legacy).
 */
function toCursorRules(agentsContent: string): string {
  const sections: string[] = [];
  const lines = agentsContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('# AGENTS')) {
      sections.push('# Cursor Rules');
      sections.push('');
      sections.push('> Auto-synced from AGENTS.md by RepoLens AI.');
    } else {
      sections.push(line);
    }
  }

  sections.push('');
  sections.push(`# Synced: ${new Date().toISOString().split('T')[0]}`);

  return sections.join('\n');
}

/**
 * Convert AGENTS.md content to .cursor/rules/project.mdc format.
 * MDC = Markdown Cursor — modern format with YAML frontmatter.
 * This is the current standard for Cursor IDE (2026+).
 */
function toMdcRules(agentsContent: string, projectName: string): string {
  const sections: string[] = [];

  // YAML frontmatter — this is what makes .mdc special
  sections.push('---');
  sections.push(`description: Project rules for ${projectName} — auto-synced from AGENTS.md`);
  sections.push('globs:');
  sections.push('alwaysApply: true');
  sections.push('---');
  sections.push('');

  // Extract content, skipping AGENTS.md header
  const lines = agentsContent.split('\n');
  let skipHeader = true;

  for (const line of lines) {
    if (skipHeader && (line.startsWith('# AGENTS') || line.startsWith('> '))) continue;
    if (skipHeader && line.trim() === '') continue;
    skipHeader = false;

    // Convert ## headers to # (MDC uses flatter hierarchy)
    if (line.startsWith('## ')) {
      sections.push(line.replace('## ', '# '));
    } else if (line.startsWith('### ')) {
      sections.push(line.replace('### ', '## '));
    } else {
      sections.push(line);
    }
  }

  // Remove trailing generator line if present
  const lastIdx = sections.length - 1;
  if (sections[lastIdx]?.includes('RepoLens AI') || sections[lastIdx]?.includes('---')) {
    sections.pop();
    if (sections[lastIdx - 1]?.trim() === '') sections.pop();
  }

  return sections.join('\n');
}

/**
 * Convert AGENTS.md to GitHub Copilot instructions format.
 */
function toCopilotInstructions(agentsContent: string): string {
  const sections: string[] = [];
  sections.push('# Copilot Instructions');
  sections.push('');
  sections.push('> Auto-synced from AGENTS.md by RepoLens AI.');
  sections.push('');

  const lines = agentsContent.split('\n');
  let skipHeader = true;

  for (const line of lines) {
    if (skipHeader && (line.startsWith('# ') || line.startsWith('> ') || line.trim() === '')) continue;
    skipHeader = false;
    sections.push(line);
  }

  sections.push('');
  sections.push(`<!-- Synced: ${new Date().toISOString().split('T')[0]} -->`);

  return sections.join('\n');
}

/**
 * Convert AGENTS.md to .windsurfrules format (Windsurf / Codeium).
 */
function toWindsurfRules(agentsContent: string): string {
  const sections: string[] = [];
  const lines = agentsContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('# AGENTS')) {
      sections.push('# Windsurf Rules');
      sections.push('');
      sections.push('> Auto-synced from AGENTS.md by RepoLens AI.');
    } else {
      sections.push(line);
    }
  }

  sections.push('');
  sections.push(`# Synced: ${new Date().toISOString().split('T')[0]}`);

  return sections.join('\n');
}

/**
 * Convert AGENTS.md to CODEX.md format (OpenAI Codex).
 */
function toCodexMd(agentsContent: string): string {
  const sections: string[] = [];
  sections.push(`# CODEX.md`);
  sections.push('');
  sections.push(`> Instructions for OpenAI Codex agent.`);
  sections.push(`> Synced from AGENTS.md by RepoLens AI.`);
  sections.push('');

  const lines = agentsContent.split('\n');
  let skipHeader = true;

  for (const line of lines) {
    if (skipHeader && (line.startsWith('# AGENTS') || line.startsWith('> '))) continue;
    if (skipHeader && line.trim() === '') continue;
    skipHeader = false;
    sections.push(line);
  }

  sections.push('');
  sections.push('---');
  sections.push(`*Synced from AGENTS.md by [RepoLens AI](https://github.com/repolens/repolens-ai) on ${new Date().toISOString().split('T')[0]}*`);

  return sections.join('\n');
}

// ─── Sync Engine ────────────────────────────────────────

/**
 * Create a sync plan from AGENTS.md to all AI tools.
 */
export function createSyncPlan(
  source: ContextFile,
  allContextFiles: ContextFile[],
  cwd: string,
): SyncPlan {
  const projectName = path.basename(cwd);
  const targets: SyncTarget[] = [];
  const conflicts: SyncConflict[] = [];

  if (source.type !== 'agents') {
    return { source, targets: [], conflicts: [{ file: source.path, reason: 'Only AGENTS.md can be used as sync source', sourceSnippet: '', targetSnippet: '' }] };
  }

  const targetDefs: { type: SyncTarget['type']; converter: (c: string) => string; filePath: string; label: string }[] = [
    { type: 'claude',      converter: (c) => toClaudeMd(c),                   filePath: 'CLAUDE.md',                          label: 'Claude Code / Codex CLI' },
    { type: 'mdc',         converter: (c) => toMdcRules(c, projectName),      filePath: '.cursor/rules/project.mdc',          label: 'Cursor IDE (modern .mdc)' },
    { type: 'cursorrules', converter: toCursorRules,                          filePath: '.cursorrules',                        label: 'Cursor IDE (legacy)' },
    { type: 'copilot',     converter: toCopilotInstructions,                  filePath: '.github/copilot-instructions.md',     label: 'GitHub Copilot' },
    { type: 'windsurf',    converter: toWindsurfRules,                        filePath: '.windsurfrules',                      label: 'Windsurf / Codeium' },
    { type: 'codex',       converter: (c) => toCodexMd(c),                   filePath: 'CODEX.md',                            label: 'OpenAI Codex' },
  ];

  for (const { type, converter, filePath, label } of targetDefs) {
    const fullPath = path.join(cwd, filePath);
    const exists = fs.existsSync(fullPath);
    const newContent = converter(source.content);

    if (exists) {
      const existingContent = fs.readFileSync(fullPath, 'utf-8');
      const hasManualEdits = !existingContent.includes('RepoLens AI') &&
        !existingContent.includes('Synced from AGENTS.md');

      if (hasManualEdits) {
        conflicts.push({
          file: filePath,
          reason: `${label}: File contains manual edits`,
          sourceSnippet: source.content.substring(0, 200),
          targetSnippet: existingContent.substring(0, 200),
        });
        targets.push({ type, path: filePath, action: 'skip', exists: true, content: newContent, label });
      } else {
        targets.push({ type, path: filePath, action: 'update', exists: true, content: newContent, label });
      }
    } else {
      targets.push({ type, path: filePath, action: 'create', exists: false, content: newContent, label });
    }
  }

  return { source, targets, conflicts };
}

/**
 * Execute a sync plan — write target files.
 */
export function executeSyncPlan(plan: SyncPlan, cwd: string): { written: string[]; skipped: string[] } {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const target of plan.targets) {
    if (target.action === 'skip') {
      skipped.push(target.path);
      continue;
    }

    const fullPath = path.join(cwd, target.path);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Backup existing file
    if (target.exists && fs.existsSync(fullPath)) {
      fs.copyFileSync(fullPath, fullPath + '.backup');
    }

    fs.writeFileSync(fullPath, target.content, 'utf-8');
    written.push(target.path);
  }

  return { written, skipped };
}
