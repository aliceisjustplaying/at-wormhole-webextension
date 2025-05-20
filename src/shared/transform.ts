/**
 * Shortcuts for NSIDs used in Bluesky/AT-Proto
 */
import { NSID_SHORTCUTS } from './constants';

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
  let str = decodeURIComponent(raw.trim()); // Make str mutable

  // Prepend https:// if it looks like a URL without a schema but not an AT URI fragment
  if (!str.startsWith('http') && !str.startsWith('at://') && str.includes('/') && !str.match(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9.-]+$/) && !str.startsWith('did:')) {
    // Avoid prepending https:// to things like 'handle/collection/rkey' or 'did/collection/rkey'
    // A simple heuristic: if it has more than one slash and isn't a DID, it's likely a URL path.
    // Or if it's 'domain/path'
    const parts = str.split('/');
    if (parts.length > 1 && parts[0].includes('.')) { // e.g., 'deer.social/profile/...'
       str = 'https://' + str;
    }
  }
  
  // If it's not a full URL (http/https) or a full AT URI, treat as fragment for canonicalize
  // This handles plain DIDs, handles, or AT URIs (even partial like 'did:plc:123/feed/abc')
  if (!str.startsWith('http') && !str.startsWith('at://')) {
    // Exception: if it became a URL above, don't canonicalize here
    if (!str.startsWith('https://')) { // Check specifically for https as http is already handled by original logic
        return await canonicalize(str);
    }
  }

  const atMatch = /at:\/\/[\w:.\-/]+/.exec(str);
  if (atMatch) {
    return await canonicalize(atMatch[0]);
  }

  try {
    const url = new URL(str);

    // cred.blue specific parser
    if (url.hostname === 'cred.blue' && url.pathname.length > 1) {
      // Path format: /post/:rkey/by/:handle or /:handle
      const credBluePostMatch = url.pathname.match(/^\/post\/([^\/]+)\/by\/([^\/]+)$/);
      if (credBluePostMatch) {
        const [, rkey, handle] = credBluePostMatch;
        // Use explicit NSID for posts
        return await canonicalize(`${handle}/app.bsky.feed.post/${rkey}`);
      } else if (!url.pathname.includes('/')) { // Simple handle: cred.blue/handle.bsky.social
        const handle = url.pathname.slice(1);
        if (handle) {
          return await canonicalize(handle);
        }
      }
    }

    // tangled.sh specific parser
    if (url.hostname === 'tangled.sh' && url.pathname.length > 1) {
      // Path format: /post/:rkey/by/:handle or /@:handle
      const tangledPostMatch = url.pathname.match(/^\/post\/([^\/]+)\/by\/([^\/]+)$/);
      if (tangledPostMatch) {
        const [, rkey, handle] = tangledPostMatch;
         // Use explicit NSID for posts
        return await canonicalize(`${handle}/app.bsky.feed.post/${rkey}`);
      } else { // Try to match /@handle or /handle
        const handleMatch = url.pathname.match(/^\/(@)?([^\/]+)$/);
        if (handleMatch) {
          const handle = handleMatch[2];
          return await canonicalize(handle);
        }
      }
    }

    // blue.mackuba.eu specific parser
    if (url.hostname === 'blue.mackuba.eu' && url.pathname.startsWith('/skythread')) {
      const author = url.searchParams.get('author');
      const post = url.searchParams.get('post');
      if (author && post) { // Author can be DID or handle
        // Use explicit NSID for posts. canonicalize will resolve handle if needed.
        return await canonicalize(`${author}/app.bsky.feed.post/${post}`);
      }
    }

    const qParam = url.searchParams.get('q');
    if (qParam?.startsWith('did:')) {
      return await canonicalize(qParam);
    }

    // Generic URL parsing logic (bsky.app, deer.social, etc.)
    // Path formats:
    // /profile/:idOrHandle
    // /profile/:idOrHandle/post/:rkey
    // /profile/:idOrHandle/feed/:rkey
    // /profile/:idOrHandle/lists/:rkey
    // /:idOrHandle (if idOrHandle contains a '.') - treats as profile

    const pathParts = url.pathname.substring(1).split('/'); // remove leading slash and split

    if (pathParts.length > 0 && pathParts[0]) {
      let idOrHandle: string | undefined;
      let collection: string | undefined;
      let rkey: string | undefined;

      if (pathParts[0] === 'profile' && pathParts[1]) {
        idOrHandle = pathParts[1];
        if (pathParts[2] && pathParts[3]) { // e.g., /profile/handle/post/rkey
          collection = pathParts[2];
          rkey = pathParts[3];
        }
      } else if (pathParts.length === 1 && pathParts[0].includes('.')) {
        // Case: https://bsky.app/why.bsky.team
        idOrHandle = pathParts[0];
      }

      if (idOrHandle) {
        let fragment = idOrHandle;
        if (collection && rkey) {
          // Convert common names to NSIDs if available, otherwise keep as is
          const nsidCollection = NSID_SHORTCUTS[collection.toLowerCase()] || `app.bsky.${collection}`;
          fragment += `/${nsidCollection}/${rkey}`;
        }
        return await canonicalize(fragment);
      }
    }
    // If no specific parsing rule matched for the URL, fall through to return null
  } catch (error) {
    // If URL parsing fails or any other error, it will fall through to return null
    console.error('Error parsing URL or during canonicalization attempt:', error);
  }

  return null; // Default return if no pattern matches or an error occurs
}

/**
 * Canonicalizes an input fragment into a standard info object.
 */
export async function canonicalize(fragment: string): Promise<TransformInfo | null> {
  // Ensure fragment starts with at:// if it's a DID or handle, possibly with path
  let f = fragment;
  if (!f.startsWith('at://') && (f.startsWith('did:') || f.includes('.'))) {
    // Heuristic: if it's a DID or contains a dot (likely a handle), prepend at://
    // This also handles cases like 'handle/app.bsky.feed.post/rkey'
     f = 'at://' + f;
  } else if (!f.startsWith('at://')) {
    // If it's not a DID/handle and doesn't start with at://, it might be an invalid fragment
    // For example, a simple rkey without context.
    // However, resolveHandleToDid can take simple handles, so we let it through
    // if it doesn't have slashes. If it has slashes, it must be a path.
    if (f.includes('/')) { // like 'feed/abcdef'
        // This case is ambiguous without a preceding handle/DID.
        // The original logic prepended at://, let's see if that's robust.
        // For now, let's assume it's part of a path that should have had a DID/handle.
        // This path might be problematic.
         f = 'at://' + f; // This will likely fail if `f` is like `feed/rkey`
    } else { // Simple string, could be a handle
        f = 'at://' + f;
    }
  }
  
  // Robustly split, handling potential leading slashes in idAndRest if f was just 'at://'
  const idAndRest = f.startsWith('at://') ? f.substring('at://'.length) : f;
  const [idPart, ...restParts] = idAndRest.split('/');
  
  let did = idPart.startsWith('did:') ? idPart : null;
  let handleFromInput = did ? null : (idPart.includes('.') ? idPart : null); // Only treat as handle if it has a dot or isn't a DID

  if (!did && handleFromInput) {
    did = await resolveHandleToDid(handleFromInput);
  } else if (!did && !handleFromInput && !idPart.startsWith('did:')) {
    // If idPart is not a DID and not identified as a handle (e.g. simple string like "cozy"),
    // it might be a malformed AT URI or an attempt to resolve a non-handle as handle.
    // Let's try resolving it as a handle if it's the only part.
    if (restParts.length === 0 && idPart) {
        const resolvedDid = await resolveHandleToDid(idPart);
        if (resolvedDid) {
            did = resolvedDid;
            handleFromInput = idPart; // Successfully resolved, so it was a handle
        }
    }
  }


  // Reconstruct path, ensuring NSID shortcuts are applied
  let processedPath = '';
  if (restParts.length > 0) {
    const collectionOrShortcut = restParts[0];
    let actualNsid = NSID_SHORTCUTS[collectionOrShortcut.toLowerCase()] || collectionOrShortcut;
    
    // Ensure nsid is in correct format if not a shortcut (e.g. app.bsky.feed.post)
    if (!actualNsid.includes('.') && !NSID_SHORTCUTS[collectionOrShortcut.toLowerCase()]) {
        // This might be a malformed collection or a shortcut that's not in our list
        // For safety, prefix with app.bsky if it's a simple word
        if (/^[a-zA-Z0-9_]+$/.test(actualNsid)) {
            // This is a guess; ideally, nsids should be fully qualified or be valid shortcuts
        }
    }

    const rkeyPart = restParts.length > 1 ? restParts.slice(1).join('/') : undefined;
    processedPath = `/${actualNsid}${rkeyPart ? `/${rkeyPart}` : ''}`;
  }
  
  const [nsid, rkey] = processedPath.substring(1).split('/').filter(Boolean);

  // Try to get handle if we only have DID (for bskyAppPath)
  let displayHandle = handleFromInput;
  if (did && !handleFromInput) {
    // This is an async operation, ideally should be done earlier if consistently needed
    // For now, keep it simple as bskyAppPath is cosmetic for some outputs.
    // displayHandle = await resolveDidToHandle(did); // Optional: for better bskyAppPath
  }

  let bskyAppPath = '';
  const acct = displayHandle ?? did; // Use resolved handle for path if available
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
    atUri: `at://${did}${processedPath}`, // Use processedPath which includes leading slash if path exists
    did,
    handle: handleFromInput, // Ensure we return the handle derived from input or resolved
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
