import { describe, expect } from 'vitest';
import { it } from '@effect/vitest';
import { Effect, Context } from 'effect';
import { ParseError } from '@effect/schema/ParseResult';
import { Parser, ParserLive } from '@/services/parser';

/*
 * Phase 2, Lesson 4: Creating Services
 *
 * In Effect, a "service" is a container for related functionality
 * that can be injected as a dependency. This solves the problem
 * of testability and modularity without global state.
 *
 * Key concepts:
 * 1. Services are identified by unique "tags" (Context.Tag)
 * 2. Services can depend on other services
 * 3. Services are provided through "layers"
 */

describe('Parser Service', () => {
  it.effect('should parse a handle', () =>
    Effect.gen(function* () {
      // To use a service, we need to:
      // 1. Access it with its tag
      // 2. Provide an implementation

      // Get the Parser service from the context
      const parser = yield* Parser;

      // Use it to parse input
      const result = yield* parser.parseInput('alice.bsky.social');

      // It should recognize this as a handle
      expect(result.type).toBe('handle');
      expect(result.value).toBe('alice.bsky.social');
    }).pipe(
      // Provide the live implementation
      Effect.provide(Context.make(Parser, ParserLive)),
    ),
  );

  it.effect('should parse a DID', () =>
    Parser.pipe(
      Effect.flatMap((parser) => parser.parseInput('did:plc:z72i7hdynmk6r22z27h6tvur')),
      Effect.tap((result) =>
        Effect.sync(() => {
          expect(result.type).toBe('did');
          // Type guard to access method property
          if (result.type === 'did') {
            expect(result.method).toBe('plc');
          }
        }),
      ),
      Effect.provide(Context.make(Parser, ParserLive)),
    ),
  );

  /*
   * Lesson 5: Dependency Injection
   *
   * Notice how we "provide" the ParserLive implementation?
   * This means we can easily swap it for a mock in tests!
   */

  it.effect('should use a mock implementation', () => {
    // Create a mock that always returns a specific handle
    const ParserMock = Parser.of({
      parseInput: (_input: string) =>
        Effect.succeed({
          type: 'handle' as const,
          value: 'mock.handle' as any, // We're cheating on the brand for the mock
        }),
    });

    return Effect.gen(function* () {
      const parser = yield* Parser;
      const result = yield* parser.parseInput('anything');

      // No matter what input, we get our mock response
      expect(result.value).toBe('mock.handle');
    }).pipe(Effect.provide(Context.make(Parser, ParserMock)));
  });
});
