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
  await cache.load().match(
    () => {
      Debug.serviceWorker('Cache loaded successfully');
    },
    (error) => {
      Debug.error('serviceWorker', 'Failed to load cache:', error);
    },
  );
})().catch((error: unknown) => {
  Debug.error('serviceWorker', 'Failed to initialize:', error);
});

// Handle messages from the popup
const messageListener = (
  request: SWMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean => {
  // UPDATE_CACHE
  if (request.type === 'UPDATE_CACHE' && typeof request.did === 'string' && typeof request.handle === 'string') {
    void cache.set(request.did, request.handle).match(
      () => {
        sendResponse({ success: true });
      },
      (error) => {
        console.error('Failed to update cache via message:', error);
        sendResponse({ success: false, error: error.message });
      },
    );
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
        const result = await resolveDidToHandle(request.did);
        await result.match(
          async (handle) => {
            if (handle) {
              await cache.set(request.did, handle).match(
                () => {
                  // Success - no action needed
                },
                (cacheError) => {
                  console.error('Failed to cache DID->handle mapping:', cacheError);
                },
              );
            }
            sendResponse({ handle, fromCache: false });
          },
          (error) => {
            console.error('Resolve DID to handle failed:', error);
            sendResponse({ handle: null, fromCache: false });
          },
        );
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
        const result = await resolveHandleToDid(request.handle);
        await result.match(
          async (did) => {
            if (did) {
              await cache.set(did, request.handle).match(
                () => {
                  // Success - no action needed
                },
                (cacheError) => {
                  console.error('Failed to cache handle->DID mapping:', cacheError);
                },
              );
            }
            sendResponse({ did, fromCache: false });
          },
          (error) => {
            console.error('Resolve handle to DID failed:', error);
            sendResponse({ did: null, fromCache: false });
          },
        );
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
    void cache.clear().match(
      () => {
        sendResponse({ success: true });
      },
      (error) => {
        console.error('Failed to clear cache:', error);
        sendResponse({ success: false, error: error.message });
      },
    );
    return true;
  }

  return false;
};

chrome.runtime.onMessage.addListener(messageListener);

const tabUpdateListener = (_tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  void (async () => {
    await cacheLoaded;
    try {
      if (info.status !== 'complete' || !tab.url) return;

      const parseResult = parseInput(tab.url);
      await parseResult.match(
        async (data) => {
          if (!data || (!data.did && !data.handle)) return;

          // Case 1: URL had both DID and handle, cache the pair
          if (data.did && data.handle) {
            await cache.set(data.did, data.handle).match(
              () => {
                // Success - no action needed
              },
              (error) => {
                console.error('Failed to cache DID+handle pair from URL:', error);
              },
            );
            return;
          }

          // Case 2: URL had only DID, resolve handle if not cached
          if (data.did && !data.handle) {
            const cachedHandle = cache.getHandle(data.did);
            if (cachedHandle) {
              return;
            }
            const result = await resolveDidToHandle(data.did);
            await result.match(
              async (handle) => {
                if (handle && data.did) {
                  await cache.set(data.did, handle).match(
                    () => {
                      // Success - no action needed
                    },
                    (cacheError) => {
                      console.error('Failed to cache background DID->handle resolution:', cacheError);
                    },
                  );
                }
              },
              (error) => {
                console.error('Background DID->handle resolution failed:', error);
              },
            );
            return;
          }

          // Case 3: URL had only handle, resolve DID if not cached
          if (data.handle && !data.did) {
            const cachedDid = cache.getDid(data.handle);
            if (cachedDid) {
              return;
            }
            const result = await resolveHandleToDid(data.handle);
            await result.match(
              async (did) => {
                if (did && data.handle) {
                  await cache.set(did, data.handle).match(
                    () => {
                      // Success - no action needed
                    },
                    (cacheError) => {
                      console.error('Failed to cache background handle->DID resolution:', cacheError);
                    },
                  );
                }
              },
              (error) => {
                console.error('Background handle->DID resolution failed:', error);
              },
            );
            return;
          }
        },
        (error) => {
          console.error('URL parsing failed in background:', error);
        },
      );
    } catch (error: unknown) {
      console.error('SW error', error);
    }
  })();
};

chrome.tabs.onUpdated.addListener(tabUpdateListener);
