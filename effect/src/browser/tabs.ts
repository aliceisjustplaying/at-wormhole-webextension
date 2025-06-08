import { Context, Effect, Option, Data, Layer } from 'effect';
import { Schema as S, ParseResult } from '@effect/schema';

/*
 * Phase 5, Lesson 13 (continued): Chrome Tabs Service Implementation
 *
 * This wraps the chrome.tabs API with Effect-based error handling
 * and type safety.
 */

// Error type
export class TabsError extends Data.TaggedError('TabsError')<{
  operation: string;
  reason: string;
  cause?: unknown;
}> {}

// Tab type - subset of chrome.tabs.Tab that we care about
export interface Tab {
  id?: number;
  url?: string;
  title?: string;
  active: boolean;
  index: number;
  windowId: number;
}

// Service interface
export interface TabsService {
  query: (info: chrome.tabs.QueryInfo) => Effect.Effect<Tab[], TabsError>;
  get: (tabId: number) => Effect.Effect<Option.Option<Tab>, TabsError>;
  getCurrent: () => Effect.Effect<Option.Option<Tab>, TabsError>;
  create: (props: chrome.tabs.CreateProperties) => Effect.Effect<Tab, TabsError>;
  update: (tabId: number, props: chrome.tabs.UpdateProperties) => Effect.Effect<Tab, TabsError>;
  remove: (tabId: number) => Effect.Effect<void, TabsError>;
  sendMessage: <M, MI, R, RI>(tabId: number, message: M, messageSchema: S.Schema<M, MI>, responseSchema: S.Schema<R, RI>) => Effect.Effect<Option.Option<R>, TabsError | ParseResult.ParseError>;
}

// Service tag
export class Tabs extends Context.Tag('Tabs')<Tabs, TabsService>() {}

// Helper to check chrome runtime errors
const checkChromeError = (operation: string): TabsError | null => {
  try {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      return new TabsError({
        operation,
        reason: lastError.message ?? 'Unknown chrome error',
      });
    }
  } catch {
    // Chrome API not available
  }
  return null;
};

// Convert callback-based API to Effect
const fromCallback = <T>(fn: (callback: (result: T) => void) => void, operation: string): Effect.Effect<T, TabsError> =>
  Effect.async<T, TabsError>((resume) => {
    try {
      fn((result) => {
        const error = checkChromeError(operation);
        if (error) {
          resume(Effect.fail(error));
        } else {
          resume(Effect.succeed(result));
        }
      });
    } catch (cause) {
      resume(
        Effect.fail(
          new TabsError({
            operation,
            reason: 'Failed to execute tabs operation',
            cause,
          }),
        ),
      );
    }
  });

// Service implementation
const TabsServiceLive = Tabs.of({
  query: (info) =>
    fromCallback<chrome.tabs.Tab[]>((cb) => {
      chrome.tabs.query(info, cb);
    }, 'query'),

  get: (tabId) =>
    Effect.gen(function* () {
      const tab = yield* fromCallback<chrome.tabs.Tab | undefined>((cb) => {
        chrome.tabs.get(tabId, cb);
      }, 'get');
      return tab ? Option.some(tab as Tab) : Option.none();
    }),

  getCurrent: () =>
    Effect.gen(function* () {
      const tabs = yield* fromCallback<chrome.tabs.Tab[]>((cb) => {
        chrome.tabs.query({ active: true, currentWindow: true }, cb);
      }, 'getCurrent');
      return tabs.length > 0 ? Option.some(tabs[0] as Tab) : Option.none();
    }),

  create: (props) =>
    fromCallback<chrome.tabs.Tab>((cb) => {
      chrome.tabs.create(props, cb);
    }, 'create'),

  update: (tabId, props) =>
    Effect.async<chrome.tabs.Tab, TabsError>((resume) => {
      try {
        chrome.tabs.update(tabId, props, (tab) => {
          const error = checkChromeError('update');
          if (error) {
            resume(Effect.fail(error));
          } else if (!tab) {
            resume(Effect.fail(new TabsError({ operation: 'update', reason: 'Tab not found' })));
          } else {
            resume(Effect.succeed(tab));
          }
        });
      } catch (cause) {
        resume(
          Effect.fail(
            new TabsError({
              operation: 'update',
              reason: 'Failed to execute tabs operation',
              cause,
            }),
          ),
        );
      }
    }),

  remove: (tabId) =>
    Effect.async((resume: (effect: Effect.Effect<void, TabsError>) => void) => {
      try {
        chrome.tabs.remove(tabId, () => {
          const error = checkChromeError('remove');
          if (error) {
            resume(Effect.fail(error));
          } else {
            resume(Effect.void);
          }
        });
      } catch (cause) {
        resume(
          Effect.fail(
            new TabsError({
              operation: 'remove',
              reason: 'Failed to execute tabs operation',
              cause,
            }),
          ),
        );
      }
    }),

  sendMessage: <M, MI, R, RI>(tabId: number, message: M, messageSchema: S.Schema<M, MI>, responseSchema: S.Schema<R, RI>) =>
    Effect.gen(function* () {
      // Encode the message
      const encoded = yield* S.encode(messageSchema)(message);

      // Send and get response
      const response = yield* fromCallback<unknown>((cb) => {
        chrome.tabs.sendMessage(tabId, encoded, cb);
      }, 'sendMessage');

      if (response === undefined) {
        return Option.none();
      }

      // Decode the response
      const decoded = yield* S.decodeUnknown(responseSchema)(response);
      return Option.some(decoded);
    }),
});

// Create a layer for easy provision
export const TabsLive = Layer.succeed(Tabs, TabsServiceLive);

/*
 * What we learned:
 *
 * 1. Wrapping callback APIs is straightforward with Effect.async
 * 2. Option type elegantly handles nullable returns
 * 3. Schema validation ensures type safety for messages
 * 4. Service pattern provides clean dependency injection
 * 5. Tagged errors make error handling explicit
 */
