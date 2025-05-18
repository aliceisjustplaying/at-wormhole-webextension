// service-worker.js

// Try to import transform.js. 
// In Manifest V3, for service workers, direct global function exposure from importScripts is typical.
// If transform.js is structured to put its functions on a global (e.g., self.WormholeTransform),
// we'd use that. Assuming it makes functions globally available for now.
try {
  importScripts('transform.js');
} catch (e) {
  console.error("Failed to import transform.js in service-worker:", e);
}

const DID_HANDLE_CACHE_KEY = 'didHandleCache'; // Caching re-enabled

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Ensure functions are available (they should be if importScripts worked)
  if (typeof parseInput !== 'function' || typeof resolveDidToHandle !== 'function') {
    console.error('Service Worker: parseInput or resolveDidToHandle not defined. Check transform.js import.');
    return;
  }

  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Service Worker: Tab ${tabId} updated to complete, URL: ${tab.url}`);
    try {
      const info = await parseInput(tab.url);
      if (info && info.did && !info.handle) { // We have a DID but no immediate handle
        console.log(`Service Worker: Found DID ${info.did} from ${tab.url}, attempting to resolve handle for pre-caching.`);
        
        // Check if we already have this DID in cache to avoid unnecessary re-fetching by the service worker itself
        // The popup will have its own logic to prefer cache then fetch.
        const cache = await chrome.storage.local.get(DID_HANDLE_CACHE_KEY);
        const currentCache = cache[DID_HANDLE_CACHE_KEY] || {};
        if (currentCache[info.did]) {
          console.log(`Service Worker: Handle for DID ${info.did} already in cache, no pre-fetch needed by worker.`);
          return;
        }

        const resolvedHandle = await resolveDidToHandle(info.did);

        if (resolvedHandle) {
          console.log(`Service Worker: Successfully resolved DID ${info.did} to handle ${resolvedHandle}. Caching.`);
          const newCacheEntry = { [info.did]: resolvedHandle };
          const updatedCache = { ...currentCache, ...newCacheEntry };
          await chrome.storage.local.set({ [DID_HANDLE_CACHE_KEY]: updatedCache });
          console.log(`Service Worker: DID ${info.did} -> Handle ${resolvedHandle} saved to cache.`);
        } else {
          console.log(`Service Worker: Could not resolve handle for DID ${info.did} from ${tab.url}. Not caching.`);
        }
      }
    } catch (error) {
      console.error(`Service Worker: Error processing tab update for ${tab.url}:`, error);
    }
  }
});

console.log("Service Worker started and listeners added (caching re-enabled).");
