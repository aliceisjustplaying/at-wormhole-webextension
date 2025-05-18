const NSID_SHORTCUTS = {
  post: "app.bsky.feed.post",
  feed: "app.bsky.feed.generator",
  // list: "app.bsky.graph.list",
  lists: "app.bsky.graph.list",
};

async function parseInput(raw) {
  if (!raw) return null;
  let str = decodeURIComponent(raw.trim());
  if (!str.startsWith("http")) {
    return await canonicalize(str);
  }
  // Try to pull out at://... from inside web URL, else treat full URL as possible at link
  const m = str.match(/at:\/\/[\w:.\-\/]+/);
  if (m) {
    return await canonicalize(m[0]);
  }
  const parts = str.split(/[/?#]/);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (
      p.startsWith("did:") ||
      (p.includes(".") && parts[i - 1] === "profile")
    ) {
      // Re-attach everything that comes *after* the id so we keep /post/<rkey>
      const rest = parts.slice(i + 1).join("/");
      return await canonicalize(p + (rest ? "/" + rest : ""));
    }
  }
  return null;
}

async function canonicalize(fragment) {
  // Ensure at:// prefix
  let f = fragment.replace(/^at:\/([^/])/, "at://$1");
  if (!f.startsWith("at://")) f = "at://" + f;
  // at://did/path or at://handle/path
  const [, idAndRest] = f.split("at://");
  const [idPart, ...restParts] = idAndRest.split("/");
  let did = idPart.startsWith("did:") ? idPart : null;
  const handle = did ? null : idPart;
  if (!did && handle) {
    did = await resolveHandle(handle);
  }

  if (restParts.length) {
    const first = restParts[0];
    if (NSID_SHORTCUTS[first]) {
      restParts[0] = NSID_SHORTCUTS[first];
    }
  }
  const pathRest = restParts.join("/");
  const [nsid, rkey] = pathRest.split("/").filter(Boolean);

  // --- bskyAppPath logic ---
  let bskyAppPath = "";
  const acct = handle || did;
  if (acct) {
    bskyAppPath = `/profile/${acct}`;
    if (nsid && rkey) {
      if (nsid === "app.bsky.feed.generator") {
        bskyAppPath += `/feed/${rkey}`;
      } else if (nsid === "app.bsky.feed.post") {
        bskyAppPath += `/post/${rkey}`;
      } else if (nsid === "app.bsky.graph.list") {
        bskyAppPath += `/lists/${rkey}`;
      }
    }
  }

  // Bail if did is falsy
  if (!did) return null;

  return {
    atUri: "at://" + (did || handle) + (pathRest ? "/" + pathRest : ""),
    did,
    handle,
    rkey,
    nsid,
    bskyAppPath,
  };
}

async function resolveHandle(handle) {
  // If handle is a did:web:... and looks like did:web:domain
  if (typeof handle === "string" && handle.startsWith("did:web:")) {
    const parts = handle.split(":");
    if (parts.length === 3) {
      // Try to fetch the full DID from .well-known/did.json
      const domain = parts[2];
      try {
        const resp = await fetch(
          "https://" + domain + "/.well-known/did.json"
        ).catch(() => null);
        if (resp && resp.ok) {
          const data = await resp.json();
          return data.id || handle;
        }
      } catch (_) {
        // fallback to returning the input
      }
      return handle;
    }
    // If it's a longer did:web:...:... just return as-is
    return handle;
  }
  // Otherwise, resolve handle via bsky API
  try {
    const url =
      "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=" +
      encodeURIComponent(handle);
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.did || null;
  } catch (_) {
    return null;
  }
}

function buildDestinations(info) {
  // Use the new bskyAppPath for both deer.social and bsky.app
  const { atUri, did, handle, rkey, bskyAppPath } = info;
  const isDidWeb = did && did.startsWith("did:web:");
  return [
    { label: "🦌 deer.social", url: `https://deer.social${bskyAppPath}` },
    { label: "🦋 bsky.app", url: `https://bsky.app${bskyAppPath}` },
    {
      label: "⚙️ pdsls.dev",
      url: `https://pdsls.dev/${atUri}`,
    },
    {
      label: "🛠️ atp.tools",
      url: `https://atp.tools/${atUri}`,
    },
    {
      label: "☀️ clearsky",
      url: `https://clearsky.app/${did}/blocked-by`,
    },
    ...(rkey
      ? [
          {
            label: "☁️ skythread",
            url: `https://blue.mackuba.eu/skythread/?author=${did}&post=${rkey}`,
          },
        ]
      : []),
    ...(handle
      ? [
          {
            label: "🍥 cred.blue",
            url: `https://cred.blue/${handle}`,
          },
          {
            label: "🪢 tangled.sh",
            url: `https://tangled.sh/@${handle}`,
          },
          {
            label: "📰 frontpage.fyi",
            url: `https://frontpage.fyi/profile/${handle}`,
          },
        ]
      : []),
    ...(!isDidWeb
      ? [
          {
            label: "⛵ boat.kelinci",
            url: `https://boat.kelinci.net/plc-oplogs?q=${did}`,
          },
          {
            label: "🪪 plc.directory",
            url: `https://plc.directory/${did}`,
          },
        ]
      : []),
  ].filter((d) => !!d && !!d.url);
}

// Node.js (test) and browser (extension) export compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    NSID_SHORTCUTS,
    parseInput,
    canonicalize,
    resolveHandle,
    buildDestinations,
  };
} else if (typeof window !== "undefined") {
  window.WormholeTransform = {
    parseInput,
    buildDestinations,
  };
}
