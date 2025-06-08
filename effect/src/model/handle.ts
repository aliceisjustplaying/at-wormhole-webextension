import { Schema as S } from '@effect/schema';
import { ParseResult } from '@effect/schema';
import { Effect } from 'effect';

/*
 * Lesson 1: Creating a Branded Type
 *
 * A "branded type" is a regular type (like string) with an extra
 * compile-time tag that makes it unique. This prevents us from
 * accidentally passing any string where we need a valid handle.
 */

// Step 1: Define what makes a valid handle
const HANDLE_REGEX = /^([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+$/;

// Step 2: Create a branded type using Schema
// First define the schema without annotations
const HandleSchema = S.String.pipe(S.pattern(HANDLE_REGEX), S.brand('Handle'));

// Create branded examples by decoding valid strings
const handleExamples = [S.decodeSync(HandleSchema)('alice.bsky.social'), S.decodeSync(HandleSchema)('bob.example.com')] as const;

// Now add annotations with properly typed examples
export const Handle = HandleSchema.pipe(
  S.annotations({
    title: 'AT Protocol Handle',
    description: 'A valid AT Protocol handle like alice.bsky.social',
    examples: handleExamples,
  }),
);

// Step 3: Extract the TypeScript type from our schema
export type Handle = S.Schema.Type<typeof Handle>;

// Step 4: Create a parsing function that returns an Effect
export const parseHandle = (input: string): Effect.Effect<{ value: Handle; type: 'handle' }, ParseResult.ParseError> =>
  S.decodeUnknown(Handle)(input).pipe(
    // Transform the branded Handle into our result format
    Effect.map((handle) => ({
      value: handle,
      type: 'handle' as const,
    })),
  );

/*
 * What's happening here?
 *
 * 1. S.decodeUnknown(Handle) creates a decoder function
 * 2. When called with input, it returns an Effect that either:
 *    - Succeeds with a branded Handle value
 *    - Fails with a ParseError describing what went wrong
 * 3. Effect.map transforms the success value
 *
 * The beauty: TypeScript knows this can fail and what type of
 * error it produces. You can't forget to handle errors!
 */
