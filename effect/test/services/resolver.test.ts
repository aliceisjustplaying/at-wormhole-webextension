import { describe, expect, vi, beforeEach, afterEach } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Context } from 'effect';
import { Resolver, ResolverLive } from '@/services/resolver';
import { installFetchMock, mockFetchResponse } from '../helpers/fetch-mock';

/*
 * Phase 3, Lesson 9: Testing the Resolver Service
 *
 * These tests demonstrate:
 * - Mocking fetch for network operations
 * - Testing retry behavior with TestClock
 * - Error scenario handling
 * - Both handle resolution and DID document resolution
 */

describe('Resolver Service', () => {
  // Store original fetch
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof installFetchMock>;

  // Mock fetch setup
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = installFetchMock();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Helper to provide Resolver service
  const provideResolver = Effect.provide(Context.make(Resolver, ResolverLive));

  describe('resolveHandle', () => {
    it.effect('should resolve a valid handle to DID', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ did: 'did:plc:z72i7hdynmk6r22z27h6tvur' }),
          }),
        );

        const resolver = yield* Resolver;
        const result = yield* resolver.resolveHandle('alice.bsky.social');

        expect(result).toBe('did:plc:z72i7hdynmk6r22z27h6tvur');
        expect(fetchMock).toHaveBeenCalledWith('https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=alice.bsky.social', undefined);
      }).pipe(provideResolver),
    );

    it.effect('should reject did:web as handle', () =>
      Effect.gen(function* () {
        // did:web is not a valid handle format
        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveHandle('did:web:example.com'));

        expect(error._tag).toBe('InvalidHandleError');
        expect(error.handle).toBe('did:web:example.com');
        expect(fetchMock).not.toHaveBeenCalled();
      }).pipe(provideResolver),
    );

    it.effect('should return HandleNotFoundError for 404', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          }),
        );

        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveHandle('unknown.handle'));

        expect(error._tag).toBe('HandleNotFoundError');
        expect(error.handle).toBe('unknown.handle');
      }).pipe(provideResolver),
    );

    it.effect('should return RateLimitError for 429', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: { 'Retry-After': '60' },
          }),
        );

        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveHandle('alice.bsky.social'));

        expect(error._tag).toBe('RateLimitError');
        expect(error.retryAfter).toBe(60);
      }).pipe(provideResolver),
    );

    // TODO: Add retry and timeout tests once we understand TestClock better

    it.effect('should reject invalid handle format', () =>
      Effect.gen(function* () {
        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveHandle('not a valid handle!'));

        expect(error._tag).toBe('InvalidHandleError');
      }).pipe(provideResolver),
    );
  });

  describe('resolveDidDocument', () => {
    it.effect('should resolve did:web document with handle', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                '@context': ['https://www.w3.org/ns/did/v1'],
                id: 'did:web:example.com',
                alsoKnownAs: ['at://example.com'],
                service: [
                  {
                    id: '#atproto_pds',
                    type: 'AtprotoPersonalDataServer',
                    serviceEndpoint: 'https://pds.example.com',
                  },
                ],
              }),
          }),
        );

        const resolver = yield* Resolver;
        const result = yield* resolver.resolveDidDocument('did:web:example.com');

        expect(result.handle).toBe('example.com');
        expect(fetchMock).toHaveBeenCalledWith('https://example.com/.well-known/did.json', undefined);
      }).pipe(provideResolver),
    );

    it.effect('should return null handle for did:plc', () =>
      Effect.gen(function* () {
        const resolver = yield* Resolver;
        const result = yield* resolver.resolveDidDocument('did:plc:z72i7hdynmk6r22z27h6tvur');

        expect(result.handle).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
      }).pipe(provideResolver),
    );

    it.effect('should handle did:web without alsoKnownAs', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                '@context': ['https://www.w3.org/ns/did/v1'],
                id: 'did:web:example.com',
              }),
          }),
        );

        const resolver = yield* Resolver;
        const result = yield* resolver.resolveDidDocument('did:web:example.com');

        expect(result.handle).toBeNull();
      }).pipe(provideResolver),
    );

    it.effect('should handle invalid DID document', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ invalid: 'document' }),
          }),
        );

        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveDidDocument('did:web:example.com'));

        expect(error._tag).toBe('InvalidDidDocumentError');
      }).pipe(provideResolver),
    );

    it.effect('should handle 404 for did:web', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          }),
        );

        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveDidDocument('did:web:notfound.com'));

        expect(error._tag).toBe('DidResolutionError');
        expect(error.statusCode).toBe(404);
      }).pipe(provideResolver),
    );

    it.effect('should handle complex domain in did:web', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                '@context': ['https://www.w3.org/ns/did/v1'],
                id: 'did:web:sub.domain.example.com',
                alsoKnownAs: ['at://sub.domain.example.com'],
              }),
          }),
        );

        const resolver = yield* Resolver;
        const result = yield* resolver.resolveDidDocument('did:web:sub.domain.example.com');

        expect(result.handle).toBe('sub.domain.example.com');
        expect(fetchMock).toHaveBeenCalledWith('https://sub.domain.example.com/.well-known/did.json', undefined);
      }).pipe(provideResolver),
    );
  });

  describe('real-world scenarios', () => {
    it.effect('should handle malformed JSON response', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: true,
            status: 200,
            json: () => Promise.reject(new Error('Invalid JSON')),
          }),
        );

        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveHandle('alice.bsky.social'));

        expect(error._tag).toBe('NetworkError');
        expect(error.cause).toBe('Invalid JSON response');
      }).pipe(provideResolver),
    );

    it.effect('should handle unexpected API response format', () =>
      Effect.gen(function* () {
        fetchMock.mockResolvedValueOnce(
          mockFetchResponse({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ unexpected: 'format' }), // Missing 'did' field
          }),
        );

        const resolver = yield* Resolver;
        const error = yield* Effect.flip(resolver.resolveHandle('alice.bsky.social'));

        expect(error._tag).toBe('NetworkError');
        expect(error.cause).toBe('Invalid response format');
      }).pipe(provideResolver),
    );
  });
});

/*
 * What we're learning:
 *
 * 1. Mocking async operations with vitest
 * 2. Testing retry logic with TestClock
 * 3. Comprehensive error scenario testing
 * 4. Effect.either for asserting on errors
 * 5. Testing both success and failure paths
 */
