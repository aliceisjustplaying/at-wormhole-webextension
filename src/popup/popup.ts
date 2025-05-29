import { parseInput } from '../shared/parser';
import { buildDestinations } from '../shared/services';
import Debug from '../shared/debug';
import type { TransformInfo, BrowserWithTheme, DebugConfig, Destination, WindowWithDebug } from '../shared/types';

/**
 * Applies Firefox theme colors to the popup if available, falls back to CSS media query
 */
async function applyTheme(): Promise<void> {
  Debug.theme('Theme detection starting...');

  // Only attempt theme detection in Firefox
  const browserWithTheme = chrome as BrowserWithTheme;
  if (!browserWithTheme.theme?.getCurrent) {
    Debug.theme('Theme API not available (likely Chrome or older Firefox)');
    return;
  }

  Debug.theme('Theme API available, getting current theme...');

  try {
    const theme = await browserWithTheme.theme.getCurrent();
    Debug.theme('Raw theme object:', theme);

    if (!theme.colors) {
      Debug.warn('theme', 'No colors in theme, using CSS fallback');
      return;
    }

    const colors = theme.colors;
    Debug.theme('Theme colors found:', colors);

    const style = document.createElement('style');
    style.id = 'firefox-theme-override';

    // Build CSS custom properties from theme colors
    const cssVars = [];

    // Use popup colors first (most appropriate for our popup)
    if (colors.popup) {
      cssVars.push(`--theme-bg: ${colors.popup}`);
      Debug.theme(`Background: ${colors.popup}`);
    } else if (colors.toolbar) {
      cssVars.push(`--theme-bg: ${colors.toolbar}`);
      Debug.theme(`Background (toolbar fallback): ${colors.toolbar}`);
    }

    if (colors.popup_text) {
      cssVars.push(`--theme-text: ${colors.popup_text}`);
      Debug.theme(`Text: ${colors.popup_text}`);
    } else if (colors.toolbar_text) {
      cssVars.push(`--theme-text: ${colors.toolbar_text}`);
      Debug.theme(`Text (toolbar fallback): ${colors.toolbar_text}`);
    }

    if (colors.popup_border) {
      cssVars.push(`--theme-border: ${colors.popup_border}`);
      Debug.theme(`Border: ${colors.popup_border}`);
    } else if (colors.toolbar_field_border) {
      cssVars.push(`--theme-border: ${colors.toolbar_field_border}`);
      Debug.theme(`Border (field fallback): ${colors.toolbar_field_border}`);
    }

    // For buttons, use popup_highlight or toolbar_field colors
    if (colors.popup_highlight) {
      cssVars.push(`--theme-button-bg: ${colors.popup_highlight}`);
      Debug.theme(`Button bg: ${colors.popup_highlight}`);
    } else if (colors.toolbar_field) {
      cssVars.push(`--theme-button-bg: ${colors.toolbar_field}`);
      Debug.theme(`Button bg (field fallback): ${colors.toolbar_field}`);
    }

    if (colors.popup_highlight_text) {
      cssVars.push(`--theme-button-text: ${colors.popup_highlight_text}`);
      Debug.theme(`Button text: ${colors.popup_highlight_text}`);
    } else if (colors.toolbar_field_text) {
      cssVars.push(`--theme-button-text: ${colors.toolbar_field_text}`);
      Debug.theme(`Button text (field fallback): ${colors.toolbar_field_text}`);
    }

    // Hover effects
    if (colors.button_background_hover) {
      cssVars.push(`--theme-button-hover: ${colors.button_background_hover}`);
      Debug.theme(`Button hover: ${colors.button_background_hover}`);
    }

    Debug.theme(`Total CSS vars created: ${cssVars.length}`);

    // Only apply if we have meaningful theme colors
    if (cssVars.length > 0) {
      style.textContent = `
        :root { ${cssVars.join('; ')}; }
        body.firefox-theme {
          background: var(--theme-bg, var(--fallback-bg)) !important;
          color: var(--theme-text, var(--fallback-text)) !important;
        }
        body.firefox-theme button,
        body.firefox-theme ul#dest a {
          background: var(--theme-button-bg, var(--fallback-button-bg)) !important;
          color: var(--theme-button-text, var(--fallback-button-text)) !important;
          border-color: var(--theme-border, var(--fallback-border)) !important;
        }
        body.firefox-theme button:hover,
        body.firefox-theme ul#dest a:hover {
          background: var(--theme-button-hover, var(--theme-button-bg, var(--fallback-hover-bg))) !important;
          filter: brightness(1.1);
        }
        body.firefox-theme hr {
          background-color: var(--theme-border, var(--fallback-border)) !important;
        }
      `;

      document.head.appendChild(style);
      document.body.classList.add('firefox-theme');
      Debug.theme('Firefox theme applied successfully!');
      Debug.theme('CSS applied:', style.textContent);
    } else {
      Debug.warn('theme', 'No usable theme colors found, using CSS fallback');
    }
  } catch (error) {
    Debug.error('theme', 'Theme detection failed:', error);
  }
}

// Local type for list items

/**
 * Main entry for popup script. Runs on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  void (async () => {
    // Load debug configuration
    await Debug.loadRuntimeConfig();
    Debug.popup('Popup initialized');

    // Apply Firefox theme if available
    await applyTheme();
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
      Debug.popup('Showing status:', msg);
      list.innerHTML = `<li>${msg}</li>`;
    };
    const createItem = ({ url, label }: Destination): string => `
    <li>
      <a href="${url}" target="_blank" rel="noopener noreferrer">
        ${label}
      </a>
    </li>`;
    const render = (ds: Destination[]): void => {
      Debug.popup('Rendering destinations:', ds.length);
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
    Debug.parsing('Processing input:', raw);
    if (!raw) {
      showStatus('No URL or payload provided');
      return;
    }

    const info: TransformInfo | null = await parseInput(raw);
    Debug.parsing('Parse result:', info);
    if (!info?.did && !info?.atUri) {
      showStatus('No DID or at:// URI found in current tab.');
      return;
    }

    let ds = buildDestinations(info);
    render(ds);

    if (info.did && !info.handle) {
      let handleToUse: string | null = null;
      let errorStatusWasSet = false;

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

// Expose debug controls to browser console for development
// Usage: window.wormholeDebug.theme(true) or window.wormholeDebug.getConfig()

(window as unknown as WindowWithDebug).wormholeDebug = {
  theme: (enabled: boolean) => {
    Debug.setCategory('theme', enabled);
  },
  cache: (enabled: boolean) => {
    Debug.setCategory('cache', enabled);
  },
  parsing: (enabled: boolean) => {
    Debug.setCategory('parsing', enabled);
  },
  popup: (enabled: boolean) => {
    Debug.setCategory('popup', enabled);
  },
  serviceWorker: (enabled: boolean) => {
    Debug.setCategory('serviceWorker', enabled);
  },
  transform: (enabled: boolean) => {
    Debug.setCategory('transform', enabled);
  },
  getConfig: () => Debug.getConfig(),
  all: (enabled: boolean) => {
    const categories: (keyof DebugConfig)[] = ['theme', 'cache', 'parsing', 'popup', 'serviceWorker', 'transform'];
    categories.forEach((category) => {
      Debug.setCategory(category, enabled);
    });
  },
};
