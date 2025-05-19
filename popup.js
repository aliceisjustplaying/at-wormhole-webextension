/* global chrome */

document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('dest');
  const emptyBtn = document.getElementById('emptyCacheBtn');

  const showStatus = (msg) => (list.innerHTML = `<li>${msg}</li>`);
  const createItem = ({ url, label }) => `
    <li>
      <a href="${url}" target="_blank" rel="noopener noreferrer"
         style="display:block;padding:6px 8px;border:1px solid #ccc;border-radius:6px;background:#fafafa;text-decoration:none;color:inherit;font-size:14px;">
        ${label}
      </a>
    </li>`;
  const render = (ds) =>
    ds && ds.length ? (list.innerHTML = ds.map(createItem).join('')) : showStatus('No actions available');

  const rawParam = new URLSearchParams(location.search).get('payload');
  let raw = rawParam || (await chrome.tabs.query({ active: true, currentWindow: true }))[0].url;

  if (!window.WormholeTransform?.parseInput) {
    showStatus('Error: transform not loaded');
    return; // Exit if critical component is missing
  }

  const info = await window.WormholeTransform.parseInput(raw);
  if (!info?.did && !info?.atUri) {
    showStatus('No DID or at:// found');
    return; // Exit if no relevant data
  }

  let ds = window.WormholeTransform.buildDestinations(info); // Initial build (might be without handle)
  render(ds); // Initial render

  if (info.did && !info.handle) {
    let handleToUse = null;
    let errorStatusWasSet = false; // Flag to track if an error message was shown
    const { didHandleCache = {} } = await chrome.storage.local.get('didHandleCache');
    const cachedHandleValue = didHandleCache[info.did];

    if (typeof cachedHandleValue === 'string') {
      handleToUse = cachedHandleValue;
    } else {
      // Not a string in cache (or not present)
      if (cachedHandleValue !== undefined) {
        console.warn('Cached handle for DID', info.did, 'was not a string, re-fetching. Value:', cachedHandleValue);
      }

      // Show "Resolving..." status only if necessary. 
      // (`!ds.length` implies nothing was renderable initially, `cachedHandleValue !== undefined` implies we are re-fetching a bad cache entry)
      if (!ds.length || cachedHandleValue !== undefined) {
        showStatus('Resolving...');
      }

      try {
        if (typeof window.WormholeTransform.resolveDidToHandle !== 'function') {
          showStatus('Error: resolve fn missing');
          errorStatusWasSet = true; // Set flag
          // handleToUse remains null
        } else {
          const freshHandle = await window.WormholeTransform.resolveDidToHandle(info.did);
          if (freshHandle) {
            handleToUse = freshHandle;
            // Update cache with the correct string format
            await chrome.storage.local.set({ didHandleCache: { ...didHandleCache, [info.did]: freshHandle } });
          }
          // If freshHandle is null, handleToUse remains null (no specific error, just no handle found for DID)
        }
      } catch (err) {
        console.error('Error resolving DID to handle:', err);
        showStatus('Error resolving');
        errorStatusWasSet = true; // Set flag
        // handleToUse remains null due to error
      }
    }

    // After attempting to get handle from cache or by fetching:
    if (handleToUse) {
      info.handle = handleToUse;
      ds = window.WormholeTransform.buildDestinations(info); // Re-build destinations with the handle
      render(ds); // Re-render the list
    } else {
      // Handle was not obtained. An error status might have already been set.
      // If the list is still empty and no explicit error status was set, show "No actions available".
      if (!ds.length && !errorStatusWasSet) {
        showStatus('No actions available');
      }
    }
  }

  if (emptyBtn) {
    emptyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const originalText = emptyBtn.textContent;
      emptyBtn.textContent = 'Working...';
      emptyBtn.disabled = true;

      try {
        await chrome.storage.local.remove('didHandleCache');

        await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, (msgResponse) => {
            if (chrome.runtime.lastError) {
              console.error('Runtime error sending message:', chrome.runtime.lastError);
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (msgResponse && msgResponse.success) {
              resolve(msgResponse);
            } else {
              reject(new Error(msgResponse?.error || 'Unknown error from service worker'));
            }
          });
        });
        emptyBtn.textContent = 'Cleared';
      } catch (error) {
        console.error('Failed to clear cache:', error);
        emptyBtn.textContent = 'Error';
      } finally {
        setTimeout(() => {
          emptyBtn.textContent = originalText;
          emptyBtn.disabled = false;
        }, 1500);
      }
    });
  } else {
    console.error('emptyCacheBtn NOT FOUND even within DOMContentLoaded.');
  }
});

console.log('popup.js script finished initial global execution.');
