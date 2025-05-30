import { describe, test, expect, beforeEach } from 'bun:test';
import { BidirectionalMap } from '../src/shared/cache';

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
