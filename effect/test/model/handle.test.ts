import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Exit } from 'effect';
import { parseHandle } from '@/model/handle';

/*
 * Lesson 1: Branded Types with Schema
 *
 * Problem: In regular TypeScript, a string is just a string.
 * We can't distinguish between a valid handle and any random string.
 *
 * Solution: Effect's Schema lets us create "branded types" -
 * types that look like strings but carry extra compile-time guarantees.
 */

describe('Learning Effect: Handle Parsing', () => {
  it.effect('should parse a valid handle', () =>
    Effect.gen(function* () {
      // With @effect/vitest, we can use generators directly
      // No more Effect.runPromise boilerplate!
      const result = yield* parseHandle('alice.bsky.social');

      expect(result).toEqual({
        value: 'alice.bsky.social',
        type: 'handle',
      });
    }),
  );

  it.effect('should fail on invalid handle', () =>
    Effect.gen(function* () {
      // Lesson 2: Error handling in Effect
      //
      // With @effect/vitest, we can use Effect.exit to capture
      // both success and failure cases

      const result = yield* Effect.exit(parseHandle('not a handle'));

      // Exit.isFailure tells us if it failed
      expect(Exit.isFailure(result)).toBe(true);

      // But that's not very informative. Let's see the actual error...
    }),
  );

  it.effect('should provide detailed error information', () =>
    Effect.gen(function* () {
      // With @effect/vitest and Exit, we get cleaner error handling
      const result = yield* Effect.exit(parseHandle('not@valid'));

      // Exit has more detailed matching capabilities
      expect(Exit.isFailure(result)).toBe(true);

      if (Exit.isFailure(result)) {
        // TypeScript knows this is the error case!
        const error = result.cause;

        // Schema errors include the actual validation failure
        expect(error).toBeDefined();
        // In tests, we typically don't console.log
      }
    }),
  );

  it.effect('should validate various handle formats', () =>
    Effect.gen(function* () {
      // Test various valid handles
      const validHandles = ['alice.bsky.social', 'bob.test.example.com', 'user123.domain.co.uk', 'hello-world.example.com'];

      // With generators, we can use regular for loops!
      for (const handle of validHandles) {
        const result = yield* parseHandle(handle);
        expect(result.value).toBe(handle);
      }
    }),
  );

  it.effect('should reject invalid handle formats', () =>
    Effect.gen(function* () {
      // Test various invalid formats
      const invalidHandles = ['no-dots', '.starts-with-dot', 'ends-with-dot.', 'has spaces.com', 'special@chars.com', 'under_scores.com', ''];

      for (const handle of invalidHandles) {
        const result = yield* Effect.exit(parseHandle(handle));
        expect(Exit.isFailure(result)).toBe(true);
      }
    }),
  );
});
