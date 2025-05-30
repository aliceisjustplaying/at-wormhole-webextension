import type { TransformInfo } from './types';
import { parseUrlFromServices } from './services';
import { canonicalize } from './canonicalizer';

/**
 * Parses a raw input string (URL, DID, handle) and returns canonical info.
 * This is the main entry point for parsing any user input.
 */
export function parseInput(raw: string): TransformInfo | null {
  if (!raw) return null;
  const str = decodeURIComponent(raw.trim());

  // Non-URL inputs (handles, DIDs, AT URIs)
  if (!str.startsWith('http')) {
    return canonicalize(str);
  }

  // Check for AT URI embedded in the URL string
  const atMatch = /at:\/\/[\w:.\-/]+/.exec(str);
  if (atMatch) {
    return canonicalize(atMatch[0]);
  }

  try {
    const url = new URL(str);

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
  } catch (error) {
    console.error('Error parsing input:', error);
  }

  return null;
}
