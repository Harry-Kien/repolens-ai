import { maskSecrets } from '../utils/masks.js';
import { sanitizePath } from '../utils/paths.js';

/**
 * Privacy filter for data sent to AI.
 * Ensures no secrets, personal paths, or sensitive content leaks.
 */

/**
 * Sanitize a list of file paths for AI context.
 */
export function sanitizeFilePaths(paths: string[]): string[] {
  return paths.map(sanitizePath);
}

/**
 * Sanitize text content — mask secrets, strip sensitive data.
 */
export function sanitizeContent(content: string): string {
  let safe = maskSecrets(content);
  safe = sanitizePath(safe);

  // Remove any inline .env content
  safe = safe.replace(/^[A-Z_]+=.+$/gm, (match) => {
    const key = match.split('=')[0];
    return `${key}=[FILTERED]`;
  });

  return safe;
}

/**
 * Truncate content to a safe size for AI context.
 */
export function truncateForAi(content: string, maxChars: number = 8000): string {
  if (content.length <= maxChars) return content;
  return content.substring(0, maxChars) + '\n... [truncated for privacy]';
}

/**
 * Check if a file should be excluded from AI context.
 */
export function shouldExcludeFromAi(filePath: string): boolean {
  const excluded = ['.env', '.key', '.pem', '.cert', 'id_rsa', 'credentials', 'secret'];
  const lower = filePath.toLowerCase();
  return excluded.some((e) => lower.includes(e));
}
