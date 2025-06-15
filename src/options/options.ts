import { getOptions, setOptions, onOptionsChange, getDefaultOptions } from '../shared/options';
import type { WormholeOptions } from '../shared/options';

async function initializeOptions(): Promise<void> {
  const showEmojisCheckbox = document.getElementById('showEmojis') as HTMLInputElement | null;
  const strictModeCheckbox = document.getElementById('strictMode') as HTMLInputElement | null;

  if (!showEmojisCheckbox || !strictModeCheckbox) {
    console.error('Required checkboxes not found');
    return;
  }

  // Load current options
  const optionsResult = await getOptions();
  const options = optionsResult.unwrapOr(getDefaultOptions());

  showEmojisCheckbox.checked = options.showEmojis;
  strictModeCheckbox.checked = options.strictMode;

  // Update options when checkboxes change
  const updateOptions = () => {
    const newOptions: WormholeOptions = {
      showEmojis: showEmojisCheckbox.checked,
      strictMode: strictModeCheckbox.checked,
    };

    void setOptions(newOptions).then((result) => {
      return result.match(
        () => undefined, // Success - no notification needed
        (error) => {
          console.error('Failed to save options:', error);
          // Revert checkboxes to previous state
          showEmojisCheckbox.checked = options.showEmojis;
          strictModeCheckbox.checked = options.strictMode;
        },
      );
    });
  };

  showEmojisCheckbox.addEventListener('change', updateOptions);
  strictModeCheckbox.addEventListener('change', updateOptions);

  // Listen for external changes
  const handleExternalChanges = (changes: Partial<WormholeOptions>) => {
    if (changes.showEmojis !== undefined) {
      showEmojisCheckbox.checked = changes.showEmojis;
    }
    if (changes.strictMode !== undefined) {
      strictModeCheckbox.checked = changes.strictMode;
    }
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
