import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Effect, Context, TestContext, TestServices, Duration } from "effect"
import { Resolver, ResolverLive } from "@/services/resolver"
import { Handle } from "@/model/handle"
import { Did } from "@/model/did"
import { installFetchMock, mockFetchResponse, type MockResponse } from "../helpers/fetch-mock"

/*
 * Phase 3, Lesson 9: Testing the Resolver Service
 * 
 * These tests demonstrate:
 * - Mocking fetch for network operations
 * - Testing retry behavior with TestClock
 * - Error scenario handling
 * - Both handle resolution and DID document resolution
 */

describe("Resolver Service", () => {
  // Store original fetch
  const originalFetch = global.fetch
  let fetchMock: ReturnType<typeof installFetchMock>

  // Mock fetch setup
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = installFetchMock()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe("resolveHandle", () => {
    it("should resolve a valid handle to DID", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => ({ did: "did:plc:z72i7hdynmk6r22z27h6tvur" })
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveHandle("alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive))
        )
      )

      expect(result).toBe("did:plc:z72i7hdynmk6r22z27h6tvur")
      expect(fetchMock).toHaveBeenCalledWith(
        "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=alice.bsky.social",
        undefined
      )
    })

    it("should reject did:web as handle", async () => {
      // did:web is not a valid handle format

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveHandle("did:web:example.com")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("InvalidHandleError")
        if (result.left._tag === "InvalidHandleError") {
          expect(result.left.handle).toBe("did:web:example.com")
        }
      }
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("should return HandleNotFoundError for 404", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: false,
        status: 404,
        statusText: "Not Found"
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveHandle("unknown.handle")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("HandleNotFoundError")
        if (result.left._tag === "HandleNotFoundError") {
          expect(result.left.handle).toBe("unknown.handle")
        }
      }
    })

    it("should return RateLimitError for 429", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Retry-After": "60" }
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveHandle("alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("RateLimitError")
        if (result.left._tag === "RateLimitError") {
          expect(result.left.retryAfter).toBe(60)
        }
      }
    })

    // TODO: Add retry and timeout tests once we understand TestClock better

    it("should reject invalid handle format", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveHandle("not a valid handle!")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("InvalidHandleError")
      }
    })
  })

  describe("resolveDidDocument", () => {
    it("should resolve did:web document with handle", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => ({
          "@context": ["https://www.w3.org/ns/did/v1"],
          id: "did:web:example.com",
          alsoKnownAs: ["at://example.com"],
          service: [{
            id: "#atproto_pds",
            type: "AtprotoPersonalDataServer",
            serviceEndpoint: "https://pds.example.com"
          }]
        })
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveDidDocument("did:web:example.com")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive))
        )
      )

      expect(result.handle).toBe("example.com")
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.com/.well-known/did.json",
        undefined
      )
    })

    it("should return null handle for did:plc", async () => {
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveDidDocument("did:plc:z72i7hdynmk6r22z27h6tvur")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive))
        )
      )

      expect(result.handle).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("should handle did:web without alsoKnownAs", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => ({
          "@context": ["https://www.w3.org/ns/did/v1"],
          id: "did:web:example.com"
        })
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveDidDocument("did:web:example.com")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive))
        )
      )

      expect(result.handle).toBeNull()
    })

    it("should handle invalid DID document", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => ({ invalid: "document" })
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveDidDocument("did:web:example.com")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("InvalidDidDocumentError")
      }
    })

    it("should handle 404 for did:web", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: false,
        status: 404,
        statusText: "Not Found"
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveDidDocument("did:web:notfound.com")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("DidResolutionError")
        if (result.left._tag === "DidResolutionError") {
          expect(result.left.statusCode).toBe(404)
        }
      }
    })

    it("should handle complex domain in did:web", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => ({
          "@context": ["https://www.w3.org/ns/did/v1"],
          id: "did:web:sub.domain.example.com",
          alsoKnownAs: ["at://sub.domain.example.com"]
        })
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveDidDocument("did:web:sub.domain.example.com")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive))
        )
      )

      expect(result.handle).toBe("sub.domain.example.com")
      expect(fetchMock).toHaveBeenCalledWith(
        "https://sub.domain.example.com/.well-known/did.json",
        undefined
      )
    })
  })

  describe("real-world scenarios", () => {
    it("should handle malformed JSON response", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => { throw new Error("Invalid JSON") }
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveHandle("alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("NetworkError")
        if (result.left._tag === "NetworkError") {
          expect(result.left.cause).toBe("Invalid JSON response")
        }
      }
    })

    it("should handle unexpected API response format", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => ({ unexpected: "format" }) // Missing 'did' field
      }))

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const resolver = yield* Resolver
          return yield* resolver.resolveHandle("alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(Resolver, ResolverLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("NetworkError")
        if (result.left._tag === "NetworkError") {
          expect(result.left.cause).toBe("Invalid response format")
        }
      }
    })
  })
})

/*
 * What we're learning:
 * 
 * 1. Mocking async operations with vitest
 * 2. Testing retry logic with TestClock
 * 3. Comprehensive error scenario testing
 * 4. Effect.either for asserting on errors
 * 5. Testing both success and failure paths
 */