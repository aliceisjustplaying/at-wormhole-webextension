/**
 * Shortcuts for NSIDs used in Bluesky/AT-Proto
 */
export const NSID_SHORTCUTS: Record<string, string> = {
  post: 'app.bsky.feed.post',
  feed: 'app.bsky.feed.generator',
  lists: 'app.bsky.graph.list',
};

/**
 * Parses a raw input string (URL, DID, handle) and returns canonical info.
 */
export async function parseInput(raw: string): Promise<any> {
  if (!raw) return null;
  let str = decodeURIComponent(raw.trim());
  if (!str.startsWith('http')) {
    return await canonicalize(str);
  }

  const atMatch = str.match(/at:\/\/[\w:.\-/]+/);
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

    const qParam = url.searchParams.get('q');
    if (qParam && qParam.startsWith('did:')) {
      return await canonicalize(qParam);
    }

    const parts = str.split(/[/?#]/);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.startsWith('did:') || (p.includes('.') && parts[i - 1] === 'profile')) {
        const rest = parts.slice(i + 1).join('/');
        return await canonicalize(p + (rest ? '/' + rest : ''));
      }
    }
  } catch (error) {
    console.error('Error parsing input:', error);
  }

  return null;
}

/**
 * Canonicalizes an input fragment into a standard info object.
 */
export async function canonicalize(fragment: string): Promise<any> {
  let f = fragment.replace(/^at:\/([^/])/, 'at://$1');
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
  const acct = handle || did;
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
    atUri: 'at://' + (did || handle) + (pathRest ? '/' + pathRest : ''),
    did,
    handle,
    rkey,
    nsid,
    bskyAppPath,
  };
}

/**
 * Resolves a handle to a DID, using the Bluesky API or did:web.
 */
export async function resolveHandleToDid(handle: string): Promise<string | null> {
  if (typeof handle === 'string' && handle.startsWith('did:web:')) {
    const parts = handle.split(':');
    if (parts.length === 3) {
      try {
        const resp = await fetch(`https://${parts[2]}/.well-known/did.json`);
        if (resp?.ok) {
          const { id } = await resp.json();
          return id || handle;
        }
      } catch {
        /* ignore */
      }
      return handle;
    }
    return handle;
  }
  try {
    const resp = await fetch(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    if (resp.ok) {
      const { did: resolved } = await resp.json();
      return resolved || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Extracts a handle from an alsoKnownAs array (used in did:web).
 */
function _extractHandleFromAlsoKnownAs(alsoKnownAs: any): string | null {
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
  if (path && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return `https://${hostAndPort}${path}/.well-known/did.json`;
}

/**
 * Resolves a DID to its handle, if possible.
 */
export async function resolveDidToHandle(did: string): Promise<string | null> {
  if (!did || typeof did !== 'string') return null;
  if (did.startsWith('did:plc:')) {
    try {
      const resp = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
      if (resp.ok) {
        const { alsoKnownAs } = await resp.json();
        const h = _extractHandleFromAlsoKnownAs(alsoKnownAs);
        if (h) return h;
      }
    } catch {
      /* ignore */
    }
    try {
      const resp = await fetch(
        `https://public.api.bsky.app/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(did)}`,
      );
      if (resp.ok) {
        const { handle } = await resp.json();
        if (handle) return handle;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
  if (did.startsWith('did:web:')) {
    const url = _getDidWebWellKnownUrl(did);
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const { alsoKnownAs } = await resp.json();
        const h = _extractHandleFromAlsoKnownAs(alsoKnownAs);
        if (h) return h;
      }
    } catch {
      /* ignore */
    }
    try {
      const resp = await fetch(
        `https://public.api.bsky.app/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(did)}`,
      );
      if (resp.ok) {
        const { handle } = await resp.json();
        if (handle) return handle;
      }
    } catch {
      /* ignore */
    }
    return decodeURIComponent(did.substring('did:web:'.length).split('#')[0]);
  }
  return null;
}

/**
 * Builds a list of destination link objects from canonical info.
 */
export function buildDestinations(info: any): Array<{ label: string; url: string }> {
  const { atUri, did, handle, rkey, bskyAppPath } = info;
  const isDidWeb = did && did.startsWith('did:web:');
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
  ].filter((d) => !!d && !!d.url);
}

// Attach to window for popup usage (browser only)
if (typeof window !== 'undefined') {
  (window as any).WormholeTransform = {
    parseInput,
    canonicalize,
    resolveHandleToDid,
    resolveDidToHandle,
    buildDestinations,
  };
}
