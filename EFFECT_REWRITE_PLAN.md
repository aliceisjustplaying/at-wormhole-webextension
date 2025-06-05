# Effect Rewrite Plan for AT Wormhole Extension

## Overview

This document provides a comprehensive plan for rewriting the AT Wormhole browser extension using the Effect TypeScript library. The rewrite aims to leverage Effect's powerful functional programming features, type-safe error handling, and service-oriented architecture.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Models and Schemas](#data-models-and-schemas)
3. [Service Architecture](#service-architecture)
4. [Error Handling Strategy](#error-handling-strategy)
5. [Browser Extension Integration](#browser-extension-integration)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Migration Strategy](#migration-strategy)
8. [Testing Approach](#testing-approach)

## Architecture Overview

### Core Principles

- **Pure Functional Core**: All business logic implemented as pure Effect computations
- **Service-Oriented Architecture**: Each major component as a tagged Effect service
- **Schema-Driven Validation**: All data types defined and validated with Effect Schema
- **Layered Dependencies**: Clear separation between infrastructure and domain layers
- **Type-Safe Error Handling**: All errors tracked in Effect's type system

### Layer Architecture

```
┌─────────────────────────────────────────┐
│         Browser Extension UI            │
│        (Popup, Options, Content)        │
├─────────────────────────────────────────┤
│          Application Layer              │
│     (Orchestration, Use Cases)         │
├─────────────────────────────────────────┤
│           Domain Layer                  │
│    (Core Business Logic, Pure)         │
├─────────────────────────────────────────┤
│        Infrastructure Layer             │
│  (Browser APIs, Network, Storage)      │
└─────────────────────────────────────────┘
```

### Module Organization

```
src/
├── domain/           # Pure business logic
│   ├── models/      # Effect Schema definitions
│   ├── parser/      # URL parsing logic
│   ├── canonicalizer/   # Transformation logic
│   └── services/    # Service configurations
├── infrastructure/  # External integrations
│   ├── browser/     # Browser API wrappers
│   ├── network/     # HTTP client
│   └── storage/     # Persistence layer
├── application/     # Use cases and orchestration
│   ├── transform/   # Main transformation pipeline
│   └── cache/       # Cache management
└── presentation/    # UI components
    ├── popup/       # Popup UI
    ├── options/     # Options page
    └── background/  # Service worker
```

## Prerequisites and Dependencies

### Required Dependencies

```bash
# Core Effect packages
bun add effect @effect/schema @effect/vitest

# Browser-specific Effect packages
bun add @effect/platform @effect/platform-browser

# Development dependencies
bun add -D vitest @vitest/ui jsdom
```

### Import Organization

All Effect code should use explicit imports for better tree-shaking:

```typescript
// ✅ Good - explicit imports
import { Effect, pipe } from "effect"
import { Schema as S } from "@effect/schema"
import { Match } from "effect/Match"
import { Layer } from "effect/Layer"
import { Context } from "effect/Context"
import { Duration } from "effect/Duration"
import { Schedule } from "effect/Schedule"
import { Stream } from "effect/Stream"

// ❌ Bad - barrel imports
import { Effect, pipe, Match, Layer } from "effect"
```

### Test Configuration

Create `effect/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@effect': new URL('./', import.meta.url).pathname,
    },
  },
})
```

## Data Models and Schemas

### Core Value Types

```typescript
import { Schema as S } from "@effect/schema"
import { Brand } from "effect/Brand"
import type { Effect } from "effect/Effect"

// Branded types for type safety
export const Handle = S.String.pipe(
  S.pattern(/^([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+$/),
  S.brand("Handle"),
  S.annotations({
    title: "Handle",
    description: "AT Protocol handle (e.g., alice.bsky.social)",
    examples: ["alice.bsky.social", "bob.example.com"]
  })
)
export type Handle = S.Schema.Type<typeof Handle>

export const DidPlc = S.TemplateLiteral("did:plc:", S.String).pipe(
  S.brand("DidPlc"),
  S.annotations({
    title: "DID PLC",
    description: "Decentralized Identifier using PLC method"
  })
)
export type DidPlc = S.Schema.Type<typeof DidPlc>

export const DidWeb = S.TemplateLiteral("did:web:", S.String).pipe(
  S.brand("DidWeb"),
  S.annotations({
    title: "DID Web",
    description: "Decentralized Identifier using Web method"
  })
)
export type DidWeb = S.Schema.Type<typeof DidWeb>

export const Did = S.Union(DidPlc, DidWeb)
export type Did = S.Schema.Type<typeof Did>

export const Rkey = S.String.pipe(
  S.pattern(/^[a-zA-Z0-9_-]+$/),
  S.brand("Rkey"),
  S.annotations({
    title: "Record Key",
    description: "Record key for specific content"
  })
)
export type Rkey = S.Schema.Type<typeof Rkey>

export const Nsid = S.String.pipe(
  S.pattern(/^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)*$/),
  S.brand("Nsid"),
  S.annotations({
    title: "Namespace ID",
    description: "AT Protocol namespace identifier"
  })
)
export type Nsid = S.Schema.Type<typeof Nsid>

export const AtUri = S.TemplateLiteral(
  "at://",
  S.Union(Handle, Did),
  "/",
  Nsid,
  S.optional(S.TemplateLiteral("/", Rkey))
).pipe(
  S.brand("AtUri"),
  S.annotations({
    title: "AT URI",
    description: "AT Protocol URI"
  })
)
export type AtUri = S.Schema.Type<typeof AtUri>
```

### Domain Models

```typescript
// Main transform information
export const TransformInfo = S.Struct({
  atUri: S.optional(AtUri),
  did: S.optional(Did),
  handle: S.optional(Handle),
  rkey: S.optional(Rkey),
  nsid: S.optional(Nsid),
  bskyAppPath: S.NonEmpty
})
export type TransformInfo = S.Schema.Type<typeof TransformInfo>

// Service content support levels
export const ContentSupport = S.Literal(
  "full",
  "profiles-and-posts",
  "only-posts",
  "only-profiles"
)
export type ContentSupport = S.Schema.Type<typeof ContentSupport>

// Service configuration
export const ServiceConfig = S.Struct({
  emoji: S.String,
  name: S.NonEmpty,
  contentSupport: ContentSupport,
  parsing: S.optional(S.Struct({
    hostname: S.NonEmpty,
    patterns: S.Record(S.String, S.instanceOf(RegExp))
  })),
  buildUrl: S.Function,
  requiredFields: S.optional(S.Struct({
    handle: S.optional(S.Boolean),
    rkey: S.optional(S.Boolean),
    plcOnly: S.optional(S.Boolean)
  }))
})
export type ServiceConfig = S.Schema.Type<typeof ServiceConfig>

// Destination link
export const DestinationLink = S.Struct({
  url: S.String,
  label: S.NonEmpty,
  service: S.NonEmpty,
  matched: S.Boolean
})
export type DestinationLink = S.Schema.Type<typeof DestinationLink>

// User preferences
export const UserPreferences = S.Struct({
  showEmojis: S.Boolean,
  strictMode: S.Boolean
})
export type UserPreferences = S.Schema.Type<typeof UserPreferences>
```

### Message Types for Browser Communication

```typescript
// Service worker messages
export const ResolveRequest = S.Struct({
  type: S.Literal("resolve"),
  input: S.String,
  cacheOnly: S.optional(S.Boolean)
})

export const ResolveResponse = S.Struct({
  type: S.Literal("resolved"),
  transformInfo: TransformInfo,
  cacheHit: S.Boolean
})

export const ClearCacheRequest = S.Struct({
  type: S.Literal("clearCache")
})

export const ServiceWorkerMessage = S.Union(
  ResolveRequest,
  ResolveResponse,
  ClearCacheRequest
)
```

## Service Architecture

### Core Services

```typescript
import { Context } from "effect/Context"
import { Effect } from "effect/Effect"
import { Layer } from "effect/Layer"
import type { Duration } from "effect/Duration"
import type { Stream } from "effect/Stream"
import type { Schema as S } from "@effect/schema"

// Missing type definitions
export interface ParsedFragments {
  handle?: string
  did?: string
  rkey?: string
  nsid?: string
  path?: string
}

export interface TransformOptions {
  showEmojis?: boolean
  strictMode?: boolean
  cacheOnly?: boolean
}

export interface CacheStats {
  size: number
  handleCount: number
  didCount: number
  bytesUsed: number
}

export interface TabUpdateEvent {
  tabId: number
  url: string
  status: "loading" | "complete"
}

// Parser Service - Extracts identifiers from various inputs
export interface ParserService {
  readonly parseInput: (
    input: string
  ) => Effect.Effect<TransformInfo | null, ParseError>
}
export const ParserService = Context.GenericTag<ParserService>("ParserService")

// Canonicalizer Service - Normalizes parsed data
export interface CanonicalizerService {
  readonly canonicalize: (
    fragments: ParsedFragments
  ) => Effect.Effect<TransformInfo, ValidationError>
}
export const CanonicalizerService = Context.GenericTag<CanonicalizerService>("CanonicalizerService")

// Resolver Service - Network operations for handle/DID resolution
export interface ResolverService {
  readonly resolveHandle: (
    handle: Handle
  ) => Effect.Effect<Did, ResolverError | NetworkError>
  
  readonly resolveDid: (
    did: Did
  ) => Effect.Effect<Handle, ResolverError | NetworkError>
}
export const ResolverService = Context.GenericTag<ResolverService>("ResolverService")

// Cache Service - Bidirectional cache for handle/DID mappings
export interface CacheService {
  readonly get: <K extends Handle | Did>(
    key: K
  ) => Effect.Effect<K extends Handle ? Did : Handle, CacheError>
  
  readonly set: (
    handle: Handle,
    did: Did
  ) => Effect.Effect<void, CacheError>
  
  readonly clear: Effect.Effect<void, CacheError>
  
  readonly getStats: Effect.Effect<CacheStats, never>
}
export const CacheService = Context.GenericTag<CacheService>("CacheService")

// Transform Service - Main orchestrator
export interface TransformService {
  readonly transform: (
    input: string,
    options?: TransformOptions
  ) => Effect.Effect<DestinationLink[], TransformError>
}
export const TransformService = Context.GenericTag<TransformService>("TransformService")

// Browser Storage Service
export interface StorageService {
  readonly get: <A>(
    key: string,
    schema: S.Schema<A>
  ) => Effect.Effect<A | null, StorageError>
  
  readonly set: <A>(
    key: string,
    value: A,
    schema: S.Schema<A>
  ) => Effect.Effect<void, StorageError>
  
  readonly remove: (key: string) => Effect.Effect<void, StorageError>
  
  readonly getBytesInUse: (
    keys?: string[]
  ) => Effect.Effect<number, StorageError>
}
export const StorageService = Context.GenericTag<StorageService>("StorageService")

// HTTP Service
export interface HttpService {
  readonly fetch: <A>(
    url: string,
    options: {
      schema: S.Schema<A>
      timeout?: Duration
      retries?: number
    }
  ) => Effect.Effect<A, NetworkError | ParseError>
}
export const HttpService = Context.GenericTag<HttpService>("HttpService")

// Browser Tabs Service
export interface TabsService {
  readonly getCurrentTab: Effect.Effect<chrome.tabs.Tab | null, TabsError>
  readonly onUpdated: Stream.Stream<TabUpdateEvent, never>
}
export const TabsService = Context.GenericTag<TabsService>("TabsService")
```

### Service Implementations

```typescript
import { Effect } from "effect/Effect"
import { pipe } from "effect/Function"
import { Match } from "effect/Match"
import { Option } from "effect/Option"
import { Duration } from "effect/Duration"
import { Layer } from "effect/Layer"
import type { Chunk } from "effect/Chunk"
import type { Stream } from "effect/Stream"

// Helper function implementations
const normalizeInput = (input: string): string => {
  return input.trim().toLowerCase()
}

const identifyInputType = (input: string): Effect.Effect<"url" | "handle" | "did" | "atUri", ParseError> => {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return Effect.succeed("url" as const)
  }
  if (input.startsWith("did:")) {
    return Effect.succeed("did" as const)
  }
  if (input.startsWith("at://")) {
    return Effect.succeed("atUri" as const)
  }
  if (input.includes(".")) {
    return Effect.succeed("handle" as const)
  }
  return Effect.fail(new ParseError({
    message: "Could not identify input type",
    input,
    reason: "Unknown format"
  }))
}

// Parser implementations (stubs - copy logic from src/shared/parser.ts)
const parseUrl = (url: string): Effect.Effect<TransformInfo | null, ParseError> => {
  // Copy URL parsing logic from src/shared/parser.ts
  return Effect.succeed(null)
}

const parseHandle = (handle: string): Effect.Effect<TransformInfo | null, ParseError> => {
  // Validate and return TransformInfo with handle
  return Effect.succeed({
    atUri: null,
    did: null,
    handle: handle as Handle,
    bskyAppPath: `/profile/${handle}`
  })
}

const parseDid = (did: string): Effect.Effect<TransformInfo | null, ParseError> => {
  // Validate and return TransformInfo with DID
  return Effect.succeed({
    atUri: null,
    did: did as Did,
    handle: null,
    bskyAppPath: `/profile/${did}`
  })
}

const parseAtUri = (uri: string): Effect.Effect<TransformInfo | null, ParseError> => {
  // Parse AT URI format
  return Effect.succeed(null)
}

// Additional helper functions referenced but not defined
const extractHandleFromPlc = (plcResponse: any): Handle => {
  // Extract handle from PLC directory response
  // Implementation would parse the alsoKnownAs array
  const alsoKnownAs = plcResponse.alsoKnownAs || []
  const atProtoUri = alsoKnownAs.find((uri: string) => uri.startsWith('at://'))
  if (atProtoUri) {
    const handle = atProtoUri.replace('at://', '')
    return handle as Handle
  }
  throw new Error('No handle found in PLC response')
}

const resolveDidWeb = (
  webDid: DidWeb,
  http: HttpService,
  cache: CacheService
): Effect.Effect<Handle, ResolverError | NetworkError> => {
  // Extract domain from did:web and fetch .well-known/did.json
  const domain = webDid.replace('did:web:', '')
  return pipe(
    http.fetch(
      `https://${domain}/.well-known/did.json`,
      {
        schema: DidWebResponse,
        timeout: Duration.seconds(5),
        retries: 2
      }
    ),
    Effect.map((response) => {
      // Extract handle from DID document
      const handle = response.alsoKnownAs?.find(uri => uri.startsWith('at://'))?.replace('at://', '')
      if (!handle) {
        throw new ResolverError({
          message: 'No handle found in DID document',
          identifier: webDid,
          type: 'did'
        })
      }
      return handle as Handle
    }),
    Effect.tap((handle) => cache.set(handle, webDid))
  )
}

const resolveIdentifiers = (
  parsed: TransformInfo,
  resolver: ResolverService
): Effect.Effect<TransformInfo, ResolverError | NetworkError> => {
  return Effect.gen(function* () {
    let result = { ...parsed }
    
    // If we have a handle but no DID, resolve it
    if (result.handle && !result.did) {
      const did = yield* resolver.resolveHandle(result.handle).pipe(
        Effect.catchTag("ResolverError", () => Effect.succeed(null)),
        Effect.catchTag("NetworkError", () => Effect.succeed(null))
      )
      if (did) result.did = did
    }
    
    // If we have a DID but no handle, resolve it
    if (result.did && !result.handle) {
      const handle = yield* resolver.resolveDid(result.did).pipe(
        Effect.catchTag("ResolverError", () => Effect.succeed(null)),
        Effect.catchTag("NetworkError", () => Effect.succeed(null))
      )
      if (handle) result.handle = handle
    }
    
    return result
  })
}

const buildDestinations = (
  info: TransformInfo,
  options: TransformOptions & UserPreferences
): DestinationLink[] => {
  // Copy logic from src/shared/services.ts buildUrl functions
  // This would iterate through all services and build destination links
  const destinations: DestinationLink[] = []
  
  // Example implementation (would need to copy full logic)
  Object.entries(SERVICES).forEach(([key, service]) => {
    if (service.buildUrl) {
      const url = service.buildUrl(info)
      if (url) {
        destinations.push({
          url,
          label: options.showEmojis ? `${service.emoji} ${service.name}` : service.name,
          service: key,
          matched: false // Would need to implement matching logic
        })
      }
    }
  })
  
  return destinations
}

// Parser Service Implementation
export const ParserServiceLive = Layer.succeed(
  ParserService,
  ParserService.of({
    parseInput: (input) =>
      pipe(
        Effect.succeed(input),
        Effect.map(normalizeInput),
        Effect.flatMap(identifyInputType),
        Effect.flatMap((type) =>
          Match.value(type).pipe(
            Match.when("url", () => parseUrl(input)),
            Match.when("handle", () => parseHandle(input)),
            Match.when("did", () => parseDid(input)),
            Match.when("atUri", () => parseAtUri(input)),
            Match.exhaustive
          )
        ),
        Effect.catchTag("ParseError", () => Effect.succeed(null))
      )
  })
)

// Resolver Service with caching and retry
export const ResolverServiceLive = Layer.effect(
  ResolverService,
  Effect.gen(function* () {
    const cache = yield* CacheService
    const http = yield* HttpService
    
    const resolveHandleFromNetwork = (handle: Handle) =>
      pipe(
        http.fetch(
          `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
          {
            schema: ResolveHandleResponse,
            timeout: Duration.seconds(5),
            retries: 3
          }
        ),
        Effect.map((response) => response.did),
        Effect.tap((did) => cache.set(handle, did))
      )
    
    const resolveDidFromNetwork = (did: Did) =>
      Match.value(did).pipe(
        Match.when({ _tag: "DidPlc" }, (plcDid) =>
          http.fetch(
            `https://plc.directory/${plcDid.value}`,
            {
              schema: PlcDirectoryResponse,
              timeout: Duration.seconds(5),
              retries: 3
            }
          ).pipe(
            Effect.map(extractHandleFromPlc),
            Effect.tap((handle) => cache.set(handle, did))
          )
        ),
        Match.when({ _tag: "DidWeb" }, (webDid) =>
          resolveDidWeb(webDid, http, cache)
        ),
        Match.exhaustive
      )
    
    return ResolverService.of({
      resolveHandle: (handle) =>
        pipe(
          cache.get(handle),
          Effect.orElse(() => resolveHandleFromNetwork(handle))
        ),
      
      resolveDid: (did) =>
        pipe(
          cache.get(did),
          Effect.orElse(() => resolveDidFromNetwork(did))
        )
    })
  })
).pipe(
  Layer.provide(CacheServiceLive),
  Layer.provide(HttpServiceLive)
)

// Transform Service - Main orchestrator
export const TransformServiceLive = Layer.effect(
  TransformService,
  Effect.gen(function* () {
    const parser = yield* ParserService
    const canonicalizer = yield* CanonicalizerService
    const resolver = yield* ResolverService
    const storage = yield* StorageService
    
    return TransformService.of({
      transform: (input, options = {}) =>
        Effect.gen(function* () {
          // Parse input
          const parsed = yield* parser.parseInput(input)
          if (!parsed) return []
          
          // Get user preferences
          const prefs = yield* storage.get("preferences", UserPreferences).pipe(
            Effect.map((p) => p ?? { showEmojis: true, strictMode: false })
          )
          
          // Resolve missing identifiers
          const resolved = yield* resolveIdentifiers(parsed, resolver)
          
          // Build destination links
          return buildDestinations(resolved, { ...prefs, ...options })
        })
    })
  })
)
```

### Layer Composition

```typescript
// Infrastructure layer
export const InfrastructureLayer = Layer.mergeAll(
  StorageServiceLive,
  HttpServiceLive,
  TabsServiceLive
)

// Domain layer
export const DomainLayer = Layer.mergeAll(
  ParserServiceLive,
  CanonicalizerServiceLive,
  ResolverServiceLive,
  CacheServiceLive
).pipe(
  Layer.provide(InfrastructureLayer)
)

// Application layer
export const ApplicationLayer = TransformServiceLive.pipe(
  Layer.provide(DomainLayer)
)

// Main runtime layer for the extension
export const MainLayer = ApplicationLayer
```

## Error Handling Strategy

### Error Types

```typescript
import { Schema as S } from "@effect/schema"

// Base error class
abstract class WormholeError extends S.TaggedError<WormholeError>() {}

// Specific error types
export class ParseError extends S.TaggedError<ParseError>()("ParseError", {
  message: S.String,
  input: S.String,
  reason: S.optional(S.String)
}) {}

export class NetworkError extends S.TaggedError<NetworkError>()("NetworkError", {
  message: S.String,
  url: S.String,
  status: S.optional(S.Number),
  cause: S.optional(S.Unknown)
}) {}

export class ValidationError extends S.TaggedError<ValidationError>()("ValidationError", {
  message: S.String,
  field: S.String,
  value: S.Unknown
}) {}

export class CacheError extends S.TaggedError<CacheError>()("CacheError", {
  message: S.String,
  operation: S.Literal("get", "set", "clear", "evict"),
  cause: S.optional(S.Unknown)
}) {}

export class StorageError extends S.TaggedError<StorageError>()("StorageError", {
  message: S.String,
  operation: S.String,
  cause: S.optional(S.Unknown)
}) {}

export class ResolverError extends S.TaggedError<ResolverError>()("ResolverError", {
  message: S.String,
  identifier: S.String,
  type: S.Literal("handle", "did")
}) {}

export class TabsError extends S.TaggedError<TabsError>()("TabsError", {
  message: S.String,
  operation: S.String
}) {}

// Union of all application errors
export type AppError = 
  | ParseError 
  | NetworkError 
  | ValidationError 
  | CacheError 
  | StorageError 
  | ResolverError 
  | TabsError
```

### Error Handling Patterns

```typescript
// Graceful degradation
export const transformWithFallback = (input: string) =>
  pipe(
    transform(input),
    Effect.catchTag("NetworkError", (error) =>
      pipe(
        Effect.logWarning(`Network error: ${error.message}, using offline mode`),
        Effect.flatMap(() => getOfflineDestinations(input))
      )
    ),
    Effect.catchTag("CacheError", (error) =>
      pipe(
        Effect.logWarning(`Cache error: ${error.message}, continuing without cache`),
        Effect.flatMap(() => transformWithoutCache(input))
      )
    )
  )

// Retry with exponential backoff
export const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.jittered,
  Schedule.whileOutput(Duration.lessThanOrEqualTo("5 seconds")),
  Schedule.recurs(3)
)

// Circuit breaker for external services
export const circuitBreaker = CircuitBreaker.make({
  maxFailures: 5,
  resetTimeout: Duration.minutes(1),
  onStateChange: (state) =>
    Effect.log(`Circuit breaker state changed to: ${state}`)
})

// Error recovery strategies
export const handleResolverError = (error: ResolverError) =>
  Match.value(error.type).pipe(
    Match.when("handle", () =>
      Effect.succeed({
        message: "Could not resolve handle. Using cached data if available.",
        fallback: true
      })
    ),
    Match.when("did", () =>
      Effect.succeed({
        message: "Could not resolve DID. Some services may be unavailable.",
        fallback: true
      })
    ),
    Match.exhaustive
  )
```

## Browser Extension Integration

### Background Service Worker

```typescript
// Service worker program
export const serviceWorkerProgram = Effect.gen(function* () {
  const transform = yield* TransformService
  const cache = yield* CacheService
  const tabs = yield* TabsService
  
  // Message handler
  const handleMessage = (
    message: unknown,
    sender: chrome.runtime.MessageSender
  ): Effect.Effect<unknown, AppError> =>
    pipe(
      S.decodeUnknown(ServiceWorkerMessage)(message),
      Effect.flatMap((msg) =>
        Match.value(msg).pipe(
          Match.tag("resolve", ({ input, cacheOnly }) =>
            pipe(
              cacheOnly
                ? getCachedTransform(input, cache)
                : transform.transform(input),
              Effect.map((result) => ({
                type: "resolved" as const,
                transformInfo: result,
                cacheHit: cacheOnly ?? false
              }))
            )
          ),
          Match.tag("clearCache", () =>
            pipe(
              cache.clear,
              Effect.map(() => ({ type: "cacheCleared" as const }))
            )
          ),
          Match.exhaustive
        )
      )
    )
  
  // Set up message listener
  yield* Effect.async<never, never>((callback) => {
    chrome.runtime.onMessage.addListener(
      (message, sender, sendResponse) => {
        Effect.runPromise(
          handleMessage(message, sender).pipe(
            Effect.catchAll((error) =>
              Effect.succeed({
                type: "error" as const,
                error: formatError(error)
              })
            )
          )
        ).then(sendResponse)
        
        return true // Async response
      }
    )
    
    // Cleanup not needed for service workers
  })
  
  // Monitor tab updates for pre-caching
  yield* pipe(
    tabs.onUpdated,
    Stream.filter((event) => event.status === "complete"),
    Stream.tap((event) =>
      pipe(
        transform.transform(event.url, { cacheOnly: false }),
        Effect.tapError((error) =>
          Effect.logDebug(`Pre-cache failed for ${event.url}: ${error.message}`)
        ),
        Effect.ignore
      )
    ),
    Stream.runDrain
  ).pipe(Effect.forkDaemon)
  
  // Keep service worker alive
  yield* Effect.never
})

// Run the service worker
export const runServiceWorker = () =>
  pipe(
    serviceWorkerProgram,
    Effect.provide(MainLayer),
    Effect.runFork
  )
```

### Popup Integration

```typescript
// Popup program
export const popupProgram = Effect.gen(function* () {
  const runtime = yield* Effect.runtime<never>()
  
  // Get current tab URL
  const getCurrentUrl = Effect.gen(function* () {
    const urlParams = new URLSearchParams(window.location.search)
    const payloadUrl = urlParams.get("payload")
    
    if (payloadUrl) {
      return decodeURIComponent(payloadUrl)
    }
    
    const tabs = yield* Effect.promise(() =>
      chrome.tabs.query({ active: true, currentWindow: true })
    )
    
    return tabs[0]?.url ?? ""
  })
  
  // Send message to service worker
  const sendMessage = <A>(
    message: ServiceWorkerMessage
  ): Effect.Effect<A, AppError> =>
    Effect.tryPromise({
      try: () => chrome.runtime.sendMessage(message),
      catch: (error) =>
        new TabsError({
          message: "Failed to send message to service worker",
          operation: "sendMessage"
        })
    }).pipe(
      Effect.flatMap(S.decodeUnknown(S.Unknown) as (u: unknown) => Effect.Effect<A, ParseError>)
    )
  
  // Main popup flow
  const url = yield* getCurrentUrl
  const response = yield* sendMessage<ResolveResponse>({
    type: "resolve",
    input: url
  })
  
  // Render UI
  yield* renderDestinations(response.transformInfo)
  
  // Set up event handlers
  yield* setupEventHandlers(runtime)
})

// Render functions
const renderDestinations = (links: DestinationLink[]) =>
  Effect.sync(() => {
    const container = document.getElementById("destinations")
    if (!container) return
    
    container.innerHTML = links
      .map((link) => `
        <a href="${link.url}" class="destination ${link.matched ? 'matched' : ''}">
          ${link.label}
        </a>
      `)
      .join("")
  })

// Run popup
export const runPopup = () =>
  pipe(
    popupProgram,
    Effect.provide(MainLayer),
    Effect.runPromise
  )
```

### Options Page

```typescript
export const optionsProgram = Effect.gen(function* () {
  const storage = yield* StorageService
  
  // Load current preferences
  const prefs = yield* storage.get("preferences", UserPreferences).pipe(
    Effect.map((p) => p ?? { showEmojis: true, strictMode: false })
  )
  
  // Update UI with current preferences
  yield* updateOptionsUI(prefs)
  
  // Handle checkbox changes with immediate save
  yield* Effect.async<never, never>((callback) => {
    const showEmojisCheckbox = document.getElementById("showEmojis") as HTMLInputElement
    const strictModeCheckbox = document.getElementById("strictMode") as HTMLInputElement
    
    const savePreference = (key: keyof UserPreferences, value: boolean) =>
      Effect.gen(function* () {
        const current = yield* storage.get("preferences", UserPreferences).pipe(
          Effect.map((p) => p ?? { showEmojis: true, strictMode: false })
        )
        
        const updated = { ...current, [key]: value }
        
        yield* storage.set("preferences", updated, UserPreferences)
        yield* showSavedIndicator(key)
      })
    
    // Save immediately on change
    showEmojisCheckbox.addEventListener("change", (e) => {
      const checked = (e.target as HTMLInputElement).checked
      Effect.runPromise(
        savePreference("showEmojis", checked).pipe(
          Effect.tapError((error) => 
            Effect.sync(() => console.error("Failed to save preference:", error))
          )
        )
      )
    })
    
    strictModeCheckbox.addEventListener("change", (e) => {
      const checked = (e.target as HTMLInputElement).checked
      Effect.runPromise(
        savePreference("strictMode", checked).pipe(
          Effect.tapError((error) => 
            Effect.sync(() => console.error("Failed to save preference:", error))
          )
        )
      )
    })
  })
})

// Show brief "Saved" indicator next to the changed setting
const showSavedIndicator = (key: string) =>
  Effect.sync(() => {
    const indicator = document.querySelector(`#${key} + .saved-indicator`) as HTMLElement
    if (indicator) {
      indicator.style.opacity = "1"
      setTimeout(() => {
        indicator.style.opacity = "0"
      }, 1500)
    }
  })
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Set up Effect and @effect/schema dependencies
- [x] Configure ESLint for Effect patterns
- [ ] Create base project structure
- [ ] Implement core schemas and branded types
- [ ] Set up testing infrastructure with Effect's test utilities
- [ ] Create basic service interfaces

### Phase 2: Infrastructure Layer (Week 2)
- [ ] Implement StorageService with chrome.storage.local wrapper
- [ ] Implement HttpService with fetch wrapper and retry logic
- [ ] Implement TabsService for browser tab interactions
- [ ] Create error types and error handling utilities
- [ ] Add logging and tracing setup
- [ ] Test infrastructure services in isolation

### Phase 3: Domain Layer (Week 3)
- [ ] Port Parser service with Schema validation
- [ ] Port Canonicalizer as pure Effect functions
- [ ] Implement Cache service with bidirectional map
- [ ] Implement Resolver service with Effect concurrency
- [ ] Create service configuration system
- [ ] Add comprehensive domain tests

### Phase 4: Application Layer (Week 4)
- [ ] Create Transform orchestrator service
- [ ] Implement main transformation pipeline
- [ ] Add caching strategies and cache warming
- [ ] Create message handling for service worker
- [ ] Implement offline mode fallbacks
- [ ] Performance optimization with Effect's fiber model

### Phase 5: Presentation Layer (Week 5)
- [ ] Port popup UI with Effect integration
- [ ] Port options page with preference management
- [ ] Implement service worker with Effect runtime
- [ ] Handle Firefox-specific requirements
- [ ] Add development mode features
- [ ] Create build system adjustments

### Phase 6: Testing & Polish (Week 6)
- [ ] Comprehensive testing with Effect's test framework
- [ ] Performance testing and optimization
- [ ] Add Effect's built-in tracing and debugging
- [ ] Documentation and API references
- [ ] Migration guide from current codebase
- [ ] Final cleanup and code review

## Migration Strategy

### Separate Folder Development Approach

To minimize risk and maintain a working extension throughout the migration, the Effect implementation will be developed in a completely separate folder structure:

```
at-wormhole-webextension/
├── src/                    # Current implementation (unchanged)
│   ├── shared/            # Existing neverthrow-based code
│   ├── popup/             # Current popup implementation
│   ├── options/           # Current options page
│   └── background/        # Current service worker
├── effect/                 # New Effect implementation
│   ├── domain/            # Pure business logic
│   │   ├── models/        # Effect Schema definitions
│   │   ├── parser/        # URL parsing logic
│   │   ├── canonicalizer/ # Transformation logic
│   │   └── services/      # Service configurations
│   ├── infrastructure/    # External integrations
│   │   ├── browser/       # Browser API wrappers
│   │   ├── network/       # HTTP client
│   │   └── storage/       # Persistence layer
│   ├── application/       # Use cases and orchestration
│   │   ├── transform/     # Main transformation pipeline
│   │   └── cache/         # Cache management
│   ├── presentation/      # UI components
│   │   ├── popup/         # Popup UI
│   │   ├── options/       # Options page
│   │   └── background/    # Service worker
│   └── tests/             # Effect-based tests
├── vite.config.ts          # Current build config
├── vite.config.effect.ts   # Separate Effect build config
└── package.json           # Updated with dual scripts
```

### Build Configuration

#### Dual Build Scripts

```json
// package.json scripts
{
  "scripts": {
    // Current implementation scripts
    "build:current": "vite build",
    "build:chrome:current": "npm run build:current && npm run zip:chrome",
    "build:firefox:current": "npm run build:current && npm run patch:firefox && npm run zip:firefox",
    "dev:current": "vite build --watch --mode development",
    "test:current": "bun test src",
    
    // Effect implementation scripts
    "build:effect": "vite build -c vite.config.effect.ts",
    "build:chrome:effect": "npm run build:effect && npm run zip:chrome:effect",
    "build:firefox:effect": "npm run build:effect && npm run patch:firefox:effect && npm run zip:firefox:effect",
    "dev:effect": "vite build --watch --mode development -c vite.config.effect.ts",
    "test:effect": "bun test effect",
    
    // Parallel development
    "dev": "concurrently \"npm run dev:current\" \"npm run dev:effect\"",
    "test": "npm run test:current && npm run test:effect",
    
    // Default to current implementation
    "build": "npm run build:current",
    "build:chrome": "npm run build:chrome:current",
    "build:firefox": "npm run build:firefox:current"
  }
}
```

#### Vite Configuration for Effect

```typescript
// vite.config.effect.ts
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifestConfig from './manifest.effect.json'

export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist-effect',
    // ... rest of config
  },
  plugins: [
    crx({ manifest: manifestConfig }),
  ],
  resolve: {
    alias: {
      '@effect': path.resolve(__dirname, './effect'),
      '@effect/domain': path.resolve(__dirname, './effect/domain'),
      '@effect/infrastructure': path.resolve(__dirname, './effect/infrastructure'),
      '@effect/application': path.resolve(__dirname, './effect/application'),
      '@effect/presentation': path.resolve(__dirname, './effect/presentation'),
    },
  },
}))
```

### Implementation Strategy

1. **Extract Code from Plan**
   - Copy all code examples from this plan into actual files
   - Start with models and schemas (already ~90% complete in plan)
   - Move service interfaces next (already defined in plan)
   - Implement service bodies using plan examples as starting point

2. **Parallel Testing**
   - Create test adapters to run Effect code against existing test cases
   - Ensure behavioral parity with current implementation
   - Add Effect-specific tests for new capabilities

3. **Gradual Integration**
   - Use environment variables or build flags to switch implementations
   - Start with non-critical paths (e.g., cache service)
   - Progress to core functionality once confidence is built
   - Final switch for UI components

4. **Feature Flag System**

```typescript
// effect/infrastructure/feature-flags.ts
export const FeatureFlags = {
  useEffectParser: process.env.USE_EFFECT_PARSER === 'true',
  useEffectCache: process.env.USE_EFFECT_CACHE === 'true',
  useEffectResolver: process.env.USE_EFFECT_RESOLVER === 'true',
  useEffectUI: process.env.USE_EFFECT_UI === 'true',
}

// Adapter example
export const parseInput = FeatureFlags.useEffectParser
  ? effectParser.parseInput
  : legacyParser.parseInput
```

### Benefits of This Approach

1. **Zero Risk** - Current code remains completely untouched
2. **Side-by-Side Comparison** - Easy to verify behavior matches
3. **Independent Development** - No merge conflicts or interference
4. **Gradual Migration** - Move one module at a time when ready
5. **Easy Rollback** - Just switch build targets
6. **Clean Separation** - No mixing of paradigms or dependencies
7. **Leverages Existing Work** - ~40% of implementation already in plan

### Migration Phases

#### Phase 0: Setup (Immediate)
- [ ] Create `effect/` folder structure
- [ ] Set up `vite.config.effect.ts`
- [ ] Update package.json with dual scripts
- [ ] Extract code from plan into files
- [ ] Verify parallel builds work

#### Phase 1: Foundation (Week 1)
- [ ] Complete domain models from plan examples
- [ ] Set up Effect testing infrastructure
- [ ] Implement basic service shells
- [ ] Create first adapter tests

#### Phase 2-6: (As outlined in original plan)
Continue with the implementation roadmap, but now in the `effect/` folder

### Migration Checklist

- [ ] Create Effect folder structure
- [ ] Extract plan code into actual files
- [ ] Set up parallel build process
- [ ] Configure dual test suites
- [ ] Implement feature flag system
- [ ] Create compatibility adapters
- [ ] Document parallel development workflow
- [ ] Set up CI/CD for both implementations
- [ ] Plan gradual production rollout

## Testing Approach

### Testing Strategy with Effect

```typescript
import { Effect, TestContext, TestServices } from "effect"
import { describe, expect, it } from "@effect/vitest"

// Test utilities
export const TestInfrastructureLayer = Layer.mergeAll(
  StorageServiceTest,
  HttpServiceTest,
  TabsServiceTest
)

// Example test
describe("TransformService", () => {
  it.effect("should transform valid Bluesky URL", () =>
    Effect.gen(function* () {
      const transform = yield* TransformService
      const result = yield* transform.transform(
        "https://bsky.app/profile/alice.bsky.social"
      )
      
      expect(result).toHaveLength(10)
      expect(result[0]).toMatchObject({
        service: "bsky.app",
        matched: true
      })
    }).pipe(
      Effect.provide(TestApplicationLayer)
    )
  )
  
  it.effect("should handle network errors gracefully", () =>
    Effect.gen(function* () {
      const transform = yield* TransformService
      const http = yield* HttpService
      
      // Mock network failure
      yield* TestServices.mockFunction(
        http,
        "fetch",
        Effect.fail(new NetworkError({
          message: "Network unreachable",
          url: "https://bsky.social/xrpc/...",
          status: undefined
        }))
      )
      
      const result = yield* transform.transform("alice.bsky.social")
      
      // Should still return offline destinations
      expect(result.length).toBeGreaterThan(0)
    }).pipe(
      Effect.provide(TestApplicationLayer)
    )
  )
})
```

### Property-Based Testing

```typescript
import { fc } from "@effect/schema/FastCheck"

describe("Parser Property Tests", () => {
  it.effect("should parse any valid handle", () =>
    Effect.gen(function* () {
      const parser = yield* ParserService
      const handleArb = fc(Handle)
      
      yield* Effect.forEach(
        handleArb.sample(),
        (handle) =>
          parser.parseInput(handle).pipe(
            Effect.map((result) => {
              expect(result).not.toBeNull()
              expect(result?.handle).toBe(handle)
            })
          )
      )
    })
  )
})
```

## Key Benefits of Effect Rewrite

1. **Type Safety**
   - All errors tracked in types at compile time
   - No runtime surprises with error handling
   - Branded types prevent invalid data

2. **Testability**
   - Pure functions throughout
   - Dependency injection built-in
   - Easy mocking and testing

3. **Performance**
   - Fiber-based concurrency model
   - Automatic batching and caching
   - Resource pooling

4. **Maintainability**
   - Clear separation of concerns
   - Self-documenting code with schemas
   - Consistent patterns throughout

5. **Developer Experience**
   - Built-in tracing and debugging
   - Excellent error messages
   - Rich ecosystem of utilities

6. **Resilience**
   - Automatic retry with backoff
   - Circuit breakers for external services
   - Graceful degradation

7. **Extensibility**
   - Easy to add new services
   - Plugin architecture with layers
   - Type-safe configuration

## Resources and References

### Effect Documentation
- [Effect Docs](https://effect.website/docs)
- [Effect Schema](https://effect.website/docs/schema/introduction)
- [Effect Best Practices](https://effect.website/docs/guides/best-practices)

### Example Projects
- [Effect Examples](https://github.com/Effect-TS/examples)
- [Effect HTTP](https://github.com/Effect-TS/http)

### Community
- [Effect Discord](https://discord.gg/effect-ts)
- [Effect GitHub Discussions](https://github.com/Effect-TS/effect/discussions)

## Common Gotchas for Effect in Browser Extensions

### 1. Chrome Runtime APIs

**Problem**: Chrome APIs use callbacks, not Promises by default.

**Solution**: Use Effect.async or Effect.tryPromise:
```typescript
const sendMessage = <A>(message: unknown) => 
  Effect.async<A, TabsError>((resume) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resume(Effect.fail(new TabsError({
          message: chrome.runtime.lastError.message,
          operation: "sendMessage"
        })))
      } else {
        resume(Effect.succeed(response))
      }
    })
  })
```

### 2. Service Worker Lifecycle

**Problem**: Service workers can be terminated at any time.

**Solution**: Use Effect.acquireRelease for cleanup:
```typescript
const acquireConnection = Effect.sync(() => {
  const port = chrome.runtime.connect({ name: "keepalive" })
  return port
})

const releaseConnection = (port: chrome.runtime.Port) =>
  Effect.sync(() => port.disconnect())

const withConnection = <R, E, A>(
  effect: Effect.Effect<A, E, R>
) => Effect.acquireUseRelease(
  acquireConnection,
  () => effect,
  releaseConnection
)
```

### 3. Manifest V3 Restrictions

**Problem**: No remote code execution, strict CSP.

**Solution**: All Effect code must be bundled. No eval or dynamic imports.

### 4. Message Passing Type Safety

**Problem**: Messages between contexts are untyped.

**Solution**: Always validate with Schema:
```typescript
const handleMessage = (message: unknown) =>
  pipe(
    S.decodeUnknown(ServiceWorkerMessage)(message),
    Effect.flatMap(processMessage)
  )
```

### 5. Storage Quota Limits

**Problem**: chrome.storage.local has quota limits.

**Solution**: Implement LRU eviction in cache:
```typescript
const evictOldestEntries = (bytesNeeded: number) =>
  Effect.gen(function* () {
    const stats = yield* cache.getStats()
    if (stats.bytesUsed + bytesNeeded > STORAGE_QUOTA) {
      yield* cache.evictLRU(bytesNeeded)
    }
  })
```

## Static Assets Handling

### CSS Files

```typescript
// effect/presentation/popup/popup.css
// Copy directly from src/popup/popup.css - no changes needed

// effect/presentation/options/options.css  
// Copy directly from src/options/options.css - no changes needed
```

### HTML Files

```html
<!-- effect/presentation/popup/popup.html -->
<!-- Copy from src/popup/popup.html with script path updates -->
<script type="module" src="./popup.js"></script>

<!-- effect/presentation/options/options.html -->
<!-- Copy from src/options/options.html with script path updates -->
<script type="module" src="./options.js"></script>
```

### Icon Files

All icon files in `public/images/` should be referenced as-is. No changes needed to icon files.

## Build Output Structure

The Effect build will output to `dist-effect/` with this structure:

```
dist-effect/
├── manifest.json          # Generated from manifest.effect.json
├── service-worker.js      # Bundled service worker
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── images/               # Copied from public/images/
└── _locales/            # Copied from _locales/
```

## Missing Schema Definitions

Add these schemas to support the service implementations:

```typescript
// API Response schemas
export const ResolveHandleResponse = S.Struct({
  did: Did
})

export const PlcDirectoryResponse = S.Struct({
  id: S.String,
  alsoKnownAs: S.Array(S.String),
  verificationMethods: S.optional(S.Unknown),
  services: S.optional(S.Unknown)
})

export const DidWebResponse = S.Struct({
  id: S.String,
  alsoKnownAs: S.optional(S.Array(S.String)),
  service: S.optional(S.Array(S.Unknown))
})

// Service registry (copy from src/shared/services.ts)
export const SERVICES = {
  // Copy the entire SERVICES object from src/shared/services.ts
  // No changes needed - it's already pure data
} as const
```

## Manifest.json Modifications

Create `manifest.effect.json` by copying `public/manifest.json` and updating paths:

```json
{
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html"
  },
  "options_ui": {
    "page": "options/options.html"
  }
}
```

## Migration Testing Strategy

### 1. Parallel Testing Infrastructure

Create test adapters to run Effect implementation against existing test cases:

```typescript
// effect/tests/adapters/parser.adapter.ts
import { parseInput as effectParse } from '../domain/parser'
import { parseInput as legacyParse } from '../../src/shared/parser'

describe('Parser Compatibility', () => {
  const testCases = [
    'https://bsky.app/profile/alice.bsky.social',
    'alice.bsky.social',
    'did:plc:1234567890',
    'at://alice.bsky.social/app.bsky.feed.post/abc123'
  ]
  
  testCases.forEach(input => {
    it(`should match legacy behavior for: ${input}`, async () => {
      const effectResult = await Effect.runPromise(
        effectParse(input).pipe(
          Effect.catchAll(() => Effect.succeed(null))
        )
      )
      
      const legacyResult = await legacyParse(input).match(
        ok => ok,
        err => null
      )
      
      expect(effectResult).toEqual(legacyResult)
    })
  })
})
```

### 2. Property-Based Testing

```typescript
// effect/tests/properties/handle.test.ts
import { fc } from '@effect/schema/FastCheck'
import { Handle } from '../domain/models'

describe('Handle Properties', () => {
  it('should round-trip through serialization', () => {
    fc.assert(
      fc.property(fc(Handle), (handle) => {
        const json = JSON.stringify(handle)
        const parsed = JSON.parse(json)
        return S.decodeUnknownSync(Handle)(parsed) === handle
      })
    )
  })
})
```

### 3. Integration Testing

```typescript
// effect/tests/integration/transform.test.ts
describe('Transform Integration', () => {
  const layer = Layer.mergeAll(
    MockStorageService,
    MockHttpService,
    MockTabsService
  ).pipe(
    Layer.provideMerge(ApplicationLayer)
  )
  
  it.effect('should handle full transformation flow', () =>
    Effect.gen(function* () {
      const transform = yield* TransformService
      
      // Mock HTTP responses
      yield* mockHttpResponse(
        'https://bsky.social/xrpc/com.atproto.identity.resolveHandle',
        { did: 'did:plc:testuser123' }
      )
      
      const result = yield* transform.transform('alice.bsky.social')
      
      expect(result).toContainEqual(
        expect.objectContaining({
          service: 'bsky.app',
          url: 'https://bsky.app/profile/alice.bsky.social'
        })
      )
    }).pipe(Effect.provide(layer))
  )
})
```

### 4. Performance Testing

```typescript
// effect/tests/performance/cache.bench.ts
import { bench, describe } from 'vitest'

describe('Cache Performance', () => {
  bench('bidirectional lookup', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const cache = yield* CacheService
        
        // Add 1000 entries
        yield* Effect.forEach(
          Array.from({ length: 1000 }, (_, i) => i),
          (i) => cache.set(
            `user${i}.bsky.social` as Handle,
            `did:plc:user${i}` as Did
          ),
          { concurrency: 'unbounded' }
        )
        
        // Perform lookups
        yield* cache.get('user500.bsky.social' as Handle)
        yield* cache.get('did:plc:user500' as Did)
      })
    )
  })
})
```

## Performance Considerations

### 1. Effect Fiber Pooling

```typescript
// Use bounded concurrency for parallel operations
const resolveMultipleHandles = (handles: Handle[]) =>
  Effect.forEach(
    handles,
    (handle) => resolver.resolveHandle(handle),
    { 
      concurrency: 5, // Limit concurrent requests
      batching: true  // Enable request batching
    }
  )
```

### 2. Lazy Service Construction

```typescript
// Services are only constructed when first accessed
export const ApplicationLayer = Layer.succeed(TransformService, 
  TransformService.of({
    transform: Effect.suspend(() => transformImplementation)
  })
)
```

### 3. Stream-Based Tab Monitoring

```typescript
// Efficient tab monitoring with backpressure
const monitorTabs = Stream.async<TabUpdateEvent>((emit) => {
  const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      emit(Effect.succeed(Chunk.of({ tabId, url: tab.url, status: 'complete' })))
    }
  }
  
  chrome.tabs.onUpdated.addListener(listener)
  
  return Effect.sync(() => {
    chrome.tabs.onUpdated.removeListener(listener)
  })
}).pipe(
  Stream.debounce(Duration.millis(300)) // Debounce rapid updates
)
```

## Token-Efficient Implementation Guide

### 🎯 START HERE - Implementation Instructions

This section is designed for AI assistants to execute the Effect rewrite with minimal human intervention. Follow these steps sequentially.

### Phase 0: Initial Setup (10 minutes)

1. **Create folder structure**:
```bash
mkdir -p effect/{domain/{models,parser,canonicalizer,services},infrastructure/{browser,network,storage},application/{transform,cache},presentation/{popup,options,background},tests}
```

2. **Copy code from this plan**:
   - All schemas in "Data Models and Schemas" section → `effect/domain/models/index.ts`
   - All service interfaces in "Core Services" section → `effect/domain/services/interfaces.ts`
   - All error types in "Error Types" section → `effect/domain/models/errors.ts`

3. **Install Effect dependencies**:
```bash
bun add effect @effect/schema @effect/vitest
```

### Phase 1: Domain Models (Copy & Paste - 5 minutes)

Create `effect/domain/models/index.ts` and copy ALL code from the "Data Models and Schemas" section above. This is already complete - just copy it.

### Phase 2: Pure Functions Port (20 minutes)

**IMPORTANT**: The service implementations in the "Service Implementations" section of this plan are ALREADY IDIOMATIC Effect code. Use those as reference for the correct patterns.

**Parser Service**:
1. Look at `ParserServiceLive` in this plan - it shows the idiomatic implementation
2. Copy the URL parsing regex patterns from `src/shared/parser.ts`
3. Implement using the generator pattern shown in the plan:
```typescript
Effect.gen(function* () {
  // Use Match for pattern matching
  // Use tagged errors
  // Return Effect.succeed(null) for no match
})
```

**Canonicalizer Service**:
1. This is a pure transformation - can mostly use mechanical conversion
2. But wrap in service pattern as shown in plan
3. Keep all validation logic unchanged

### Phase 3: Service Implementations (30 minutes)

**HTTP Service** - Create `effect/infrastructure/network/http.ts`:
```typescript
// Copy the resolver's fetch logic from src/shared/resolver.ts
// Wrap with Effect.tryPromise and add retry from the plan's retryPolicy
```

**Storage Service** - Create `effect/infrastructure/storage/index.ts`:
```typescript
// Copy storage logic from src/shared/cache.ts
// Wrap chrome.storage calls with Effect.tryPromise
```

**Cache Service** - Create `effect/application/cache/index.ts`:
```typescript
// Copy BidirectionalMap class from src/shared/cache.ts AS-IS
// Wrap methods with Effect.succeed/Effect.fail
```

### Phase 4: Test Migration (15 minutes)

1. Copy all test files from `tests/` to `effect/tests/`
2. Update imports to point to Effect modules
3. Replace test assertions:
```typescript
// Before
expect(result.isOk()).toBe(true)
expect(result._unsafeUnwrap()).toEqual(expected)

// After
const actual = await Effect.runPromise(result)
expect(actual).toEqual(expected)
```

### Phase 5: Build Configuration (5 minutes)

1. Create `vite.config.effect.ts` by copying from the plan
2. Update `package.json` scripts by copying from the plan
3. Create `manifest.effect.json` by copying `public/manifest.json`

### Conversion Patterns Reference

**Quick conversion table for common patterns**:

| Neverthrow | Effect (Mechanical) | Effect (Idiomatic) |
|------------|---------------------|-------------------|
| `Result<T, E>` | `Effect<T, E>` | `Effect<T, E>` with service context |
| `ResultAsync<T, E>` | `Effect<T, E>` | `Effect<T, E>` |
| `ok(value)` | `Effect.succeed(value)` | `Effect.succeed(value)` |
| `err(error)` | `Effect.fail(error)` | `Effect.fail(new ErrorClass({...}))` |
| `.map(fn)` | `Effect.map(fn)` | Use in generator: `const x = yield* effect` |
| `.andThen(fn)` | `Effect.flatMap(fn)` | Use generator or Match |
| `.mapErr(fn)` | `Effect.mapError(fn)` | Usually not needed with tagged errors |
| `.orElse(fn)` | `Effect.orElse(() => fn)` | `Effect.catchTag("ErrorType", handler)` |
| `combine([r1, r2])` | `Effect.all([r1, r2])` | `Effect.all([r1, r2], { concurrency: "unbounded" })` |
| `.match({ok, err})` | `Effect.match({onSuccess: ok, onFailure: err})` | Let errors propagate up |

**Idiomatic Patterns**:

1. **Use generators for sequential operations**:
```typescript
// Instead of: effect1.pipe(Effect.flatMap(x => effect2(x)))
Effect.gen(function* () {
  const x = yield* effect1
  return yield* effect2(x)
})
```

2. **Use services instead of direct functions**:
```typescript
// Instead of: parseInput(input)
Effect.gen(function* () {
  const parser = yield* ParserService
  return yield* parser.parseInput(input)
})
```

3. **Use Match for pattern matching**:
```typescript
// Instead of: if/else chains
Match.value(data).pipe(
  Match.when(pattern, handler),
  Match.orElse(defaultHandler)
)
```

4. **Use Option for nullable values**:
```typescript
// Instead of: Effect<T | null, E>
Effect<Option<T>, E>
```

5. **Use tagged errors**:
```typescript
// Instead of: Effect.fail({ type: 'NetworkError', ... })
Effect.fail(new NetworkError({ ... }))
```

**Service configuration objects**: Copy AS-IS from `src/shared/services.ts` - no changes needed.

**Constants**: Copy AS-IS from `src/shared/constants.ts` - no changes needed.

### What NOT to Port

- Skip debug.ts - use Effect's built-in tracing
- Skip retry.ts - use Effect's Schedule
- Skip options.ts - will be handled by Storage service

### Validation Command

After each phase, run:
```bash
cd effect && bun test
```

## Conclusion

This rewrite plan provides a comprehensive roadmap for migrating the AT Wormhole extension to Effect. The new architecture will be more maintainable, type-safe, and performant while maintaining all existing functionality. The incremental migration approach ensures minimal disruption while allowing for continuous improvement throughout the process.

The Token-Efficient Implementation Guide above allows for mechanical execution with ~40% of the code already provided in this plan.