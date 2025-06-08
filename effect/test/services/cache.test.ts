import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, TestClock, TestContext, Option } from 'effect';
import { Handle } from '@/model/handle';
import { Did } from '@/model/did';
import { Schema as S } from '@effect/schema';
import { Cache, CacheLayer } from '@/services/cache';

/*
 * Phase 4, Lesson 10: Cache Service with Ref
 *
 * Problem: We need to cache handle↔DID mappings to avoid repeated
 * network calls. The cache must be:
 * - Thread-safe for concurrent access
 * - Bidirectional (lookup by handle OR by DID)
 * - Size-limited with LRU eviction
 * - Support TTL/expiration
 *
 * Effect's Ref provides safe concurrent state management.
 */

describe('Cache Service', () => {
  // First, let's understand what we're caching
  const makeTestData = (): { handle1: Handle; did1: Did; handle2: Handle; did2: Did } => {
    const handle1 = S.decodeSync(Handle)('alice.bsky.social');
    const did1 = S.decodeSync(Did)('did:plc:z72i7hdynmk6r22z27h6tvur');

    const handle2 = S.decodeSync(Handle)('bob.example.com');
    const did2 = S.decodeSync(Did)('did:web:example.com');

    return { handle1, did1, handle2, did2 };
  };

  // Helper to provide cache layer with test configuration
  const provideTestCache = (maxSize = 100, ttlMillis = 3600000): (<A, E>(effect: Effect.Effect<A, E, Cache>) => Effect.Effect<A, E>) => Effect.provide(CacheLayer(maxSize, ttlMillis));

  describe('Basic Operations', () => {
    it.effect('should store and retrieve a handle-did mapping', () =>
      Effect.gen(function* () {
        const { handle1, did1 } = makeTestData();

        // We'll need a cache service that can:
        // 1. Store a mapping
        // 2. Retrieve by handle
        // 3. Retrieve by DID (bidirectional)

        // For now, let's imagine the API
        const cache = yield* Cache;

        // Store the mapping
        yield* cache.set(handle1, did1);

        // Retrieve by handle
        const didResult = yield* cache.getByHandle(handle1);
        expect(Option.isSome(didResult)).toBe(true);
        if (Option.isSome(didResult)) {
          expect(didResult.value).toBe(did1);
        }

        // Retrieve by DID (bidirectional)
        const handleResult = yield* cache.getByDid(did1);
        expect(Option.isSome(handleResult)).toBe(true);
        if (Option.isSome(handleResult)) {
          expect(handleResult.value).toBe(handle1);
        }
      }).pipe(provideTestCache()),
    );

    it.effect('should return None for missing entries', () =>
      Effect.gen(function* () {
        const { handle1 } = makeTestData();
        const cache = yield* Cache;

        const result = yield* cache.getByHandle(handle1);
        expect(Option.isNone(result)).toBe(true);
      }).pipe(provideTestCache()),
    );

    it.effect('should update existing mappings', () =>
      Effect.gen(function* () {
        const { handle1, did1, did2 } = makeTestData();
        const cache = yield* Cache;

        // First mapping
        yield* cache.set(handle1, did1);

        // Update to new DID
        yield* cache.set(handle1, did2);

        // Should return new DID
        const result = yield* cache.getByHandle(handle1);
        expect(Option.isSome(result)).toBe(true);
        if (Option.isSome(result)) {
          expect(result.value).toBe(did2);
        }

        // Old DID should not map to handle anymore
        const oldResult = yield* cache.getByDid(did1);
        expect(Option.isNone(oldResult)).toBe(true);
      }).pipe(provideTestCache()),
    );

    it.effect('should handle concurrent access safely', () =>
      Effect.gen(function* () {
        const { handle1, handle2, did1, did2 } = makeTestData();
        const cache = yield* Cache;

        // Run multiple operations concurrently
        yield* Effect.all([cache.set(handle1, did1), cache.set(handle2, did2), cache.getByHandle(handle1), cache.getByDid(did2)], { concurrency: 'unbounded' });

        // Verify both mappings exist
        const result1 = yield* cache.getByHandle(handle1);
        const result2 = yield* cache.getByHandle(handle2);

        expect(Option.isSome(result1)).toBe(true);
        if (Option.isSome(result1)) {
          expect(result1.value).toBe(did1);
        }
        expect(Option.isSome(result2)).toBe(true);
        if (Option.isSome(result2)) {
          expect(result2.value).toBe(did2);
        }
      }).pipe(provideTestCache()),
    );
  });

  describe('LRU Eviction', () => {
    it.effect('should evict least recently used items when capacity is reached', () =>
      Effect.gen(function* () {
        const cache = yield* Cache;

        // Assuming cache has capacity of 2 for this test
        const handle1 = S.decodeSync(Handle)('user1.bsky.social');
        const did1 = S.decodeSync(Did)('did:plc:111111111111111111111111');

        const handle2 = S.decodeSync(Handle)('user2.bsky.social');
        const did2 = S.decodeSync(Did)('did:plc:222222222222222222222222');

        const handle3 = S.decodeSync(Handle)('user3.bsky.social');
        const did3 = S.decodeSync(Did)('did:plc:333333333333333333333333');

        // Fill cache
        yield* cache.set(handle1, did1);
        yield* TestClock.adjust(1);
        yield* cache.set(handle2, did2);
        yield* TestClock.adjust(1);

        // Access handle1 to make it more recently used
        yield* cache.getByHandle(handle1);
        yield* TestClock.adjust(1);

        // Add third item - should evict handle2 (least recently used)
        yield* cache.set(handle3, did3);

        // handle1 should still exist (was accessed)
        const result1 = yield* cache.getByHandle(handle1);
        expect(Option.isSome(result1)).toBe(true);
        if (Option.isSome(result1)) {
          expect(result1.value).toBe(did1);
        }

        // handle2 should be evicted
        const result2 = yield* cache.getByHandle(handle2);
        expect(Option.isNone(result2)).toBe(true);

        // handle3 should exist (just added)
        const result3 = yield* cache.getByHandle(handle3);
        expect(Option.isSome(result3)).toBe(true);
        if (Option.isSome(result3)) {
          expect(result3.value).toBe(did3);
        }
      }).pipe(provideTestCache(2), Effect.provide(TestContext.TestContext)),
    );
  });

  describe('TTL/Expiration', () => {
    it.effect('should expire entries after TTL', () =>
      Effect.gen(function* () {
        const { handle1, did1 } = makeTestData();
        const cache = yield* Cache;

        // Set with 1 hour TTL
        yield* cache.set(handle1, did1);

        // Should exist initially
        const before = yield* cache.getByHandle(handle1);
        expect(Option.isSome(before)).toBe(true);
        if (Option.isSome(before)) {
          expect(before.value).toBe(did1);
        }

        // Advance time by 2 hours
        yield* TestClock.adjust('2 hours');

        // Should be expired
        const after = yield* cache.getByHandle(handle1);
        expect(Option.isNone(after)).toBe(true);
      }).pipe(provideTestCache(100, 3600000), Effect.provide(TestContext.TestContext)),
    );
  });

  describe('Cache Statistics', () => {
    it.effect('should track cache hits and misses', () =>
      Effect.gen(function* () {
        const { handle1, did1 } = makeTestData();
        const cache = yield* Cache;

        // Store a mapping
        yield* cache.set(handle1, did1);

        // Get initial stats
        const statsBefore = yield* cache.getStats();
        expect(statsBefore.hits).toBe(0);
        expect(statsBefore.misses).toBe(0);

        // Cache hit
        yield* cache.getByHandle(handle1);

        // Cache miss
        yield* cache.getByHandle(S.decodeSync(Handle)('unknown.bsky.social'));

        // Check updated stats
        const statsAfter = yield* cache.getStats();
        expect(statsAfter.hits).toBe(1);
        expect(statsAfter.misses).toBe(1);
        expect(statsAfter.size).toBe(1);
      }).pipe(provideTestCache()),
    );
  });

  describe('Clear Operations', () => {
    it.effect('should clear all entries', () =>
      Effect.gen(function* () {
        const { handle1, did1, handle2, did2 } = makeTestData();
        const cache = yield* Cache;

        // Add some entries
        yield* cache.set(handle1, did1);
        yield* cache.set(handle2, did2);

        // Clear cache
        yield* cache.clear();

        // All entries should be gone
        const result1 = yield* cache.getByHandle(handle1);
        const result2 = yield* cache.getByHandle(handle2);

        expect(Option.isNone(result1)).toBe(true);
        expect(Option.isNone(result2)).toBe(true);
      }).pipe(provideTestCache()),
    );
  });
});
