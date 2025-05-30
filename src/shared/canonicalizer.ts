import { NSID_SHORTCUTS } from './constants';
import type { TransformInfo } from './types';

/**
 * Canonicalizes an input fragment into a standard info object.
 * This is a pure transformation function - no network calls.
 */
export function canonicalize(fragment: string): TransformInfo | null {
  let f = fragment.replace(/^at:\/\/([^/])/, 'at://$1');
  if (!f.startsWith('at://')) f = 'at://' + f;
  const [, idAndRest] = f.split('at://');
  const [idPart, ...restParts] = idAndRest.split('/');
  const did = idPart.startsWith('did:') ? idPart : null;
  const handle = did ? null : idPart;

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

  // Return TransformInfo with atUri using either DID or handle
  const identifier = did ?? handle;
  return {
    atUri: identifier ? `at://${identifier}${pathRest ? `/${pathRest}` : ''}` : null,
    did,
    handle,
    rkey,
    nsid,
    bskyAppPath,
  };
}
