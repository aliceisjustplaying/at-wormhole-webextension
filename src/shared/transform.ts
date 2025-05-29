/**
 * Shortcuts for NSIDs used in Bluesky/AT-Proto
 */
import { NSID_SHORTCUTS } from './constants';
import type { TransformInfo } from './types';
import { buildDestinationsFromServices } from './services';
import { resolveHandleToDid } from './resolver';

/**
 * Standardized info returned from transform functions.
 */

/**
 * Canonicalizes an input fragment into a standard info object.
 */
export async function canonicalize(fragment: string): Promise<TransformInfo | null> {
  let f = fragment.replace(/^at:\/\/([^/])/, 'at://$1');
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

  return {
    atUri: `at://${did}${pathRest ? `/${pathRest}` : ''}`,
    did,
    handle,
    rkey,
    nsid,
    bskyAppPath,
  };
}

/**
 * Builds a list of destination link objects from canonical info.
 */
export function buildDestinations(info: TransformInfo): { label: string; url: string }[] {
  return buildDestinationsFromServices(info);
}

// Re-export functions from other modules to maintain backward compatibility
export { parseInput } from './parser';
export { resolveHandleToDid, resolveDidToHandle } from './resolver';
