import { describe, expect, it } from 'vitest';
import { calculateVibeReadiness } from '../src/core/vibeReadiness.js';

describe('calculateVibeReadiness', () => {
  it('rewards repos with strong context, tool coverage, and workflow signals', () => {
    const result = calculateVibeReadiness({
      contextScores: [95, 90],
      driftScores: [4],
      toolCoverage: {
        agents: true,
        claudeOrCodex: true,
        cursor: true,
        copilot: true,
        windsurf: true,
        skills: true,
      },
      workflow: {
        hasDevScript: true,
        hasBuildScript: true,
        hasLintScript: true,
        hasTestScript: true,
        hasReadme: true,
        hasCi: true,
        hasLicense: true,
        hasContributing: true,
      },
      quality: {
        hasTests: true,
        highRisks: 0,
        mediumRisks: 0,
        lowRisks: 0,
        circularDeps: 0,
        avgComplexity: 8,
        documentedPercentage: 60,
      },
    });

    expect(result.overall).toBeGreaterThanOrEqual(90);
    expect(result.verdict).toMatch(/launch|beta/i);
  });

  it('pushes low-readiness repos toward setup, sync, skills, and tests', () => {
    const result = calculateVibeReadiness({
      contextScores: [],
      driftScores: [],
      toolCoverage: {
        agents: false,
        claudeOrCodex: false,
        cursor: false,
        copilot: false,
        windsurf: false,
        skills: false,
      },
      workflow: {
        hasDevScript: false,
        hasBuildScript: false,
        hasLintScript: false,
        hasTestScript: false,
        hasReadme: false,
        hasCi: false,
        hasLicense: false,
        hasContributing: false,
      },
      quality: {
        hasTests: false,
        highRisks: 1,
        mediumRisks: 2,
        lowRisks: 5,
        circularDeps: 1,
        avgComplexity: 22,
        documentedPercentage: 20,
      },
    });

    expect(result.overall).toBeLessThan(40);
    expect(result.actions.join('\n')).toContain('repolens setup');
    expect(result.actions.join('\n')).toContain('repolens sync');
    expect(result.actions.join('\n')).toContain('repolens skills --all');
  });
});
