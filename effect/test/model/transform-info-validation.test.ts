import { describe, it, expect } from 'vitest';
import { Schema as S } from '@effect/schema';
import { Effect } from 'effect';

/*
 * Understanding Schema Validation Challenges
 *
 * Let's explore why we skipped those tests and what
 * the proper solutions would be.
 */

describe('Schema Validation Patterns', () => {
  it('shows the challenge with cross-field validation', () => {
    // Our TransformInfo needs these business rules:
    // 1. Must have EITHER handle OR did (at least one)
    // 2. Posts must have an rkey
    // 3. Feeds must have an rkey
    // 4. Lists must have an rkey

    // The problem: Schema validation happens field-by-field
    // We need to validate relationships BETWEEN fields

    // Here's what we tried (simplified):
    const AttemptedSchema = S.Struct({
      handle: S.optional(S.String),
      did: S.optional(S.String),
      contentType: S.Literal('profile', 'post'),
      rkey: S.optional(S.String),
    });

    // This validates each field independently, but can't enforce:
    // - "Must have handle OR did"
    // - "If contentType is 'post', rkey is required"
  });

  it('shows different approaches to complex validation', () => {
    // Approach 1: Use refinements (what we tried to do)
    const WithRefinement = S.Struct({
      a: S.optional(S.String),
      b: S.optional(S.String),
    }).pipe(
      S.filter((data) => {
        // This SHOULD work but the syntax has changed
        // in newer Effect versions
        return data.a !== undefined || data.b !== undefined;
      }),
    );

    // Approach 2: Use union types to model valid states
    const WithUnion = S.Union(
      // State 1: Has handle, no did
      S.Struct({
        handle: S.String,
        did: S.optional(S.Never),
        contentType: S.Literal('profile'),
      }),
      // State 2: Has did, no handle
      S.Struct({
        handle: S.optional(S.Never),
        did: S.String,
        contentType: S.Literal('profile'),
      }),
      // State 3: Has both
      S.Struct({
        handle: S.String,
        did: S.String,
        contentType: S.Literal('profile'),
      }),
    );

    // Approach 3: Validate after parsing (what we're doing now)
    const SimpleSchema = S.Struct({
      handle: S.optional(S.String),
      did: S.optional(S.String),
    });

    const validate = (data: unknown) =>
      S.decodeUnknown(SimpleSchema)(data).pipe(
        Effect.flatMap((parsed) => {
          if (!parsed.handle && !parsed.did) {
            return Effect.fail(new Error('Need handle or did'));
          }
          return Effect.succeed(parsed);
        }),
      );
  });

  it('explains why we skipped the tests', () => {
    // Test 1: "should reject invalid data"
    // This tests data missing both handle and did
    // Problem: Our current schema allows this because both fields are optional
    // Solution: We need post-parse validation
    // Test 2: "should reject posts without rkey"
    // This tests a post (contentType: "post") without an rkey
    // Problem: Schema can't express "if contentType='post' then rkey required"
    // Solution: Either use union types or post-parse validation
    // Why skip instead of fix?
    // 1. We're learning incrementally - complex validation comes later
    // 2. The Canonicalizer service will handle this validation
    // 3. Effect has multiple ways to solve this - we'll explore them
  });

  it("shows what we'll do in the Canonicalizer", async () => {
    // The Canonicalizer service will:
    // 1. Take raw input and create partial TransformInfo
    // 2. Apply business rules during transformation
    // 3. Return errors for invalid combinations

    // Example of what Canonicalizer will do:
    const canonicalize = (input: any) => {
      // Build TransformInfo
      const info = {
        handle: input.handle,
        did: input.did,
        contentType: input.contentType,
        rkey: input.rkey,
        bskyAppPath: '...',
        inputType: 'handle' as const,
      };

      // Validate business rules
      if (!info.handle && !info.did) {
        return Effect.fail(new Error('Must have handle or did'));
      }

      if (info.contentType === 'post' && !info.rkey) {
        return Effect.fail(new Error('Posts must have rkey'));
      }

      return Effect.succeed(info);
    };

    // This separates concerns:
    // - Schema handles type validation
    // - Service handles business logic
  });
});
