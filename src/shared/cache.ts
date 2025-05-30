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

  async load(): Promise<void> {
    const result = await chrome.storage.local.get(DidHandleCache.STORAGE_KEY);
    const data: unknown = result[DidHandleCache.STORAGE_KEY];

    if (!data || typeof data !== 'object') {
      return;
    }

    try {
      for (const [did, entry] of Object.entries(data as Record<string, CacheEntry>)) {
        if (this.isValidDid(did) && this.isValidCacheEntry(entry)) {
          this.cache.set(did, entry.handle);
          this.lastAccessTime.set(did, entry.lastAccessed);
        }
      }
    } catch (error: unknown) {
      console.warn('Failed to load cache data:', error);
    }
  }

  async set(did: string, handle: string): Promise<void> {
    if (!this.isValidDid(did)) {
      throw new Error('Invalid DID format');
    }

    if (!this.isValidHandle(handle)) {
      throw new Error('Invalid handle format');
    }

    const previousHandle = this.cache.getByFirst(did);
    const previousLastAccessed = this.lastAccessTime.get(did);

    try {
      this.cache.set(did, handle);
      this.lastAccessTime.set(did, Date.now());

      this.checkSizeAndEvict();
      await this.persist();
    } catch (error) {
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
      throw error;
    }
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

  async clear(): Promise<void> {
    this.cache.clear();
    this.lastAccessTime.clear();
    await chrome.storage.local.remove(DidHandleCache.STORAGE_KEY);
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

    void this.persist().catch((error: unknown) => {
      console.warn('Failed to persist last accessed time:', error);
    });
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

  private async persist(): Promise<void> {
    const data: Record<string, CacheEntry> = {};

    for (const [did, lastAccessed] of this.lastAccessTime.entries()) {
      const handle = this.cache.getByFirst(did);
      if (handle) {
        data[did] = { handle, lastAccessed };
      }
    }

    await chrome.storage.local.set({
      [DidHandleCache.STORAGE_KEY]: data,
    });
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
