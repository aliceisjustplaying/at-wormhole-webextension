import type { TransformInfo } from './types';

export interface ServiceConfig {
  emoji: string;
  name: string;

  // Input parsing configuration
  parsing?: {
    hostname: string | string[]; // Support multiple hostnames
    patterns?: {
      // For services accepting handle OR DID (e.g., bsky.app/profile/X)
      profileIdentifier?: RegExp;

      // For handle-only services (e.g., cred.blue/alice)
      profileHandle?: RegExp;

      // For DID-only services (e.g., clearsky.app/did:plc:xyz)
      profileDid?: RegExp;

      // For query parameter extraction (e.g., ?q=did:plc:xyz)
      queryParam?: string;

      // For complex cases (e.g., skythread's multi-param format)
      customParser?: (url: URL) => string | null;
    };
  };

  // Output building configuration
  buildUrl: (info: TransformInfo) => string | null;
  requiredFields?: {
    handle?: boolean;
    rkey?: boolean;
    plcOnly?: boolean; // Only for did:plc, not did:web
  };
}

export const SERVICES: Record<string, ServiceConfig> = {
  DEER_SOCIAL: {
    emoji: '🦌',
    name: 'deer.social',
    parsing: {
      hostname: 'deer.social',
      patterns: {
        // Matches /profile/IDENTIFIER where IDENTIFIER can be handle or DID
        profileIdentifier: /^\/profile\/([^/]+)/,
      },
    },
    buildUrl: (info) => `https://deer.social${info.bskyAppPath}`,
  },

  BSKY_APP: {
    emoji: '🦋',
    name: 'bsky.app',
    parsing: {
      hostname: 'bsky.app',
      patterns: {
        // Matches /profile/IDENTIFIER where IDENTIFIER can be handle or DID
        profileIdentifier: /^\/profile\/([^/]+)/,
      },
    },
    buildUrl: (info) => `https://bsky.app${info.bskyAppPath}`,
  },

  PDSLS_DEV: {
    emoji: '⚙️',
    name: 'pdsls.dev',
    parsing: {
      hostname: 'pdsls.dev',
      patterns: {
        customParser: (url) => {
          // Extract AT URI from pathname: /at://did:plc:xyz/app.bsky.feed.post/abc
          const atMatch = /at:\/\/[\w:.\-/]+/.exec(url.pathname);
          return atMatch ? atMatch[0] : null;
        },
      },
    },
    buildUrl: (info) => `https://pdsls.dev/${info.atUri}`,
  },

  ATP_TOOLS: {
    emoji: '🛠️',
    name: 'atp.tools',
    parsing: {
      hostname: 'atp.tools',
      patterns: {
        customParser: (url) => {
          // ATP Tools uses at:/ instead of at:// in URLs
          const atMatch = /at:\/[\w:.\-/]+/.exec(url.pathname);
          if (atMatch) {
            // Convert at:/ to at:// for canonicalization
            return atMatch[0].replace('at:/', 'at://');
          }
          return null;
        },
      },
    },
    buildUrl: (info) => (info.atUri ? `https://atp.tools/${info.atUri.replace('at://', 'at:/')}` : ''),
  },

  CLEARSKY: {
    emoji: '☀️',
    name: 'clearsky',
    parsing: {
      hostname: 'clearsky.app',
      patterns: {
        // Clearsky URLs contain DIDs: /did:plc:xyz/blocked-by
        profileDid: /^\/(did:[^/]+)/,
      },
    },
    buildUrl: (info) => `https://clearsky.app/${info.did}/blocked-by`,
  },

  SKYTHREAD: {
    emoji: '☁️',
    name: 'skythread',
    parsing: {
      hostname: 'blue.mackuba.eu',
      patterns: {
        customParser: (url) => {
          if (url.pathname.startsWith('/skythread')) {
            const author = url.searchParams.get('author');
            const post = url.searchParams.get('post');
            if (author?.startsWith('did:') && post) {
              // Return in a format that canonicalize can handle
              return `${author}/app.bsky.feed.post/${post}`;
            }
          }
          return null;
        },
      },
    },
    buildUrl: (info) => (info.rkey ? `https://blue.mackuba.eu/skythread/?author=${info.did}&post=${info.rkey}` : null),
    requiredFields: { rkey: true },
  },

  CRED_BLUE: {
    emoji: '🍥',
    name: 'cred.blue',
    parsing: {
      hostname: 'cred.blue',
      patterns: {
        // cred.blue/handle (no @ prefix)
        profileHandle: /^\/([^/]+)$/,
      },
    },
    buildUrl: (info) => (info.handle ? `https://cred.blue/${info.handle}` : null),
    requiredFields: { handle: true },
  },

  TANGLED_SH: {
    emoji: '🪢',
    name: 'tangled.sh',
    parsing: {
      hostname: 'tangled.sh',
      patterns: {
        // tangled.sh/handle or tangled.sh/@handle
        profileHandle: /^\/@?([^/]+)$/,
      },
    },
    buildUrl: (info) => (info.handle ? `https://tangled.sh/@${info.handle}` : null),
    requiredFields: { handle: true },
  },

  FRONTPAGE_FYI: {
    emoji: '📰',
    name: 'frontpage.fyi',
    parsing: {
      hostname: 'frontpage.fyi',
      patterns: {
        // frontpage.fyi/profile/handle
        profileHandle: /^\/profile\/([^/]+)$/,
      },
    },
    buildUrl: (info) => (info.handle ? `https://frontpage.fyi/profile/${info.handle}` : null),
    requiredFields: { handle: true },
  },

  BOAT_KELINCI: {
    emoji: '⛵',
    name: 'boat.kelinci',
    parsing: {
      hostname: 'boat.kelinci.net',
      patterns: {
        // Extract DID from query parameter ?q=did:plc:xyz
        queryParam: 'q',
      },
    },
    buildUrl: (info) => `https://boat.kelinci.net/plc-oplogs?q=${info.did}`,
    requiredFields: { plcOnly: true },
  },

  PLC_DIRECTORY: {
    emoji: '🪪',
    name: 'plc.directory',
    parsing: {
      hostname: 'plc.directory',
      patterns: {
        // plc.directory/did:plc:xyz
        profileDid: /^\/(did:plc:[^/]+)/,
      },
    },
    buildUrl: (info) => `https://plc.directory/${info.did}`,
    requiredFields: { plcOnly: true },
  },
};

/**
 * Parses a URL using service configurations to extract AT Protocol identifiers.
 * Returns a string that can be passed to canonicalize() or null if no match.
 */
export function parseUrlFromServices(url: URL): string | null {
  for (const service of Object.values(SERVICES)) {
    if (!service.parsing) continue;

    // Check if hostname matches (support string or array)
    const hostnames = Array.isArray(service.parsing.hostname) ? service.parsing.hostname : [service.parsing.hostname];

    if (!hostnames.includes(url.hostname)) continue;

    const patterns = service.parsing.patterns;
    if (!patterns) continue;

    // Try custom parser first (highest priority)
    if (patterns.customParser) {
      const result = patterns.customParser(url);
      if (result) return result;
    }

    // Try query parameter extraction
    if (patterns.queryParam) {
      const param = url.searchParams.get(patterns.queryParam);
      if (param && (param.startsWith('did:') || param.includes('.'))) {
        return param;
      }
    }

    // Try profile identifier (handle OR DID)
    if (patterns.profileIdentifier) {
      const match = url.pathname.match(patterns.profileIdentifier);
      if (match) {
        const identifier = match[1];
        // Extract rest of path for posts/feeds/lists
        const restPath = url.pathname.slice(match[0].length);
        return restPath ? `${identifier}${restPath}` : identifier;
      }
    }

    // Try handle-specific pattern
    if (patterns.profileHandle) {
      const match = url.pathname.match(patterns.profileHandle);
      if (match) {
        const handle = match[1];
        const restPath = url.pathname.slice(match[0].length);
        return restPath ? `${handle}${restPath}` : handle;
      }
    }

    // Try DID-specific pattern
    if (patterns.profileDid) {
      const match = url.pathname.match(patterns.profileDid);
      if (match) {
        const did = match[1];
        const restPath = url.pathname.slice(match[0].length);
        return restPath ? `${did}${restPath}` : did;
      }
    }
  }

  return null;
}

/**
 * Builds a list of destination link objects from canonical info using service configuration.
 */
export function buildDestinations(info: TransformInfo, showEmojis = true): { label: string; url: string }[] {
  const isDidWeb = info.did?.startsWith('did:web:') ?? false;
  const destinations: { label: string; url: string }[] = [];

  for (const service of Object.values(SERVICES)) {
    // Check required fields
    if (service.requiredFields) {
      if (service.requiredFields.handle && !info.handle) continue;
      if (service.requiredFields.rkey && !info.rkey) continue;
      if (service.requiredFields.plcOnly && isDidWeb) continue;
    }

    const url = service.buildUrl(info);
    if (url) {
      const label = showEmojis ? `${service.emoji} ${service.name}` : service.name;
      destinations.push({ label, url });
    }
  }

  return destinations;
}
