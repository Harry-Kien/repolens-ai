import { logger } from './logger.js';

/**
 * Centralized error handling utility.
 * Replaces all empty catch {} blocks with proper error tracking.
 */

export class RepoLensError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RepoLensError';
  }
}

/**
 * Safely execute a function, returning a fallback on error.
 * Logs debug information instead of silently swallowing errors.
 */
export function safely<T>(fn: () => T, fallback: T, context?: string): T {
  try {
    return fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.debug(`[${context || 'unknown'}] ${msg}`);
    return fallback;
  }
}

/**
 * Async version of safely.
 */
export async function safelyAsync<T>(fn: () => Promise<T>, fallback: T, context?: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.debug(`[${context || 'unknown'}] ${msg}`);
    return fallback;
  }
}

/**
 * Wrap a command handler with proper error reporting.
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<void>>(fn: T): (...args: Parameters<T>) => Promise<void> {
  return async (...args: Parameters<T>) => {
    try {
      await fn(...args);
    } catch (error) {
      if (error instanceof RepoLensError) {
        logger.error(`${error.message} (${error.code})`);
      } else {
        logger.error(error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  };
}
