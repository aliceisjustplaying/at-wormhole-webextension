import { Context, Effect, Ref, Option, Layer, Clock } from 'effect';
import { Handle } from '@/model/handle';
import { Did } from '@/model/did';

/*
 * Phase 4, Lesson 10: Cache Service Implementation
 *
 * Using Effect's Ref for thread-safe state management.
 * The cache is bidirectional and supports LRU eviction.
 */

// Cache entry with metadata
interface CacheEntry {
  handle: Handle;
  did: Did;
  lastAccessed: number; // timestamp for LRU
  expiresAt: number; // timestamp for TTL
}

// Cache state
interface CacheState {
  // Bidirectional maps
  byHandle: Map<Handle, CacheEntry>;
  byDid: Map<Did, CacheEntry>;

  // Statistics
  hits: number;
  misses: number;

  // Configuration
  maxSize: number;
  ttlMillis: number;
}

// Service interface
export interface CacheService {
  set: (handle: Handle, did: Did) => Effect.Effect<void>;
  getByHandle: (handle: Handle) => Effect.Effect<Option.Option<Did>>;
  getByDid: (did: Did) => Effect.Effect<Option.Option<Handle>>;
  clear: () => Effect.Effect<void>;
  getStats: () => Effect.Effect<{ hits: number; misses: number; size: number }>;
}

// Service tag
export class Cache extends Context.Tag('Cache')<Cache, CacheService>() {}

// Helper to create initial state
const makeInitialState = (maxSize: number, ttlMillis: number): CacheState => ({
  byHandle: new Map(),
  byDid: new Map(),
  hits: 0,
  misses: 0,
  maxSize,
  ttlMillis,
});

// Helper to check if entry is expired
const isExpired = (entry: CacheEntry, now: number): boolean => entry.expiresAt <= now;

// Helper to evict LRU entry
const evictLRU = (state: CacheState): void => {
  if (state.byHandle.size === 0) return;

  let lruEntry: CacheEntry | null = null;
  let lruTime = Infinity;

  // Find least recently used entry
  for (const entry of state.byHandle.values()) {
    if (entry.lastAccessed < lruTime) {
      lruTime = entry.lastAccessed;
      lruEntry = entry;
    }
  }

  // Remove it
  if (lruEntry) {
    state.byHandle.delete(lruEntry.handle);
    state.byDid.delete(lruEntry.did);
  }
};

// Create the cache service implementation
export const CacheLive = (
  maxSize = 100,
  ttlMillis = 3600000, // 1 hour default TTL
): Effect.Effect<CacheService> =>
  Effect.gen(function* () {
    // Create the state ref
    const stateRef = yield* Ref.make(makeInitialState(maxSize, ttlMillis));

    return Cache.of({
      set: (handle, did) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;

          yield* Ref.update(stateRef, (state) => {
            // Remove any existing mapping for this handle
            const existing = state.byHandle.get(handle);
            if (existing) {
              state.byDid.delete(existing.did);
            }

            // Check if we need to evict (before adding new entry)
            if (state.byHandle.size >= state.maxSize && !existing) {
              evictLRU(state);
            }

            // Create new entry
            const entry: CacheEntry = {
              handle,
              did,
              lastAccessed: now,
              expiresAt: now + state.ttlMillis,
            };

            // Add to both maps
            state.byHandle.set(handle, entry);
            state.byDid.set(did, entry);

            return state;
          });
        }),

      getByHandle: (handle) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;

          return yield* Ref.modify(stateRef, (state) => {
            const entry = state.byHandle.get(handle);

            if (!entry || isExpired(entry, now)) {
              // Cache miss or expired
              state.misses++;

              // Remove expired entry
              if (entry) {
                state.byHandle.delete(handle);
                state.byDid.delete(entry.did);
              }

              return [Option.none(), state] as const;
            }

            // Cache hit - update last accessed
            entry.lastAccessed = now;
            state.hits++;

            return [Option.some(entry.did), state] as const;
          });
        }),

      getByDid: (did) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;

          return yield* Ref.modify(stateRef, (state) => {
            const entry = state.byDid.get(did);

            if (!entry || isExpired(entry, now)) {
              // Cache miss or expired
              state.misses++;

              // Remove expired entry
              if (entry) {
                state.byHandle.delete(entry.handle);
                state.byDid.delete(did);
              }

              return [Option.none(), state] as const;
            }

            // Cache hit - update last accessed
            entry.lastAccessed = now;
            state.hits++;

            return [Option.some(entry.handle), state] as const;
          });
        }),

      clear: () =>
        Ref.update(stateRef, (state) => ({
          ...state,
          byHandle: new Map(),
          byDid: new Map(),
        })),

      getStats: () =>
        Ref.get(stateRef).pipe(
          Effect.map((state) => ({
            hits: state.hits,
            misses: state.misses,
            size: state.byHandle.size,
          })),
        ),
    });
  });

// Create a layer for easy provision
export const CacheLayer = (maxSize?: number, ttlMillis?: number): Layer.Layer<Cache> => Layer.effect(Cache, CacheLive(maxSize, ttlMillis));
