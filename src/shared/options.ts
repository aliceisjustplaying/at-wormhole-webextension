interface OptionsData {
  showEmojis: boolean;
  strictMode: boolean;
}

const DEFAULT_OPTIONS: OptionsData = {
  showEmojis: true,
  strictMode: false,
};

const STORAGE_KEY = 'wormhole-options';

let cachedOptions: OptionsData | null = null;

export async function loadOptions(): Promise<OptionsData> {
  if (cachedOptions) {
    return cachedOptions;
  }

  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const data: unknown = result[STORAGE_KEY];

    if (data && typeof data === 'object') {
      const options = data as Record<string, unknown>;
      cachedOptions = {
        showEmojis: typeof options.showEmojis === 'boolean' ? options.showEmojis : DEFAULT_OPTIONS.showEmojis,
        strictMode: typeof options.strictMode === 'boolean' ? options.strictMode : DEFAULT_OPTIONS.strictMode,
      };
    } else {
      cachedOptions = DEFAULT_OPTIONS;
    }

    return cachedOptions;
  } catch (error: unknown) {
    console.warn('Failed to load options:', error);
    cachedOptions = DEFAULT_OPTIONS;
    return cachedOptions;
  }
}

export function clearOptionsCache(): void {
  cachedOptions = null;
}
