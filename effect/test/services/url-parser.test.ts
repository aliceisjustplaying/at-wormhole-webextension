import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Context } from 'effect';
import { UrlParser, UrlParserLive } from '@/services/url-parser';

/*
 * Phase 3, Lesson 8: URL Parser Service
 *
 * The URL Parser extracts AT Protocol identifiers from service-specific URLs.
 * Each service has its own URL structure that we need to understand.
 *
 * This service will:
 * - Parse URLs from different AT Protocol services
 * - Extract handles, DIDs, rkeys, and content types
 * - Handle query parameters (like skythread)
 * - Return normalized input for the Normalizer
 */

// Helper to provide UrlParser service
const provideUrlParser = Effect.provide(Context.make(UrlParser, UrlParserLive));

describe('UrlParser Service', () => {
  describe('bsky.app URLs', () => {
    it.effect('should parse profile URL with handle', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://bsky.app/profile/alice.bsky.social');

        expect(result.kind).toBe('handle');
        expect(result.value).toBe('alice.bsky.social');
      }).pipe(provideUrlParser),
    );

    it.effect('should parse post URL with handle', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://bsky.app/profile/alice.bsky.social/post/3kt7p4fzxhh2c');

        expect(result.kind).toBe('fragment');
        expect(result.value).toBe('alice.bsky.social/post/3kt7p4fzxhh2c');
      }).pipe(provideUrlParser),
    );

    it.effect('should parse feed URL', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://bsky.app/profile/why.bsky.team/feed/cozy');

        expect(result.kind).toBe('fragment');
        expect(result.value).toBe('why.bsky.team/feed/cozy');
      }).pipe(provideUrlParser),
    );

    it.effect('should parse list URL', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://bsky.app/profile/alice.bsky.social/lists/3l7vfhhfqcz2u');

        expect(result.kind).toBe('fragment');
        expect(result.value).toBe('alice.bsky.social/lists/3l7vfhhfqcz2u');
      }).pipe(provideUrlParser),
    );

    it.effect('should parse profile URL with DID', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur');

        expect(result.kind).toBe('did');
        expect(result.value).toBe('did:plc:z72i7hdynmk6r22z27h6tvur');
      }).pipe(provideUrlParser),
    );
  });

  describe('deer.social URLs', () => {
    it.effect('should parse post URL', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://deer.social/profile/alice.bsky.social/post/3kt7p4fzxhh2c');

        expect(result.kind).toBe('fragment');
        expect(result.value).toBe('alice.bsky.social/post/3kt7p4fzxhh2c');
      }).pipe(provideUrlParser),
    );
  });

  describe('toolify.blue URLs', () => {
    it.effect('should parse profile URL', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://toolify.blue/profile/alice.mosphere.at');

        expect(result.kind).toBe('handle');
        expect(result.value).toBe('alice.mosphere.at');
      }).pipe(provideUrlParser),
    );

    it.effect('should parse post URL with DID', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p');

        expect(result.kind).toBe('fragment');
        expect(result.value).toBe('did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p');
      }).pipe(provideUrlParser),
    );
  });

  describe('pdsls.dev URLs', () => {
    it.effect('should parse AT URI from URL', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');

        expect(result.kind).toBe('at-uri');
        expect(result.value).toBe('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
      }).pipe(provideUrlParser),
    );
  });

  describe('atp.tools URLs', () => {
    it.effect('should parse malformed AT URI', () =>
      Effect.gen(function* () {
        // atp.tools uses at:/ instead of at://
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://atp.tools/at:/did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');

        expect(result.kind).toBe('at-uri');
        expect(result.value).toBe('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
      }).pipe(provideUrlParser),
    );
  });

  describe('skythread URLs', () => {
    it.effect('should parse skythread query parameters', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23');

        expect(result.kind).toBe('at-uri');
        expect(result.value).toBe('at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23');
      }).pipe(provideUrlParser),
    );
  });

  describe('boat.kelinci.net URLs', () => {
    it.effect('should parse DID from query parameter', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg');

        expect(result.kind).toBe('did');
        expect(result.value).toBe('did:plc:5sk4eqsu7byvwokfcnfgywxg');
      }).pipe(provideUrlParser),
    );
  });

  describe('clearsky.app URLs', () => {
    it.effect('should parse DID from URL path', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://clearsky.app/did:plc:kkkcb7sys7623hcf7oefcffg/blocked-by');

        expect(result.kind).toBe('did');
        expect(result.value).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
      }).pipe(provideUrlParser),
    );
  });

  describe('plc.directory URLs', () => {
    it.effect('should parse DID from URL path', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const result = yield* parser.parseUrl('https://plc.directory/did:plc:kkkcb7sys7623hcf7oefcffg');

        expect(result.kind).toBe('did');
        expect(result.value).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
      }).pipe(provideUrlParser),
    );
  });

  describe('error handling', () => {
    it.effect('should reject non-URLs', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const error = yield* parser.parseUrl('not a url').pipe(Effect.flip);

        expect(error._tag).toBe('InvalidUrlError');
      }).pipe(provideUrlParser),
    );

    it.effect('should reject unsupported domains', () =>
      Effect.gen(function* () {
        const parser = yield* UrlParser;
        const error = yield* parser.parseUrl('https://example.com/something').pipe(Effect.flip);

        expect(error._tag).toBe('UnsupportedServiceError');
      }).pipe(provideUrlParser),
    );
  });
});

/*
 * What we're learning:
 *
 * 1. Different services have different URL patterns
 * 2. Some services use query parameters (skythread, boat.kelinci)
 * 3. Some services have malformed AT URIs (atp.tools)
 * 4. The parser needs to normalize these into standard formats
 * 5. The output should be ready for the Normalizer service
 */
