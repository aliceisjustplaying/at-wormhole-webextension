import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Effect, Layer } from "effect"
import { UrlParser, UrlParserLive } from "@/services/url-parser"
import { Normalizer, NormalizerLive } from "@/services/normalizer"
import { Resolver, ResolverLive } from "@/services/resolver"
import { installFetchMock, mockFetchResponse } from "../helpers/fetch-mock"

/*
 * Integration Test: Full Pipeline
 * 
 * This demonstrates the complete flow:
 * 1. URL Parser extracts identifier from service URL
 * 2. Normalizer creates TransformInfo
 * 3. Resolver enriches with DID (if handle provided)
 */

describe("Full Transform Pipeline", () => {
  const originalFetch = global.fetch
  let fetchMock: ReturnType<typeof installFetchMock>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = installFetchMock()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  // Create a layer with all services
  const AppLayer = Layer.mergeAll(
    Layer.succeed(UrlParser, UrlParserLive),
    Layer.succeed(Normalizer, NormalizerLive),
    Layer.succeed(Resolver, ResolverLive)
  )

  const transformUrl = (url: string) =>
    Effect.gen(function* () {
      const urlParser = yield* UrlParser
      const normalizer = yield* Normalizer
      const resolver = yield* Resolver
      
      // Parse URL
      const parsed = yield* urlParser.parseUrl(url)
      
      // Normalize to TransformInfo
      const info = yield* normalizer.normalize(parsed.value)
      
      // If we have a handle, resolve to DID
      if (info.handle && !info.did) {
        const did = yield* resolver.resolveHandle(info.handle).pipe(
          Effect.option // Don't fail the whole pipeline if resolution fails
        )
        
        if (did._tag === "Some") {
          return { ...info, did: did.value }
        }
      }
      
      return info
    })

  it("should transform bsky.app URL with handle resolution", async () => {
    // Mock successful handle resolution
    fetchMock.mockResolvedValueOnce(mockFetchResponse({
      ok: true,
      status: 200,
      json: async () => ({ did: "did:plc:z72i7hdynmk6r22z27h6tvur" })
    }))

    const result = await Effect.runPromise(
      transformUrl("https://bsky.app/profile/alice.bsky.social/post/3kt7p4fzxhh2c").pipe(
        Effect.provide(AppLayer)
      )
    )

    expect(result.handle).toBe("alice.bsky.social")
    expect(result.did).toBe("did:plc:z72i7hdynmk6r22z27h6tvur") // Resolved!
    expect(result.rkey).toBe("3kt7p4fzxhh2c")
    expect(result.nsid).toBe("app.bsky.feed.post")
    expect(result.bskyAppPath).toBe("/profile/alice.bsky.social/post/3kt7p4fzxhh2c")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=alice.bsky.social",
      undefined
    )
  })

  it("should handle URLs that already have DIDs", async () => {
    // No fetch should occur for DID-based URLs

    const result = await Effect.runPromise(
      transformUrl("https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur/post/3kt7p4fzxhh2c").pipe(
        Effect.provide(AppLayer)
      )
    )

    expect(result.did).toBe("did:plc:z72i7hdynmk6r22z27h6tvur")
    expect(result.handle).toBeUndefined()
    expect(result.rkey).toBe("3kt7p4fzxhh2c")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should gracefully handle resolution failures", async () => {
    // Mock failed handle resolution
    fetchMock.mockResolvedValueOnce(mockFetchResponse({
      ok: false,
      status: 404,
      statusText: "Not Found"
    }))

    const result = await Effect.runPromise(
      transformUrl("https://bsky.app/profile/unknown.handle/post/3kt7p4fzxhh2c").pipe(
        Effect.provide(AppLayer)
      )
    )

    // Should still work, just without DID
    expect(result.handle).toBe("unknown.handle")
    expect(result.did).toBeUndefined()
    expect(result.rkey).toBe("3kt7p4fzxhh2c")
  })

  it("should transform skythread URL with DID resolution", async () => {
    
    const result = await Effect.runPromise(
      transformUrl("https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23").pipe(
        Effect.provide(AppLayer)
      )
    )

    expect(result.did).toBe("did:plc:2p6idfgjfe3easltiwmnofw6")
    expect(result.rkey).toBe("3lpjntj43rs23")
    expect(result.nsid).toBe("app.bsky.feed.post")
    expect(fetchMock).not.toHaveBeenCalled() // Already has DID
  })

  it("should handle did:web URLs", async () => {
    // Mock did:web document resolution
    fetchMock.mockResolvedValueOnce(mockFetchResponse({
      ok: true,
      status: 200,
      json: async () => ({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:web:example.com",
        alsoKnownAs: ["at://example.com"]
      })
    }))

    const result = await Effect.runPromise(
      transformUrl("https://bsky.app/profile/did:web:example.com").pipe(
        Effect.provide(AppLayer)
      )
    )

    expect(result.did).toBe("did:web:example.com")
    expect(result.handle).toBeUndefined() // We don't reverse-resolve in this pipeline
    expect(result.bskyAppPath).toBe("/profile/did:web:example.com")
  })

  describe("error propagation", () => {
    it("should fail on unsupported service", async () => {
      const result = await Effect.runPromise(
        transformUrl("https://unsupported.com/something").pipe(
          Effect.provide(AppLayer),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("UnsupportedServiceError")
      }
    })

    it("should fail on invalid URL format", async () => {
      const result = await Effect.runPromise(
        transformUrl("not a url").pipe(
          Effect.provide(AppLayer),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("InvalidUrlError")
      }
    })
  })
})

/*
 * What we learned:
 * 
 * 1. Composing multiple services in a pipeline
 * 2. Optional operations with Effect.option
 * 3. Enriching data through multiple stages
 * 4. Graceful degradation when parts fail
 * 5. Layer.mergeAll for combining many layers
 */