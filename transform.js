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

  // Try to pull out at://... from inside web URL
  const atMatch = str.match(/at:\/\/[\w:.\-\/]+/);
  if (atMatch) {
    return await canonicalize(atMatch[0]);
  }

  try {
    const url = new URL(str);
    // Check for 'q' query parameter containing a DID
    const qParam = url.searchParams.get("q");
    if (qParam && qParam.startsWith("did:")) {
      return await canonicalize(qParam);
    }

    // Existing logic to find DID/handle in path parts
    const parts = str.split(/[/?#]/);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (
        p.startsWith("did:") ||
        (p.includes(".") && parts[i - 1] === "profile")
      ) {
        const rest = parts.slice(i + 1).join("/");
        return await canonicalize(p + (rest ? "/" + rest : ""));
      }
    }
  } catch (e) {
    // If URL parsing fails or other error, log it and fall through or return null
    console.error("Error parsing URL or its components:", e);
    // Depending on desired behavior, you might want to return null here
    // or let it fall through if there's a chance non-URL at:// strings are passed with http prefix
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
    // Use the renamed function here
    did = await resolveHandleToDid(handle);
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
      // Find the shortcut key (e.g., "feed", "post") that matches the current full nsid
      const shortcutKey = Object.keys(NSID_SHORTCUTS).find(
        (key) => NSID_SHORTCUTS[key] === nsid
      );
      if (shortcutKey) {
        bskyAppPath += `/${shortcutKey}/${rkey}`;
      }
      // If nsid is not in NSID_SHORTCUTS (e.g. a custom nsid),
      // bskyAppPath remains /profile/acct, which is the current behavior.
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

// Renamed function: Takes a handle, returns a DID
async function resolveHandleToDid(handle) {
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

// Helper function to extract handle from alsoKnownAs array
function _extractHandleFromAlsoKnownAs(alsoKnownAs) {
  if (Array.isArray(alsoKnownAs)) {
    for (const aka of alsoKnownAs) {
      if (typeof aka === "string" && aka.startsWith("at://")) {
        const handle = aka.substring("at://".length);
        if (handle) {
          return handle;
        }
      }
    }
  }
  return null;
}

// Helper function to construct the .well-known/did.json URL for did:web
function _getDidWebWellKnownUrl(did) {
  // Decode percent-encoded characters in the method-specific identifier part
  const methodSpecificId = decodeURIComponent(
    did.substring("did:web:".length).split("#")[0]
  );
  const parts = methodSpecificId.split(":");
  const hostAndPort = parts[0]; // e.g., "example.com" or "localhost:3000"
  let path = "";
  if (parts.length > 1) {
    // Path segments are joined by slashes
    path = "/" + parts.slice(1).join("/");
  }
  // Ensure path doesn't end with a slash if it's not empty before appending /.well-known
  if (path && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return `https://${hostAndPort}${path}/.well-known/did.json`;
}

// New function: Takes a DID, returns a handle
async function resolveDidToHandle(did) {
  if (!did || typeof did !== "string") {
    console.warn(
      "resolveDidToHandle: Invalid DID provided (null or not a string)",
      did
    );
    return null;
  }

  // --- DID:PLC ---
  if (did.startsWith("did:plc:")) {
    console.log(`resolveDidToHandle: Processing did:plc: ${did}`);
    // Primary: plc.directory
    try {
      const plcUrl = `https://plc.directory/${encodeURIComponent(did)}`;
      console.log("resolveDidToHandle: Fetching from PLC directory:", plcUrl);
      const plcResp = await fetch(plcUrl);
      if (plcResp.ok) {
        const plcData = await plcResp.json();
        console.log(
          "resolveDidToHandle: PLC directory success for",
          did,
          "; Data snippet:",
          JSON.stringify(plcData).substring(0, 200) + "..."
        );
        if (plcData.alsoKnownAs) {
          const handleFromPlc = _extractHandleFromAlsoKnownAs(
            plcData.alsoKnownAs
          );
          if (handleFromPlc) {
            console.log(
              `resolveDidToHandle: Found handle '${handleFromPlc}' from plc.directory alsoKnownAs for ${did}`
            );
            return handleFromPlc;
          }
        }
      } else {
        const errorText = await plcResp
          .text()
          .catch(() => "Failed to get error text from plcResp");
        console.warn(
          `resolveDidToHandle: plc.directory fetch failed for ${did} with status ${plcResp.status}. Error: ${errorText}`
        );
      }
    } catch (error) {
      console.error(
        `resolveDidToHandle: Error fetching/parsing PLC directory for ${did}:`,
        error
      );
    }

    // Fallback to describeRepo for did:plc:
    console.log(
      `resolveDidToHandle: Falling back to describeRepo for did:plc: ${did}`
    );
    try {
      const drUrl = `https://public.api.bsky.app/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(
        did
      )}`;
      console.log(
        "resolveDidToHandle: Attempting describeRepo fetch (plc fallback):",
        drUrl
      );
      const drResp = await fetch(drUrl);
      if (drResp.ok) {
        const drData = await drResp.json();
        console.log(
          "resolveDidToHandle: describeRepo success for",
          did,
          "(plc fallback); Data:",
          JSON.stringify(drData)
        );
        if (drData.handle) {
          console.log(
            `resolveDidToHandle: Found handle '${drData.handle}' from describeRepo (plc fallback) for ${did}`
          );
          return drData.handle;
        }
      }
    } catch (error) {
      console.error(
        `resolveDidToHandle: Error in describeRepo (plc fallback) for ${did}:`,
        error
      );
    }

    console.log(
      `resolveDidToHandle: All resolution methods failed for did:plc: ${did}`
    );
    return null;
  }

  // --- DID:WEB ---
  else if (did.startsWith("did:web:")) {
    console.log(`resolveDidToHandle: Processing did:web: ${did}`);
    const methodSpecificId = decodeURIComponent(
      did.substring("did:web:".length).split("#")[0]
    );

    // Primary: .well-known/did.json
    try {
      const wellKnownUrl = _getDidWebWellKnownUrl(did);
      console.log(
        "resolveDidToHandle: Fetching from .well-known/did.json:",
        wellKnownUrl
      );
      const wkResp = await fetch(wellKnownUrl);
      if (wkResp.ok) {
        const wkData = await wkResp.json();
        console.log(
          "resolveDidToHandle: .well-known success for",
          did,
          "; Data snippet:",
          JSON.stringify(wkData).substring(0, 200) + "..."
        );
        if (wkData.alsoKnownAs) {
          const handleFromWk = _extractHandleFromAlsoKnownAs(
            wkData.alsoKnownAs
          );
          if (handleFromWk) {
            console.log(
              `resolveDidToHandle: Found handle '${handleFromWk}' from .well-known alsoKnownAs for ${did}`
            );
            return handleFromWk;
          }
        }
      } else {
        const errorText = await wkResp
          .text()
          .catch(() => "Failed to get error text from wkResp");
        console.warn(
          `resolveDidToHandle: .well-known fetch failed for ${did} (url: ${wellKnownUrl}) status ${wkResp.status}. Error: ${errorText}`
        );
      }
    } catch (error) {
      console.error(
        `resolveDidToHandle: Error fetching/parsing .well-known/did.json for ${did}:`,
        error
      );
    }

    // Fallback 1: describeRepo
    console.log(
      `resolveDidToHandle: Falling back to describeRepo for did:web: ${did}`
    );
    try {
      const drUrl = `https://public.api.bsky.app/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(
        did
      )}`;
      console.log(
        "resolveDidToHandle: Attempting describeRepo fetch (web fallback 1):",
        drUrl
      );
      const drResp = await fetch(drUrl);
      if (drResp.ok) {
        const drData = await drResp.json();
        console.log(
          "resolveDidToHandle: describeRepo success for",
          did,
          "(web fallback 1); Data:",
          JSON.stringify(drData)
        );
        if (drData.handle) {
          console.log(
            `resolveDidToHandle: Found handle '${drData.handle}' from describeRepo (web fallback 1) for ${did}`
          );
          return drData.handle;
        }
      }
    } catch (error) {
      console.error(
        `resolveDidToHandle: Error in describeRepo (web fallback 1) for ${did}:`,
        error
      );
    }

    // Fallback 2: Derive from did:web string (methodSpecificId)
    console.log(
      `resolveDidToHandle: All other methods failed for did:web: ${did}. Falling back to derived handle: ${methodSpecificId}`
    );
    return methodSpecificId;
  }

  // --- UNSUPPORTED DID METHOD ---
  else {
    console.warn(
      `resolveDidToHandle: Unsupported DID method for ${did}. Only did:plc and did:web are supported.`
    );
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
    resolveHandleToDid, // Export with new name
    resolveDidToHandle, // Export new function
    buildDestinations,
  };
} else if (typeof window !== "undefined") {
  window.WormholeTransform = {
    parseInput,
    canonicalize,
    resolveHandleToDid, // Export with new name for window object
    resolveDidToHandle, // Export new function for window object
    buildDestinations,
  };
}
