/**
 * Build prompts for AI enhancement.
 * Only sends scanned facts — never raw file contents.
 */

const SYSTEM_PROMPT = `You are a senior software engineer analyzing a codebase.
You provide clear, professional, actionable analysis.
Base your analysis ONLY on the facts provided — do not invent files or features that don't exist.
Be concise but thorough. Use bullet points.
Tone: professional, helpful, senior engineer style.`;

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildAnalyzePrompt(context: {
  framework: string;
  language: string;
  totalFiles: number;
  languages: string[];
  directories: string[];
  importantFiles: string[];
  architectureStyle: string;
  riskCount: number;
}): string {
  return `Analyze this codebase and provide a senior-engineer-style summary.

Project facts:
- Framework: ${context.framework}
- Language: ${context.language}
- Total files: ${context.totalFiles}
- Languages detected: ${context.languages.join(', ')}
- Top-level directories: ${context.directories.join(', ')}
- Important files: ${context.importantFiles.join(', ')}
- Architecture style: ${context.architectureStyle}
- Risk issues found: ${context.riskCount}

Provide:
1. A concise project summary (2-3 sentences)
2. Architecture assessment
3. Top 3 improvement recommendations
4. Key risks to watch`;
}

export function buildExplainPrompt(topic: string, relatedFiles: string[], framework: string): string {
  return `Explain the "${topic}" feature/module in this ${framework} project.

Related files found:
${relatedFiles.map(f => `- ${f}`).join('\n')}

Explain:
1. What this feature likely does
2. How the files relate to each other
3. The typical flow/lifecycle
4. Potential risks or issues
5. Improvement suggestions`;
}

export function buildReviewPrompt(changedFiles: string[], diffStat: string, dangerCount: number): string {
  return `Review these recent code changes.

Changed files:
${changedFiles.map(f => `- ${f}`).join('\n')}

Diff stats:
${diffStat}

Dangerous changes detected: ${dangerCount}

Provide:
1. Summary of what changed
2. Risk assessment
3. Specific concerns
4. Recommended actions`;
}
