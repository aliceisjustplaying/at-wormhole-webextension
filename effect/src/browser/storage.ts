import { Context, Effect, Option, Data } from 'effect';
import { Schema as S, ParseResult } from '@effect/schema';

/*
 * Phase 5, Lesson 13: Browser Storage Service Implementation
 *
 * This wraps the chrome.storage API with:
 * - Effect-based error handling
 * - Schema validation
 * - Type safety
 */

// Error types
export class StorageError extends Data.TaggedError('StorageError')<{
  operation: 'get' | 'set' | 'remove' | 'clear';
  reason: string;
  cause?: unknown;
}> {}

// Storage area type
export type StorageArea = 'local' | 'sync';

// Storage options
export interface StorageOptions {
  area?: StorageArea;
}

// Service interface
export interface StorageService {
  get: <A, I>(key: string, schema: S.Schema<A, I>, options?: StorageOptions) => Effect.Effect<Option.Option<A>, StorageError | ParseResult.ParseError>;

  set: <A, I>(key: string, value: A, schema: S.Schema<A, I>, options?: StorageOptions) => Effect.Effect<void, StorageError | ParseResult.ParseError>;

  remove: (key: string, options?: StorageOptions) => Effect.Effect<void, StorageError>;

  clear: (options?: StorageOptions) => Effect.Effect<void, StorageError>;
}

// Service tag
export class Storage extends Context.Tag('Storage')<Storage, StorageService>() {}

// Helper to check chrome runtime errors
const checkChromeError = (): StorageError | null => {
  try {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      return new StorageError({
        operation: 'get',
        reason: lastError.message ?? 'Unknown chrome error',
      });
    }
  } catch {
    // Chrome API not available
  }
  return null;
};

// Convert callback-based API to Effect
const fromCallback = <T>(fn: (callback: (result: T) => void) => void, operation: StorageError['operation']): Effect.Effect<T, StorageError> =>
  Effect.async<T, StorageError>((resume) => {
    try {
      fn((result) => {
        const error = checkChromeError();
        if (error) {
          resume(Effect.fail(error));
        } else {
          resume(Effect.succeed(result));
        }
      });
    } catch (cause) {
      resume(
        Effect.fail(
          new StorageError({
            operation,
            reason: 'Failed to execute storage operation',
            cause,
          }),
        ),
      );
    }
  });

// Service implementation
export const StorageLive: StorageService = {
  get: <A, I>(key: string, schema: S.Schema<A, I>, options?: StorageOptions) =>
    Effect.gen(function* () {
      const area = options?.area ?? 'local';
      const storage = chrome.storage[area];

      const result = yield* fromCallback<Record<string, unknown>>((cb) => {
        storage.get([key], cb);
      }, 'get');

      const raw = result[key];
      if (raw === undefined) {
        return Option.none();
      }

      // Parse JSON and validate with schema
      try {
        const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const decoded = yield* S.decodeUnknown(schema)(parsed);
        return Option.some(decoded);
      } catch {
        // If it's not JSON, try to decode directly
        const decoded = yield* S.decodeUnknown(schema)(raw);
        return Option.some(decoded);
      }
    }),

  set: <A, I>(key: string, value: A, schema: S.Schema<A, I>, options?: StorageOptions) =>
    Effect.gen(function* () {
      const area = options?.area ?? 'local';
      const storage = chrome.storage[area];

      // Encode with schema to ensure it's valid
      const encoded = yield* S.encode(schema)(value);

      // Store as JSON string for consistency
      const data = { [key]: JSON.stringify(encoded) };

      yield* Effect.async((resume: (effect: Effect.Effect<void, StorageError>) => void) => {
        try {
          storage.set(data, () => {
            const error = checkChromeError();
            if (error) {
              resume(Effect.fail(error));
            } else {
              resume(Effect.void);
            }
          });
        } catch (cause) {
          resume(
            Effect.fail(
              new StorageError({
                operation: 'set',
                reason: 'Failed to execute storage operation',
                cause,
              }),
            ),
          );
        }
      });
    }),

  remove: (key: string, options?: StorageOptions) =>
    Effect.gen(function* () {
      const area = options?.area ?? 'local';
      const storage = chrome.storage[area];

      yield* Effect.async((resume: (effect: Effect.Effect<void, StorageError>) => void) => {
        try {
          storage.remove([key], () => {
            const error = checkChromeError();
            if (error) {
              resume(Effect.fail(error));
            } else {
              resume(Effect.void);
            }
          });
        } catch (cause) {
          resume(
            Effect.fail(
              new StorageError({
                operation: 'remove',
                reason: 'Failed to execute storage operation',
                cause,
              }),
            ),
          );
        }
      });
    }),

  clear: (options?: StorageOptions) =>
    Effect.gen(function* () {
      const area = options?.area ?? 'local';
      const storage = chrome.storage[area];

      yield* Effect.async((resume: (effect: Effect.Effect<void, StorageError>) => void) => {
        try {
          storage.clear(() => {
            const error = checkChromeError();
            if (error) {
              resume(Effect.fail(error));
            } else {
              resume(Effect.void);
            }
          });
        } catch (cause) {
          resume(
            Effect.fail(
              new StorageError({
                operation: 'clear',
                reason: 'Failed to execute storage operation',
                cause,
              }),
            ),
          );
        }
      });
    }),
};

// Create a layer for the storage service
export const StorageLayer = Storage.of(StorageLive);

/*
 * What we learned:
 *
 * 1. Effect.async converts callback-based APIs to Effects
 * 2. Schema encode/decode provides type-safe serialization
 * 3. Option type represents nullable values explicitly
 * 4. Tagged errors make error handling explicit
 * 5. Service pattern works well for browser APIs
 */
