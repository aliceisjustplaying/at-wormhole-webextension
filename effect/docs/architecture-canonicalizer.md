# Evaluating the Canonicalizer Pattern

## What the Canonicalizer Does

Looking at the original implementation, the canonicalizer:

1. Takes a fragment string (handle, DID, or AT URI)
2. Parses and validates the format
3. Transforms to a normalized TransformInfo structure
4. Returns consistent output regardless of input format

## The Good ✅

### 1. **Single Source of Truth**
```typescript
// No matter how the input comes in:
canonicalize("alice.bsky.social")
canonicalize("did:plc:xyz") 
canonicalize("at://alice.bsky.social/app.bsky.feed.post/123")

// We get consistent TransformInfo output
```

### 2. **Pure Function**
- No side effects
- No network calls  
- Easy to test
- Easy to reason about

### 3. **Separation of Concerns**
```
Parser → Canonicalizer → Resolver → URL Builder
  ↓           ↓            ↓           ↓
Parse    Normalize    Network     Generate
URLs      Format      Calls       Links
```

## The Questionable 🤔

### 1. **The Name**
"Canonicalizer" is a bit academic. Alternatives:
- `Normalizer`
- `Transformer` 
- `StandardizeInput`

### 2. **Doing Too Much?**
Currently it:
- Parses AT URIs
- Validates formats
- Applies NSID shortcuts
- Builds bskyAppPath

Could be split into:
```typescript
parseAtUri() → validateFormat() → buildTransformInfo()
```

### 3. **AT URI Knowledge**
The canonicalizer has deep knowledge of AT URI format:
```typescript
// It knows this format:
at://[identifier]/[nsid]/[rkey]
```

## Alternative Patterns

### Option 1: Parser-Only Pattern
```typescript
// Just parse, don't transform
const parsed = parseInput(raw) // Returns ParsedInput type
const validated = validateParsed(parsed) // Returns ValidInput type  
const info = buildTransformInfo(validated) // Returns TransformInfo
```

**Pros**: More modular, each step is clear
**Cons**: More boilerplate, multiple intermediate types

### Option 2: Builder Pattern
```typescript
const info = TransformInfoBuilder
  .fromInput(raw)
  .validate()
  .normalize()
  .build()
```

**Pros**: Fluent API, clear steps
**Cons**: More complex, stateful builder

### Option 3: Direct Service Methods
```typescript
class TransformService {
  parseHandle(handle: string): Effect<TransformInfo>
  parseDid(did: string): Effect<TransformInfo>
  parseUrl(url: URL): Effect<TransformInfo>
  parseAtUri(uri: string): Effect<TransformInfo>
}
```

**Pros**: No intermediate canonicalization
**Cons**: Duplication between methods

## My Recommendation ✨

**Keep the canonicalizer pattern, but rename it to `Normalizer`**

Why:
1. **It's working** - The pattern has proven itself in your codebase
2. **Clear responsibility** - Transform any input → standard format
3. **Pure and testable** - These benefits are huge
4. **AT Protocol specific** - This domain needs normalization

Suggested improvements:

```typescript
// Rename for clarity
export const NormalizerService = {
  // More specific method name
  normalizeToTransformInfo: (input: string) => Effect<TransformInfo>
}

// Or split if needed
export const AtUriParser = {
  parse: (uri: string) => Effect<ParsedAtUri>
}

export const TransformInfoBuilder = {
  fromParsedUri: (parsed: ParsedAtUri) => TransformInfo
}
```

## For Your Extension Specifically

The canonicalizer/normalizer pattern is **particularly good** for the AT Wormhole because:

1. **Multiple input formats** - Users paste all kinds of things
2. **Need for consistency** - Every service needs the same info
3. **Complex domain** - AT URIs, handles, DIDs have specific rules
4. **Performance** - Parse once, use everywhere

The pattern fits your problem domain perfectly. I'd keep it!

## Effect-style Implementation

With Effect, we can make it even better:

```typescript
// Clear error types
type NormalizeError = 
  | InvalidHandleError
  | InvalidDidError  
  | InvalidAtUriError
  | MissingIdentifierError

// Service with dependency injection
class Normalizer extends Context.Tag("Normalizer")<
  Normalizer,
  {
    normalize: (input: string) => Effect<TransformInfo, NormalizeError>
  }
>() {}

// Pure, testable implementation
const NormalizerLive = Normalizer.of({
  normalize: (input) => Effect.gen(function* () {
    // Parse input type
    const parsed = yield* parseInputType(input)
    
    // Validate format
    yield* validateFormat(parsed)
    
    // Build TransformInfo
    return yield* buildTransformInfo(parsed)
  })
})
```

This gives you the same pattern with better error handling and testability!