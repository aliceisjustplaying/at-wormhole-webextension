import { parseInput } from '../shared/parser';
import { resolveDidToHandle, resolveHandleToDid } from '../shared/resolver';
import { DidHandleCache } from '../shared/cache';
import Debug from '../shared/debug';
import type { SWMessage } from '../shared/types';

const cache = new DidHandleCache();

// Initialize the cache when the service worker starts
const cacheLoaded = (async () => {
  await Debug.loadRuntimeConfig();
  Debug.serviceWorker('Service worker starting, loading cache...');
  await cache.load();
  Debug.serviceWorker('Cache loaded successfully');
})().catch((error: unknown) => {
  Debug.error('serviceWorker', 'Failed to initialize:', error);
});

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request: SWMessage, _sender, sendResponse): boolean => {
  // UPDATE_CACHE
  if (request.type === 'UPDATE_CACHE' && typeof request.did === 'string' && typeof request.handle === 'string') {
    void cache
      .set(request.did, request.handle)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error: unknown) => {
        console.error('Failed to update cache via message:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      });
    return true;
  }

  // GET_HANDLE
  if (request.type === 'GET_HANDLE' && typeof request.did === 'string') {
    void (async () => {
      await cacheLoaded;
      try {
        const handle = cache.getHandle(request.did);
        if (handle) {
          sendResponse({ handle, fromCache: true });
          return;
        }
        const resolvedHandle = await resolveDidToHandle(request.did);
        if (resolvedHandle) await cache.set(request.did, resolvedHandle);
        sendResponse({ handle: resolvedHandle ?? null, fromCache: false });
      } catch (e: unknown) {
        console.error('GET_HANDLE error', e);
        sendResponse({ handle: null, fromCache: false });
      }
    })();
    return true;
  }

  // GET_DID
  if (request.type === 'GET_DID' && typeof request.handle === 'string') {
    void (async () => {
      await cacheLoaded;
      try {
        const did = cache.getDid(request.handle);
        if (did) {
          sendResponse({ did, fromCache: true });
          return;
        }
        const resolvedDid = await resolveHandleToDid(request.handle);
        if (resolvedDid) await cache.set(resolvedDid, request.handle);
        sendResponse({ did: resolvedDid ?? null, fromCache: false });
      } catch {
        sendResponse({ did: null, fromCache: false });
      }
    })();
    return true;
  }

  // DEBUG_LOG
  if (request.type === 'DEBUG_LOG' && typeof request.message === 'string') {
    Debug.popup('Popup message:', request.message);
    sendResponse({ success: true });
    return true;
  }

  // CLEAR_CACHE
  if (request.type === 'CLEAR_CACHE') {
    void cache
      .clear()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error: unknown) => {
        console.error('Failed to clear cache:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      });
    return true;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((_tabId, info, tab) => {
  void (async () => {
    await cacheLoaded;
    try {
      if (info.status !== 'complete' || !tab.url) return;
      const data = parseInput(tab.url);
      if (!data || (!data.did && !data.handle)) return;

      // Case 1: URL had both DID and handle, cache the pair
      if (data.did && data.handle) {
        await cache.set(data.did, data.handle);
        return;
      }

      // Case 2: URL had only DID, resolve handle if not cached
      if (data.did && !data.handle) {
        const cachedHandle = cache.getHandle(data.did);
        if (cachedHandle) {
          return;
        }
        const resolvedHandle = await resolveDidToHandle(data.did);
        if (resolvedHandle) await cache.set(data.did, resolvedHandle);
        return;
      }

      // Case 3: URL had only handle, resolve DID if not cached
      if (data.handle && !data.did) {
        const cachedDid = cache.getDid(data.handle);
        if (cachedDid) {
          return;
        }
        const resolvedDid = await resolveHandleToDid(data.handle);
        if (resolvedDid) await cache.set(resolvedDid, data.handle);
        return;
      }
    } catch (error: unknown) {
      console.error('SW error', error);
    }
  })();
});
