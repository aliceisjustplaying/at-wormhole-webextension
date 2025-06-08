import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Exit } from 'effect';
import { parseDid } from '@/model/did';

/*
 * Lesson 3: Union Types and Pattern Matching
 *
 * Problem: We have two types of DIDs - did:plc: and did:web:
 * We need to handle both but they have different formats.
 *
 * Solution: Effect's Schema.Union and pattern matching with Match
 */

describe('Learning Effect: DID Parsing', () => {
  it.effect('should parse a valid did:plc', () =>
    Effect.gen(function* () {
      const result = yield* parseDid('did:plc:z72i7hdynmk6r22z27h6tvur');

      expect(result).toEqual({
        value: 'did:plc:z72i7hdynmk6r22z27h6tvur',
        type: 'did',
        method: 'plc',
      });
    }),
  );

  it.effect('should parse a valid did:web', () =>
    Effect.gen(function* () {
      const result = yield* parseDid('did:web:example.com');

      expect(result).toEqual({
        value: 'did:web:example.com',
        type: 'did',
        method: 'web',
      });
    }),
  );

  it.effect('should reject invalid DID formats', () =>
    Effect.gen(function* () {
      const invalidDids = [
        'not-a-did',
        'did:invalid:method',
        'did:plc:', // missing identifier
        'did:web:', // missing domain
        'did:plc:UPPERCASE', // PLCs are lowercase
        'did:web:with spaces.com',
      ];

      for (const did of invalidDids) {
        const result = yield* Effect.exit(parseDid(did));
        expect(Exit.isFailure(result)).toBe(true);
      }
    }),
  );
});
