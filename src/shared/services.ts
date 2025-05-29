import type { TransformInfo } from './types';

export interface ServiceConfig {
  label: string;
  buildUrl: (info: TransformInfo) => string | null;
  requiredFields?: {
    handle?: boolean;
    rkey?: boolean;
    plcOnly?: boolean; // Only for did:plc, not did:web
  };
}

export const SERVICES: Record<string, ServiceConfig> = {
  DEER_SOCIAL: {
    label: '🦌 deer.social',
    buildUrl: (info) => `https://deer.social${info.bskyAppPath}`,
  },

  BSKY_APP: {
    label: '🦋 bsky.app',
    buildUrl: (info) => `https://bsky.app${info.bskyAppPath}`,
  },

  PDSLS_DEV: {
    label: '⚙️ pdsls.dev',
    buildUrl: (info) => `https://pdsls.dev/${info.atUri}`,
  },

  ATP_TOOLS: {
    label: '🛠️ atp.tools',
    buildUrl: (info) => `https://atp.tools/${info.atUri.replace('at://', 'at:/')}`,
  },

  CLEARSKY: {
    label: '☀️ clearsky',
    buildUrl: (info) => `https://clearsky.app/${info.did}/blocked-by`,
  },

  SKYTHREAD: {
    label: '☁️ skythread',
    buildUrl: (info) => (info.rkey ? `https://blue.mackuba.eu/skythread/?author=${info.did}&post=${info.rkey}` : null),
    requiredFields: { rkey: true },
  },

  CRED_BLUE: {
    label: '🍥 cred.blue',
    buildUrl: (info) => (info.handle ? `https://cred.blue/${info.handle}` : null),
    requiredFields: { handle: true },
  },

  TANGLED_SH: {
    label: '🪢 tangled.sh',
    buildUrl: (info) => (info.handle ? `https://tangled.sh/@${info.handle}` : null),
    requiredFields: { handle: true },
  },

  FRONTPAGE_FYI: {
    label: '📰 frontpage.fyi',
    buildUrl: (info) => (info.handle ? `https://frontpage.fyi/profile/${info.handle}` : null),
    requiredFields: { handle: true },
  },

  BOAT_KELINCI: {
    label: '⛵ boat.kelinci',
    buildUrl: (info) => `https://boat.kelinci.net/plc-oplogs?q=${info.did}`,
    requiredFields: { plcOnly: true },
  },

  PLC_DIRECTORY: {
    label: '🪪 plc.directory',
    buildUrl: (info) => `https://plc.directory/${info.did}`,
    requiredFields: { plcOnly: true },
  },
};

/**
 * Builds a list of destination link objects from canonical info using service configuration.
 */
export function buildDestinationsFromServices(info: TransformInfo): { label: string; url: string }[] {
  const isDidWeb = info.did.startsWith('did:web:');
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
      destinations.push({ label: service.label, url });
    }
  }

  return destinations;
}
