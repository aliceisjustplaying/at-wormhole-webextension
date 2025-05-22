import { parseInput, resolveDidToHandle, resolveHandleToDid } from '../shared/transform';
import Debug from '../shared/debug';

const DID_HANDLE_CACHE_KEY = 'didHandleCache';
const MAX_CACHE_ENTRIES = 1000; // Maximum number of entries to keep in the cache
const CLEANUP_THRESHOLD = 1.2 * MAX_CACHE_ENTRIES; // Start cleanup when we're 20% over limit

// Type definitions for cache entries
interface CacheEntry {
  handle: string;
  lastAccessed: number;
}

// Structure: { [did]: { handle: string, lastAccessed: number } }

/**
 * Updates the cache with a new entry and ensures it doesn't exceed the maximum size
 */
// Use a simple LRU cache with Map for better performance
let didToHandle = new Map<string, CacheEntry>();
const handleToDid = new Map<string, string>();
let isCacheDirty = false;
let cleanupScheduled = false;

// Load cache from storage on startup
async function loadCache(): Promise<void> {
  try {
    const result = await chrome.storage.local.get<Record<string, unknown>>(DID_HANDLE_CACHE_KEY);
    const stored = result[DID_HANDLE_CACHE_KEY];
    const rawEntries =
      typeof stored === 'object' && stored != null ? Object.entries(stored as Record<string, unknown>) : [];
    const validEntries: [string, CacheEntry][] = [];
    for (const [key, val] of rawEntries) {
      if (typeof val === 'object' && val != null) {
        const e = val as Record<string, unknown>;
        if (typeof e.handle === 'string' && typeof e.lastAccessed === 'number') {
          validEntries.push([key, { handle: e.handle, lastAccessed: e.lastAccessed }]);
        }
      }
    }
    didToHandle = new Map(validEntries);
    // Populate reverse map
    handleToDid.clear();
    for (const [did, entry] of didToHandle) {
      handleToDid.set(entry.handle, did);
    }
  } catch (error: unknown) {
    console.error('Failed to load cache:', error);
  }
}

// Save cache to storage, but debounce to prevent frequent writes
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Performs the actual save and cache-quota handling
 */
async function _doSave(resolve: () => void): Promise<void> {
  if (isCacheDirty) {
    try {
      await chrome.storage.local.set({
        [DID_HANDLE_CACHE_KEY]: Object.fromEntries(didToHandle),
      });
      isCacheDirty = false;
    } catch (error: unknown) {
      console.error('Failed to save cache:', error);
      if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
        await clearOldCacheEntries(0.5);
        void saveCache().then(resolve);
        return;
      }
    }
  }
  resolve();
}

async function saveCache(): Promise<void> {
  isCacheDirty = true;
  if (saveTimeout) clearTimeout(saveTimeout);
  return new Promise<void>((resolve) => {
    saveTimeout = setTimeout(() => {
      void _doSave(resolve);
    }, 1000); // debounce
  });
}

async function updateCache(did: string, handle: string): Promise<void> {
  try {
    Debug.cache('Updating cache:', { did, handle });
    // Update the in-memory cache
    didToHandle.set(did, { handle, lastAccessed: Date.now() });
    // Update reverse cache
    handleToDid.set(handle, did);

    // Schedule a cleanup if needed
    if (didToHandle.size > CLEANUP_THRESHOLD && !cleanupScheduled) {
      cleanupScheduled = true;
      // Run cleanup on the next tick to avoid blocking the UI
      setTimeout(() => {
        void cleanupCache().finally(() => {
          cleanupScheduled = false;
        });
      }, 0);
    }

    // Schedule a save to storage
    await saveCache();
  } catch (error: unknown) {
    console.error('Failed to update cache:', error);
  }
}

/**
 * Clears the oldest entries from the cache
 * @param {number} ratio - Fraction of the cache to clear (0-1)
 */
async function clearOldCacheEntries(ratio = 0.5): Promise<void> {
  if (didToHandle.size === 0) return;

  try {
    const entries = Array.from(didToHandle.entries());
    const sorted = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    const toKeep = sorted.slice(-Math.floor(entries.length * (1 - ratio)));

    didToHandle = new Map(toKeep);
    // Rebuild reverse handle->did map
    handleToDid.clear();
    for (const [d, e] of didToHandle) {
      handleToDid.set(e.handle, d);
    }
    await saveCache();
  } catch (error: unknown) {
    console.error('Failed to clear old cache entries:', error);
  }
}

/**
 * Clears the oldest entries from the cache if over limit
 */
async function cleanupCache(): Promise<void> {
  if (didToHandle.size <= MAX_CACHE_ENTRIES) return;

  try {
    // Convert to array, sort, and keep only the most recent entries
    const sorted = Array.from(didToHandle.entries()).sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Keep only the most recent MAX_CACHE_ENTRIES
    const toKeep = sorted.slice(-MAX_CACHE_ENTRIES);

    didToHandle = new Map(toKeep);
    // Rebuild reverse handle->did map
    handleToDid.clear();
    for (const [d, e] of didToHandle) {
      handleToDid.set(e.handle, d);
    }

    // Save the cleaned-up cache
    await saveCache();
  } catch (error: unknown) {
    console.error('Failed to clean up cache:', error);
  }
}

// Initialize the cache when the service worker starts
const cacheLoaded = (async () => {
  await Debug.loadRuntimeConfig();
  Debug.serviceWorker('Service worker starting, loading cache...');
  await loadCache();
  Debug.serviceWorker('Cache loaded successfully');
})().catch((error: unknown) => {
  Debug.error('serviceWorker', 'Failed to initialize:', error);
});

// Message types for service worker comms
type SWMessage =
  | { type: 'UPDATE_CACHE'; did: string; handle: string }
  | { type: 'GET_HANDLE'; did: string }
  | { type: 'GET_DID'; handle: string }
  | { type: 'CLEAR_CACHE' }
  | { type: 'DEBUG_LOG'; message: string };

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request: SWMessage, sender, sendResponse): boolean => {
  // UPDATE_CACHE
  if (request.type === 'UPDATE_CACHE' && typeof request.did === 'string' && typeof request.handle === 'string') {
    void updateCache(request.did, request.handle)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error: unknown) => {
        console.error('Failed to update cache via message:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      });
    return true; // Indicates async response
  }
  // GET_HANDLE
  if (request.type === 'GET_HANDLE' && typeof request.did === 'string') {
    void (async () => {
      await cacheLoaded;
      try {
        const entry = didToHandle.get(request.did);
        if (entry) {
          entry.lastAccessed = Date.now();
          void saveCache().catch(console.error);
          sendResponse({ handle: entry.handle });
          return;
        }
        const h = await resolveDidToHandle(request.did);
        if (h) await updateCache(request.did, h);
        sendResponse({ handle: h ?? null });
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
        const d = handleToDid.get(request.handle);
        if (d) {
          const entry = didToHandle.get(d);
          if (entry) {
            entry.lastAccessed = Date.now();
            void saveCache().catch(console.error);
          }
          sendResponse({ did: d });
          return;
        }
        const dd = await resolveHandleToDid(request.handle);
        if (dd) await updateCache(dd, request.handle);
        sendResponse({ did: dd ?? null });
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
    // Clear the in-memory cache
    didToHandle.clear();
    handleToDid.clear();
    // Clear the storage
    void chrome.storage.local
      .remove(DID_HANDLE_CACHE_KEY)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error: unknown) => {
        console.error('Failed to clear storage cache:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      });

    return true; // Keep the message channel open for the async response
  }

  // For any other message types, we don't respond
  return false;
});

chrome.tabs.onUpdated.addListener((_tabId, info, tab) => {
  void (async () => {
    await cacheLoaded;
    try {
      if (info.status !== 'complete' || !tab.url) return;
      const data = await parseInput(tab.url);
      if (!data?.did) return;
      // If URL had a handle, cache the pair
      if (data.handle) {
        await updateCache(data.did, data.handle);
        return;
      }

      const cached = didToHandle.get(data.did);
      if (cached) {
        cached.lastAccessed = Date.now();
        void saveCache().catch(console.error);
        return;
      }

      const h = await resolveDidToHandle(data.did);
      if (h) await updateCache(data.did, h);
    } catch (error: unknown) {
      console.error('SW error', error);
    }
  })();
});
