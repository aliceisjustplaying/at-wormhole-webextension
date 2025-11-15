import { canonicalize } from './canonicalizer';
import type { TransformInfo } from './types';

export interface AlternateLinkCandidate {
  href?: string | null;
  rel?: string | null;
  type?: string | null;
  title?: string | null;
}

export interface RelAlternateProbeResult {
  atUri: string;
  info: TransformInfo;
  rel: string | null;
  type: string | null;
}

const AT_URI_PREFIX = 'at://';

function hasAlternateRel(rel: string | null | undefined): boolean {
  if (!rel) return false;
  return rel
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase())
    .includes('alternate');
}

export function extractAtUriFromAlternateLinks(links: AlternateLinkCandidate[]): RelAlternateProbeResult | null {
  for (const link of links) {
    if (!hasAlternateRel(link.rel)) continue;
    const href = (link.href ?? '').trim();
    if (!href.toLowerCase().startsWith(AT_URI_PREFIX)) continue;

    const canonicalResult = canonicalize(href);
    if (canonicalResult.isErr()) {
      continue;
    }
    const info = canonicalResult.value;
    if (!info) {
      continue;
    }

    return {
      atUri: info.atUri ?? href,
      info,
      rel: link.rel ?? null,
      type: link.type ?? null,
    };
  }

  return null;
}
