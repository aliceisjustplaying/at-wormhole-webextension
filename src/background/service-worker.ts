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
          sendResponse({ handle });
          return;
        }
        const resolvedHandle = await resolveDidToHandle(request.did);
        if (resolvedHandle) await cache.set(request.did, resolvedHandle);
        sendResponse({ handle: resolvedHandle ?? null });
      } catch (e: unknown) {
        console.error('GET_HANDLE error', e);
        sendResponse({ handle: null });
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
          sendResponse({ did });
          return;
        }
        const resolvedDid = await resolveHandleToDid(request.handle);
        if (resolvedDid) await cache.set(resolvedDid, request.handle);
        sendResponse({ did: resolvedDid ?? null });
      } catch {
        sendResponse({ did: null });
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
      if (!data?.did) return;

      // If URL had a handle, cache the pair
      if (data.handle) {
        await cache.set(data.did, data.handle);
        return;
      }

      // Check if we already have this DID cached
      const cachedHandle = cache.getHandle(data.did);
      if (cachedHandle) {
        return;
      }

      // Resolve and cache the handle
      const resolvedHandle = await resolveDidToHandle(data.did);
      if (resolvedHandle) await cache.set(data.did, resolvedHandle);
    } catch (error: unknown) {
      console.error('SW error', error);
    }
  })();
});
