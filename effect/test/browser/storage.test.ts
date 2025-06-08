import { describe, expect, beforeEach, vi } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Option, Layer } from 'effect';
import { Schema as S } from '@effect/schema';
import { Storage, type StorageArea, StorageLive } from '@/browser/storage';

/*
 * Phase 5, Lesson 13: Browser Storage API Wrapper
 *
 * Problem: Browser storage APIs (chrome.storage) are callback-based
 * and don't provide type safety. We need:
 * - Schema validation for stored values
 * - Effect-based API for better error handling
 * - Type-safe get/set operations
 * - Support for both local and sync storage areas
 */

describe('Browser Storage Wrapper', () => {
  // Mock chrome.storage API
  const mockStorage = {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - mocking chrome global
    global.chrome = { storage: mockStorage };
  });

  // Helper to provide Storage service
  const provideStorage = <A, E>(effect: Effect.Effect<A, E, Storage>): Effect.Effect<A, E> => Effect.provide(effect, Layer.succeed(Storage, StorageLive));

  describe('Schema-based Storage', () => {
    // Define a schema for our stored data
    const UserPreferences = S.Struct({
      theme: S.Literal('light', 'dark', 'auto'),
      showEmojis: S.Boolean,
      debugMode: S.optional(S.Boolean),
    });

    type UserPreferences = S.Schema.Type<typeof UserPreferences>;

    it.effect('should store and retrieve typed values', () =>
      Effect.gen(function* () {
        // Mock successful storage
        mockStorage.local.set.mockImplementation((_data: unknown, callback?: () => void) => {
          callback?.();
        });

        mockStorage.local.get.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
          callback?.({
            userPrefs: JSON.stringify({
              theme: 'dark',
              showEmojis: true,
            }),
          });
        });

        // Create storage instance with schema
        const storage = yield* Storage;

        // Store with schema validation
        const prefs: UserPreferences = {
          theme: 'dark',
          showEmojis: true,
        };

        yield* storage.set('userPrefs', prefs, UserPreferences);

        // Retrieve with automatic parsing
        const retrieved = yield* storage.get('userPrefs', UserPreferences);

        expect(Option.isSome(retrieved)).toBe(true);
        if (Option.isSome(retrieved)) {
          expect(retrieved.value.theme).toBe('dark');
          expect(retrieved.value.showEmojis).toBe(true);
        }
      }).pipe(provideStorage),
    );

    it.effect('should handle missing keys gracefully', () =>
      Effect.gen(function* () {
        mockStorage.local.get.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
          callback?.({});
        });

        const storage = yield* Storage;
        const result = yield* storage.get('nonexistent', UserPreferences);

        expect(Option.isNone(result)).toBe(true);
      }).pipe(provideStorage),
    );

    it.effect('should validate data on retrieval', () =>
      Effect.gen(function* () {
        // Mock invalid data
        mockStorage.local.get.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
          callback?.({
            userPrefs: JSON.stringify({
              theme: 'invalid-theme', // Invalid enum value
              showEmojis: 'not-a-boolean', // Wrong type
            }),
          });
        });

        const storage = yield* Storage;

        // Should fail with parse error
        const result = yield* storage.get('userPrefs', UserPreferences).pipe(Effect.either);

        expect(result._tag).toBe('Left');
      }).pipe(provideStorage),
    );
  });

  describe('Storage Areas', () => {
    it.effect('should support both local and sync storage', () =>
      Effect.gen(function* () {
        const SomeData = S.Struct({ value: S.String });

        mockStorage.sync.set.mockImplementation((_data: unknown, callback?: () => void) => {
          callback?.();
        });

        const storage = yield* Storage;

        // Use sync storage area
        yield* storage.set('syncData', { value: 'test' }, SomeData, {
          area: 'sync' as StorageArea,
        });

        expect(mockStorage.sync.set).toHaveBeenCalledWith({ syncData: JSON.stringify({ value: 'test' }) }, expect.any(Function));
      }).pipe(provideStorage),
    );
  });

  describe('Batch Operations', () => {
    it.effect('should support getting multiple keys at once', () =>
      Effect.gen(function* () {
        const StringSchema = S.String;
        const NumberSchema = S.Number;

        mockStorage.local.get.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
          callback?.({
            key1: JSON.stringify('value1'),
            key2: JSON.stringify(42),
          });
        });

        const storage = yield* Storage;

        // Get multiple keys with different schemas
        const results = yield* Effect.all({
          str: storage.get('key1', StringSchema),
          num: storage.get('key2', NumberSchema),
        });

        expect(Option.isSome(results.str)).toBe(true);
        expect(Option.isSome(results.num)).toBe(true);

        if (Option.isSome(results.str) && Option.isSome(results.num)) {
          expect(results.str.value).toBe('value1');
          expect(results.num.value).toBe(42);
        }
      }).pipe(provideStorage),
    );
  });

  describe('Error Handling', () => {
    it.effect('should handle chrome runtime errors', () =>
      Effect.gen(function* () {
        // Mock chrome runtime error
        mockStorage.local.get.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
          // @ts-expect-error - mocking chrome runtime
          global.chrome.runtime = {
            lastError: { message: 'Storage quota exceeded' },
          };
          callback?.({});
        });

        const storage = yield* Storage;
        const result = yield* storage.get('key', S.String).pipe(Effect.either);

        expect(result._tag).toBe('Left');
        if (result._tag === 'Left') {
          expect(result.left).toMatchObject({
            _tag: 'StorageError',
          });
        }
      }).pipe(provideStorage),
    );
  });

  describe('Complex Data Types', () => {
    it.effect('should handle our cache entries', () =>
      Effect.gen(function* () {
        // Reuse our branded types
        const { Handle } = yield* Effect.promise(() => import('@/model/handle'));
        const { Did } = yield* Effect.promise(() => import('@/model/did'));

        // Define cache entry schema
        const CacheEntry = S.Struct({
          handle: Handle,
          did: Did,
          timestamp: S.Number,
        });

        const testEntry = {
          handle: S.decodeSync(Handle)('alice.bsky.social'),
          did: S.decodeSync(Did)('did:plc:z72i7hdynmk6r22z27h6tvur'),
          timestamp: Date.now(),
        };

        mockStorage.local.set.mockImplementation((_data: unknown, callback?: () => void) => {
          callback?.();
        });

        mockStorage.local.get.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
          callback?.({
            cacheEntry: JSON.stringify(testEntry),
          });
        });

        const storage = yield* Storage;

        yield* storage.set('cacheEntry', testEntry, CacheEntry);
        const retrieved = yield* storage.get('cacheEntry', CacheEntry);

        expect(Option.isSome(retrieved)).toBe(true);
        if (Option.isSome(retrieved)) {
          expect(retrieved.value.handle).toBe(testEntry.handle);
          expect(retrieved.value.did).toBe(testEntry.did);
        }
      }).pipe(provideStorage),
    );
  });
});
