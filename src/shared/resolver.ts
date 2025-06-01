import { ResultAsync, ok, err, okAsync, errAsync } from 'neverthrow';
import { isRecord } from './types';
import type { WormholeError } from './errors-effect.js';
import { NetworkError, ParseError } from './errors-effect.js';
import { logError } from './debug';
import { withNetworkRetry } from './retry';

/**
 * Safely parse JSON and ensure it's an object using ResultAsync
 */
function safeJson<T extends Record<string, unknown>>(resp: Response, url: string): ResultAsync<T, WormholeError> {
  if (!resp.ok) {
    return errAsync(NetworkError.make({ message: 'HTTP error', url, status: resp.status }));
  }

  return ResultAsync.fromPromise(resp.json() as Promise<unknown>, () =>
    ParseError.make({ message: 'Invalid JSON response', input: url }),
  ).andThen((raw) => {
    if (isRecord(raw)) {
      return ok(raw as T);
    }
    return err(ParseError.make({ message: 'Response is not a valid object', input: url }));
  });
}

/**
 * Resolves a handle to a DID, using the Bluesky API or did:web.
 */
export function resolveHandleToDid(handle: string): ResultAsync<string, WormholeError> {
  if (handle.startsWith('did:web:')) {
    const parts = handle.split(':');
    if (parts.length === 3) {
      const url = `https://${parts[2]}/.well-known/did.json`;
      return withNetworkRetry(() =>
        ResultAsync.fromPromise(fetch(url, { signal: AbortSignal.timeout(5000) }), (e) =>
          NetworkError.make({ message: 'Failed to fetch did:web document', url, cause: e }),
        ),
      )
        .andThen((resp) => safeJson<{ id?: string }>(resp, url))
        .map((data) => data.id ?? handle)
        .orElse((error) => {
          logError('RESOLVER', error, { handle, type: 'did:web' });
          // For did:web, fallback to returning the original handle if resolution fails
          return ok(handle);
        });
    }
    return okAsync(handle);
  }

  const apiUrl = `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
  return withNetworkRetry(() =>
    ResultAsync.fromPromise(fetch(apiUrl, { signal: AbortSignal.timeout(5000) }), (e) =>
      NetworkError.make({ message: 'Failed to fetch handle resolution', url: apiUrl, cause: e }),
    ),
  )
    .andThen((resp) => safeJson<{ did?: string }>(resp, apiUrl))
    .andThen((data) => {
      if (data.did) {
        return ok(data.did);
      }
      return err(ParseError.make({ message: 'No DID found in response', input: apiUrl }));
    })
    .orElse((error) => {
      logError('RESOLVER', error, { handle, type: 'handle' });
      return err(error);
    });
}

/**
 * Resolves a DID to its handle, if possible.
 */
export function resolveDidToHandle(did: string): ResultAsync<string | null, WormholeError> {
  if (!did) {
    return okAsync(null);
  }

  if (did.startsWith('did:plc:')) {
    const url = `https://plc.directory/${encodeURIComponent(did)}`;
    return withNetworkRetry(() =>
      ResultAsync.fromPromise(fetch(url, { signal: AbortSignal.timeout(5000) }), (e) =>
        NetworkError.make({ message: 'Failed to fetch PLC directory', url, cause: e }),
      ),
    )
      .andThen((resp) => safeJson<{ alsoKnownAs?: unknown }>(resp, url))
      .map((data) => _extractHandleFromAlsoKnownAs(data.alsoKnownAs))
      .orElse((error) => {
        logError('RESOLVER', error, { did, type: 'did:plc' });
        return ok(null); // Return null on PLC resolution failure
      });
  }

  if (did.startsWith('did:web:')) {
    const url = _getDidWebWellKnownUrl(did);
    return withNetworkRetry(() =>
      ResultAsync.fromPromise(fetch(url, { signal: AbortSignal.timeout(5000) }), (e) =>
        NetworkError.make({ message: 'Failed to fetch did:web document', url, cause: e }),
      ),
    )
      .andThen((resp) => safeJson<{ alsoKnownAs?: unknown }>(resp, url))
      .map((data) => _extractHandleFromAlsoKnownAs(data.alsoKnownAs))
      .orElse((error) => {
        logError('RESOLVER', error, { did, type: 'did:web fallback' });
        // Fallback to decoding the did:web identifier
        const fallbackHandle = decodeURIComponent(did.substring('did:web:'.length).split('#')[0]);
        return ok(fallbackHandle);
      });
  }

  return okAsync(null);
}

/**
 * Extracts a handle from an alsoKnownAs array (used in did:web).
 */
function _extractHandleFromAlsoKnownAs(alsoKnownAs: unknown): string | null {
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
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return `https://${hostAndPort}${path}/.well-known/did.json`;
}
