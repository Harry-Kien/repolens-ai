export interface VibeReadinessInput {
  contextScores: number[];
  driftScores: number[];
  toolCoverage: {
    agents: boolean;
    claudeOrCodex: boolean;
    cursor: boolean;
    copilot: boolean;
    windsurf: boolean;
    skills: boolean;
  };
  workflow: {
    hasDevScript: boolean;
    hasBuildScript: boolean;
    hasLintScript: boolean;
    hasTestScript: boolean;
    hasReadme: boolean;
    hasCi: boolean;
    hasLicense: boolean;
    hasContributing: boolean;
  };
  quality: {
    hasTests: boolean;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    circularDeps: number;
    avgComplexity?: number;
    documentedPercentage?: number;
  };
}

export interface VibeReadinessResult {
  overall: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  verdict: string;
  breakdown: {
    context: number;
    toolCoverage: number;
    workflow: number;
    codeHealth: number;
  };
  strengths: string[];
  actions: string[];
}

export function calculateVibeReadiness(input: VibeReadinessInput): VibeReadinessResult {
  const bestContext = input.contextScores.length > 0 ? Math.max(...input.contextScores) : 0;
  const worstDrift = input.driftScores.length > 0 ? Math.max(...input.driftScores) : 0;
  const context = clamp(Math.round(bestContext - worstDrift * 0.45));

  const toolCoverage = clamp(
    (input.toolCoverage.agents ? 25 : 0) +
    (input.toolCoverage.claudeOrCodex ? 15 : 0) +
    (input.toolCoverage.cursor ? 20 : 0) +
    (input.toolCoverage.copilot ? 15 : 0) +
    (input.toolCoverage.windsurf ? 10 : 0) +
    (input.toolCoverage.skills ? 15 : 0)
  );

  const workflow = clamp(
    (input.workflow.hasDevScript ? 12 : 0) +
    (input.workflow.hasBuildScript ? 14 : 0) +
    (input.workflow.hasLintScript ? 14 : 0) +
    (input.workflow.hasTestScript ? 14 : 0) +
    (input.workflow.hasReadme ? 12 : 0) +
    (input.workflow.hasCi ? 12 : 0) +
    (input.workflow.hasLicense ? 11 : 0) +
    (input.workflow.hasContributing ? 11 : 0)
  );

  let codeHealth = 100;
  if (!input.quality.hasTests) codeHealth -= 25;
  codeHealth -= input.quality.highRisks * 25;
  codeHealth -= input.quality.mediumRisks * 8;
  codeHealth -= Math.min(12, input.quality.lowRisks * 2);
  codeHealth -= input.quality.circularDeps * 10;
  if ((input.quality.avgComplexity ?? 0) > 18) codeHealth -= 12;
  else if ((input.quality.avgComplexity ?? 0) > 12) codeHealth -= 6;
  if ((input.quality.documentedPercentage ?? 100) < 35) codeHealth -= 8;
  codeHealth = clamp(Math.round(codeHealth));

  const overall = clamp(Math.round(
    context * 0.35 +
    toolCoverage * 0.25 +
    workflow * 0.25 +
    codeHealth * 0.15
  ));

  const strengths: string[] = [];
  const actions: string[] = [];

  if (context >= 85) strengths.push('Project context is strong enough for AI agents to follow.');
  if (toolCoverage >= 80) strengths.push('Most major AI coding tools are covered.');
  if (workflow >= 85) strengths.push('Developer workflow is clear and repeatable.');
  if (codeHealth >= 85) strengths.push('Code health signals are good for community use.');

  if (!input.toolCoverage.agents) actions.push('Run `repolens setup` to create AGENTS.md as the source of truth.');
  if (toolCoverage < 80) actions.push('Run `repolens sync` to cover Claude, Cursor, Copilot, Windsurf, and Codex.');
  if (!input.toolCoverage.skills) actions.push('Run `repolens skills --all` to add task-specific AI instructions.');
  if (!input.workflow.hasTestScript) actions.push('Add a reliable `test` script so AI changes can be verified.');
  if (!input.workflow.hasBuildScript) actions.push('Add a `build` script so users can check production readiness.');
  if (!input.workflow.hasContributing) actions.push('Add CONTRIBUTING.md to make community contributions easier.');
  if (worstDrift > 15) actions.push('Run `repolens setup` after major refactors to refresh stale context.');
  if (input.quality.highRisks > 0) actions.push('Fix high-risk security findings before a public launch.');
  if (codeHealth < 85 && (input.quality.avgComplexity ?? 0) > 12) {
    actions.push('Document or refactor the highest-complexity functions.');
  }

  return {
    overall,
    grade: gradeFor(overall),
    verdict: verdictFor(overall),
    breakdown: { context, toolCoverage, workflow, codeHealth },
    strengths,
    actions: dedupe(actions).slice(0, 7),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function gradeFor(score: number): VibeReadinessResult['grade'] {
  if (score >= 92) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function verdictFor(score: number): string {
  if (score >= 92) return 'Community launch ready';
  if (score >= 85) return 'Public beta ready';
  if (score >= 75) return 'Useful, but needs polish before a bigger launch';
  if (score >= 65) return 'Promising, but not yet smooth for broad community use';
  if (score >= 50) return 'Prototype quality';
  return 'Needs foundational setup';
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}
