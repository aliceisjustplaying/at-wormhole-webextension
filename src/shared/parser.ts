import type { TransformInfo } from './types';
import { parseUrlFromServices } from './services';

// Temporary import from transform.ts - will be resolved in Phase 5 after all modules are extracted
import { canonicalize } from './transform';

/**
 * Parses a raw input string (URL, DID, handle) and returns canonical info.
 * This is the main entry point for parsing any user input.
 */
export async function parseInput(raw: string): Promise<TransformInfo | null> {
  if (!raw) return null;
  const str = decodeURIComponent(raw.trim());

  // Non-URL inputs (handles, DIDs, AT URIs)
  if (!str.startsWith('http')) {
    return await canonicalize(str);
  }

  // Check for AT URI embedded in the URL string
  const atMatch = /at:\/\/[\w:.\-/]+/.exec(str);
  if (atMatch) {
    return await canonicalize(atMatch[0]);
  }

  try {
    const url = new URL(str);

    // Try service-specific parsing first
    const serviceResult = parseUrlFromServices(url);
    if (serviceResult) {
      return await canonicalize(serviceResult);
    }

    // Fallback: generic query parameter check for DIDs
    const qParam = url.searchParams.get('q');
    if (qParam?.startsWith('did:')) {
      return await canonicalize(qParam);
    }

    // Fallback: generic parsing for any /profile/identifier pattern
    const parts = str.split(/[/?#]/);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.startsWith('did:') || (p.includes('.') && parts[i - 1]?.toLowerCase() === 'profile')) {
        const rest = parts.slice(i + 1).join('/');
        // Include slash before rest path
        const fragment = rest ? `${p}/${rest}` : p;
        return await canonicalize(fragment);
      }
    }
  } catch (error) {
    console.error('Error parsing input:', error);
  }

  return null;
}
