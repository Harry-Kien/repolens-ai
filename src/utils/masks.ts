/**
 * Secret masking utilities.
 * Ensures no API keys, tokens, or passwords are exposed in output.
 */

const SECRET_PATTERNS: RegExp[] = [
  // API keys & tokens
  /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{8,})["']?/gi,
  // OpenAI keys
  /sk-[a-zA-Z0-9]{20,}/g,
  // AWS keys
  /AKIA[0-9A-Z]{16}/g,
  // Generic long hex/base64 secrets
  /(?:password|passwd|pwd|secret|token)\s*[:=]\s*["']?([^\s"']{8,})["']?/gi,
  // Connection strings
  /(?:mongodb|postgres|mysql|redis):\/\/[^\s"']+/gi,
  // .env style KEY=VALUE with sensitive names
  /(?:DATABASE_URL|OPENAI_API_KEY|STRIPE_SECRET|AWS_SECRET_ACCESS_KEY|JWT_SECRET|SESSION_SECRET)\s*=\s*(.+)/gi,
];

/**
 * Mask sensitive values in a string.
 * Replaces detected secrets with [MASKED].
 */
export function maskSecrets(text: string): string {
  let masked = text;
  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    masked = masked.replace(pattern, (match) => {
      // Keep the key name, mask the value
      const eqIndex = match.indexOf('=');
      const colonIndex = match.indexOf(':');
      const sepIndex = eqIndex >= 0 ? eqIndex : colonIndex;

      if (sepIndex >= 0 && sepIndex < match.length - 1) {
        return match.substring(0, sepIndex + 1) + ' [MASKED]';
      }
      return '[MASKED]';
    });
  }
  return masked;
}

/**
 * Check if a string likely contains a secret value.
 */
export function containsSecret(text: string): boolean {
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Mask a value, showing only first 4 chars.
 */
export function partialMask(value: string): string {
  if (value.length <= 4) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 2);
}
