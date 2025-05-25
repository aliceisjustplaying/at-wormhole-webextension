/**
 * Shortcuts for NSIDs used in Bluesky/AT-Proto
 */
import { NSID_SHORTCUTS } from './constants';
import Debug from './debug';

/**
 * Standardized info returned from transform functions.
 */
export interface TransformInfo {
  atUri: string;
  did: string;
  handle: string | null;
  rkey?: string;
  nsid?: string;
  bskyAppPath: string;
}

/**
 * Parses a raw input string (URL, DID, handle) and returns canonical info.
 */
export async function parseInput(raw: string): Promise<TransformInfo | null> {
  if (!raw) return null;
  const str = decodeURIComponent(raw.trim());
  if (!str.startsWith('http')) {
    return await canonicalize(str);
  }

  const atMatch = /at:\/\/[\w:.\-/]+/.exec(str);
  if (atMatch) {
    return await canonicalize(atMatch[0]);
  }

  try {
    const url = new URL(str);

    if (url.hostname === 'cred.blue' && url.pathname.length > 1) {
      const handle = url.pathname.slice(1);
      if (handle) {
        return await canonicalize(handle);
      }
    }

    if (url.hostname === 'tangled.sh' && url.pathname.length > 1) {
      const handle = url.pathname.slice(1).replace(/^@/, '');
      if (handle) {
        return await canonicalize(handle);
      }
    }

    if (url.hostname === 'blue.mackuba.eu' && url.pathname.startsWith('/skythread')) {
      const author = url.searchParams.get('author');
      const post = url.searchParams.get('post');
      if (author?.startsWith('did:') && post) {
        // Use explicit NSID for posts
        return await canonicalize(`${author}/app.bsky.feed.post/${post}`);
      }
    }

    const qParam = url.searchParams.get('q');
    if (qParam?.startsWith('did:')) {
      return await canonicalize(qParam);
    }

    // New path parsing logic
    const pathSegments = url.pathname.split('/').filter(Boolean); // Get non-empty segments
    for (let i = 0; i < pathSegments.length; i++) {
      const p = pathSegments[i];
      // Check if 'p' is a DID or a potential handle (contains '.' and isn't part of common hostnames/paths)
      // and ensure that if the previous segment was 'profile', we use 'p'.
      const isPotentialIdentifier = p.startsWith('did:') || 
                                    (p.includes('.') && p !== 'www' && !p.endsWith('.com') && !p.endsWith('.org') && !p.endsWith('.net') && !p.endsWith('.app') && !p.endsWith('.social') && !p.endsWith('.dev') && !p.endsWith('.team') && !p.endsWith('.watch') && !p.endsWith('.eu') && !p.endsWith('.fyi') && !p.endsWith('.sh') && !p.endsWith('.net') && !p.endsWith('.directory'));
      
      const prevSegment = i > 0 ? pathSegments[i-1].toLowerCase() : '';

      if (isPotentialIdentifier || prevSegment === 'profile') {
        // If prevSegment is 'profile', p is the identifier regardless of isPotentialIdentifier
        // (handles cases like /profile/handle.example.com)
        // Otherwise, p itself must be a potential identifier.
        if (prevSegment === 'profile' || isPotentialIdentifier) {
          const identifier = p;
          const rest = pathSegments.slice(i + 1).join('/');
          const fragment = rest ? `${identifier}/${rest}` : identifier;
          return await canonicalize(fragment);
        }
      }
    }
  } catch (error) {
    Debug.error('transform', 'Error parsing input:', error);
  }

  return null;
}

/**
 * Canonicalizes an input fragment into a standard info object.
 */
export async function canonicalize(fragment: string): Promise<TransformInfo | null> {
  let f = fragment.replace(/^at:\/\/([^/])/, 'at://$1');
  if (!f.startsWith('at://')) f = 'at://' + f;
  const [, idAndRest] = f.split('at://');
  const [idPart, ...restParts] = idAndRest.split('/');
  let did = idPart.startsWith('did:') ? idPart : null;
  let handle = did ? null : idPart;

  const isExtensionContext = typeof chrome !== 'undefined' && chrome.runtime.id;

  if (!did && handle) { // Input was a handle, resolve to DID
    if (isExtensionContext) {
      Debug.transform('canonicalize: In extension context, resolving handle via SW:', handle);
      const response = await new Promise<{ did: string | null } | undefined>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_DID', handle }, (res) => {
          if (chrome.runtime.lastError) {
            Debug.error(
              'transform',
              `canonicalize: SW GET_DID error for ${handle}:`,
              chrome.runtime.lastError.message,
            );
            resolve(undefined); // Resolve with undefined on error
            return;
          }
          resolve(res as { did: string | null });
        });
      });
      did = response?.did ?? null;
      Debug.transform('canonicalize: SW resolved handle to DID:', { handle, did });
    } else {
      Debug.transform('canonicalize: Not in extension context, resolving handle directly:', handle);
      did = await resolveHandleToDid(handle);
      Debug.transform('canonicalize: Direct resolved handle to DID:', { handle, did });
    }
  } else if (did && !handle) { // Input was a DID, resolve to handle
    if (isExtensionContext) {
      Debug.transform('canonicalize: In extension context, resolving DID via SW:', did);
      const response = await new Promise<{ handle: string | null } | undefined>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_HANDLE', did }, (res) => {
          if (chrome.runtime.lastError) {
            Debug.error(
              'transform',
              `canonicalize: SW GET_HANDLE error for ${did}:`,
              chrome.runtime.lastError.message,
            );
            resolve(undefined); // Resolve with undefined on error
            return;
          }
          resolve(res as { handle: string | null });
        });
      });
      handle = response?.handle ?? null;
      Debug.transform('canonicalize: SW resolved DID to handle:', { did, handle });
    } else {
      Debug.transform('canonicalize: Not in extension context, resolving DID directly:', did);
      handle = await resolveDidToHandle(did);
      Debug.transform('canonicalize: Direct resolved DID to handle:', { did, handle });
    }
  }

  if (restParts.length) {
    const first = restParts[0];
    if (NSID_SHORTCUTS[first]) {
      restParts[0] = NSID_SHORTCUTS[first];
    }
  }
  const pathRest = restParts.join('/');
  let nsid: string | undefined;
  let rkey: string | undefined;

  const [potentialNsid, potentialRkey] = pathRest.split('/').filter(Boolean);

  if (potentialNsid === 'blocked-by') {
    // 'blocked-by' is not a valid nsid, so ignore it and any rkey.
    // nsid and rkey remain undefined as initialized
  } else {
    nsid = potentialNsid;
    rkey = potentialRkey;
  }

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

  let atUriPath = '';
  if (nsid && rkey) {
    atUriPath = `/${nsid}/${rkey}`;
  } else if (nsid) {
    atUriPath = `/${nsid}`;
  }

  return {
    atUri: `at://${did}${atUriPath}`,
    did,
    handle,
    rkey,
    nsid,
    bskyAppPath,
  };
}

// Type guard for JSON
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
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
        return data?.id ?? null;
      } catch {
        return null;
      }
    }
    return null;
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
  const { atUri, did, handle, rkey, bskyAppPath } = info;
  const isDidWeb = did.startsWith('did:web:');
  return [
    { label: '🦌 deer.social', url: `https://deer.social${bskyAppPath}` },
    { label: '🦋 bsky.app', url: `https://bsky.app${bskyAppPath}` },
    {
      label: '⚙️ pdsls.dev',
      url: `https://pdsls.dev/${atUri}`,
    },
    {
      label: '🛠️ atp.tools',
      url: `https://atp.tools/${atUri}`,
    },
    {
      label: '☀️ clearsky',
      url: `https://clearsky.app/${did}/blocked-by`,
    },
    ...(rkey ?
      [
        {
          label: '☁️ skythread',
          url: `https://blue.mackuba.eu/skythread/?author=${did}&post=${rkey}`,
        },
      ]
    : []),
    ...(handle ?
      [
        {
          label: '🍥 cred.blue',
          url: `https://cred.blue/${handle}`,
        },
        {
          label: '🪢 tangled.sh',
          url: `https://tangled.sh/@${handle}`,
        },
        {
          label: '📰 frontpage.fyi',
          url: `https://frontpage.fyi/profile/${handle}`,
        },
      ]
    : []),
    ...(!isDidWeb ?
      [
        {
          label: '⛵ boat.kelinci',
          url: `https://boat.kelinci.net/plc-oplogs?q=${did}`,
        },
        {
          label: '🪪 plc.directory',
          url: `https://plc.directory/${did}`,
        },
      ]
    : []),
  ].filter((d) => Boolean(d.url));
}
