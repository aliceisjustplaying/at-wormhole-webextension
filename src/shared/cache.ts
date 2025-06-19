import { ResultAsync, ok, err } from 'neverthrow';
import type { WormholeError } from './errors';
import { cacheError } from './errors';
import { logError } from './debug';

export class BidirectionalMap<K1, K2> {
  private forwardMap = new Map<K1, K2>();
  private reverseMap = new Map<K2, K1>();

  set(k1: K1, k2: K2): void {
    const existingK2 = this.forwardMap.get(k1);
    const existingK1 = this.reverseMap.get(k2);

    if (existingK2 !== undefined) {
      this.reverseMap.delete(existingK2);
    }

    if (existingK1 !== undefined) {
      this.forwardMap.delete(existingK1);
    }

    this.forwardMap.set(k1, k2);
    this.reverseMap.set(k2, k1);
  }

  getByFirst(k1: K1): K2 | undefined {
    return this.forwardMap.get(k1);
  }

  getBySecond(k2: K2): K1 | undefined {
    return this.reverseMap.get(k2);
  }

  delete(k1: K1, k2: K2): boolean {
    const currentK2 = this.forwardMap.get(k1);
    const currentK1 = this.reverseMap.get(k2);

    if (currentK2 === k2 && currentK1 === k1) {
      this.forwardMap.delete(k1);
      this.reverseMap.delete(k2);
      return true;
    }

    return false;
  }

  clear(): void {
    this.forwardMap.clear();
    this.reverseMap.clear();
  }

  get size(): number {
    return this.forwardMap.size;
  }
}

interface CacheEntry {
  handle: string;
  lastAccessed: number;
}

export class DidHandleCache {
  private cache = new BidirectionalMap<string, string>();
  private lastAccessTime = new Map<string, number>();
  private maxStorageSize: number;
  private static readonly STORAGE_KEY = 'wormhole-cache';
  private static readonly DEFAULT_MAX_SIZE = 4 * 1024 * 1024; // 4MB

  constructor(maxStorageSize: number = DidHandleCache.DEFAULT_MAX_SIZE) {
    this.maxStorageSize = maxStorageSize;
  }

  load(): ResultAsync<void, WormholeError> {
    return ResultAsync.fromPromise(chrome.storage.local.get(DidHandleCache.STORAGE_KEY), (e) =>
      cacheError('Failed to load cache from storage', 'load', e),
    )
      .andThen((result) => {
        const data: unknown = result[DidHandleCache.STORAGE_KEY];

        if (!data || typeof data !== 'object') {
          return ok(undefined);
        }

        try {
          for (const [did, entry] of Object.entries(data as Record<string, CacheEntry>)) {
            if (this.isValidDid(did) && this.isValidCacheEntry(entry)) {
              this.cache.set(did, entry.handle);
              this.lastAccessTime.set(did, entry.lastAccessed);
            }
          }
          return ok(undefined);
        } catch (error: unknown) {
          const err = cacheError('Failed to parse cache data', 'load', error);
          logError('CACHE', err);
          return ok(undefined); // Continue with empty cache on parse errors
        }
      })
      .map(() => undefined);
  }

  set(did: string, handle: string): ResultAsync<void, WormholeError> {
    // Validation errors are programmer errors - keep as throws
    if (!this.isValidDid(did)) {
      throw new Error('Invalid DID format');
    }

    if (!this.isValidHandle(handle)) {
      throw new Error('Invalid handle format');
    }

    const previousHandle = this.cache.getByFirst(did);
    const previousLastAccessed = this.lastAccessTime.get(did);

    // Update cache immediately
    this.cache.set(did, handle);
    this.lastAccessTime.set(did, Date.now());
    this.checkSizeAndEvict();

    // Attempt to persist - if it fails, rollback and return error
    return this.persist().orElse((error) => {
      // Rollback on persistence failure
      if (previousHandle !== undefined) {
        this.cache.set(did, previousHandle);
        if (previousLastAccessed !== undefined) {
          this.lastAccessTime.set(did, previousLastAccessed);
        }
      } else {
        const currentHandle = this.cache.getByFirst(did);
        if (currentHandle) {
          this.cache.delete(did, currentHandle);
        }
        this.lastAccessTime.delete(did);
      }
      return err(error);
    });
  }

  getHandle(did: string): string | undefined {
    const handle = this.cache.getByFirst(did);
    if (handle !== undefined) {
      this.updateLastAccessed(did);
    }
    return handle;
  }

  getDid(handle: string): string | undefined {
    const did = this.cache.getBySecond(handle);
    if (did !== undefined) {
      this.updateLastAccessed(did);
    }
    return did;
  }

  clear(): ResultAsync<void, WormholeError> {
    this.cache.clear();
    this.lastAccessTime.clear();
    return ResultAsync.fromPromise(chrome.storage.local.remove(DidHandleCache.STORAGE_KEY), (e) =>
      cacheError('Failed to clear cache from storage', 'clear', e),
    ).map(() => undefined);
  }

  get size(): number {
    return this.cache.size;
  }

  get estimatedStorageSize(): number {
    if (this.cache.size === 0) {
      return 0;
    }

    const sampleData: Record<string, CacheEntry> = {};

    let count = 0;
    for (const did of this.lastAccessTime.keys()) {
      const handle = this.cache.getByFirst(did);
      const lastAccessed = this.lastAccessTime.get(did);

      if (handle && lastAccessed) {
        sampleData[did] = { handle, lastAccessed };
        count++;
        if (count >= 3) break;
      }
    }

    if (count === 0) {
      return 0;
    }

    const sampleSize = JSON.stringify({ [DidHandleCache.STORAGE_KEY]: sampleData }).length;
    const avgEntrySize = sampleSize / Math.min(count, 3);

    return Math.round(avgEntrySize * this.cache.size * 1.1);
  }

  private updateLastAccessed(did: string): void {
    this.lastAccessTime.set(did, Date.now());

    // Fire-and-forget persistence with error logging
    void this.persist().match(
      () => {
        // Success - no action needed
      },
      (error) => {
        logError('CACHE', error, { operation: 'updateLastAccessed', did });
      },
    );
  }

  private checkSizeAndEvict(): void {
    const currentSize = this.estimatedStorageSize;

    if (currentSize > this.maxStorageSize * 0.8) {
      this.evictOldestEntries();
    }
  }

  evictOldestEntries(): void {
    const entries = Array.from(this.lastAccessTime.entries()).sort(([, a], [, b]) => a - b);

    const entriesToRemove = Math.ceil(entries.length * 0.3);

    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      const [did] = entries[i];
      const handle = this.cache.getByFirst(did);

      if (handle) {
        this.cache.delete(did, handle);
        this.lastAccessTime.delete(did);
      }
    }
  }

  private persist(): ResultAsync<void, WormholeError> {
    const data: Record<string, CacheEntry> = {};

    for (const [did, lastAccessed] of this.lastAccessTime.entries()) {
      const handle = this.cache.getByFirst(did);
      if (handle) {
        data[did] = { handle, lastAccessed };
      }
    }

    return ResultAsync.fromPromise(
      chrome.storage.local.set({
        [DidHandleCache.STORAGE_KEY]: data,
      }),
      (e) => cacheError('Failed to persist cache to storage', 'persist', e),
    ).map(() => undefined);
  }

  private isValidDid(did: string): boolean {
    return typeof did === 'string' && did.length > 0 && (did.startsWith('did:plc:') || did.startsWith('did:web:'));
  }

  private isValidHandle(handle: string): boolean {
    return typeof handle === 'string' && handle.length > 0 && !handle.includes('..') && /^[a-zA-Z0-9.-]+$/.test(handle);
  }

  private isValidCacheEntry(entry: unknown): entry is CacheEntry {
    return (
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as CacheEntry).handle === 'string' &&
      typeof (entry as CacheEntry).lastAccessed === 'number'
    );
  }
}
