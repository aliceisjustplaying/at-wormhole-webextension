/**
 * Network resilience utility with exponential backoff retry logic
 * Uses neverthrow's ResultAsync for functional error handling
 */

import { ResultAsync, err } from 'neverthrow';
import type { WormholeError } from './errors';
import { logError } from './debug';

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: WormholeError) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 100, // ms
  maxDelay: 5000, // ms
  backoffFactor: 2,
  shouldRetry: (error: WormholeError) => {
    // Only retry network errors, not parse/validation errors
    return error.type === 'NETWORK_ERROR' && (!error.status || error.status >= 500);
  },
};

/**
 * Utility function to create a delay promise
 */
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculate the next delay using exponential backoff with jitter
 */
const calculateDelay = (attempt: number, options: Required<RetryOptions>): number => {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffFactor, attempt);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
  return Math.min(delayWithJitter, options.maxDelay);
};

/**
 * Retry a function with exponential backoff
 *
 * @param fn Function that returns a ResultAsync
 * @param options Retry configuration options
 * @returns ResultAsync with retry logic applied
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(
 *   () => fetchData('https://api.example.com'),
 *   { maxAttempts: 3, initialDelay: 200 }
 * );
 *
 * fetchWithRetry.match(
 *   (data) => console.log('Success:', data),
 *   (error) => console.error('Failed after retries:', error)
 * );
 * ```
 */
export function withRetry<T>(
  fn: () => ResultAsync<T, WormholeError>,
  options: RetryOptions = {},
): ResultAsync<T, WormholeError> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const attemptWithRetry = (attempt: number): ResultAsync<T, WormholeError> => {
    return fn().orElse((error) => {
      // Log the attempt for debugging
      logError('RETRY', error, { attempt, maxAttempts: opts.maxAttempts });

      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(error)) {
        return err(error);
      }

      // Calculate delay and retry
      const delayMs = calculateDelay(attempt - 1, opts);

      return ResultAsync.fromPromise(
        delay(delayMs),
        () => error, // This should never happen with delay
      ).andThen(() => attemptWithRetry(attempt + 1));
    });
  };

  return attemptWithRetry(1);
}

/**
 * Specialized retry function for network requests with default network-optimized settings
 *
 * @param fn Function that returns a ResultAsync
 * @param customOptions Optional overrides for network-specific defaults
 * @returns ResultAsync with network retry logic applied
 */
export function withNetworkRetry<T>(
  fn: () => ResultAsync<T, WormholeError>,
  customOptions: Partial<RetryOptions> = {},
): ResultAsync<T, WormholeError> {
  const networkDefaults: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 500, // Higher initial delay for network requests
    maxDelay: 10000, // Higher max delay for network requests
    backoffFactor: 2.5, // More aggressive backoff for network
    shouldRetry: (error: WormholeError) => {
      if (error.type !== 'NETWORK_ERROR') return false;

      // Retry on 5xx errors and network failures (no status)
      if (!error.status) return true; // Network error without status (timeout, connection failed)
      if (error.status >= 500) return true; // Server errors
      if (error.status === 429) return true; // Rate limiting

      return false; // Don't retry 4xx client errors
    },
  };

  return withRetry(fn, { ...networkDefaults, ...customOptions });
}
