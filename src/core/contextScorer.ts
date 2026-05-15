import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Context Quality Scorer — Evaluate the effectiveness of AI context files.
 * Based on research: auto-generated generic rules REDUCE agent performance.
 * Hand-curated tribal knowledge INCREASES performance.
 */

export interface ContextFile {
  type: 'agents' | 'claude' | 'cursorrules' | 'copilot' | 'skill' | 'unknown';
  path: string;
  content: string;
  exists: boolean;
}

export interface ScoreResult {
  overall: number;
  breakdown: {
    specificity: number;
    coverage: number;
    conciseness: number;
    freshness: number;
    tribalKnowledge: number;
  };
  issues: ScoreIssue[];
  suggestions: string[];
  genericRulesCount: number;
  specificRulesCount: number;
  totalLines: number;
}

export interface ScoreIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  fix?: string;
}

const GENERIC_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /never\s+commit\s+secrets?/i, description: 'Generic: "Never commit secrets"' },
  { pattern: /validate\s+all\s+input/i, description: 'Generic: "Validate all input"' },
  { pattern: /no\s+eval\(\)/i, description: 'Generic: "No eval()"' },
  { pattern: /never\s+trust\s+user\s+input/i, description: 'Generic: "Never trust user input"' },
  { pattern: /use\s+parameterized\s+queries/i, description: 'Generic: "Use parameterized queries"' },
  { pattern: /follow\s+\w+\s+conventions/i, description: 'Generic: "Follow X conventions"' },
  { pattern: /keep\s+files?\s+focused/i, description: 'Generic: "Keep files focused"' },
  { pattern: /minimal\s+safe\s+changes/i, description: 'Generic: "Minimal safe changes"' },
  { pattern: /analyze\s+before\s+editing/i, description: 'Generic: "Analyze before editing"' },
  { pattern: /no\s+unnecessary\s+rewrites/i, description: 'Generic: "No unnecessary rewrites"' },
  { pattern: /protect\s+\.?env\s+files?/i, description: 'Generic: "Protect .env files"' },
  { pattern: /preserve\s+auth\s+middleware/i, description: 'Generic: "Preserve auth middleware"' },
  { pattern: /summarize\s+all\s+changes/i, description: 'Generic: "Summarize changes"' },
  { pattern: /read\s+relevant\s+files?\s+before/i, description: 'Generic: "Read files before editing"' },
];

const TRIBAL_KNOWLEDGE_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /(?:always|never|must)\s+use\s+`[^`]+`/i, description: 'Specific tool/command' },
  { pattern: /because\s+.{10,}/i, description: 'Explains reasoning' },
  { pattern: /(?:gotcha|caveat|watch\s+out|careful|beware|pitfall)/i, description: 'Gotcha/pitfall' },
  { pattern: /(?:instead\s+of|don'?t\s+use\s+`[^`]+`.*use\s+`[^`]+`)/i, description: 'Specific alternative' },
  { pattern: /(?:bug|workaround|hack)\s+(?:in|for|with)\s+/i, description: 'Known bug/workaround' },
  { pattern: /(?:we|this\s+project)\s+(?:chose|decided|prefer)/i, description: 'Architecture decision' },
  { pattern: /(?:npm|yarn|pnpm)\s+run\s+\w+/i, description: 'Specific command' },
  { pattern: /\b(?:port|timeout|limit|threshold)\s*[:=]\s*\d+/i, description: 'Config value' },
  { pattern: /(?:breaking\s+change|deprecated|legacy)\s+/i, description: 'Migration note' },
  { pattern: /(?:file|module|directory)\s+`[^`]+`/i, description: 'References specific file' },
];

const COVERAGE_AREAS = [
  { area: 'Tech Stack', patterns: [/framework|stack|language|typescript|python|react|next/i] },
  { area: 'Build Commands', patterns: [/npm\s+run|yarn|pnpm|build|dev|test|lint/i] },
  { area: 'Architecture', patterns: [/architecture|pattern|structure|layer|module/i] },
  { area: 'Testing', patterns: [/test|spec|jest|vitest|pytest/i] },
  { area: 'File Structure', patterns: [/directory|folder|src\/|app\//i] },
  { area: 'Gotchas', patterns: [/gotcha|caveat|pitfall|watch\s+out|known\s+issue/i] },
  { area: 'Conventions', patterns: [/convention|naming|style|format/i] },
  { area: 'Dependencies', patterns: [/dependency|package|library|import/i] },
];

/**
 * Detect all AI context files in a repository.
 */
export function detectContextFiles(cwd: string): ContextFile[] {
  const contextFileMap: { type: ContextFile['type']; paths: string[] }[] = [
    { type: 'agents', paths: ['AGENTS.md', 'agents.md'] },
    { type: 'claude', paths: ['CLAUDE.md', 'claude.md', 'CODEX.md'] },
    { type: 'cursorrules', paths: ['.cursorrules'] },
    { type: 'copilot', paths: ['.github/copilot-instructions.md'] },
  ];

  const results: ContextFile[] = [];

  for (const { type, paths: filePaths } of contextFileMap) {
    let found = false;
    for (const p of filePaths) {
      const fullPath = path.join(cwd, p);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          results.push({ type, path: p, content, exists: true });
          found = true;
          break;
        } catch { /* skip */ }
      }
    }
    if (!found) {
      results.push({ type, path: filePaths[0], content: '', exists: false });
    }
  }

  // Check for .cursor/rules/*.mdc files
  const mdcDir = path.join(cwd, '.cursor', 'rules');
  if (fs.existsSync(mdcDir)) {
    try {
      const mdcFiles = fs.readdirSync(mdcDir).filter((f) => f.endsWith('.mdc'));
      for (const mf of mdcFiles) {
        const content = fs.readFileSync(path.join(mdcDir, mf), 'utf-8');
        results.push({ type: 'cursorrules', path: `.cursor/rules/${mf}`, content, exists: true });
      }
    } catch { /* skip */ }
  }

  // Check for .windsurfrules
  const windsurfPath = path.join(cwd, '.windsurfrules');
  if (fs.existsSync(windsurfPath)) {
    try {
      const content = fs.readFileSync(windsurfPath, 'utf-8');
      results.push({ type: 'cursorrules', path: '.windsurfrules', content, exists: true });
    } catch { /* skip */ }
  }

  // Check for SKILL.md files
  const skillPaths = ['.cursor/skills', '.skills', 'skills'];
  for (const sp of skillPaths) {
    const skillDir = path.join(cwd, sp);
    if (fs.existsSync(skillDir)) {
      try {
        const stat = fs.statSync(skillDir);
        if (stat.isDirectory()) {
          const skillFiles = fs.readdirSync(skillDir).filter((f) => f.endsWith('.md'));
          for (const sf of skillFiles) {
            const content = fs.readFileSync(path.join(skillDir, sf), 'utf-8');
            results.push({ type: 'skill', path: `${sp}/${sf}`, content, exists: true });
          }
        }
      } catch { /* skip */ }
    }
  }

  return results;
}

/**
 * Score the quality of a context file.
 */
export function scoreContextFile(content: string, projectFiles?: string[]): ScoreResult {
  const lines = content.split('\n');
  const issues: ScoreIssue[] = [];
  const suggestions: string[] = [];
  let genericCount = 0;
  let specificCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, description } of GENERIC_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        genericCount++;
        issues.push({ severity: 'warning', message: description, line: i + 1,
          fix: 'Replace with a project-specific version of this rule' });
      }
    }
    for (const { pattern } of TRIBAL_KNOWLEDGE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) specificCount++;
    }
  }

  const totalRules = genericCount + specificCount;
  const specificityScore = totalRules > 0 ? Math.round((specificCount / totalRules) * 100) : 0;

  let coveredAreas = 0;
  for (const { area, patterns } of COVERAGE_AREAS) {
    const covered = patterns.some((p) => { p.lastIndex = 0; return p.test(content); });
    if (covered) coveredAreas++;
    else suggestions.push(`Add section about: ${area}`);
  }
  const coverageScore = Math.round((coveredAreas / COVERAGE_AREAS.length) * 100);

  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length;
  let concisenessScore: number;
  if (nonEmptyLines <= 150) concisenessScore = 100;
  else if (nonEmptyLines <= 300) concisenessScore = 80;
  else if (nonEmptyLines <= 500) { concisenessScore = 50;
    issues.push({ severity: 'warning', message: `File is ${nonEmptyLines} lines — trim to under 200` });
  } else { concisenessScore = 20;
    issues.push({ severity: 'error', message: `File is ${nonEmptyLines} lines — will overwhelm AI agents`,
      fix: 'Split into hierarchical context files' });
  }

  let freshnessScore = 50;
  if (projectFiles && projectFiles.length > 0) {
    const refed = projectFiles.filter((f) => content.includes(path.basename(f)));
    freshnessScore = Math.min(100, Math.round((refed.length / Math.min(projectFiles.length, 20)) * 100));
    if (freshnessScore < 10) {
      issues.push({ severity: 'warning', message: 'Context file references very few project files — may be outdated' });
    }
  }

  let tribalCount = 0;
  for (const { pattern } of TRIBAL_KNOWLEDGE_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, 'gi');
    const matches = content.match(globalPattern);
    if (matches) tribalCount += matches.length;
  }
  const tribalKnowledgeScore = Math.min(100, tribalCount * 15);
  if (tribalCount === 0) {
    issues.push({ severity: 'error', message: 'No tribal knowledge detected — only inferable info',
      fix: 'Add gotchas, architecture decisions, specific commands' });
  }

  if (content.length === 0) issues.push({ severity: 'error', message: 'Context file is empty' });
  if (genericCount > 5) suggestions.push(`Remove ${genericCount} generic rules that hurt agent performance`);

  const overall = Math.min(100, Math.round(
    specificityScore * 0.30 + coverageScore * 0.20 + concisenessScore * 0.15 +
    freshnessScore * 0.15 + tribalKnowledgeScore * 0.20
  ));

  return { overall, breakdown: { specificity: specificityScore, coverage: coverageScore,
    conciseness: concisenessScore, freshness: freshnessScore, tribalKnowledge: tribalKnowledgeScore },
    issues, suggestions, genericRulesCount: genericCount,
    specificRulesCount: specificCount, totalLines: nonEmptyLines };
}

export function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}
