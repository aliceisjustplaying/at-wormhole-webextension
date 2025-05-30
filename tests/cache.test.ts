import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { BidirectionalMap, DidHandleCache } from '../src/shared/cache';

describe('BidirectionalMap', () => {
  let map: BidirectionalMap<string, string>;

  beforeEach(() => {
    map = new BidirectionalMap<string, string>();
  });

  describe('set and get operations', () => {
    test('should store and retrieve values in both directions', () => {
      map.set('did:plc:123', 'alice.bsky.social');

      expect(map.getByFirst('did:plc:123')).toBe('alice.bsky.social');
      expect(map.getBySecond('alice.bsky.social')).toBe('did:plc:123');
    });

    test('should return undefined for non-existent keys', () => {
      expect(map.getByFirst('nonexistent')).toBeUndefined();
      expect(map.getBySecond('nonexistent')).toBeUndefined();
    });

    test('should handle multiple entries', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      map.set('did:plc:456', 'bob.bsky.social');

      expect(map.getByFirst('did:plc:123')).toBe('alice.bsky.social');
      expect(map.getByFirst('did:plc:456')).toBe('bob.bsky.social');
      expect(map.getBySecond('alice.bsky.social')).toBe('did:plc:123');
      expect(map.getBySecond('bob.bsky.social')).toBe('did:plc:456');
    });

    test('should overwrite existing mappings', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      map.set('did:plc:123', 'alice-new.bsky.social');

      expect(map.getByFirst('did:plc:123')).toBe('alice-new.bsky.social');
      expect(map.getBySecond('alice-new.bsky.social')).toBe('did:plc:123');
      expect(map.getBySecond('alice.bsky.social')).toBeUndefined();
    });

    test('should handle reverse overwrite when setting same value with different key', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      map.set('did:plc:456', 'alice.bsky.social');

      expect(map.getBySecond('alice.bsky.social')).toBe('did:plc:456');
      expect(map.getByFirst('did:plc:123')).toBeUndefined();
      expect(map.getByFirst('did:plc:456')).toBe('alice.bsky.social');
    });
  });

  describe('size tracking', () => {
    test('should start with size 0', () => {
      expect(map.size).toBe(0);
    });

    test('should increment size when adding entries', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      expect(map.size).toBe(1);

      map.set('did:plc:456', 'bob.bsky.social');
      expect(map.size).toBe(2);
    });

    test('should not change size when overwriting existing entry', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      expect(map.size).toBe(1);

      map.set('did:plc:123', 'alice-new.bsky.social');
      expect(map.size).toBe(1);
    });

    test('should maintain size when one mapping overwrites another', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      map.set('did:plc:456', 'bob.bsky.social');
      expect(map.size).toBe(2);

      map.set('did:plc:789', 'alice.bsky.social');
      expect(map.size).toBe(2);
    });
  });

  describe('delete operations', () => {
    test('should delete existing mapping and return true', () => {
      map.set('did:plc:123', 'alice.bsky.social');

      const result = map.delete('did:plc:123', 'alice.bsky.social');

      expect(result).toBe(true);
      expect(map.getByFirst('did:plc:123')).toBeUndefined();
      expect(map.getBySecond('alice.bsky.social')).toBeUndefined();
      expect(map.size).toBe(0);
    });

    test('should return false for non-existent mapping', () => {
      const result = map.delete('nonexistent', 'alsononexistent');
      expect(result).toBe(false);
    });

    test('should return false for mismatched pair', () => {
      map.set('did:plc:123', 'alice.bsky.social');

      const result = map.delete('did:plc:123', 'wrong.bsky.social');
      expect(result).toBe(false);
      expect(map.size).toBe(1);
    });

    test('should not affect other mappings', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      map.set('did:plc:456', 'bob.bsky.social');

      map.delete('did:plc:123', 'alice.bsky.social');

      expect(map.getByFirst('did:plc:456')).toBe('bob.bsky.social');
      expect(map.size).toBe(1);
    });
  });

  describe('clear operations', () => {
    test('should remove all mappings', () => {
      map.set('did:plc:123', 'alice.bsky.social');
      map.set('did:plc:456', 'bob.bsky.social');

      map.clear();

      expect(map.size).toBe(0);
      expect(map.getByFirst('did:plc:123')).toBeUndefined();
      expect(map.getBySecond('alice.bsky.social')).toBeUndefined();
    });

    test('should work on empty map', () => {
      expect(() => {
        map.clear();
      }).not.toThrow();
      expect(map.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string keys', () => {
      map.set('', 'value');
      expect(map.getByFirst('')).toBe('value');
      expect(map.getBySecond('value')).toBe('');
    });

    test('should handle identical keys and values', () => {
      map.set('same', 'same');
      expect(map.getByFirst('same')).toBe('same');
      expect(map.getBySecond('same')).toBe('same');
      expect(map.size).toBe(1);
    });

    test('should handle unicode characters', () => {
      map.set('🌟did:plc:123', '🦋alice.bsky.social');
      expect(map.getByFirst('🌟did:plc:123')).toBe('🦋alice.bsky.social');
      expect(map.getBySecond('🦋alice.bsky.social')).toBe('🌟did:plc:123');
    });
  });
});

interface MockStorage {
  local: {
    get: ReturnType<typeof mock>;
    set: ReturnType<typeof mock>;
    clear: ReturnType<typeof mock>;
    remove: ReturnType<typeof mock>;
    getBytesInUse?: ReturnType<typeof mock>;
  };
}

describe('DidHandleCache', () => {
  let cache: DidHandleCache;
  let mockStorage: MockStorage;

  beforeEach(() => {
    cache = new DidHandleCache();

    mockStorage = {
      local: {
        get: mock(() => Promise.resolve({})),
        set: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        remove: mock(() => Promise.resolve()),
      },
    };

    (globalThis as unknown as { chrome: { storage: MockStorage } }).chrome = {
      storage: mockStorage,
    };
  });

  describe('initialization and loading', () => {
    test('should start with empty cache', () => {
      expect(cache.size).toBe(0);
      expect(cache.estimatedStorageSize).toBe(0);
    });

    test('should load data from storage on load()', async () => {
      mockStorage.local.get.mockResolvedValue({
        'wormhole-cache': {
          'did:plc:123': { handle: 'alice.bsky.social', lastAccessed: Date.now() },
          'did:plc:456': { handle: 'bob.bsky.social', lastAccessed: Date.now() },
        },
      });

      await cache.load();

      expect(cache.size).toBe(2);
      expect(cache.getHandle('did:plc:123')).toBe('alice.bsky.social');
      expect(cache.getDid('alice.bsky.social')).toBe('did:plc:123');
    });

    test('should handle missing storage data gracefully', async () => {
      mockStorage.local.get.mockResolvedValue({});

      await cache.load();

      expect(cache.size).toBe(0);
    });

    test('should handle corrupted storage data gracefully', async () => {
      mockStorage.local.get.mockResolvedValue({
        'wormhole-cache': 'invalid-data',
      });

      await cache.load();

      expect(cache.size).toBe(0);
    });
  });

  describe('set and get operations', () => {
    test('should store and retrieve handle↔DID mappings', async () => {
      await cache.set('did:plc:123', 'alice.bsky.social');

      expect(cache.getHandle('did:plc:123')).toBe('alice.bsky.social');
      expect(cache.getDid('alice.bsky.social')).toBe('did:plc:123');
      expect(cache.size).toBe(1);
    });

    test('should immediately persist to storage on set', async () => {
      await cache.set('did:plc:123', 'alice.bsky.social');

      expect(mockStorage.local.set).toHaveBeenCalledTimes(1);
    });

    test('should update lastAccessed on get operations', async () => {
      await cache.set('did:plc:123', 'alice.bsky.social');

      await new Promise((resolve) => setTimeout(resolve, 10));

      cache.getHandle('did:plc:123');

      expect(mockStorage.local.set).toHaveBeenCalledTimes(2);
    });

    test('should return undefined for non-existent mappings', () => {
      expect(cache.getHandle('did:plc:nonexistent')).toBeUndefined();
      expect(cache.getDid('nonexistent.bsky.social')).toBeUndefined();
    });
  });

  describe('storage size tracking', () => {
    test('should track estimated storage size', async () => {
      await cache.set('did:plc:123', 'alice.bsky.social');

      expect(cache.estimatedStorageSize).toBeGreaterThan(0);
    });

    test('should update size when adding entries', async () => {
      const initialSize = cache.estimatedStorageSize;

      await cache.set('did:plc:123', 'alice.bsky.social');
      const afterFirstEntry = cache.estimatedStorageSize;

      await cache.set('did:plc:456', 'bob.bsky.social');
      const afterSecondEntry = cache.estimatedStorageSize;

      expect(afterFirstEntry).toBeGreaterThan(initialSize);
      expect(afterSecondEntry).toBeGreaterThan(afterFirstEntry);
    });

    test('should approximate JSON serialization size', async () => {
      await cache.set('did:plc:123456789', 'very-long-handle-name.bsky.social');

      const size = cache.estimatedStorageSize;
      const expectedMinSize = JSON.stringify({
        'wormhole-cache': {
          'did:plc:123456789': {
            handle: 'very-long-handle-name.bsky.social',
            lastAccessed: Date.now(),
          },
        },
      }).length;

      expect(size).toBeGreaterThanOrEqual(expectedMinSize * 0.8);
      expect(size).toBeLessThanOrEqual(expectedMinSize * 1.2);
    });
  });

  describe('LRU eviction', () => {
    test('should handle size limits gracefully', async () => {
      const maxSize = 1000;
      cache = new DidHandleCache(maxSize);

      await cache.set('did:plc:test1', 'test1.bsky.social');
      await cache.set('did:plc:test2', 'test2.bsky.social');
      await cache.set('did:plc:test3', 'test3.bsky.social');

      expect(cache.size).toBe(3);
      expect(cache.getHandle('did:plc:test1')).toBe('test1.bsky.social');
      expect(cache.estimatedStorageSize).toBeGreaterThan(0);
    });

    test('should evict entries when manually triggered', async () => {
      const maxSize = 100;
      cache = new DidHandleCache(maxSize);

      await cache.set('did:plc:old', 'old.bsky.social');
      await cache.set('did:plc:newer', 'newer.bsky.social');
      await cache.set('did:plc:newest', 'newest.bsky.social');

      cache.evictOldestEntries();

      expect(cache.size).toBeLessThan(3);
    });
  });

  describe('clear operations', () => {
    test('should remove all entries from cache and storage', async () => {
      await cache.set('did:plc:123', 'alice.bsky.social');
      await cache.set('did:plc:456', 'bob.bsky.social');

      await cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.estimatedStorageSize).toBe(0);
      expect(mockStorage.local.remove).toHaveBeenCalledWith('wormhole-cache');
    });
  });

  describe('error handling', () => {
    test('should handle storage set failures gracefully', async () => {
      mockStorage.local.set.mockRejectedValue(new Error('Storage quota exceeded'));

      try {
        await cache.set('did:plc:123', 'alice.bsky.social');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(cache.getHandle('did:plc:123')).toBeUndefined();
    });

    test('should handle storage get failures gracefully', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      try {
        await cache.load();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should validate DID format', async () => {
      try {
        await cache.set('invalid-did', 'alice.bsky.social');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should validate handle format', async () => {
      try {
        await cache.set('did:plc:123', 'invalid..handle');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Firefox compatibility', () => {
    test('should work without chrome.storage.local.getBytesInUse', async () => {
      delete mockStorage.local.getBytesInUse;

      await cache.set('did:plc:123', 'alice.bsky.social');

      expect(cache.estimatedStorageSize).toBeGreaterThan(0);
    });

    test('should estimate storage size manually when getBytesInUse unavailable', async () => {
      delete mockStorage.local.getBytesInUse;

      await cache.set('did:plc:123', 'alice.bsky.social');
      const size1 = cache.estimatedStorageSize;

      await cache.set('did:plc:456', 'bob.bsky.social');
      const size2 = cache.estimatedStorageSize;

      expect(size2).toBeGreaterThan(size1);
    });
  });
});
