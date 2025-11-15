import { getOptions, setOptions, onOptionsChange, getDefaultOptions } from '../shared/options';
import type { WormholeOptions } from '../shared/options';

async function initializeOptions(): Promise<void> {
  const showEmojisCheckbox = document.getElementById('showEmojis') as HTMLInputElement | null;
  const strictModeCheckbox = document.getElementById('strictMode') as HTMLInputElement | null;
  const showCacheDebugCheckbox = document.getElementById('showCacheDebug') as HTMLInputElement | null;

  if (!showEmojisCheckbox || !strictModeCheckbox || !showCacheDebugCheckbox) {
    console.error('Required checkboxes not found');
    return;
  }

  // Load current options
  const optionsResult = await getOptions();
  let currentOptions = optionsResult.unwrapOr(getDefaultOptions());

  showEmojisCheckbox.checked = currentOptions.showEmojis;
  strictModeCheckbox.checked = currentOptions.strictMode;
  showCacheDebugCheckbox.checked = currentOptions.showCacheDebug;

  // Update options when checkboxes change
  const updateOptions = () => {
    const newOptions: WormholeOptions = {
      showEmojis: showEmojisCheckbox.checked,
      strictMode: strictModeCheckbox.checked,
      showCacheDebug: showCacheDebugCheckbox.checked,
    };

    const previousOptions = { ...currentOptions };

    void setOptions(newOptions).match(
      () => {
        currentOptions = { ...newOptions };
      },
      (error) => {
        console.error('Failed to save options:', error);
        // Revert checkboxes to the last known good state
        showEmojisCheckbox.checked = previousOptions.showEmojis;
        strictModeCheckbox.checked = previousOptions.strictMode;
        showCacheDebugCheckbox.checked = previousOptions.showCacheDebug;
        currentOptions = previousOptions;
      },
    );
  };

  showEmojisCheckbox.addEventListener('change', updateOptions);
  strictModeCheckbox.addEventListener('change', updateOptions);
  showCacheDebugCheckbox.addEventListener('change', updateOptions);

  // Listen for external changes
  const handleExternalChanges = (changes: Partial<WormholeOptions>) => {
    if (changes.showEmojis !== undefined) {
      showEmojisCheckbox.checked = changes.showEmojis;
    }
    if (changes.strictMode !== undefined) {
      strictModeCheckbox.checked = changes.strictMode;
    }
    if (changes.showCacheDebug !== undefined) {
      showCacheDebugCheckbox.checked = changes.showCacheDebug;
    }
    currentOptions = { ...currentOptions, ...changes };
  };

  onOptionsChange(handleExternalChanges);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initializeOptions();
  });
} else {
  void initializeOptions();
}
