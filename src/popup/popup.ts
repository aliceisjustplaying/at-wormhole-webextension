import { parseInput, buildDestinations, TransformInfo } from '../shared/transform';

// Local type for list items
interface Destination {
  url: string;
  label: string;
}

/**
 * Main entry for popup script. Runs on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  void (async () => {
    const list = document.getElementById('dest') as HTMLUListElement;
    const emptyBtn = document.getElementById('emptyCacheBtn') as HTMLButtonElement;

    // Close popup when a destination link is clicked (Firefox MV3 does not auto-close)
    list.addEventListener('click', (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (anchor?.href) {
        e.preventDefault();
        e.stopPropagation();
        void chrome.tabs.create({ url: anchor.href });
        window.close();
      }
    });

    const showStatus = (msg: string): void => {
      list.innerHTML = `<li>${msg}</li>`;
    };
    const createItem = ({ url, label }: Destination): string => `
    <li>
      <a href="${url}" target="_blank" rel="noopener noreferrer">
        ${label}
      </a>
    </li>`;
    const render = (ds: Destination[]): void => {
      if (ds.length) {
        list.innerHTML = ds.map(createItem).join('');
      } else {
        showStatus('No actions available');
      }
    };

    // Determine input: payload param or active tab URL
    const payload = new URLSearchParams(location.search).get('payload');
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeUrl = tabs[0]?.url ?? '';
    const raw: string = payload ?? activeUrl;
    if (!raw) {
      showStatus('No URL or payload provided');
      return;
    }

    const info: TransformInfo | null = await parseInput(raw);
    if (!info?.did && !info?.atUri) {
      showStatus('No DID or at:// found');
      return; // Exit if no relevant data
    }

    let ds = buildDestinations(info); // Initial build
    render(ds); // Initial render

    if (info.did && !info.handle) {
      let handleToUse: string | null = null;
      let errorStatusWasSet = false; // Flag to track if an error message was shown

      // Ask SW for a handle (from cache or resolved)
      showStatus('Resolving...');
      try {
        const response = await new Promise<{ handle: string | null }>((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'GET_HANDLE', did: info.did }, (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res as { handle: string | null });
            }
          });
        });
        handleToUse = response.handle;
      } catch (err: unknown) {
        console.error('GET_HANDLE error', err);
        showStatus('Error resolving');
        errorStatusWasSet = true;
      }

      // After attempting to get handle from cache or by fetching:
      if (handleToUse) {
        info.handle = handleToUse;
        ds = buildDestinations(info); // Re-build destinations with the handle
        render(ds); // Re-render the list
      } else {
        // Handle was not obtained. An error status might have already been set.
        // If the list is still empty and no explicit error status was set, show "No actions available".
        if (!ds.length && !errorStatusWasSet) {
          showStatus('No actions available');
        }
      }
    }

    // If we have a handle but no did, resolve DID via SW
    if (info.handle && !info.did) {
      let didToUse: string | null = null;
      let errorStatusWasSet = false;
      showStatus('Resolving...');
      try {
        const response = await new Promise<{ did: string | null }>((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'GET_DID', handle: info.handle! }, (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res as { did: string | null });
            }
          });
        });
        didToUse = response.did;
      } catch (err: unknown) {
        console.error('GET_DID error', err);
        showStatus('Error resolving');
        errorStatusWasSet = true;
      }
      if (didToUse) {
        info.did = didToUse;
        ds = buildDestinations(info);
        render(ds);
      } else if (!ds.length && !errorStatusWasSet) {
        showStatus('No actions available');
      }
    }

    emptyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const originalText = emptyBtn.textContent;
      emptyBtn.textContent = 'Working...';
      emptyBtn.disabled = true;

      void (async () => {
        await chrome.storage.local.remove('didHandleCache');

        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, (rawRes: unknown) => {
            const res = rawRes as { success: boolean; error?: string };
            if (chrome.runtime.lastError) {
              console.error('Runtime error sending message:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (res.success) {
              resolve();
            } else {
              reject(new Error(res.error ?? 'Unknown error from service worker'));
            }
          });
        });
        emptyBtn.textContent = 'Cleared';
      })()
        .catch((error: unknown) => {
          console.error('Failed to clear cache:', error);
          emptyBtn.textContent = 'Error';
        })
        .finally(() => {
          setTimeout(() => {
            emptyBtn.textContent = originalText;
            emptyBtn.disabled = false;
          }, 1500);
        });
    });
  })();
});

console.log('popup.js script finished initial global execution.');
