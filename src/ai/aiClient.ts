import OpenAI from 'openai';

let client: OpenAI | null = null;

/**
 * Check if AI is available (OPENAI_API_KEY is set).
 */
export function isAiAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get or create OpenAI client.
 */
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Enhance a report with AI explanation.
 * Returns null if AI is unavailable or fails.
 */
export async function enhance(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  if (!isAiAvailable()) return null;

  try {
    const ai = getClient();
    const response = await ai.chat.completions.create({
      model: process.env.REPOLENS_AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    // Silently fail — AI is optional
    return null;
  }
}
