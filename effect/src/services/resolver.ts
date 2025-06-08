import { Context, Effect, Schedule, pipe } from "effect"
import { Schema as S } from "@effect/schema"
import { Handle } from "@/model/handle"
import { Did } from "@/model/did"
import {
  NetworkError,
  HandleNotFoundError,
  InvalidHandleError,
  RateLimitError,
  InvalidDidDocumentError,
  DidResolutionError,
  type ResolverError
} from "@/errors/resolver-errors"

/*
 * Phase 3, Lesson 9: Resolver Service
 * 
 * This service handles network requests to resolve handles to DIDs
 * and vice versa using the AT Protocol API.
 * 
 * Key concepts:
 * - Converting promises to Effects
 * - Network error handling
 * - Retry logic with exponential backoff
 * - Schema validation of API responses
 */

// API Response Schemas
const ResolveHandleResponse = S.Struct({
  did: S.String
})

const DidWebDocument = S.Struct({
  "@context": S.Array(S.String),
  id: S.String,
  alsoKnownAs: S.optional(S.Array(S.String)),
  service: S.optional(S.Array(S.Struct({
    id: S.String,
    type: S.String,
    serviceEndpoint: S.String
  })))
})

// Service interface
export interface ResolverService {
  resolveHandle: (handle: string) => Effect.Effect<Did, ResolverError>
  resolveDidDocument: (did: string) => Effect.Effect<{ handle: Handle | null }, ResolverError>
}

// Service tag
export class Resolver extends Context.Tag("Resolver")<
  Resolver,
  ResolverService
>() {}

// Helper to create fetch effect with proper error handling
const fetchWithErrors = (url: string, options?: RequestInit) =>
  Effect.tryPromise({
    try: () => fetch(url, options),
    catch: (error) => new NetworkError({
      url,
      method: options?.method || "GET",
      cause: error
    })
  })

// Create retry schedule: exponential backoff with jitter
const retrySchedule = pipe(
  Schedule.exponential("100 millis"),
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(3))
)

// Service implementation
export const ResolverLive: ResolverService = {
  resolveHandle: (handle: string) => Effect.gen(function* () {
    // Validate handle format first
    const handleResult = yield* S.decodeUnknown(Handle)(handle).pipe(
      Effect.mapError(() => new InvalidHandleError({
        handle,
        reason: "Invalid handle format"
      }))
    )

    const url = `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handleResult)}`

    const response = yield* pipe(
      fetchWithErrors(url),
      Effect.timeout("5 seconds"),
      Effect.retry(retrySchedule),
      Effect.catchTag("TimeoutException", () =>
        Effect.fail(new NetworkError({
          url,
          method: "GET",
          cause: "Request timeout"
        }))
      )
    )

    // Check response status
    if (!response.ok) {
      if (response.status === 404) {
        return yield* Effect.fail(new HandleNotFoundError({
          handle: handleResult,
          statusCode: 404
        }))
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        return yield* Effect.fail(new RateLimitError({
          retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
        }))
      }
      return yield* Effect.fail(new NetworkError({
        url,
        method: "GET",
        cause: `HTTP ${response.status}: ${response.statusText}`
      }))
    }

    // Parse and validate response
    const json = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => new NetworkError({
        url,
        method: "GET",
        cause: "Invalid JSON response"
      })
    })

    const data = yield* S.decodeUnknown(ResolveHandleResponse)(json).pipe(
      Effect.mapError(() => new NetworkError({
        url,
        method: "GET",
        cause: "Invalid response format"
      }))
    )

    // Validate and return DID
    return yield* S.decodeUnknown(Did)(data.did).pipe(
      Effect.mapError(() => new NetworkError({
        url,
        method: "GET",
        cause: "Invalid DID in response"
      }))
    )
  }),

  resolveDidDocument: (did: string) => Effect.gen(function* () {
    // Validate DID format first
    const didResult = yield* S.decodeUnknown(Did)(did).pipe(
      Effect.mapError(() => new DidResolutionError({
        did,
        reason: "Invalid DID format"
      }))
    )

    // Only did:web supports reverse resolution
    if (!didResult.startsWith("did:web:")) {
      return { handle: null }
    }

    // Extract domain from did:web
    const domain = didResult.slice(8) // Remove "did:web:"
    const url = `https://${domain}/.well-known/did.json`

    const response = yield* pipe(
      fetchWithErrors(url),
      Effect.timeout("5 seconds"),
      Effect.retry(retrySchedule),
      Effect.catchTag("TimeoutException", () =>
        Effect.fail(new DidResolutionError({
          did: didResult,
          reason: "Request timeout"
        }))
      )
    )

    if (!response.ok) {
      return yield* Effect.fail(new DidResolutionError({
        did: didResult,
        statusCode: response.status,
        reason: `HTTP ${response.status}: ${response.statusText}`
      }))
    }

    // Parse and validate DID document
    const json = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => new InvalidDidDocumentError({
        did: didResult,
        reason: "Invalid JSON response"
      })
    })

    const didDoc = yield* S.decodeUnknown(DidWebDocument)(json).pipe(
      Effect.mapError(() => new InvalidDidDocumentError({
        did: didResult,
        reason: "Invalid DID document structure"
      }))
    )

    // Extract handle from alsoKnownAs
    if (didDoc.alsoKnownAs) {
      for (const aka of didDoc.alsoKnownAs) {
        if (aka.startsWith("at://")) {
          const handle = aka.slice(5) // Remove "at://"
          const validatedHandle = yield* S.decodeUnknown(Handle)(handle).pipe(
            Effect.option
          )
          if (validatedHandle._tag === "Some") {
            return { handle: validatedHandle.value }
          }
        }
      }
    }

    return { handle: null }
  })
}

/*
 * What we learned:
 * 
 * 1. Effect.tryPromise converts promises to Effects with error mapping
 * 2. Effect.timeout adds time bounds to operations
 * 3. Effect.retry with Schedule handles transient failures
 * 4. Discriminated error types allow precise error handling
 * 5. Schema validation ensures API responses match expectations
 */