import { isRecord } from './types';

/**
 * Safely parse JSON and ensure it's an object
 */
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
