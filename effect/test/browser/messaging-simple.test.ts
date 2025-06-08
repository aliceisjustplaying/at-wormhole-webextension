import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { Schema as S } from '@effect/schema';
import { TransformRequest, TransformResponse, Request, Response } from '@/model/messages';
import { Handle } from '@/model/handle';
import { Did } from '@/model/did';

/*
 * Simple tests for message schemas without the full messaging service
 */

describe('Message Schemas', () => {
  describe('Request Schemas', () => {
    it.effect('should encode and decode TransformRequest', () =>
      Effect.gen(function* () {
        const request: TransformRequest = {
          id: 'test-123',
          timestamp: Date.now(),
          type: 'transform',
          input: 'https://bsky.app/profile/alice.bsky.social',
        };

        // Encode
        const encoded = yield* S.encode(Request)(request);
        expect(encoded).toHaveProperty('type', 'transform');
        expect(encoded).toHaveProperty('input');

        // Decode
        const decoded = yield* S.decodeUnknown(Request)(encoded);
        expect(decoded.type).toBe('transform');
        if (decoded.type === 'transform') {
          expect(decoded.input).toBe('https://bsky.app/profile/alice.bsky.social');
        }
      }),
    );

    it.effect('should encode and decode ClearCacheRequest', () =>
      Effect.gen(function* () {
        const request = {
          id: 'cache-123',
          timestamp: Date.now(),
          type: 'clearCache' as const,
        };

        const encoded = yield* S.encode(Request)(request);
        const decoded = yield* S.decodeUnknown(Request)(encoded);

        expect(decoded.type).toBe('clearCache');
        expect(decoded.id).toBe('cache-123');
      }),
    );
  });

  describe('Response Schemas', () => {
    it.effect('should encode and decode TransformResponse', () =>
      Effect.gen(function* () {
        const response: TransformResponse = {
          id: 'test-123',
          timestamp: Date.now(),
          type: 'transform',
          result: {
            handle: S.decodeSync(Handle)('alice.bsky.social'),
            did: S.decodeSync(Did)('did:plc:z72i7hdynmk6r22z27h6tvur'),
            bskyAppPath: '/profile/alice.bsky.social',
            inputType: 'url' as const,
            contentType: 'profile' as const,
          },
          cached: false,
        };

        const encoded = yield* S.encode(Response)(response);
        const decoded = yield* S.decodeUnknown(Response)(encoded);

        expect(decoded.type).toBe('transform');
        if (decoded.type === 'transform') {
          expect(decoded.result.handle).toBe('alice.bsky.social');
          expect(decoded.result.did).toBe('did:plc:z72i7hdynmk6r22z27h6tvur');
          expect(decoded.cached).toBe(false);
        }
      }),
    );

    it.effect('should handle error responses', () =>
      Effect.gen(function* () {
        const errorResponse = {
          id: 'error-123',
          timestamp: Date.now(),
          type: 'error' as const,
          error: {
            message: 'Something went wrong',
            code: 'NETWORK_ERROR',
            details: { status: 500 },
          },
        };

        const encoded = yield* S.encode(Response)(errorResponse);
        const decoded = yield* S.decodeUnknown(Response)(encoded);

        expect(decoded.type).toBe('error');
        if (decoded.type === 'error') {
          expect(decoded.error.message).toBe('Something went wrong');
          expect(decoded.error.code).toBe('NETWORK_ERROR');
        }
      }),
    );
  });

  describe('Discriminated Unions', () => {
    it.effect('should correctly discriminate request types', () =>
      Effect.gen(function* () {
        const requests = [
          { id: '1', timestamp: Date.now(), type: 'transform', input: 'test' },
          { id: '2', timestamp: Date.now(), type: 'clearCache' },
          { id: '3', timestamp: Date.now(), type: 'resolveHandle', handle: S.decodeSync(Handle)('test.bsky.social') },
        ];

        for (const req of requests) {
          const decoded = yield* S.decodeUnknown(Request)(req);
          expect(decoded.type).toBe(req.type);
        }
      }),
    );

    it.effect('should reject invalid request types', () =>
      Effect.gen(function* () {
        const invalid = {
          id: 'invalid',
          timestamp: Date.now(),
          type: 'invalid-type',
        };

        const result = yield* S.decodeUnknown(Request)(invalid).pipe(Effect.either);

        expect(result._tag).toBe('Left');
      }),
    );
  });
});
