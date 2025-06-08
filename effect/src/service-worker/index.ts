import { Effect, Layer, Console, Data } from 'effect';
import type { TransformResponse, ErrorResponse } from '@/model/messages';
import { Messaging, MessagingServerLive } from '@/browser/messaging';
import { Parser, ParserLive } from '@/services/parser';
import { Normalizer, NormalizerLive } from '@/services/normalizer';
import { UrlParser, UrlParserLive } from '@/services/url-parser';
import { Resolver, ResolverLive } from '@/services/resolver';
import { Cache, CacheLayer } from '@/services/cache';
import { Storage, StorageLayer } from '@/browser/storage';
import { TransformInfo } from '@/model/transform-info';

/*
 * Phase 6, Lesson 15: Service Worker with Effect
 *
 * This is the main background script for our extension.
 * It orchestrates all our services to handle transform requests.
 *
 * Key concepts:
 * - Layer composition at scale
 * - Error boundaries between contexts
 * - Message-based architecture
 */

// Service worker error type
export class ServiceWorkerError extends Data.TaggedError('ServiceWorkerError')<{
  reason: string;
  cause?: unknown;
}> {}

// Error handler that creates error response
const handleError =
  (requestId: string) =>
  (error: unknown): Effect.Effect<ErrorResponse> => {
    const errorResponse: ErrorResponse = {
      id: requestId,
      timestamp: Date.now(),
      type: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      },
    };
    return Effect.succeed(errorResponse);
  };

// Main service worker setup
const ServiceWorkerProgram = Effect.gen(function* () {
  yield* Console.log('[Service Worker] Starting...');

  const messaging = yield* Messaging;

  // Set up message handler
  // Within this context, all services are already provided by ServiceWorkerLive
  yield* messaging.onRequest((request) => {
    if (request.type === 'transform') {
      // Run the transform pipeline with all required services
      return Effect.gen(function* () {
        const parser = yield* Parser;
        const normalizer = yield* Normalizer;
        const resolver = yield* Resolver;
        const cache = yield* Cache;

        // Parse the input
        const parsed = yield* parser.parseInput(request.input);

        // Normalize to TransformInfo based on parsed type
        const normalized = yield* normalizer.normalize(parsed.value);

        // Resolve handle to DID if needed
        let resolved: TransformInfo;
        let wasFromCache = false;

        if (normalized.handle && !normalized.did) {
          // Check cache first
          const cachedDid = yield* cache.getByHandle(normalized.handle);
          if (cachedDid._tag === 'Some') {
            resolved = { ...normalized, did: cachedDid.value };
            wasFromCache = true;
          } else {
            // Resolver expects string, not branded Handle type
            const did = yield* resolver.resolveHandle(normalized.handle);
            yield* cache.set(normalized.handle, did);
            resolved = { ...normalized, did };
          }
        } else {
          resolved = normalized;
        }

        // If we have a DID but no handle, try reverse lookup
        if (resolved.did && !resolved.handle) {
          const cachedHandle = yield* cache.getByDid(resolved.did);
          if (cachedHandle._tag === 'Some') {
            resolved = { ...resolved, handle: cachedHandle.value };
            wasFromCache = true;
          }
        }

        // Create response
        const response: TransformResponse = {
          id: request.id,
          timestamp: Date.now(),
          type: 'transform',
          result: resolved,
          cached: wasFromCache,
        };

        return response;
      }).pipe(
        Effect.catchAll(handleError(request.id))
      ) as Effect.Effect<TransformResponse | ErrorResponse>;
    }

    // Handle other request types as needed
    return Effect.succeed({
      id: request.id,
      timestamp: Date.now(),
      type: 'error',
      error: {
        message: `Unknown request type: ${request.type}`,
      },
    } as ErrorResponse);
  });

  yield* Console.log('[Service Worker] Ready to handle messages');
});

// Compose all layers
const ServiceWorkerLive = Layer.mergeAll(MessagingServerLive, Layer.succeed(Parser, ParserLive), Layer.succeed(Normalizer, NormalizerLive), Layer.succeed(UrlParser, UrlParserLive), Layer.succeed(Resolver, ResolverLive), CacheLayer(), Layer.succeed(Storage, StorageLayer));

// Initialize the service worker
console.log('[Service Worker] Initializing...');
const runServiceWorker = ServiceWorkerProgram.pipe(
  Effect.provide(ServiceWorkerLive),
  // Catch all errors to ensure proper type
  Effect.catchAll((error: unknown) => {
    console.error('[Service Worker] Fatal error:', error);
    return Effect.void;
  }),
);

Effect.runPromise(runServiceWorker).catch((error: unknown) => {
  console.error('[Service Worker] Uncaught error:', error);
});

/*
 * What we learned:
 *
 * 1. Layer composition at scale - merging 7+ services
 * 2. Error boundaries - catchAll converts errors to responses
 * 3. Pipeline orchestration - connecting all our services
 * 4. Runtime configuration for background scripts
 * 5. Cache integration for performance
 */
