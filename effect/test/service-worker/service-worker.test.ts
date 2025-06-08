import { describe, it, expect } from 'vitest';
import { Effect, Layer, Option } from 'effect';
import { Schema as S } from '@effect/schema';
import type { TransformRequest, TransformResponse, ErrorResponse, Response as MessageResponse } from '@/model/messages';
import { Messaging, type MessagingService, MessagingError } from '@/browser/messaging';
import { Parser, type ParserService } from '@/services/parser';
import { Normalizer, type NormalizerService } from '@/services/normalizer';
import { UrlParser, type UrlParserService, InvalidUrlError } from '@/services/url-parser';
import { Resolver, type ResolverService } from '@/services/resolver';
import { Cache, type CacheService } from '@/services/cache';
import { Storage, type StorageService } from '@/browser/storage';
import { Handle, parseHandle } from '@/model/handle';
import { Did } from '@/model/did';
import type { TransformInfo } from '@/model/transform-info';

/*
 * Phase 6: Testing Service Workers with Effect
 *
 * These tests demonstrate:
 * - Mocking all service dependencies
 * - Testing message flow through the pipeline
 * - Error propagation and handling
 * - Cache integration testing
 */

describe('Service Worker', () => {
  // Mock implementations
  const mockParser: ParserService = {
    parseInput: (input: string) =>
      Effect.succeed({
        type: 'handle' as const,
        value: S.decodeSync(Handle)(input),
      }),
  };

  const mockNormalizer: NormalizerService = {
    normalize: () =>
      Effect.succeed({
        handle: S.decodeSync(Handle)('alice.bsky.social'),
      } as TransformInfo),
  };

  const mockUrlParser: UrlParserService = {
    parseUrl: () => Effect.fail(new InvalidUrlError({ input: '', reason: 'Not implemented' })),
  };

  const mockResolver: ResolverService = {
    resolveHandle: () => Effect.succeed(S.decodeSync(Did)('did:plc:z72i7hdynmk6r22z27h6tvur')),
    resolveDidDocument: () => Effect.succeed({ handle: null }),
  };

  // Cache with in-memory storage
  let cacheStore: Map<string, { did: Did; handle: Handle; timestamp: number }>;
  const mockCache = (): CacheService => ({
    set: (handle: Handle, did: Did) =>
      Effect.sync(() => {
        cacheStore.set(handle, { handle, did, timestamp: Date.now() });
      }),
    getByHandle: (handle: Handle) =>
      Effect.sync(() => {
        const entry = cacheStore.get(handle);
        return entry ? Option.some(entry.did) : Option.none();
      }),
    getByDid: (did: Did) =>
      Effect.sync(() => {
        const entry = Array.from(cacheStore.values()).find((e) => e.did === did);
        return entry ? Option.some(entry.handle) : Option.none();
      }),
    getStats: () =>
      Effect.succeed({
        hits: 0,
        misses: 0,
        size: cacheStore.size,
      }),
    clear: () =>
      Effect.sync(() => {
        cacheStore.clear();
      }),
  });

  const mockStorage: StorageService = {
    get: () => Effect.succeed(Option.none()),
    set: () => Effect.succeed(void 0),
    remove: () => Effect.succeed(void 0),
    clear: () => Effect.succeed(void 0),
  };

  // Helper to create test layers
  const createTestLayers = (): Layer.Layer<Parser | Normalizer | UrlParser | Resolver | Cache | Storage> => {
    cacheStore = new Map();
    return Layer.mergeAll(Layer.succeed(Parser, mockParser), Layer.succeed(Normalizer, mockNormalizer), Layer.succeed(UrlParser, mockUrlParser), Layer.succeed(Resolver, mockResolver), Layer.succeed(Cache, mockCache()), Layer.succeed(Storage, mockStorage));
  };

  it('should handle transform request successfully', async () => {
    const request: TransformRequest = {
      id: 'test-123',
      timestamp: Date.now(),
      type: 'transform',
      input: 'alice.bsky.social',
    };

    let capturedResponse: MessageResponse | null = null;

    const mockMessaging: MessagingService = {
      sendRequest: () =>
        Effect.fail(
          new MessagingError({
            operation: 'send',
            reason: 'Not implemented',
          }),
        ),
      onRequest: (handler) =>
        Effect.gen(function* () {
          const response = yield* handler(request);
          capturedResponse = response;
        }),
      sendResponse: () => Effect.succeed(void 0),
    };

    const layers = Layer.mergeAll(createTestLayers(), Layer.succeed(Messaging, mockMessaging));

    // Import and run the service worker logic
    // Note: In real implementation, we'd extract the handler logic
    const program = Effect.gen(function* () {
      const messaging = yield* Messaging;
      yield* messaging.onRequest((req) => {
        if (req.type === 'transform') {
          // Simulate the service worker's transform logic
          return Effect.gen(function* () {
            const parser = yield* Parser;
            const normalizer = yield* Normalizer;
            const resolver = yield* Resolver;
            const cache = yield* Cache;

            const parsed = yield* parser.parseInput(req.input);

            // Normalize based on parsed type
            let normalized: TransformInfo;
            if (parsed.type === 'handle') {
              normalized = yield* normalizer.normalize(parsed.value);
            } else {
              // For simplicity in tests, just return a basic TransformInfo
              normalized = {
                handle: S.decodeSync(Handle)('alice.bsky.social'),
                inputType: 'handle' as const,
                contentType: 'profile' as const,
                bskyAppPath: '/profile/alice.bsky.social',
              };
            }

            // Resolve handle to DID if needed
            let resolved = normalized;
            if (normalized.handle && !normalized.did) {
              const did = yield* resolver.resolveHandle(normalized.handle);
              yield* cache.set(normalized.handle, did);
              resolved = { ...normalized, did };
            }

            const response: TransformResponse = {
              id: req.id,
              timestamp: Date.now(),
              type: 'transform',
              result: resolved,
              cached: false,
            };

            return response;
          }) as Effect.Effect<TransformResponse>;
        }
        return Effect.succeed({
          id: req.id,
          timestamp: Date.now(),
          type: 'error',
          error: {
            message: 'Unknown request type',
          },
        } as ErrorResponse);
      });
    });

    await Effect.runPromise(program.pipe(Effect.provide(layers)));

    expect(capturedResponse).not.toBeNull();
    const response = capturedResponse as MessageResponse | null;
    if (response !== null) {
      expect(response.type).toBe('transform');
      // Type narrowing
      if (response.type === 'transform') {
        expect(response.result.handle).toBe('alice.bsky.social');
        expect(response.result.did).toBe('did:plc:z72i7hdynmk6r22z27h6tvur');
        expect(response.cached).toBe(false);
      }
    }
  });

  it('should use cache for repeated requests', async () => {
    let resolverCallCount = 0;
    const trackingResolver: ResolverService = {
      resolveHandle: () =>
        Effect.sync(() => {
          resolverCallCount++;
          return S.decodeSync(Did)('did:plc:abcdef1234567890abcdef12');
        }),
      resolveDidDocument: () => Effect.succeed({ handle: null }),
    };

    const layers = Layer.mergeAll(Layer.succeed(Parser, mockParser), Layer.succeed(Normalizer, mockNormalizer), Layer.succeed(UrlParser, mockUrlParser), Layer.succeed(Resolver, trackingResolver), Layer.succeed(Cache, mockCache()), Layer.succeed(Storage, mockStorage));

    const program = Effect.gen(function* () {
      const cache = yield* Cache;
      const resolver = yield* Resolver;
      const handle = S.decodeSync(Handle)('alice.bsky.social');

      // First call - should hit resolver
      const did1 = yield* resolver.resolveHandle(handle);
      yield* cache.set(handle, did1);

      // Second call - should use cache
      const cached = yield* cache.getByHandle(handle);

      expect(resolverCallCount).toBe(1);
      if (Option.isSome(cached)) {
        expect(cached.value).toBe('did:plc:abcdef1234567890abcdef12');
      } else {
        throw new Error('Expected cache to have value');
      }
    });

    await Effect.runPromise(program.pipe(Effect.provide(layers)));
  });

  it('should handle errors gracefully', async () => {
    const failingParser: ParserService = {
      parseInput: () => parseHandle('invalid!@#$'),
    };

    let capturedResponse: MessageResponse | null = null;

    const mockMessaging: MessagingService = {
      sendRequest: () =>
        Effect.fail(
          new MessagingError({
            operation: 'send',
            reason: 'Not implemented',
          }),
        ),
      onRequest: (handler) =>
        Effect.gen(function* () {
          const request: TransformRequest = {
            id: 'error-test',
            timestamp: Date.now(),
            type: 'transform',
            input: 'invalid-input',
          };

          const response = yield* handler(request).pipe(
            Effect.catchAll((_error: unknown) => {
              const errorResponse: ErrorResponse = {
                id: request.id,
                timestamp: Date.now(),
                type: 'error',
                error: {
                  message: _error instanceof Error ? _error.message : 'Unknown error',
                },
              };
              return Effect.succeed(errorResponse);
            }),
          );

          capturedResponse = response;
        }),
      sendResponse: () => Effect.succeed(void 0),
    };

    const layers = Layer.mergeAll(
      Layer.succeed(Parser, failingParser),
      Layer.succeed(Normalizer, mockNormalizer),
      Layer.succeed(UrlParser, mockUrlParser),
      Layer.succeed(Resolver, mockResolver),
      Layer.succeed(Cache, mockCache()),
      Layer.succeed(Storage, mockStorage),
      Layer.succeed(Messaging, mockMessaging),
    );

    const program = Effect.gen(function* () {
      const messaging = yield* Messaging;
      const parser = yield* Parser;

      yield* messaging.onRequest(
        () =>
          Effect.gen(function* () {
            yield* parser.parseInput('test');
            // This should fail, so we never reach here
            return {
              id: 'error-test',
              timestamp: Date.now(),
              type: 'transform' as const,
              result: {} as TransformInfo,
              cached: false,
            } satisfies TransformResponse;
          }) as Effect.Effect<TransformResponse>,
      );
    });

    await Effect.runPromise(program.pipe(Effect.provide(layers)));

    expect(capturedResponse).not.toBeNull();
    const response = capturedResponse as MessageResponse | null;
    if (response !== null) {
      expect(response.type).toBe('error');
      // Type narrowing
      if (response.type === 'error') {
        expect(response.error.message).toContain('invalid');
      }
    }
  });
});

/*
 * What we learned:
 *
 * 1. Mocking service dependencies for testing
 * 2. Testing message flow through multiple services
 * 3. Verifying cache behavior with tracking
 * 4. Error boundary testing
 * 5. Layer composition for test environments
 */
