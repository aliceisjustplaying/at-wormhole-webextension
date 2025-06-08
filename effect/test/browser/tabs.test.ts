import { describe, expect, beforeEach, vi } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Option } from 'effect';
import { Schema as S } from '@effect/schema';
import { Tabs, TabsLive } from '@/browser/tabs';

/*
 * Phase 5, Lesson 13 (continued): Chrome Tabs API Wrapper
 *
 * Problem: The chrome.tabs API is callback-based and doesn't
 * provide type safety. We need:
 * - Effect-based API for better error handling
 * - Type-safe tab queries
 * - Simplified tab manipulation
 */

describe('Chrome Tabs Wrapper', () => {
  // Mock chrome.tabs API
  const mockTabs = {
    query: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    sendMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - mocking chrome global
    global.chrome = { tabs: mockTabs };
  });

  // Mock tab data
  const mockTab: chrome.tabs.Tab = {
    id: 123,
    url: 'https://bsky.app/profile/alice.bsky.social',
    title: 'Alice Profile',
    active: true,
    index: 0,
    windowId: 1,
    pinned: false,
    highlighted: true,
    incognito: false,
    selected: true,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    frozen: false,
  };

  describe('Tab Queries', () => {
    it.effect('should get the current active tab', () =>
      Effect.gen(function* () {
        mockTabs.query.mockImplementation((query: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
          if (query.active && query.currentWindow) {
            callback([mockTab]);
          } else {
            callback([]);
          }
        });

        const tabs = yield* Tabs;
        const currentTab = yield* tabs.getCurrent();

        expect(Option.isSome(currentTab)).toBe(true);
        if (Option.isSome(currentTab)) {
          expect(currentTab.value.id).toBe(123);
          expect(currentTab.value.url).toBe('https://bsky.app/profile/alice.bsky.social');
        }
      }).pipe(Effect.provide(TabsLive)),
    );

    it.effect('should query tabs by URL pattern', () =>
      Effect.gen(function* () {
        const bskyTabs = [
          { ...mockTab, id: 1, url: 'https://bsky.app/profile/alice.bsky.social' },
          { ...mockTab, id: 2, url: 'https://bsky.app/profile/bob.bsky.social' },
        ];

        mockTabs.query.mockImplementation((query: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
          if (query.url === '*://bsky.app/*') {
            callback(bskyTabs);
          } else {
            callback([]);
          }
        });

        const tabs = yield* Tabs;
        const results = yield* tabs.query({ url: '*://bsky.app/*' });

        expect(results).toHaveLength(2);
        expect(results[0]?.url ?? '').toContain('alice');
        expect(results[1]?.url ?? '').toContain('bob');
      }).pipe(Effect.provide(TabsLive)),
    );

    it.effect('should get tab by ID', () =>
      Effect.gen(function* () {
        mockTabs.get.mockImplementation((tabId: number, callback: (tab?: chrome.tabs.Tab) => void) => {
          if (tabId === 123) {
            callback(mockTab);
          } else {
            callback(undefined);
          }
        });

        const tabs = yield* Tabs;
        const tab = yield* tabs.get(123);

        expect(Option.isSome(tab)).toBe(true);
        if (Option.isSome(tab)) {
          expect(tab.value.id).toBe(123);
        }

        // Non-existent tab
        const notFound = yield* tabs.get(999);
        expect(Option.isNone(notFound)).toBe(true);
      }).pipe(Effect.provide(TabsLive)),
    );
  });

  describe('Tab Manipulation', () => {
    it.effect('should create a new tab', () =>
      Effect.gen(function* () {
        const newTab = { ...mockTab, id: 456, url: 'https://example.com' };

        mockTabs.create.mockImplementation((props: chrome.tabs.CreateProperties, callback: (tab: chrome.tabs.Tab) => void) => {
          callback({ ...newTab, ...props });
        });

        const tabs = yield* Tabs;
        const created = yield* tabs.create({ url: 'https://example.com' });

        expect(created.url).toBe('https://example.com');
        expect(mockTabs.create).toHaveBeenCalledWith({ url: 'https://example.com' }, expect.any(Function));
      }).pipe(Effect.provide(TabsLive)),
    );

    it.effect('should update a tab', () =>
      Effect.gen(function* () {
        mockTabs.update.mockImplementation((tabId: number, props: chrome.tabs.UpdateProperties, callback: (tab: chrome.tabs.Tab) => void) => {
          callback({ ...mockTab, ...props, id: tabId });
        });

        const tabs = yield* Tabs;
        const updated = yield* tabs.update(123, { url: 'https://new-url.com' });

        expect(updated.url).toBe('https://new-url.com');
        expect(mockTabs.update).toHaveBeenCalledWith(123, { url: 'https://new-url.com' }, expect.any(Function));
      }).pipe(Effect.provide(TabsLive)),
    );
  });

  describe('Tab Messaging', () => {
    it.effect('should send messages to tabs', () =>
      Effect.gen(function* () {
        const MessageSchema = S.Struct({
          type: S.String,
          data: S.String,
        });

        const ResponseSchema = S.Struct({
          success: S.Boolean,
          result: S.String,
        });

        mockTabs.sendMessage.mockImplementation((tabId: number, message: unknown, callback: (response?: unknown) => void) => {
          const msg = message as { type: string };
          if (tabId === 123 && msg.type === 'test') {
            callback({ success: true, result: 'ok' });
          } else {
            callback(undefined);
          }
        });

        const tabs = yield* Tabs;
        const response = yield* tabs.sendMessage(123, { type: 'test', data: 'hello' }, MessageSchema, ResponseSchema);

        expect(Option.isSome(response)).toBe(true);
        if (Option.isSome(response)) {
          expect(response.value.success).toBe(true);
          expect(response.value.result).toBe('ok');
        }
      }).pipe(Effect.provide(TabsLive)),
    );
  });

  describe('Error Handling', () => {
    it.effect('should handle chrome runtime errors', () =>
      Effect.gen(function* () {
        mockTabs.query.mockImplementation((_query: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
          // @ts-expect-error - mocking chrome runtime
          global.chrome.runtime = {
            lastError: { message: 'Tabs API error' },
          };
          callback([]);
        });

        const tabs = yield* Tabs;
        const result = yield* tabs.query({}).pipe(Effect.either);

        expect(result._tag).toBe('Left');
        if (result._tag === 'Left') {
          expect(result.left).toMatchObject({
            _tag: 'TabsError',
          });
        }
      }).pipe(Effect.provide(TabsLive)),
    );
  });
});
