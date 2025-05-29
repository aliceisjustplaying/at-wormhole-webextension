/**
 * Shortcuts for NSIDs used in Bluesky/AT-Proto
 */
import { NSID_SHORTCUTS } from './constants';
import type { TransformInfo } from './types';
import { isRecord } from './types';
import { buildDestinationsFromServices } from './services';

/**
 * Standardized info returned from transform functions.
 */

/**
 * Canonicalizes an input fragment into a standard info object.
 */
export async function canonicalize(fragment: string): Promise<TransformInfo | null> {
  let f = fragment.replace(/^at:\/\/([^/])/, 'at://$1');
  if (!f.startsWith('at://')) f = 'at://' + f;
  const [, idAndRest] = f.split('at://');
  const [idPart, ...restParts] = idAndRest.split('/');
  let did = idPart.startsWith('did:') ? idPart : null;
  const handle = did ? null : idPart;
  if (!did && handle) {
    did = await resolveHandleToDid(handle);
  }

  if (restParts.length) {
    const first = restParts[0];
    if (NSID_SHORTCUTS[first]) {
      restParts[0] = NSID_SHORTCUTS[first];
    }
  }
  const pathRest = restParts.join('/');
  const [nsid, rkey] = pathRest.split('/').filter(Boolean);

  let bskyAppPath = '';
  const acct = handle ?? did;
  if (acct) {
    bskyAppPath = `/profile/${acct}`;
    if (nsid && rkey) {
      const shortcutKey = Object.keys(NSID_SHORTCUTS).find((key) => NSID_SHORTCUTS[key] === nsid);
      if (shortcutKey) {
        bskyAppPath += `/${shortcutKey}/${rkey}`;
      }
    }
  }

  if (!did) return null;

  return {
    atUri: `at://${did}${pathRest ? `/${pathRest}` : ''}`,
    did,
    handle,
    rkey,
    nsid,
    bskyAppPath,
  };
}

// Safely parse JSON and ensure it's an object
async function safeJson<T extends Record<string, unknown>>(resp: Response): Promise<T | null> {
  if (!resp.ok) return null;
  const raw = (await resp.json()) as unknown;
  return isRecord(raw) ? (raw as T) : null;
}

/**
 * Resolves a handle to a DID, using the Bluesky API or did:web.
 */
export async function resolveHandleToDid(handle: string): Promise<string | null> {
  if (handle.startsWith('did:web:')) {
    const parts = handle.split(':');
    if (parts.length === 3) {
      try {
        const resp = await fetch(`https://${parts[2]}/.well-known/did.json`);
        const data = await safeJson<{ id?: string }>(resp);
        return data?.id ?? handle;
      } catch {
        /* ignore */
      }
    }
    return handle;
  }
  try {
    const resp = await fetch(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    const data = await safeJson<{ did?: string }>(resp);
    return data?.did ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolves a DID to its handle, if possible.
 */
export async function resolveDidToHandle(did: string): Promise<string | null> {
  if (!did) return null;
  if (did.startsWith('did:plc:')) {
    try {
      const resp = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
      const data = await safeJson<{ alsoKnownAs?: unknown }>(resp);
      const h = data ? _extractHandleFromAlsoKnownAs(data.alsoKnownAs) : null;
      if (h) return h;
    } catch {
      /* ignore */
    }
  }

  if (did.startsWith('did:web:')) {
    const url = _getDidWebWellKnownUrl(did);
    try {
      const resp = await fetch(url);
      const data = await safeJson<{ alsoKnownAs?: unknown }>(resp);
      const h = data ? _extractHandleFromAlsoKnownAs(data.alsoKnownAs) : null;
      if (h) return h;
    } catch {
      /* ignore */
    }

    return decodeURIComponent(did.substring('did:web:'.length).split('#')[0]);
  }
  return null;
}

/**
 * Extracts a handle from an alsoKnownAs array (used in did:web).
 */
function _extractHandleFromAlsoKnownAs(alsoKnownAs: unknown): string | null {
  if (Array.isArray(alsoKnownAs)) {
    for (const aka of alsoKnownAs) {
      if (typeof aka === 'string' && aka.startsWith('at://')) {
        const handle = aka.substring('at://'.length);
        if (handle) {
          return handle;
        }
      }
    }
  }
  return null;
}

/**
 * Gets the well-known URL for a did:web DID.
 */
function _getDidWebWellKnownUrl(did: string): string {
  const methodSpecificId = decodeURIComponent(did.substring('did:web:'.length).split('#')[0]);
  const parts = methodSpecificId.split(':');
  const hostAndPort = parts[0];
  let path = '';
  if (parts.length > 1) {
    path = '/' + parts.slice(1).join('/');
  }
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return `https://${hostAndPort}${path}/.well-known/did.json`;
}

/**
 * Builds a list of destination link objects from canonical info.
 */
export function buildDestinations(info: TransformInfo): { label: string; url: string }[] {
  return buildDestinationsFromServices(info);
}

// Re-export parseInput from parser module to maintain backward compatibility
export { parseInput } from './parser';
