import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { UrlParser, UrlParserLive, type UrlParseError } from '@/services/url-parser';
import { Normalizer, NormalizerLive, type NormalizeError } from '@/services/normalizer';
import type { TransformInfo } from '@/model';

/*
 * Integration Test: URL Parser + Normalizer
 *
 * This demonstrates how the two services work together
 * to transform a service URL into a TransformInfo.
 */

describe('URL to TransformInfo Pipeline', () => {
  // Create a layer that provides both services
  const TestLayer = Layer.merge(Layer.succeed(UrlParser, UrlParserLive), Layer.succeed(Normalizer, NormalizerLive));

  const parseAndNormalize = (url: string): Effect.Effect<TransformInfo, UrlParseError | NormalizeError, UrlParser | Normalizer> =>
    Effect.gen(function* () {
      const urlParser = yield* UrlParser;
      const normalizer = yield* Normalizer;

      // First, parse the URL
      const parsed = yield* urlParser.parseUrl(url);

      // Then, normalize the extracted value
      const normalized = yield* normalizer.normalize(parsed.value);

      return normalized;
    });

  it.effect('should transform bsky.app post URL', () =>
    Effect.gen(function* () {
      const result = yield* parseAndNormalize('https://bsky.app/profile/alice.bsky.social/post/3kt7p4fzxhh2c').pipe(Effect.provide(TestLayer));

      expect(result.handle).toBe('alice.bsky.social');
      expect(result.rkey).toBe('3kt7p4fzxhh2c');
      expect(result.nsid).toBe('app.bsky.feed.post');
      expect(result.contentType).toBe('post');
      expect(result.bskyAppPath).toBe('/profile/alice.bsky.social/post/3kt7p4fzxhh2c');
    }),
  );

  it.effect('should transform toolify.blue feed URL', () =>
    Effect.gen(function* () {
      const result = yield* parseAndNormalize('https://toolify.blue/profile/why.bsky.team/feed/cozy').pipe(Effect.provide(TestLayer));

      expect(result.handle).toBe('why.bsky.team');
      expect(result.rkey).toBe('cozy');
      expect(result.nsid).toBe('app.bsky.feed.generator');
      expect(result.contentType).toBe('feed');
    }),
  );

  it.effect('should transform skythread URL with query params', () =>
    Effect.gen(function* () {
      const result = yield* parseAndNormalize('https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23').pipe(Effect.provide(TestLayer));

      expect(result.did).toBe('did:plc:2p6idfgjfe3easltiwmnofw6');
      expect(result.rkey).toBe('3lpjntj43rs23');
      expect(result.nsid).toBe('app.bsky.feed.post');
      expect(result.contentType).toBe('post');
    }),
  );

  it.effect('should transform pdsls.dev AT URI', () =>
    Effect.gen(function* () {
      const result = yield* parseAndNormalize('https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u').pipe(Effect.provide(TestLayer));

      expect(result.did).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
      expect(result.rkey).toBe('3lqcw7n4gly2u');
      expect(result.atUri).toBe('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
    }),
  );

  it.effect('should handle errors gracefully', () =>
    Effect.gen(function* () {
      const result = yield* parseAndNormalize('https://example.com/not-supported').pipe(Effect.provide(TestLayer), Effect.either);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('UnsupportedServiceError');
      }
    }),
  );
});

/*
 * What we learned:
 *
 * 1. Services can be composed in pipelines
 * 2. Layer.merge combines multiple service providers
 * 3. Effect.gen makes sequential operations readable
 * 4. Error types flow through the pipeline automatically
 * 5. Each service maintains its single responsibility
 */
