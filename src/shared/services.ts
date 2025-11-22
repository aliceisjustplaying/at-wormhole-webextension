import type { TransformInfo } from './types';

export interface ServiceConfig {
  emoji: string;
  name: string;
  contentSupport: 'only-profiles' | 'only-posts' | 'profiles-and-posts' | 'full';
  parsing?: {
    hostname: string | string[];
    patterns?: {
      profileIdentifier?: RegExp;
      profileHandle?: RegExp;
      profileDid?: RegExp;
      queryParam?: string;
      customParser?: (url: URL) => string | null;
    };
  };
  buildUrl: (info: TransformInfo) => string | null;
  requiredFields?: {
    handle?: boolean;
    rkey?: boolean;
    plcOnly?: boolean;
  };
}

const SERVICE_LIST: [string, ServiceConfig][] = [
  [
    'BSKY_APP',
    {
      emoji: '🦋',
      name: 'bsky.app',
      contentSupport: 'full',
      parsing: {
        hostname: 'bsky.app',
        patterns: {
          profileIdentifier: /^\/profile\/([^/]+)/,
        },
      },
      buildUrl: (info) => `https://bsky.app${info.bskyAppPath}`,
    },
  ],
  [
    'DEER_SOCIAL',
    {
      emoji: '🦌',
      name: 'deer.social',
      contentSupport: 'full',
      parsing: {
        hostname: 'deer.social',
        patterns: {
          profileIdentifier: /^\/profile\/([^/]+)/,
        },
      },
      buildUrl: (info) => `https://deer.social${info.bskyAppPath}`,
    },
  ],
  [
    'WEAVER',
    {
      emoji: '🧵',
      name: 'alpha.weaver.sh',
      contentSupport: 'full',
      buildUrl: (info) => (info.atUri ? `https://alpha.weaver.sh/record/${info.atUri}` : null),
      requiredFields: { rkey: true },
    },
  ],
  [
    'ATP_TOOLS',
    {
      emoji: '🛠️',
      name: 'atp.tools',
      contentSupport: 'full',
      parsing: {
        hostname: 'atp.tools',
        patterns: {
          customParser: (url) => {
            const atMatch = /at:\/[\w:.\-/]+/.exec(url.pathname);
            return atMatch ? atMatch[0].replace('at:/', 'at://') : null;
          },
        },
      },
      buildUrl: (info) => (info.atUri ? `https://atp.tools/${info.atUri.replace('at://', 'at:/')}` : ''),
    },
  ],
  [
    'PDSLS_DEV',
    {
      emoji: '⚙️',
      name: 'pdsls.dev',
      contentSupport: 'full',
      parsing: {
        hostname: 'pdsls.dev',
        patterns: {
          customParser: (url) => {
            const atMatch = /at:\/\/[\w:.\-/]+/.exec(url.pathname);
            return atMatch ? atMatch[0] : null;
          },
        },
      },
      buildUrl: (info) => `https://pdsls.dev/${info.atUri}`,
    },
  ],
  [
    'REPOVIEW',
    {
      emoji: '📁',
      name: 'repoview.edavis.dev',
      contentSupport: 'full',
      parsing: {
        hostname: 'repoview.edavis.dev',
        patterns: {
          customParser: (url) => {
            const atMatch = /at:\/\/[\w:.\-/]+/.exec(url.pathname);
            return atMatch ? atMatch[0] : null;
          },
        },
      },
      buildUrl: (info) => `https://repoview.edavis.dev/${info.atUri}`,
    },
  ],
  [
    'ASTROLABE',
    {
      emoji: '🔭',
      name: 'astrolabe.at',
      contentSupport: 'full',
      parsing: {
        hostname: 'astrolabe.at',
        patterns: {
          customParser: (url) => {
            const atMatch = /at\/[\w:.\-/]+/.exec(url.pathname);
            return atMatch ? atMatch[0].replace('at/', 'at://') : null;
          },
        },
      },
      buildUrl: (info) => (info.atUri ? `https://astrolabe.at/${info.atUri.replace('at://', 'at/')}` : ''),
    },
  ],
  [
    'CLEARSKY',
    {
      emoji: '☀️',
      name: 'clearsky',
      contentSupport: 'only-profiles',
      parsing: {
        hostname: 'clearsky.app',
        patterns: {
          profileDid: /^\/(did:[^/]+)/,
        },
      },
      buildUrl: (info) => (info.handle ? `https://clearsky.app/${info.handle}/blocking/blocked-by` : null),
      requiredFields: { handle: true },
    },
  ],
  [
    'SKYTHREAD',
    {
      emoji: '☁️',
      name: 'skythread',
      contentSupport: 'only-posts',
      parsing: {
        hostname: 'blue.mackuba.eu',
        patterns: {
          customParser: (url) => {
            if (url.pathname.startsWith('/skythread')) {
              const author = url.searchParams.get('author');
              const post = url.searchParams.get('post');
              if (author?.startsWith('did:') && post) {
                return `${author}/app.bsky.feed.post/${post}`;
              }
            }
            return null;
          },
        },
      },
      buildUrl: (info) =>
        info.rkey ? `https://blue.mackuba.eu/skythread/?author=${info.did}&post=${info.rkey}` : null,
      requiredFields: { rkey: true },
    },
  ],
  [
    'CRED_BLUE',
    {
      emoji: '🍥',
      name: 'cred.blue',
      contentSupport: 'only-profiles',
      parsing: {
        hostname: 'cred.blue',
        patterns: {
          profileHandle: /^\/([^/]+)$/,
        },
      },
      buildUrl: (info) => (info.handle ? `https://cred.blue/${info.handle}` : null),
      requiredFields: { handle: true },
    },
  ],
  [
    'TANGLED_SH',
    {
      emoji: '🪢',
      name: 'tangled.sh',
      contentSupport: 'only-profiles',
      parsing: {
        hostname: 'tangled.sh',
        patterns: {
          profileHandle: /^\/@?([^/]+)$/,
        },
      },
      buildUrl: (info) => (info.handle ? `https://tangled.sh/@${info.handle}` : null),
      requiredFields: { handle: true },
    },
  ],
  [
    'FRONTPAGE_FYI',
    {
      emoji: '📰',
      name: 'frontpage.fyi',
      contentSupport: 'only-profiles',
      parsing: {
        hostname: 'frontpage.fyi',
        patterns: {
          profileHandle: /^\/profile\/([^/]+)$/,
        },
      },
      buildUrl: (info) => (info.handle ? `https://frontpage.fyi/profile/${info.handle}` : null),
      requiredFields: { handle: true, plcOnly: true },
    },
  ],
  [
    'BOAT_KELINCI',
    {
      emoji: '⛵',
      name: 'boat.kelinci',
      contentSupport: 'only-profiles',
      parsing: {
        hostname: 'boat.kelinci.net',
        patterns: {
          queryParam: 'q',
        },
      },
      buildUrl: (info) => `https://boat.kelinci.net/plc-oplogs?q=${info.did}`,
      requiredFields: { plcOnly: true },
    },
  ],
  [
    'PLC_DIRECTORY',
    {
      emoji: '🪪',
      name: 'plc.directory',
      contentSupport: 'only-profiles',
      parsing: {
        hostname: 'plc.directory',
        patterns: {
          profileDid: /^\/(did:plc:[^/]+)/,
        },
      },
      buildUrl: (info) => `https://plc.directory/${info.did}`,
      requiredFields: { plcOnly: true },
    },
  ],
];

export const SERVICES: Record<string, ServiceConfig> = SERVICE_LIST.reduce<Record<string, ServiceConfig>>(
  (acc, [key, config]) => {
    acc[key] = config;
    return acc;
  },
  {},
);

/**
 * Builds a list of destination link objects from canonical info using service configuration.
 */
export function buildDestinations(
  info: TransformInfo,
  showEmojis = true,
  strictMode = false,
): { label: string; url: string }[] {
  const isDidWeb = info.did?.startsWith('did:web:') ?? false;
  const destinations: { label: string; url: string }[] = [];

  for (const service of Object.values(SERVICES)) {
    if (service.requiredFields) {
      if (service.requiredFields.handle && !info.handle) continue;
      if (service.requiredFields.rkey && !info.rkey) continue;
      if (service.requiredFields.plcOnly && isDidWeb) continue;
    }

    if (strictMode && info.rkey) {
      if (info.nsid === 'app.bsky.feed.post') {
        if (!['only-posts', 'profiles-and-posts', 'full'].includes(service.contentSupport)) {
          continue;
        }
      } else if (info.nsid === 'app.bsky.feed.generator' || info.nsid === 'app.bsky.graph.list') {
        if (service.contentSupport !== 'full') {
          continue;
        }
      }
    }

    const url = service.buildUrl(info);
    if (url) {
      const label = showEmojis ? `${service.emoji} ${service.name}` : service.name;
      destinations.push({ label, url });
    }
  }

  return destinations;
}
