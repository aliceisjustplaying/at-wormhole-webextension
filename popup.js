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

  let ds = window.WormholeTransform.buildDestinations(info);
  render(ds);

  if (info.did && !info.handle) {
    const { didHandleCache = {} } = await chrome.storage.local.get('didHandleCache');
    const cachedHandleValue = didHandleCache[info.did];

    if (typeof cachedHandleValue === 'string') {
      // Cached handle is a string, use it
      info.handle = cachedHandleValue;
      ds = window.WormholeTransform.buildDestinations(info); // Re-build ds with the handle
      render(ds); // Re-render
    } else {
      // Handle is not in cache as a string (either undefined or a non-string type)
      if (cachedHandleValue !== undefined) {
        // It existed but was not a string, log it.
        console.warn('Cached handle for DID', info.did, 'was not a string, re-fetching. Value:', cachedHandleValue);
      }

      // Show "Resolving..." if list is empty OR if we are about to overwrite a bad/missing cache entry
      // The condition `!ds.length` comes from the original code structure.
      // The condition `cachedHandleValue !== undefined` ensures "Resolving..." is shown if we just invalidated a non-string cache entry.
      if (!ds.length || cachedHandleValue !== undefined) {
        showStatus('Resolving...');
      }

      try {
        if (typeof window.WormholeTransform.resolveDidToHandle !== 'function') {
          showStatus('Error: resolve fn missing');
        } else {
          const freshHandle = await window.WormholeTransform.resolveDidToHandle(info.did); // freshHandle is a string
          if (freshHandle) {
            info.handle = freshHandle;
            ds = window.WormholeTransform.buildDestinations(info); // Re-build ds
            render(ds); // Re-render
            // Store the correct string format in cache, potentially overwriting a bad entry
            await chrome.storage.local.set({ didHandleCache: { ...didHandleCache, [info.did]: freshHandle } });
          } else if (!ds.length) {
            // Only show "No actions" if list is still empty after failed fetch
            showStatus('No actions available');
          }
        }
      } catch (err) {
        console.error('Error resolving DID to handle:', err);
        showStatus('Error resolving'); // Show error status
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
        await chrome.storage.local.remove('didHandleCache'); // Old key

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
