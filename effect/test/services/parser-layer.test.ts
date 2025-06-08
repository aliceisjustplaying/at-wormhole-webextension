import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { Parser } from '@/services/parser';
import { ParserLayer } from '@/services/parser-layer';

/*
 * Testing with Layers
 *
 * This shows the preferred way to use services in Effect:
 * provide them as layers rather than manual Context.make
 */

describe('Parser Layer', () => {
  it.effect('should provide Parser service through a layer', () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
        const parser = yield* Parser;
        return yield* parser.parseInput('alice.bsky.social');
      });

      // Using Layer is cleaner than Context.make
      const result = yield* program.pipe(Effect.provide(ParserLayer));

      expect(result.type).toBe('handle');
    }),
  );

  it.effect('should handle errors properly', () =>
    Effect.gen(function* () {
      const program = Effect.gen(function* () {
        const parser = yield* Parser;
        return yield* parser.parseInput('not-a-valid-input');
      });

      // Effect.either converts failure to a data structure
      const result = yield* program.pipe(Effect.provide(ParserLayer), Effect.either);

      expect(result._tag).toBe('Left'); // Left = error
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('ParseError');
      }
    }),
  );
});
