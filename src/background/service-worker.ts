import { parseInput } from '../shared/parser';
import { resolveDidToHandle, resolveHandleToDid } from '../shared/resolver';
import { DidHandleCache } from '../shared/cache';
import { debugLog, logError } from '../shared/logging';
import type { SWMessage } from '../shared/types';

const cache = new DidHandleCache();

// Create initialization promise immediately at module level
const cacheInitialized = initializeCache();

async function initializeCache(): Promise<void> {
  try {
    debugLog('serviceWorker', 'Service worker starting, loading cache...');
    await cache.load().match(
      () => {
        debugLog('serviceWorker', 'Cache loaded successfully');
      },
      (error) => {
        logError('serviceWorker', error);
        // Continue with empty cache - don't throw
      },
    );

    // Clean up old cache format if it exists (one-time migration)
    try {
      const oldCacheData = await chrome.storage.local.get('didHandleCache');
      if (oldCacheData.didHandleCache !== undefined) {
        debugLog('serviceWorker', 'Found old cache format, cleaning up...');
        await chrome.storage.local.remove('didHandleCache');
        debugLog('serviceWorker', 'Old cache cleaned up successfully');
      }
    } catch (cleanupError: unknown) {
      // Don't fail initialization if cleanup fails
      logError('serviceWorker', cleanupError);
    }
  } catch (error: unknown) {
    logError('serviceWorker', error);
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
            logError('serviceWorker', error);
            sendResponse({ success: false, error: error.message });
          },
        );
      } catch (error: unknown) {
        logError('serviceWorker', error);
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
                  logError('serviceWorker', cacheError);
                },
              );
            }
            sendResponse({ handle, fromCache: false });
          },
          (error) => {
            logError('serviceWorker', error);
            sendResponse({ handle: null, fromCache: false });
          },
        );
      } catch (error: unknown) {
        logError('serviceWorker', error);
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
                  logError('serviceWorker', cacheError);
                },
              );
            }
            sendResponse({ did, fromCache: false });
          },
          (error) => {
            logError('serviceWorker', error);
            sendResponse({ did: null, fromCache: false });
          },
        );
      } catch (error: unknown) {
        logError('serviceWorker', error);
        sendResponse({ did: null, fromCache: false, error: 'Cache initialization failed' });
      }
    })();
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
            logError('serviceWorker', error);
            sendResponse({ success: false, error: error.message });
          },
        );
      } catch (error: unknown) {
        logError('serviceWorker', error);
        sendResponse({ success: false, error: 'Cache initialization failed' });
      }
    })();
    return true;
  }

  return false;
};

chrome.runtime.onMessage.addListener(messageListener);

const tabUpdateListener = (_tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void => {
  if (info.status !== 'complete' || !tab.url) {
    return;
  }

  if (!tab.url.startsWith('http')) {
    return;
  }

  void precacheFromUrl(tab.url);
};

chrome.tabs.onUpdated.addListener(tabUpdateListener);

async function precacheFromUrl(rawUrl: string): Promise<void> {
  try {
    await cacheInitialized;
    const parseResult = parseInput(rawUrl);
    await parseResult.match(
      async (info) => {
        if (!info) {
          return;
        }

        if (info.did && info.handle) {
          await cache.set(info.did, info.handle).match(
            () => undefined,
            (error) => {
              logError('serviceWorker', error);
            },
          );
          return;
        }

        if (info.did && !info.handle) {
          const cachedHandle = cache.getHandle(info.did);
          if (cachedHandle) return;
          const result = await resolveDidToHandle(info.did);
          await result.match(
            async (handle) => {
              if (handle) {
                await cache.set(info.did!, handle).match(
                  () => undefined,
                  (error) => logError('serviceWorker', error),
                );
              }
            },
            (error) => {
              logError('serviceWorker', error);
            },
          );
          return;
        }

        if (info.handle && !info.did) {
          const cachedDid = cache.getDid(info.handle);
          if (cachedDid) return;
          const result = await resolveHandleToDid(info.handle);
          await result.match(
            async (did) => {
              if (did) {
                await cache.set(did, info.handle!).match(
                  () => undefined,
                  (error) => logError('serviceWorker', error),
                );
              }
            },
            (error) => {
              logError('serviceWorker', error);
            },
          );
        }
      },
      (error) => {
        logError('serviceWorker', error);
      },
    );
  } catch (error) {
    logError('serviceWorker', error);
  }
}
