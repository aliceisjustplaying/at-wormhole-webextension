import { Result, ok, err } from 'neverthrow';
import type { TransformInfo } from './types';
import type { WormholeError } from './errors';
import { parseError } from './errors';
import { SERVICES } from './services';
import { canonicalize } from './canonicalizer';
import { logError } from './logging';

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
      return canonicalize(str);
    }

    // Check for AT URI embedded in the URL string
    const atMatch = /at:\/\/[\w:.\-/]+/.exec(str);
    if (atMatch) {
      return canonicalize(atMatch[0]);
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
          return canonicalize(serviceResult);
        }

        // Fallback: generic query parameter check for DIDs
        const qParam = url.searchParams.get('q');
        if (qParam?.startsWith('did:')) {
          return canonicalize(qParam);
        }

        // Fallback: generic parsing for any /profile/identifier pattern
        const parts = str.split(/[/?#]/);
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (p.startsWith('did:') || (p.includes('.') && parts[i - 1]?.toLowerCase() === 'profile')) {
            const rest = parts.slice(i + 1).join('/');
            // Include slash before rest path
            const fragment = rest ? `${p}/${rest}` : p;
            return canonicalize(fragment);
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

function parseUrlFromServices(url: URL): string | null {
  for (const service of Object.values(SERVICES)) {
    if (!service.parsing) continue;

    const hostnames = Array.isArray(service.parsing.hostname) ? service.parsing.hostname : [service.parsing.hostname];
    if (!hostnames.includes(url.hostname)) continue;

    const patterns = service.parsing.patterns;
    if (!patterns) continue;

    if (patterns.customParser) {
      const result = patterns.customParser(url);
      if (result) return result;
    }

    if (patterns.queryParam) {
      const param = url.searchParams.get(patterns.queryParam);
      if (param && (param.startsWith('did:') || param.includes('.'))) {
        return param;
      }
    }

    if (patterns.profileIdentifier) {
      const match = url.pathname.match(patterns.profileIdentifier);
      if (match) {
        const identifier = match[1];
        const restPath = url.pathname.slice(match[0].length);
        return restPath ? `${identifier}${restPath}` : identifier;
      }
    }

    if (patterns.profileHandle) {
      const match = url.pathname.match(patterns.profileHandle);
      if (match) {
        const handle = match[1];
        const restPath = url.pathname.slice(match[0].length);
        return restPath ? `${handle}${restPath}` : handle;
      }
    }

    if (patterns.profileDid) {
      const match = url.pathname.match(patterns.profileDid);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}
