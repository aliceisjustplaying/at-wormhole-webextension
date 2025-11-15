import { parseInput } from '../shared/parser';
import { resolveDidToHandle, resolveHandleToDid } from '../shared/resolver';
import { DidHandleCache } from '../shared/cache';
import { debugLog, logError } from '../shared/logging';
import type { PageProbeResponse, ProbeSource, SWMessage, TransformInfo } from '../shared/types';
import { extractAtUriFromAlternateLinks, type AlternateLinkCandidate } from '../shared/rel-alternate';

const cache = new DidHandleCache();

// Create initialization promise immediately at module level
const cacheInitialized = initializeCache();

const PROBE_CACHE_PREFIX = 'pageProbe:';
const PROBE_CACHE_TTL_MS = 60_000;

interface ProbeCacheEntry {
  info: TransformInfo | null;
  atUri: string | null;
  source: ProbeSource | null;
  detectedAt: number;
  url: string;
}

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

function getSessionStorageArea(): chrome.storage.StorageArea | null {
  if ('session' in chrome.storage) {
    return chrome.storage.session;
  }
  return null;
}

async function getProbeCache(tabId: number): Promise<ProbeCacheEntry | null> {
  const session = getSessionStorageArea();
  if (!session) return null;
  const key = `${PROBE_CACHE_PREFIX}${tabId}`;
  const result: Record<string, unknown> = await session.get(key);
  const entry = result[key];
  if (!entry) {
    return null;
  }
  return entry as ProbeCacheEntry;
}

async function setProbeCache(tabId: number, entry: ProbeCacheEntry): Promise<void> {
  const session = getSessionStorageArea();
  if (!session) return;
  const key = `${PROBE_CACHE_PREFIX}${tabId}`;
  await session.set({ [key]: entry });
}

async function clearProbeCache(tabId: number): Promise<void> {
  const session = getSessionStorageArea();
  if (!session) return;
  const key = `${PROBE_CACHE_PREFIX}${tabId}`;
  await session.remove(key);
}

function shouldSkipProbe(url?: string): boolean {
  if (!url) return true;
  return !(url.startsWith('http://') || url.startsWith('https://'));
}

async function runRelAlternateProbe(tabId: number, tabUrl?: string): Promise<ProbeCacheEntry | null> {
  try {
    const injectionResults = (await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const head = document.head;
        const links = Array.from(head.querySelectorAll('link[rel]'));
        return links.map((link) => ({
          rel: link.getAttribute('rel'),
          href: link.getAttribute('href'),
          type: link.getAttribute('type'),
          title: link.getAttribute('title'),
        }));
      },
    })) as chrome.scripting.InjectionResult<AlternateLinkCandidate[]>[];

    const candidates: AlternateLinkCandidate[] = [];
    for (const result of injectionResults) {
      if (result.result) {
        candidates.push(...result.result);
      }
    }

    const match = extractAtUriFromAlternateLinks(candidates);
    return {
      info: match?.info ?? null,
      atUri: match?.atUri ?? null,
      source: match ? 'rel-alternate' : null,
      detectedAt: Date.now(),
      url: tabUrl ?? '',
    };
  } catch (error) {
    logError('serviceWorker', error);
    return null;
  }
}

async function handleProbeRequest(tabId: number, tabUrl?: string, force = false): Promise<PageProbeResponse> {
  if (shouldSkipProbe(tabUrl)) {
    return { info: null, atUri: null, source: null, cached: false };
  }

  if (!force) {
    try {
      const cached = await getProbeCache(tabId);
      if (cached && Date.now() - cached.detectedAt < PROBE_CACHE_TTL_MS) {
        if (tabUrl && (!cached.url || cached.url !== tabUrl)) {
          await clearProbeCache(tabId);
        } else if (cached.info && cached.atUri) {
          return { info: cached.info, atUri: cached.atUri, source: cached.source, cached: true };
        } else {
          // Cached miss - fall through to rerun probe so we don't stick with stale nulls
          await clearProbeCache(tabId);
        }
      }
    } catch (error) {
      logError('serviceWorker', error);
    }
  }

  const fresh = await runRelAlternateProbe(tabId, tabUrl);
  if (fresh?.atUri && fresh.info) {
    try {
      await setProbeCache(tabId, fresh);
    } catch (error) {
      logError('serviceWorker', error);
    }
    return { info: fresh.info, atUri: fresh.atUri, source: fresh.source, cached: false };
  }
  return { info: null, atUri: null, source: null, cached: false };
}

// Handle messages from the popup
const messageListener = (
  request: SWMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean => {
  if (request.type === 'PROBE_PAGE_FOR_AT_URI' && typeof request.tabId === 'number') {
    void (async () => {
      try {
        const response = await handleProbeRequest(request.tabId, request.tabUrl, request.force === true);
        sendResponse(response);
      } catch (error) {
        logError('serviceWorker', error);
        sendResponse({ info: null, atUri: null, source: null, cached: false });
      }
    })();
    return true;
  }

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

chrome.tabs.onRemoved.addListener((tabId) => {
  void clearProbeCache(tabId).catch((error: unknown) => logError('serviceWorker', error));
});

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
