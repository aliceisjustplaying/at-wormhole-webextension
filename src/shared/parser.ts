import { Result, ok, err } from 'neverthrow';
import type { TransformInfo } from './types';
import type { WormholeError } from './errors';
import { parseError } from './errors';
import { parseUrlFromServices } from './services';
import { canonicalize } from './canonicalizer';
import { logError } from './debug';

/**
 * Parses a raw input string (URL, DID, handle) and returns canonical info.
 * This is the main entry point for parsing any user input.
 */
export function parseInput(raw: string): Result<TransformInfo | null, WormholeError> {
  if (!raw) {
    return ok(null);
  }

  // Safe decoding with error handling
  const decodeResult = Result.fromThrowable(
    () => decodeURIComponent(raw.trim()),
    () => parseError('Failed to decode input', raw),
  )();

  return decodeResult.andThen((str) => {
    // Non-URL inputs (handles, DIDs, AT URIs)
    if (!str.startsWith('http')) {
      // For now, canonicalize returns TransformInfo | null directly
      // TODO: This will be updated when we convert canonicalizer.ts to use Result
      const result = canonicalize(str);
      return ok(result);
    }

    // Check for AT URI embedded in the URL string
    const atMatch = /at:\/\/[\w:.\-/]+/.exec(str);
    if (atMatch) {
      const result = canonicalize(atMatch[0]);
      return ok(result);
    }

    // Parse URL with proper error handling
    return Result.fromThrowable(
      () => new URL(str),
      () => parseError('Invalid URL format', str),
    )()
      .andThen((url) => {
        // Try service-specific parsing first
        const serviceResult = parseUrlFromServices(url);
        if (serviceResult) {
          const result = canonicalize(serviceResult);
          return ok(result);
        }

        // Fallback: generic query parameter check for DIDs
        const qParam = url.searchParams.get('q');
        if (qParam?.startsWith('did:')) {
          const result = canonicalize(qParam);
          return ok(result);
        }

        // Fallback: generic parsing for any /profile/identifier pattern
        const parts = str.split(/[/?#]/);
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (p.startsWith('did:') || (p.includes('.') && parts[i - 1]?.toLowerCase() === 'profile')) {
            const rest = parts.slice(i + 1).join('/');
            // Include slash before rest path
            const fragment = rest ? `${p}/${rest}` : p;
            const result = canonicalize(fragment);
            return ok(result);
          }
        }

        // No parsing pattern matched
        return ok(null);
      })
      .orElse((error) => {
        logError('PARSING', error, { input: raw });
        return err(error);
      });
  });
}
