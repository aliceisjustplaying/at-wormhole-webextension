import { Result, ok, err } from 'neverthrow';
import { NSID_SHORTCUTS } from './constants';
import type { TransformInfo } from './types';
import type { WormholeError } from './errors-effect.js';
import { ValidationError } from './errors-effect.js';
import { logError } from './debug';

/**
 * Canonicalizes an input fragment into a standard info object.
 * This is a pure transformation function - no network calls.
 */
export function canonicalize(fragment: string): Result<TransformInfo | null, WormholeError> {
  if (!fragment || typeof fragment !== 'string') {
    logError(
      'CANONICALIZER',
      ValidationError.make({ message: 'Invalid fragment input', field: 'fragment', value: fragment }),
    );
    return err(
      ValidationError.make({ message: 'Fragment must be a non-empty string', field: 'fragment', value: fragment }),
    );
  }

  let f = fragment.replace(/^at:\/\/([^/])/, 'at://$1');
  if (!f.startsWith('at://')) f = 'at://' + f;
  const [, idAndRest] = f.split('at://');

  if (!idAndRest) {
    logError(
      'CANONICALIZER',
      ValidationError.make({ message: 'Invalid AT URI format', field: 'fragment', value: fragment }),
    );
    return err(ValidationError.make({ message: 'Invalid AT URI format', field: 'fragment', value: fragment }));
  }

  const [idPart, ...restParts] = idAndRest.split('/');

  if (!idPart) {
    logError(
      'CANONICALIZER',
      ValidationError.make({ message: 'Missing identifier in AT URI', field: 'fragment', value: fragment }),
    );
    return err(ValidationError.make({ message: 'Missing identifier in AT URI', field: 'fragment', value: fragment }));
  }

  const did = idPart.startsWith('did:') ? idPart : null;
  const handle = did ? null : idPart;

  // Validate DID format if present
  if (did && !isValidDid(did)) {
    logError('CANONICALIZER', ValidationError.make({ message: 'Invalid DID format', field: 'did', value: did }));
    return err(ValidationError.make({ message: 'Invalid DID format', field: 'did', value: did }));
  }

  // Validate handle format if present
  if (handle && !isValidHandle(handle)) {
    logError(
      'CANONICALIZER',
      ValidationError.make({ message: 'Invalid handle format', field: 'handle', value: handle }),
    );
    return err(ValidationError.make({ message: 'Invalid handle format', field: 'handle', value: handle }));
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

  // Return TransformInfo with atUri using either DID or handle
  const identifier = did ?? handle;
  const result = {
    atUri: identifier ? `at://${identifier}${pathRest ? `/${pathRest}` : ''}` : null,
    did,
    handle,
    rkey,
    nsid,
    bskyAppPath,
  };

  return ok(result);
}

/**
 * Validates DID format according to AT Protocol spec.
 */
function isValidDid(did: string): boolean {
  // Basic DID format validation: did:method:identifier
  const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._%-]$/;
  return didRegex.test(did);
}

/**
 * Validates handle format according to AT Protocol spec.
 */
function isValidHandle(handle: string): boolean {
  // More permissive handle validation - allow domains with subdomains
  // The AT Protocol spec allows domain-like handles with dots
  if (!handle || handle.length > 253) {
    return false;
  }

  // Basic checks: must contain at least one dot (domain requirement)
  // and consist of valid domain characters
  const handleRegex = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;
  return handleRegex.test(handle) && handle.includes('.');
}
