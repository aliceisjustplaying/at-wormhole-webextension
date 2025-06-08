import { describe, it, expect } from 'vitest';
import { Schema as S } from '@effect/schema';
import { Handle } from '@/model/handle';
import { Did, DidPlc, DidWeb } from '@/model/did';

// Import the annotation symbols
const ExamplesSymbol = Symbol.for('@effect/schema/annotation/Examples');

/*
 * Learning: Schema Examples with Branded Types
 *
 * This test shows how to access and use the examples
 * we added to our schemas. It demonstrates that the
 * examples are real, validated branded values.
 */

describe('Schema Examples', () => {
  it('should have branded Handle examples', () => {
    // Access the examples from the schema's AST using the symbol
    const annotations = Handle.ast.annotations;
    const examples = annotations[ExamplesSymbol] as readonly string[];

    expect(examples).toBeDefined();
    expect(examples.length).toBe(2);

    // Important learning: The examples are stored as plain strings,
    // NOT as branded values! The branding is stripped.
    examples.forEach((example) => {
      expect(typeof example).toBe('string');
      expect(example).toMatch(/^([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+$/);
    });

    console.log('Handle examples (stored as plain strings):', examples);
  });

  it('should have branded DID examples', () => {
    // Check DidPlc examples
    const plcAnnotations = DidPlc.ast.annotations;
    const plcExamples = plcAnnotations[ExamplesSymbol] as readonly string[];

    expect(plcExamples).toBeDefined();
    expect(plcExamples.length).toBe(2);
    plcExamples.forEach((example) => {
      expect(example).toMatch(/^did:plc:[a-z0-9]{24}$/);
    });

    // Check DidWeb examples
    const webAnnotations = DidWeb.ast.annotations;
    const webExamples = webAnnotations[ExamplesSymbol] as readonly string[];

    expect(webExamples).toBeDefined();
    expect(webExamples.length).toBe(2);
    webExamples.forEach((example) => {
      expect(example).toMatch(/^did:web:/);
    });

    // Check union Did examples
    const didAnnotations = Did.ast.annotations;
    const didExamples = didAnnotations[ExamplesSymbol] as readonly string[];

    expect(didExamples).toBeDefined();
    expect(didExamples.length).toBe(4); // 2 plc + 2 web

    console.log('DID examples (plain strings):', didExamples);
  });

  it('demonstrates the truth about schema examples', () => {
    // Important learning: Even though we created branded examples,
    // Schema stores them as plain strings in the annotations!

    const examples = Handle.ast.annotations[ExamplesSymbol] as readonly string[];

    // These are NOT branded values anymore:
    console.log('Type of stored example:', typeof examples[0]);
    console.log('Stored example value:', examples[0]);

    // If we want to use them as branded values, we need to decode them again:
    const firstExample = examples[0];
    expect(firstExample).toBeDefined();

    const brandedExample = S.decodeSync(Handle)(firstExample!);

    // NOW it's a branded Handle that can be used where Handle is expected
    function processHandle(handle: Handle): string {
      return `Processing handle: ${handle}`;
    }

    const result = processHandle(brandedExample);
    expect(result).toBe('Processing handle: alice.bsky.social');

    // Lesson learned: Schema examples are stored as plain values,
    // not as branded types. The branding happens at runtime via decoding.
  });
});
