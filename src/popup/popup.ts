import { parseInput } from '../shared/parser';
import { buildDestinations } from '../shared/services';
import { getOptions, getDefaultOptions } from '../shared/options';
import type { BrowserWithTheme, Destination } from '../shared/types';
import { ResultAsync } from 'neverthrow';
import { runtimeError, type RuntimeError } from '../shared/errors';
import { debugLog } from '../shared/logging';

async function applyFirefoxTheme(): Promise<void> {
  const browserWithTheme = chrome as BrowserWithTheme;
  if (!browserWithTheme.theme?.getCurrent) {
    return;
  }

  try {
    const theme = await browserWithTheme.theme.getCurrent();
    const colors = theme.colors;
    if (!colors) return;

    const cssVars: string[] = [];
    const pick = (...values: (string | undefined)[]) => values.find((value) => typeof value === 'string');

    const bg = pick(colors.popup, colors.toolbar);
    const text = pick(colors.popup_text, colors.toolbar_text);
    const border = pick(colors.popup_border, colors.toolbar_field_border);
    const buttonBg = pick(colors.popup_highlight, colors.toolbar_field);
    const buttonText = pick(colors.popup_highlight_text, colors.toolbar_field_text);
    const buttonHover = colors.button_background_hover;

    if (bg) cssVars.push(`--theme-bg: ${bg}`);
    if (text) cssVars.push(`--theme-text: ${text}`);
    if (border) cssVars.push(`--theme-border: ${border}`);
    if (buttonBg) cssVars.push(`--theme-button-bg: ${buttonBg}`);
    if (buttonText) cssVars.push(`--theme-button-text: ${buttonText}`);
    if (buttonHover) cssVars.push(`--theme-button-hover: ${buttonHover}`);

    if (!cssVars.length) return;

    let style = document.getElementById('firefox-theme-vars') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'firefox-theme-vars';
      document.head.appendChild(style);
    }
    style.textContent = `:root { ${cssVars.join('; ')}; }`;
    document.body.classList.add('firefox-theme');
  } catch (error) {
    debugLog('popup', 'Firefox theme detection failed', error);
  }
}

/**
 * Sends a message to the runtime (service worker) and returns the response wrapped in a Result
 */
function sendRuntimeMessage<T>(message: unknown): ResultAsync<T, RuntimeError> {
  return ResultAsync.fromPromise(
    new Promise<T>((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response as T);
        }
      });
    }),
    (error) => runtimeError(error instanceof Error ? error.message : 'Unknown runtime error', error),
  );
}

// Local type for list items

/**
 * Main entry for popup script. Runs on DOMContentLoaded.
 */
const domContentLoadedHandler = () => {
  void (async () => {
    await applyFirefoxTheme();
    const optionsResult = await getOptions();
    const options = optionsResult.unwrapOr(getDefaultOptions());
    debugLog('popup', 'Popup initialized');

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

    const createStatusItem = (msg: string): HTMLLIElement => {
      const item = document.createElement('li');
      item.textContent = msg;
      return item;
    };

    const createDestinationItem = ({ url, label }: Destination): HTMLLIElement => {
      const item = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = label;
      item.appendChild(anchor);
      return item;
    };

    const debugInfo = document.getElementById('debugInfo') as HTMLDivElement | null;

    const setDebugInfo = (msg: string): void => {
      if (!debugInfo) return;
      if (!options.showCacheDebug) {
        debugInfo.hidden = true;
        debugInfo.textContent = '';
        return;
      }
      debugInfo.hidden = false;
      debugInfo.textContent = msg;
    };

    if (debugInfo) {
      if (options.showCacheDebug) {
        debugInfo.hidden = false;
        debugInfo.textContent = 'Cache debug enabled';
      } else {
        debugInfo.hidden = true;
        debugInfo.textContent = '';
      }
    }

    const showStatus = (msg: string): void => {
      debugLog('popup', 'Showing status:', msg);
      list.replaceChildren(createStatusItem(msg));
    };

    const render = (ds: Destination[]): void => {
      debugLog('popup', 'Rendering destinations:', ds.length);
      if (ds.length) {
        const fragment = document.createDocumentFragment();
        ds.forEach((destination) => {
          fragment.appendChild(createDestinationItem(destination));
        });
        list.replaceChildren(fragment);
      } else {
        showStatus('No actions available');
      }
    };

    // Determine input: payload param or active tab URL
    const payload = new URLSearchParams(location.search).get('payload');
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeUrl = tabs[0]?.url ?? '';
    const raw: string = payload ?? activeUrl;
    debugLog('parsing', 'Processing input:', raw);
    if (!raw) {
      showStatus('No URL or payload provided');
      return;
    }

    const parseResult = parseInput(raw);
    void parseResult.match(
      async (info) => {
        debugLog('parsing', 'Parse result:', info);
        if (!info || (!info.did && !info.handle && !info.atUri)) {
          showStatus('No DID or at:// URI found in current tab.');
          return;
        }

        let ds = buildDestinations(info, options.showEmojis, options.strictMode);
        render(ds);

        if (info.did && !info.handle) {
          // Ask SW for a handle (from cache or resolved)
          showStatus('Resolving...');

          const { handleToUse, errorStatusWasSet } = await sendRuntimeMessage<{
            handle: string | null;
            fromCache: boolean;
          }>({
            type: 'GET_HANDLE',
            did: info.did,
          }).match(
            (response) => {
              const handle = response.handle;
              if (handle && import.meta.env.MODE === 'development') {
                debugLog('popup', response.fromCache ? 'handle cache hit' : 'handle resolved');
              }
              if (handle) {
                setDebugInfo(response.fromCache ? 'DID cache hit' : 'DID cache miss');
              } else {
                setDebugInfo('DID cache unresolved');
              }
              return { handleToUse: handle, errorStatusWasSet: false };
            },
            (error) => {
              console.error('GET_HANDLE error', error);
              showStatus('Error resolving');
              return { handleToUse: null, errorStatusWasSet: true };
            },
          );

          // After attempting to get handle from cache or by fetching:
          if (handleToUse) {
            info.handle = handleToUse;
            ds = buildDestinations(info, options.showEmojis, options.strictMode); // Re-build destinations with the handle
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
          showStatus('Resolving...');

          const { didToUse, errorStatusWasSet } = await sendRuntimeMessage<{ did: string | null; fromCache: boolean }>({
            type: 'GET_DID',
            handle: info.handle,
          }).match(
            (response) => {
              const did = response.did;
              if (did && import.meta.env.MODE === 'development') {
                debugLog('popup', response.fromCache ? 'did cache hit' : 'did resolved');
              }
              if (did) {
                setDebugInfo(response.fromCache ? 'Handle cache hit' : 'Handle cache miss');
              } else {
                setDebugInfo('Handle cache unresolved');
              }
              return { didToUse: did, errorStatusWasSet: false };
            },
            (error) => {
              console.error('GET_DID error', error);
              showStatus('Error resolving');
              return { didToUse: null, errorStatusWasSet: true };
            },
          );

          if (didToUse) {
            info.did = didToUse;
            ds = buildDestinations(info, options.showEmojis, options.strictMode);
            render(ds);
          } else if (!ds.length && !errorStatusWasSet) {
            showStatus('No actions available');
          }
        }
      },
      (error) => {
        console.error('Parse error in popup:', error);
        showStatus('Error parsing URL or input.');
      },
    );

    emptyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const originalText = emptyBtn.textContent;
      emptyBtn.textContent = 'Working...';
      emptyBtn.disabled = true;

      void (async () => {
        // No need to manually remove storage - the service worker handles it via CLEAR_CACHE message
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
};

document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
