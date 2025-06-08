import { Schema as S } from '@effect/schema';
import { ParseResult } from '@effect/schema';
import { Effect } from 'effect';
import { Match } from 'effect';

/*
 * Lesson 3: Union Types with Schema
 *
 * We need to support two different DID formats:
 * - did:plc:xxxxx (24 character lowercase alphanumeric)
 * - did:web:domain.com (any valid domain)
 *
 * Schema.Union lets us say "it's either this OR that"
 */

// First, define each DID type separately

// Define PLC schema without annotations first
const DidPlcSchema = S.String.pipe(S.pattern(/^did:plc:[a-z0-9]{24}$/), S.brand('DidPlc'));

// Create branded PLC examples
const plcExamples = [S.decodeSync(DidPlcSchema)('did:plc:z72i7hdynmk6r22z27h6tvur'), S.decodeSync(DidPlcSchema)('did:plc:abcdef1234567890abcdef12')] as const;

export const DidPlc = DidPlcSchema.pipe(
  S.annotations({
    title: 'DID PLC',
    description: 'Decentralized Identifier using PLC method',
    examples: plcExamples,
  }),
);

export type DidPlc = S.Schema.Type<typeof DidPlc>;

// Define Web schema without annotations first
const DidWebSchema = S.String.pipe(S.pattern(/^did:web:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/), S.brand('DidWeb'));

// Create branded Web examples
const webExamples = [S.decodeSync(DidWebSchema)('did:web:example.com'), S.decodeSync(DidWebSchema)('did:web:alice.example.org')] as const;

export const DidWeb = DidWebSchema.pipe(
  S.annotations({
    title: 'DID Web',
    description: 'Decentralized Identifier using Web method',
    examples: webExamples,
  }),
);

export type DidWeb = S.Schema.Type<typeof DidWeb>;

// Now create a union - it can be EITHER type
// For the union, we can combine both example sets
export const Did = S.Union(DidPlc, DidWeb).pipe(
  S.annotations({
    title: 'AT Protocol DID',
    description: 'Either did:plc or did:web',
    examples: [...plcExamples, ...webExamples],
  }),
);

export type Did = S.Schema.Type<typeof Did>;

// Parse function that identifies which type we got
export const parseDid = (input: string): Effect.Effect<{ value: Did; type: 'did'; method: 'plc' | 'web' }, ParseResult.ParseError> =>
  S.decodeUnknown(Did)(input).pipe(
    Effect.map((did) => {
      // Pattern matching to determine the method
      const method = Match.value(did).pipe(
        Match.when(
          (d): d is DidPlc => d.startsWith('did:plc:'),
          () => 'plc' as const,
        ),
        Match.when(
          (d): d is DidWeb => d.startsWith('did:web:'),
          () => 'web' as const,
        ),
        Match.exhaustive, // TypeScript ensures we handle all cases!
      );

      return {
        value: did,
        type: 'did' as const,
        method,
      };
    }),
  );

/*
 * What's cool here?
 *
 * 1. Union types give us type-safe "OR" logic
 * 2. Template literals build structured strings
 * 3. Pattern matching ensures we handle all cases
 * 4. TypeScript knows exactly which DID type we have
 *
 * Try removing one of the Match.when cases - TypeScript
 * will complain that the match isn't exhaustive!
 */
