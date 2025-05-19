// @ts-nocheck
// TODO: Use 'browser' API with polyfill for cross-browser support
import { parseInput, resolveDidToHandle } from '../shared/transform';

const DID_HANDLE_CACHE_KEY = 'didHandleCache';
const MAX_CACHE_ENTRIES = 1000; // Maximum number of entries to keep in the cache
const CLEANUP_THRESHOLD = 1.2 * MAX_CACHE_ENTRIES; // Start cleanup when we're 20% over limit

// Structure: { [did]: { handle: string, lastAccessed: number } }

/**
 * Updates the cache with a new entry and ensures it doesn't exceed the maximum size
 */
// Use a simple LRU cache with Map for better performance
let cache = new Map();
let isCacheDirty = false;
let cleanupScheduled = false;

// Load cache from storage on startup
async function loadCache() {
  try {
    const result = await chrome.storage.local.get(DID_HANDLE_CACHE_KEY);
    const stored = result[DID_HANDLE_CACHE_KEY] || {};
    // Keep only object-format entries (legacy strings are discarded)
    const entries = Object.entries(stored).filter(
      ([, entry]) => entry && typeof entry === 'object'
    );
    cache = new Map(entries);
  } catch (error) {
    console.error('Failed to load cache:', error);
  }
}

// Save cache to storage, but debounce to prevent frequent writes
let saveTimeout = null;
async function saveCache() {
  isCacheDirty = true;

  if (saveTimeout) clearTimeout(saveTimeout);

  // Debounce saves to prevent excessive writes
  return new Promise((resolve) => {
    saveTimeout = setTimeout(async () => {
      if (isCacheDirty) {
        try {
          await chrome.storage.local.set({
            [DID_HANDLE_CACHE_KEY]: Object.fromEntries(cache),
          });
          isCacheDirty = false;
        } catch (error) {
          console.error('Failed to save cache:', error);
          if (error.message.includes('QUOTA_BYTES')) {
            await clearOldCacheEntries(0.5);
            return saveCache().then(resolve);
          }
        }
      }
      resolve();
    }, 1000); // 1s debounce
  });
}

async function updateCache(did, handle) {
  try {
    // Update the in-memory cache
    cache.set(did, { handle, lastAccessed: Date.now() });

    // Schedule a cleanup if needed
    if (cache.size > CLEANUP_THRESHOLD && !cleanupScheduled) {
      cleanupScheduled = true;
      // Run cleanup on the next tick to avoid blocking the UI
      setTimeout(() => {
        cleanupCache().finally(() => {
          cleanupScheduled = false;
        });
      }, 0);
    }

    // Schedule a save to storage
    await saveCache();
  } catch (error) {
    console.error('Failed to update cache:', error);
  }
}

/**
 * Clears the oldest entries from the cache
 * @param {number} ratio - Fraction of the cache to clear (0-1)
 */
async function cleanupCache() {
  if (cache.size <= MAX_CACHE_ENTRIES) return;

  try {
    // Convert to array, sort, and keep only the most recent entries
    const sorted = Array.from(cache.entries()).sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Keep only the most recent MAX_CACHE_ENTRIES
    const toKeep = sorted.slice(-MAX_CACHE_ENTRIES);

    // Update the cache
    cache = new Map(toKeep);

    // Save the cleaned-up cache
    await saveCache();
  } catch (error) {
    console.error('Failed to clean up cache:', error);
  }
}

// For backward compatibility with the existing code
async function clearOldCacheEntries(ratio = 0.5) {
  if (cache.size === 0) return;

  try {
    const entries = Array.from(cache.entries());
    const sorted = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    const toKeep = sorted.slice(-Math.floor(entries.length * (1 - ratio)));

    cache = new Map(toKeep);
    await saveCache();
  } catch (error) {
    console.error('Failed to clear old cache entries:', error);
  }
}

// Initialize the cache when the service worker starts
loadCache().catch(console.error);

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_CACHE' && request.did && request.handle) {
    updateCache(request.did, request.handle)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Failed to update cache via message:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates async response
  }
  if (request.type === 'CLEAR_CACHE') {
    // Clear the in-memory cache
    cache.clear();
    // Clear the storage
    chrome.storage.local
      .remove(DID_HANDLE_CACHE_KEY)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Failed to clear storage cache:', error);
        sendResponse({
          success: false,
          error: error.message,
        });
      });

    return true; // Keep the message channel open for the async response
  }

  // For any other message types, we don't respond
  return false;
});

chrome.tabs.onUpdated.addListener(async (_, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;

  try {
    const data = await parseInput(tab.url);
    if (!data?.did || data.handle) return;

    // Check in-memory cache first
    const cached = cache.get(data.did);
    if (cached) {
      // Update lastAccessed in memory and schedule a save
      cached.lastAccessed = Date.now();
      saveCache().catch(console.error);
      return;
    }

    // Not in cache, resolve and add to cache
    const h = await resolveDidToHandle(data.did);
    if (h) {
      await updateCache(data.did, h);
    }
  } catch (e) {
    console.error('SW error', e);
  }
});
