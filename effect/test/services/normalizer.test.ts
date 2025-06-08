import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Context, Exit } from 'effect';
import { Normalizer, NormalizerLive } from '@/services/normalizer';

/*
 * Phase 3: The Normalizer Service
 *
 * The Normalizer (formerly Canonicalizer) takes raw input
 * and transforms it into a normalized TransformInfo structure.
 *
 * It handles:
 * - Parsing handles and DIDs
 * - Parsing AT URIs
 * - Applying NSID shortcuts
 * - Building proper bskyAppPath
 * - Enforcing business rules
 */

describe('Normalizer Service', () => {
  // Helper to provide the Normalizer context
  const provideNormalizer = Effect.provide(Context.make(Normalizer, NormalizerLive));
  describe('handle normalization', () => {
    it.effect('should normalize a simple handle', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('alice.bsky.social');

        expect(result.handle).toBe('alice.bsky.social');
        expect(result.inputType).toBe('handle');
        expect(result.contentType).toBe('profile');
        expect(result.bskyAppPath).toBe('/profile/alice.bsky.social');
      }).pipe(provideNormalizer),
    );
    it.effect('should handle @ prefix', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('@alice.bsky.social');

        expect(result.handle).toBe('alice.bsky.social');
      }).pipe(provideNormalizer),
    );
  });

  describe('DID normalization', () => {
    it.effect('should normalize a did:plc', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('did:plc:z72i7hdynmk6r22z27h6tvur');

        expect(result.did).toBe('did:plc:z72i7hdynmk6r22z27h6tvur');
        expect(result.inputType).toBe('did');
        expect(result.contentType).toBe('profile');
        expect(result.bskyAppPath).toBe('/profile/did:plc:z72i7hdynmk6r22z27h6tvur');
      }).pipe(provideNormalizer),
    );
  });

  describe('AT URI parsing', () => {
    it.effect('should parse profile AT URI', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('at://alice.bsky.social');

        expect(result.handle).toBe('alice.bsky.social');
        expect(result.atUri).toBe('at://alice.bsky.social');
        expect(result.bskyAppPath).toBe('/profile/alice.bsky.social');
      }).pipe(provideNormalizer),
    );
    it.effect('should parse post AT URI', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('at://alice.bsky.social/app.bsky.feed.post/3kt7p4fzxhh2c');

        expect(result.handle).toBe('alice.bsky.social');
        expect(result.rkey).toBe('3kt7p4fzxhh2c');
        expect(result.nsid).toBe('app.bsky.feed.post');
        expect(result.contentType).toBe('post');
        expect(result.atUri).toBe('at://alice.bsky.social/app.bsky.feed.post/3kt7p4fzxhh2c');
        expect(result.bskyAppPath).toBe('/profile/alice.bsky.social/post/3kt7p4fzxhh2c');
      }).pipe(provideNormalizer),
    );
    it.effect('should handle NSID shortcuts', () =>
      // Using 'p' shortcut for app.bsky.feed.post
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('at://alice.bsky.social/p/3kt7p4fzxhh2c');

        expect(result.nsid).toBe('app.bsky.feed.post');
        expect(result.contentType).toBe('post');
      }).pipe(provideNormalizer),
    );
  });

  describe('fragment parsing', () => {
    it.effect('should parse handle/post fragment', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('alice.bsky.social/post/3kt7p4fzxhh2c');

        expect(result.handle).toBe('alice.bsky.social');
        expect(result.rkey).toBe('3kt7p4fzxhh2c');
        expect(result.contentType).toBe('post');
      }).pipe(provideNormalizer),
    );
    it.effect('should parse handle/feed fragment', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('alice.bsky.social/feed/aaaf5mxr2s62c');

        expect(result.handle).toBe('alice.bsky.social');
        expect(result.rkey).toBe('aaaf5mxr2s62c');
        expect(result.contentType).toBe('feed');
        expect(result.nsid).toBe('app.bsky.feed.generator');
      }).pipe(provideNormalizer),
    );
    it.effect('should parse handle/list fragment', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('alice.bsky.social/lists/aaaf5mxr2s62c');

        expect(result.handle).toBe('alice.bsky.social');
        expect(result.rkey).toBe('aaaf5mxr2s62c');
        expect(result.contentType).toBe('list');
        expect(result.nsid).toBe('app.bsky.graph.list');
      }).pipe(provideNormalizer),
    );
    it.effect("should handle singular 'list' path alias", () =>
      // The normalizer should handle both 'lists' and 'list' paths
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* normalizer.normalize('alice.bsky.social/list/aaaf5mxr2s62c');

        expect(result.handle).toBe('alice.bsky.social');
        expect(result.rkey).toBe('aaaf5mxr2s62c');
        expect(result.contentType).toBe('list');
        expect(result.nsid).toBe('app.bsky.graph.list');
        expect(result.bskyAppPath).toBe('/profile/alice.bsky.social/lists/aaaf5mxr2s62c');
      }).pipe(provideNormalizer),
    );
  });

  describe('real-world examples', () => {
    describe('complex handles', () => {
      it.effect('should handle multi-subdomain handles', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('now.alice.mosphere.at');

          expect(result.handle).toBe('now.alice.mosphere.at');
          expect(result.bskyAppPath).toBe('/profile/now.alice.mosphere.at');
        }).pipe(provideNormalizer),
      );
      it.effect('should handle team domain handles', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('why.bsky.team');

          expect(result.handle).toBe('why.bsky.team');
        }).pipe(provideNormalizer),
      );
    });

    describe('did:web support', () => {
      it.effect('should handle did:web identifiers', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:web:didweb.watch');

          expect(result.did).toBe('did:web:didweb.watch');
          expect(result.inputType).toBe('did');
          expect(result.bskyAppPath).toBe('/profile/did:web:didweb.watch');
        }).pipe(provideNormalizer),
      );
      it.effect('should handle did:web with posts', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j');

          expect(result.did).toBe('did:web:didweb.watch');
          expect(result.rkey).toBe('3lpaioe62qk2j');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/did:web:didweb.watch/post/3lpaioe62qk2j');
        }).pipe(provideNormalizer),
      );
    });

    describe('feed URLs', () => {
      it.effect('should parse feed fragments', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('why.bsky.team/feed/cozy');

          expect(result.handle).toBe('why.bsky.team');
          expect(result.rkey).toBe('cozy');
          expect(result.nsid).toBe('app.bsky.feed.generator');
          expect(result.contentType).toBe('feed');
          expect(result.bskyAppPath).toBe('/profile/why.bsky.team/feed/cozy');
          expect(result.atUri).toBe('at://why.bsky.team/app.bsky.feed.generator/cozy');
        }).pipe(provideNormalizer),
      );
      it.effect('should handle feed AT URIs', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://why.bsky.team/app.bsky.feed.generator/cozy');

          expect(result.contentType).toBe('feed');
          expect(result.rkey).toBe('cozy');
        }).pipe(provideNormalizer),
      );
    });

    describe('list URLs', () => {
      it.effect('should parse list fragments', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('alice.mosphere.at/lists/3l7vfhhfqcz2u');

          expect(result.handle).toBe('alice.mosphere.at');
          expect(result.rkey).toBe('3l7vfhhfqcz2u');
          expect(result.nsid).toBe('app.bsky.graph.list');
          expect(result.contentType).toBe('list');
          expect(result.bskyAppPath).toBe('/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u');
          expect(result.atUri).toBe('at://alice.mosphere.at/app.bsky.graph.list/3l7vfhhfqcz2u');
        }).pipe(provideNormalizer),
      );
      it.effect('should handle list AT URIs with DIDs', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/3l7vfhhfqcz2u');

          expect(result.did).toBe('did:plc:by3jhwdqgbtrcc7q4tkkv3cf');
          expect(result.contentType).toBe('list');
          expect(result.rkey).toBe('3l7vfhhfqcz2u');
        }).pipe(provideNormalizer),
      );
    });

    describe('post URLs with various rkey formats', () => {
      it.effect('should handle standard 13-char rkeys', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('now.alice.mosphere.at/post/3lqcw7n4gly2u');

          expect(result.rkey).toBe('3lqcw7n4gly2u');
          expect(result.atUri).toBe('at://now.alice.mosphere.at/app.bsky.feed.post/3lqcw7n4gly2u');
        }).pipe(provideNormalizer),
      );
      it.effect('should handle post fragments with DID', () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n');

          expect(result.did).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
          expect(result.rkey).toBe('3lpe6ek6xhs2n');
          expect(result.contentType).toBe('post');
          expect(result.bskyAppPath).toBe('/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n');
        }).pipe(provideNormalizer),
      );
    });

    describe('NSID shortcuts', () => {
      it.effect("should handle 'f' shortcut for feeds", () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://why.bsky.team/f/cozy');

          expect(result.nsid).toBe('app.bsky.feed.generator');
          expect(result.contentType).toBe('feed');
        }).pipe(provideNormalizer),
      );
      it.effect("should handle 'l' shortcut for lists", () =>
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://alice.mosphere.at/l/3l7vfhhfqcz2u');

          expect(result.nsid).toBe('app.bsky.graph.list');
          expect(result.contentType).toBe('list');
        }).pipe(provideNormalizer),
      );
    });
  });

  describe('business rule validation', () => {
    it.effect('should reject empty input', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* Effect.exit(normalizer.normalize(''));
        expect(Exit.isFailure(result)).toBe(true);
      }).pipe(provideNormalizer),
    );
    it.effect('should reject invalid format', () =>
      Effect.gen(function* () {
        const normalizer = yield* Normalizer;
        const result = yield* Effect.exit(normalizer.normalize('not-a-valid-anything'));
        expect(Exit.isFailure(result)).toBe(true);
      }).pipe(provideNormalizer),
    );
  });

  describe('missing tests from original transform.test.ts', () => {
    describe('feed URLs from original test', () => {
      it.effect('should parse feed URLs with handle from deer.social', () =>
        // This simulates parseInput('https://deer.social/profile/why.bsky.team/feed/cozy')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('why.bsky.team/feed/cozy');

          expect(result.atUri).toBe('at://why.bsky.team/app.bsky.feed.generator/cozy');
          expect(result.did).toBeUndefined();
          expect(result.handle).toBe('why.bsky.team');
          expect(result.rkey).toBe('cozy');
          expect(result.nsid).toBe('app.bsky.feed.generator');
          expect(result.bskyAppPath).toBe('/profile/why.bsky.team/feed/cozy');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse post URLs with DID from deer.social', () =>
        // This simulates parseInput('https://deer.social/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n');

          expect(result.atUri).toBe('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lpe6ek6xhs2n');
          expect(result.did).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBe('3lpe6ek6xhs2n');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse list URLs with handle from deer.social', () =>
        // This simulates parseInput('https://deer.social/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('alice.mosphere.at/lists/3l7vfhhfqcz2u');

          expect(result.atUri).toBe('at://alice.mosphere.at/app.bsky.graph.list/3l7vfhhfqcz2u');
          expect(result.did).toBeUndefined();
          expect(result.handle).toBe('alice.mosphere.at');
          expect(result.rkey).toBe('3l7vfhhfqcz2u');
          expect(result.nsid).toBe('app.bsky.graph.list');
          expect(result.bskyAppPath).toBe('/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u');
        }).pipe(provideNormalizer),
      );
    });

    describe('did:web profile URLs', () => {
      it.effect('should parse did:web profile URLs', () =>
        // This simulates parseInput('https://deer.social/profile/did:web:didweb.watch')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:web:didweb.watch');

          expect(result.atUri).toBe('at://did:web:didweb.watch');
          expect(result.did).toBe('did:web:didweb.watch');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBeUndefined();
          expect(result.nsid).toBeUndefined();
          expect(result.bskyAppPath).toBe('/profile/did:web:didweb.watch');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse did:web post URLs', () =>
        // This simulates parseInput('https://deer.social/profile/did:web:didweb.watch/post/3lpaioe62qk2j')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:web:didweb.watch/post/3lpaioe62qk2j');

          expect(result.atUri).toBe('at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j');
          expect(result.did).toBe('did:web:didweb.watch');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBe('3lpaioe62qk2j');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/did:web:didweb.watch/post/3lpaioe62qk2j');
        }).pipe(provideNormalizer),
      );
    });

    describe('real service URLs', () => {
      it.effect('should parse bsky.app post URL', () =>
        // This simulates parseInput('https://bsky.app/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('now.alice.mosphere.at/post/3lqcw7n4gly2u');

          expect(result.atUri).toBe('at://now.alice.mosphere.at/app.bsky.feed.post/3lqcw7n4gly2u');
          expect(result.did).toBeUndefined();
          expect(result.handle).toBe('now.alice.mosphere.at');
          expect(result.rkey).toBe('3lqcw7n4gly2u');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse deer.social post URL', () =>
        // This simulates parseInput('https://deer.social/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('now.alice.mosphere.at/post/3lqcw7n4gly2u');

          expect(result.atUri).toBe('at://now.alice.mosphere.at/app.bsky.feed.post/3lqcw7n4gly2u');
          expect(result.did).toBeUndefined();
          expect(result.handle).toBe('now.alice.mosphere.at');
          expect(result.rkey).toBe('3lqcw7n4gly2u');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse pdsls.dev AT URI', () =>
        // This simulates parseInput('https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');

          expect(result.atUri).toBe('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
          expect(result.did).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBe('3lqcw7n4gly2u');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lqcw7n4gly2u');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse atp.tools malformed AT URI', () =>
        // This simulates parseInput('https://atp.tools/at:/did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');

          expect(result.atUri).toBe('at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
          expect(result.did).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBe('3lqcw7n4gly2u');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lqcw7n4gly2u');
        }).pipe(provideNormalizer),
      );
    });

    describe('toolify.blue URLs', () => {
      it.effect('should parse profile URL with handle', () =>
        // This simulates parseInput('https://toolify.blue/profile/alice.mosphere.at')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('alice.mosphere.at');

          expect(result.atUri).toBe('at://alice.mosphere.at');
          expect(result.did).toBeUndefined();
          expect(result.handle).toBe('alice.mosphere.at');
          expect(result.rkey).toBeUndefined();
          expect(result.nsid).toBeUndefined();
          expect(result.bskyAppPath).toBe('/profile/alice.mosphere.at');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse post URL with handle', () =>
        // This simulates parseInput('https://toolify.blue/profile/alice.mosphere.at/post/3lqeyxrcx6k2p')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('alice.mosphere.at/post/3lqeyxrcx6k2p');

          expect(result.atUri).toBe('at://alice.mosphere.at/app.bsky.feed.post/3lqeyxrcx6k2p');
          expect(result.did).toBeUndefined();
          expect(result.handle).toBe('alice.mosphere.at');
          expect(result.rkey).toBe('3lqeyxrcx6k2p');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/alice.mosphere.at/post/3lqeyxrcx6k2p');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse profile URL with DID', () =>
        // This simulates parseInput('https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:plc:by3jhwdqgbtrcc7q4tkkv3cf');

          expect(result.atUri).toBe('at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf');
          expect(result.did).toBe('did:plc:by3jhwdqgbtrcc7q4tkkv3cf');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBeUndefined();
          expect(result.nsid).toBeUndefined();
          expect(result.bskyAppPath).toBe('/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf');
        }).pipe(provideNormalizer),
      );
      it.effect('should parse post URL with DID', () =>
        // This simulates parseInput('https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p');

          expect(result.atUri).toBe('at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.feed.post/3lqeyxrcx6k2p');
          expect(result.did).toBe('did:plc:by3jhwdqgbtrcc7q4tkkv3cf');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBe('3lqeyxrcx6k2p');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p');
        }).pipe(provideNormalizer),
      );
    });

    describe('query parameter DIDs', () => {
      it.effect('should parse query parameter DIDs', () =>
        // This simulates parseInput('https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('did:plc:5sk4eqsu7byvwokfcnfgywxg');

          expect(result.atUri).toBe('at://did:plc:5sk4eqsu7byvwokfcnfgywxg');
          expect(result.did).toBe('did:plc:5sk4eqsu7byvwokfcnfgywxg');
          expect(result.handle).toBeUndefined();
          expect(result.nsid).toBeUndefined();
          expect(result.rkey).toBeUndefined();
          expect(result.bskyAppPath).toBe('/profile/did:plc:5sk4eqsu7byvwokfcnfgywxg');
        }).pipe(provideNormalizer),
      );
    });

    describe('skythread URLs', () => {
      it.effect('should parse skythread URLs', () =>
        // This simulates parseInput('https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23')
        Effect.gen(function* () {
          const normalizer = yield* Normalizer;
          const result = yield* normalizer.normalize('at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23');

          expect(result.atUri).toBe('at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23');
          expect(result.did).toBe('did:plc:2p6idfgjfe3easltiwmnofw6');
          expect(result.handle).toBeUndefined();
          expect(result.rkey).toBe('3lpjntj43rs23');
          expect(result.nsid).toBe('app.bsky.feed.post');
          expect(result.bskyAppPath).toBe('/profile/did:plc:2p6idfgjfe3easltiwmnofw6/post/3lpjntj43rs23');
        }).pipe(provideNormalizer),
      );
    });
  });
});
