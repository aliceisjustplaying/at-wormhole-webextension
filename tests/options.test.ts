import { test, expect, describe, beforeEach, mock } from 'bun:test';
import {
  getOptions,
  getOption,
  setOptions,
  setOption,
  onOptionsChange,
  removeOptionsChangeListener,
  getDefaultOptions,
  getOptionMetadata,
  loadOptions,
  clearOptionsCache,
} from '../src/shared/options';
import type { WormholeOptions } from '../src/shared/options';

// Mock chrome.storage API
let mockStorageData: Record<string, unknown> = {};
const mockChangeListeners: ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void)[] = [];

const mockChrome = {
  storage: {
    sync: {
      get: mock((keys: Record<string, unknown>) => {
        if (typeof keys === 'object' && !Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const key in keys) {
            result[key] = mockStorageData[key] ?? keys[key];
          }
          return Promise.resolve(result);
        }
        return Promise.resolve({});
      }),
      set: mock((items: Record<string, unknown>) => {
        // First update storage data
        const changes: Record<string, chrome.storage.StorageChange> = {};
        for (const key in items) {
          changes[key] = { newValue: items[key], oldValue: mockStorageData[key] };
          mockStorageData[key] = items[key];
        }
        // Then trigger change listeners
        mockChangeListeners.forEach((listener) => listener(changes, 'sync'));
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: mock(
        (callback: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void) => {
          mockChangeListeners.push(callback);
        },
      ),
      removeListener: mock(
        (callback: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void) => {
          const index = mockChangeListeners.indexOf(callback);
          if (index !== -1) {
            mockChangeListeners.splice(index, 1);
          }
        },
      ),
    },
  },
};

// @ts-expect-error - Mocking chrome API
global.chrome = mockChrome;

describe('Options Module', () => {
  beforeEach(() => {
    // Clear mock data before each test
    mockStorageData = {};
    mockChangeListeners.length = 0;
    mockChrome.storage.sync.get.mockClear();
    mockChrome.storage.sync.set.mockClear();
  });

  describe('getOptions', () => {
    test('should return default options when storage is empty', async () => {
      const result = await getOptions();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          showEmojis: true,
          strictMode: false,
        });
      }
    });

    test('should return stored options', async () => {
      mockStorageData.showEmojis = false;
      mockStorageData.strictMode = true;

      const result = await getOptions();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          showEmojis: false,
          strictMode: true,
        });
      }
    });

    test('should merge with defaults when some options are missing', async () => {
      mockStorageData.showEmojis = false;
      // strictMode not set

      const result = await getOptions();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          showEmojis: false,
          strictMode: false, // default
        });
      }
    });
  });

  describe('getOption', () => {
    test('should return specific option value', async () => {
      mockStorageData.showEmojis = false;
      mockStorageData.strictMode = true;

      const result = await getOption('showEmojis');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    test('should return default value when option not set', async () => {
      const result = await getOption('strictMode');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('setOptions', () => {
    test('should set all options', async () => {
      const options: WormholeOptions = {
        showEmojis: false,
        strictMode: true,
      };

      const result = await setOptions(options);
      expect(result.isOk()).toBe(true);
      expect(mockStorageData.showEmojis).toBe(false);
      expect(mockStorageData.strictMode).toBe(true);
    });

    test('should set partial options', async () => {
      const result = await setOptions({ showEmojis: false });
      expect(result.isOk()).toBe(true);
      expect(mockStorageData.showEmojis).toBe(false);
      expect(mockStorageData.strictMode).toBeUndefined();
    });
  });

  describe('setOption', () => {
    test('should set single option', async () => {
      const result = await setOption('showEmojis', false);
      expect(result.isOk()).toBe(true);
      expect(mockStorageData.showEmojis).toBe(false);
    });
  });

  describe('onOptionsChange', () => {
    test('should call callback when options change', async () => {
      let changedOptions: Partial<WormholeOptions> | null = null;
      const callback = (changes: Partial<WormholeOptions>) => {
        changedOptions = changes;
      };

      onOptionsChange(callback);

      await setOptions({ showEmojis: false });

      // Allow time for change listener to fire
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(changedOptions).not.toBeNull();
      expect(changedOptions!).toEqual({ showEmojis: false });
    });

    test('should only notify about our options', () => {
      let callCount = 0;
      const callback = () => {
        callCount++;
      };

      onOptionsChange(callback);

      // Simulate external storage change
      mockChangeListeners.forEach((listener) => listener({ someOtherKey: { newValue: 'test' } }, 'sync'));

      expect(callCount).toBe(0);
    });

    test('should handle multiple listeners', async () => {
      let count1 = 0;
      let count2 = 0;
      const callback1 = () => count1++;
      const callback2 = () => count2++;

      onOptionsChange(callback1);
      onOptionsChange(callback2);

      await setOptions({ showEmojis: false });

      // Allow time for change listeners to fire
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  describe('removeOptionsChangeListener', () => {
    test('should remove change listener', async () => {
      let callCount = 0;
      const callback = () => {
        callCount++;
      };

      onOptionsChange(callback);
      removeOptionsChangeListener(callback);

      await setOptions({ showEmojis: false });

      // Allow time for change listener to fire (if it would)
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callCount).toBe(0);
    });
  });

  describe('getDefaultOptions', () => {
    test('should return default options', () => {
      const defaults = getDefaultOptions();
      expect(defaults).toEqual({
        showEmojis: true,
        strictMode: false,
      });
    });

    test('should return a copy of defaults', () => {
      const defaults1 = getDefaultOptions();
      const defaults2 = getDefaultOptions();
      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });
  });

  describe('getOptionMetadata', () => {
    test('should return option metadata', () => {
      const metadata = getOptionMetadata();
      expect(metadata.showEmojis).toEqual({
        key: 'showEmojis',
        defaultValue: true,
        description: 'Show emoji icons in service lists',
      });
      expect(metadata.strictMode).toEqual({
        key: 'strictMode',
        defaultValue: false,
        description: 'Only show services that support the current content type',
      });
    });
  });

  describe('loadOptions (legacy)', () => {
    test('should return options on success', async () => {
      mockStorageData.showEmojis = false;
      const options = await loadOptions();
      expect(options).toEqual({
        showEmojis: false,
        strictMode: false,
      });
    });

    test('should return defaults on error', async () => {
      // Simulate storage error
      mockChrome.storage.sync.get.mockImplementationOnce(() => {
        return Promise.reject(new Error('Storage error'));
      });

      const options = await loadOptions();
      expect(options).toEqual({
        showEmojis: true,
        strictMode: false,
      });
    });
  });

  describe('clearOptionsCache', () => {
    test('should be a no-op', () => {
      // Should not throw
      expect(() => clearOptionsCache()).not.toThrow();
    });
  });
});
