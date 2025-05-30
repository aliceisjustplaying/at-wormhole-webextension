interface OptionsData {
  showEmojis: boolean;
}

const DEFAULT_OPTIONS: OptionsData = {
  showEmojis: true,
};

const STORAGE_KEY = 'wormhole-options';

async function loadOptions(): Promise<OptionsData> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const data: unknown = result[STORAGE_KEY];

    if (data && typeof data === 'object') {
      const options = data as Record<string, unknown>;
      return {
        showEmojis: typeof options.showEmojis === 'boolean' ? options.showEmojis : DEFAULT_OPTIONS.showEmojis,
      };
    }

    return DEFAULT_OPTIONS;
  } catch (error: unknown) {
    console.warn('Failed to load options:', error);
    return DEFAULT_OPTIONS;
  }
}

async function saveOptions(options: OptionsData): Promise<void> {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: options });
  } catch (error: unknown) {
    console.error('Failed to save options:', error);
  }
}

async function initializeOptions(): Promise<void> {
  const showEmojisCheckbox = document.getElementById('showEmojis') as HTMLInputElement | null;

  if (!showEmojisCheckbox) {
    console.error('showEmojis checkbox not found');
    return;
  }

  const options = await loadOptions();
  showEmojisCheckbox.checked = options.showEmojis;

  showEmojisCheckbox.addEventListener('change', () => {
    const newOptions: OptionsData = {
      showEmojis: showEmojisCheckbox.checked,
    };
    void saveOptions(newOptions);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initializeOptions();
  });
} else {
  void initializeOptions();
}
