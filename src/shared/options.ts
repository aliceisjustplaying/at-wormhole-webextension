import { ResultAsync } from 'neverthrow';
import { StorageError, storageError } from './errors';

// Option type definitions
export interface WormholeOptions {
  showEmojis: boolean;
  strictMode: boolean;
}

// Option metadata
interface OptionMetadata<K extends keyof WormholeOptions> {
  key: K;
  defaultValue: WormholeOptions[K];
  description: string;
}

// Option configurations
const OPTION_CONFIGS: { [K in keyof WormholeOptions]: OptionMetadata<K> } = {
  showEmojis: {
    key: 'showEmojis',
    defaultValue: true,
    description: 'Show emoji icons in service lists',
  },
  strictMode: {
    key: 'strictMode',
    defaultValue: false,
    description: 'Only show services that support the current content type',
  },
};

// Define defaults
const DEFAULT_OPTIONS: WormholeOptions = {
  showEmojis: true,
  strictMode: false,
};

// Get all options
export function getOptions(): ResultAsync<WormholeOptions, StorageError> {
  return ResultAsync.fromPromise(chrome.storage.sync.get(DEFAULT_OPTIONS), (error) =>
    storageError('Failed to get options', 'get', error),
  ).map((result) => result as WormholeOptions);
}

// Get single option
export function getOption<K extends keyof WormholeOptions>(key: K): ResultAsync<WormholeOptions[K], StorageError> {
  return getOptions().map((options) => options[key]);
}

// Set option(s)
export function setOptions(options: Partial<WormholeOptions>): ResultAsync<void, StorageError> {
  return ResultAsync.fromPromise(chrome.storage.sync.set(options), (error) =>
    storageError('Failed to set options', 'set', error),
  );
}

// Set single option
export function setOption<K extends keyof WormholeOptions>(
  key: K,
  value: WormholeOptions[K],
): ResultAsync<void, StorageError> {
  return setOptions({ [key]: value });
}

// Map to store wrapped listeners
const listenerMap = new WeakMap<
  (changes: Partial<WormholeOptions>) => void,
  (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
>();

// Listen for changes
export function onOptionsChange(callback: (changes: Partial<WormholeOptions>) => void): void {
  const wrappedListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === 'sync') {
      const optionChanges: Partial<WormholeOptions> = {};

      // Check for our option keys
      if ('showEmojis' in changes) {
        optionChanges.showEmojis = changes.showEmojis.newValue as boolean;
      }
      if ('strictMode' in changes) {
        optionChanges.strictMode = changes.strictMode.newValue as boolean;
      }

      if (Object.keys(optionChanges).length > 0) {
        callback(optionChanges);
      }
    }
  };
  
  listenerMap.set(callback, wrappedListener);
  chrome.storage.onChanged.addListener(wrappedListener);
}

// Remove listener
export function removeOptionsChangeListener(callback: (changes: Partial<WormholeOptions>) => void): void {
  const wrappedListener = listenerMap.get(callback);
  if (wrappedListener) {
    chrome.storage.onChanged.removeListener(wrappedListener);
    listenerMap.delete(callback);
  }
}

// Get default values
export function getDefaultOptions(): WormholeOptions {
  return { ...DEFAULT_OPTIONS };
}

// Get option metadata
export function getOptionMetadata(): typeof OPTION_CONFIGS {
  return OPTION_CONFIGS;
}

// Legacy compatibility - backwards compatible wrapper for gradual migration
export async function loadOptions(): Promise<WormholeOptions> {
  const result = await getOptions();
  return result.match(
    (options) => options,
    () => DEFAULT_OPTIONS,
  );
}

// Clear any legacy cache (no-op now since we don't cache)
export function clearOptionsCache(): void {
  // No-op for compatibility
}
