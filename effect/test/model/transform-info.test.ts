import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Schema as S } from '@effect/schema';
import { Effect, Exit } from 'effect';
import { Handle } from '@/model/handle';
import { Did } from '@/model/did';
import { createTransformInfo } from '@/model/transform-info';

/*
 * Phase 3: Complex Data Modeling
 *
 * TransformInfo is our core data structure that represents
 * a fully parsed and normalized AT Protocol entity.
 *
 * It needs to handle:
 * - Profiles (just a handle or DID)
 * - Posts (handle/DID + post ID)
 * - Different input sources (URLs, raw handles, etc)
 */

describe('TransformInfo Model', () => {
  it.effect('should create a valid profile with handle and did', () =>
    Effect.gen(function* () {
      // First decode our branded types
      const handle = S.decodeSync(Handle)('alice.bsky.social');
      const did = S.decodeSync(Did)('did:plc:z72i7hdynmk6r22z27h6tvur');

      const profileInfo = {
        handle,
        did,
        atUri: 'at://alice.bsky.social',
        bskyAppPath: '/profile/alice.bsky.social',
        inputType: 'handle' as const,
        contentType: 'profile' as const,
      };

      // Validate with our schema
      const result = yield* createTransformInfo(profileInfo);

      expect(result.handle).toBe('alice.bsky.social');
      expect(result.did).toBe('did:plc:z72i7hdynmk6r22z27h6tvur');
      expect(result.contentType).toBe('profile');
      expect(result.atUri).toBe('at://alice.bsky.social');
      expect(result.bskyAppPath).toBe('/profile/alice.bsky.social');
    }),
  );

  it.effect('should create a valid post', () =>
    Effect.gen(function* () {
      const handle = S.decodeSync(Handle)('alice.bsky.social');
      const did = S.decodeSync(Did)('did:plc:z72i7hdynmk6r22z27h6tvur');

      const postInfo = {
        handle,
        did,
        rkey: '3kt7p4fzxhh2c', // Will be validated as Rkey
        nsid: 'app.bsky.feed.post',
        atUri: 'at://alice.bsky.social/app.bsky.feed.post/3kt7p4fzxhh2c',
        bskyAppPath: '/profile/alice.bsky.social/post/3kt7p4fzxhh2c',
        inputType: 'url' as const,
        contentType: 'post' as const,
        sourceUrl: 'https://bsky.app/profile/alice.bsky.social/post/3kt7p4fzxhh2c',
      };

      const result = yield* createTransformInfo(postInfo);

      expect(result.rkey).toBe('3kt7p4fzxhh2c');
      expect(result.contentType).toBe('post');
      expect(result.nsid).toBe('app.bsky.feed.post');
      expect(result.sourceUrl).toBe('https://bsky.app/profile/alice.bsky.social/post/3kt7p4fzxhh2c');
    }),
  );

  it.effect('should handle partial information', () =>
    Effect.gen(function* () {
      // Only handle, no DID yet
      const handle = S.decodeSync(Handle)('alice.bsky.social');

      const partialInfo = {
        handle,
        atUri: 'at://alice.bsky.social',
        bskyAppPath: '/profile/alice.bsky.social',
        inputType: 'handle' as const,
        contentType: 'profile' as const,
      };

      const result = yield* createTransformInfo(partialInfo);

      expect(result.handle).toBe('alice.bsky.social');
      expect(result.did).toBeUndefined();
    }),
  );

  it.effect('should reject invalid data', () =>
    Effect.gen(function* () {
      // Missing both handle and did
      const invalidInfo = {
        bskyAppPath: '/profile/',
        inputType: 'handle' as const,
        contentType: 'profile' as const,
      };

      const result = yield* Effect.exit(createTransformInfo(invalidInfo));

      expect(Exit.isFailure(result)).toBe(true);
      // The error will be a ParseError from Schema validation
    }),
  );

  it.effect('should reject posts without rkey', () =>
    Effect.gen(function* () {
      const handle = S.decodeSync(Handle)('alice.bsky.social');

      const invalidPost = {
        handle,
        bskyAppPath: '/profile/alice.bsky.social/post/',
        inputType: 'url' as const,
        contentType: 'post' as const,
        // Missing rkey!
      };

      const result = yield* Effect.exit(createTransformInfo(invalidPost));

      expect(Exit.isFailure(result)).toBe(true);
    }),
  );

  it.effect('should create a valid feed', () =>
    Effect.gen(function* () {
      const handle = S.decodeSync(Handle)('alice.bsky.social');

      const feedInfo = {
        handle,
        rkey: 'aaaf5mxr2s62c',
        nsid: 'app.bsky.feed.generator',
        atUri: 'at://alice.bsky.social/app.bsky.feed.generator/aaaf5mxr2s62c',
        bskyAppPath: '/profile/alice.bsky.social/feed/aaaf5mxr2s62c',
        inputType: 'url' as const,
        contentType: 'feed' as const,
      };

      const result = yield* createTransformInfo(feedInfo);

      expect(result.contentType).toBe('feed');
      expect(result.nsid).toBe('app.bsky.feed.generator');
    }),
  );

  it.effect('should create a valid list', () =>
    Effect.gen(function* () {
      const did = S.decodeSync(Did)('did:plc:z72i7hdynmk6r22z27h6tvur');

      const listInfo = {
        did,
        rkey: '3ktt7onpsjz2c',
        nsid: 'app.bsky.graph.list',
        atUri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.graph.list/3ktt7onpsjz2c',
        bskyAppPath: '/profile/did:plc:z72i7hdynmk6r22z27h6tvur/lists/3ktt7onpsjz2c',
        inputType: 'url' as const,
        contentType: 'list' as const,
      };

      const result = yield* createTransformInfo(listInfo);

      expect(result.contentType).toBe('list');
      expect(result.nsid).toBe('app.bsky.graph.list');
    }),
  );
});
