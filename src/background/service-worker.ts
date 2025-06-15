import { parseInput } from '../shared/parser';
import { resolveDidToHandle, resolveHandleToDid } from '../shared/resolver';
import { DidHandleCache } from '../shared/cache';
import Debug from '../shared/debug';
import type { SWMessage } from '../shared/types';

const cache = new DidHandleCache();

// Create initialization promise immediately at module level
const cacheInitialized = initializeCache();

async function initializeCache(): Promise<void> {
  try {
    // Load debug config - optional, so we ignore errors
    await Debug.loadRuntimeConfig().unwrapOr(undefined);
    Debug.serviceWorker('Service worker starting, loading cache...');
    await cache.load().match(
      () => {
        Debug.serviceWorker('Cache loaded successfully');
      },
      (error) => {
        Debug.error('serviceWorker', 'Failed to load cache:', error);
        // Continue with empty cache - don't throw
      },
    );

    // Clean up old cache format if it exists (one-time migration)
    try {
      const oldCacheData = await chrome.storage.local.get('didHandleCache');
      if (oldCacheData.didHandleCache !== undefined) {
        Debug.serviceWorker('Found old cache format, cleaning up...');
        await chrome.storage.local.remove('didHandleCache');
        Debug.serviceWorker('Old cache cleaned up successfully');
      }
    } catch (cleanupError: unknown) {
      // Don't fail initialization if cleanup fails
      Debug.warn('serviceWorker', 'Failed to clean up old cache:', cleanupError);
    }
  } catch (error: unknown) {
    Debug.error('serviceWorker', 'Failed to initialize:', error);
    // Continue with empty cache - don't throw
  }
}

// Handle messages from the popup
const messageListener = (
  request: SWMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean => {
  // UPDATE_CACHE
  if (request.type === 'UPDATE_CACHE' && typeof request.did === 'string' && typeof request.handle === 'string') {
    void (async () => {
      try {
        await cacheInitialized;
        await cache.set(request.did, request.handle).match(
          () => {
            sendResponse({ success: true });
          },
          (error) => {
            Debug.error('serviceWorker', 'Failed to update cache via message:', error);
            sendResponse({ success: false, error: error.message });
          },
        );
      } catch (error: unknown) {
        Debug.error('serviceWorker', 'Cache initialization error:', error);
        sendResponse({ success: false, error: 'Cache initialization failed' });
      }
    })();
    return true;
  }

  // GET_HANDLE
  if (request.type === 'GET_HANDLE' && typeof request.did === 'string') {
    void (async () => {
      try {
        await cacheInitialized;
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
                  Debug.error('serviceWorker', 'Failed to cache DID->handle mapping:', cacheError);
                },
              );
            }
            sendResponse({ handle, fromCache: false });
          },
          (error) => {
            Debug.error('serviceWorker', 'Resolve DID to handle failed:', error);
            sendResponse({ handle: null, fromCache: false });
          },
        );
      } catch (error: unknown) {
        Debug.error('serviceWorker', 'GET_HANDLE error:', error);
        sendResponse({ handle: null, fromCache: false, error: 'Cache initialization failed' });
      }
    })();
    return true;
  }

  // GET_DID
  if (request.type === 'GET_DID' && typeof request.handle === 'string') {
    void (async () => {
      try {
        await cacheInitialized;
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
                  Debug.error('serviceWorker', 'Failed to cache handle->DID mapping:', cacheError);
                },
              );
            }
            sendResponse({ did, fromCache: false });
          },
          (error) => {
            Debug.error('serviceWorker', 'Resolve handle to DID failed:', error);
            sendResponse({ did: null, fromCache: false });
          },
        );
      } catch (error: unknown) {
        Debug.error('serviceWorker', 'GET_DID error:', error);
        sendResponse({ did: null, fromCache: false, error: 'Cache initialization failed' });
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
    void (async () => {
      try {
        await cacheInitialized;
        await cache.clear().match(
          () => {
            sendResponse({ success: true });
          },
          (error) => {
            Debug.error('serviceWorker', 'Failed to clear cache:', error);
            sendResponse({ success: false, error: error.message });
          },
        );
      } catch (error: unknown) {
        Debug.error('serviceWorker', 'Clear cache initialization error:', error);
        sendResponse({ success: false, error: 'Cache initialization failed' });
      }
    })();
    return true;
  }

  return false;
};

chrome.runtime.onMessage.addListener(messageListener);

const tabUpdateListener = (_tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  void (async () => {
    try {
      await cacheInitialized;
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
                Debug.error('serviceWorker', 'Failed to cache DID+handle pair from URL:', error);
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
                      Debug.error('serviceWorker', 'Failed to cache background DID->handle resolution:', cacheError);
                    },
                  );
                }
              },
              (error) => {
                Debug.error('serviceWorker', 'Background DID->handle resolution failed:', error);
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
                      Debug.error('serviceWorker', 'Failed to cache background handle->DID resolution:', cacheError);
                    },
                  );
                }
              },
              (error) => {
                Debug.error('serviceWorker', 'Background handle->DID resolution failed:', error);
              },
            );
            return;
          }
        },
        (error) => {
          Debug.error('serviceWorker', 'URL parsing failed in background:', error);
        },
      );
    } catch (error: unknown) {
      Debug.error('serviceWorker', 'Tab update error:', error);
    }
  })();
};

chrome.tabs.onUpdated.addListener(tabUpdateListener);
