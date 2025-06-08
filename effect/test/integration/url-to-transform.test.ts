import { describe, it, expect } from "vitest"
import { Effect, Context, Layer } from "effect"
import { UrlParser, UrlParserLive } from "@/services/url-parser"
import { Normalizer, NormalizerLive } from "@/services/normalizer"

/*
 * Integration Test: URL Parser + Normalizer
 * 
 * This demonstrates how the two services work together
 * to transform a service URL into a TransformInfo.
 */

describe("URL to TransformInfo Pipeline", () => {
  // Create a layer that provides both services
  const TestLayer = Layer.merge(
    Layer.succeed(UrlParser, UrlParserLive),
    Layer.succeed(Normalizer, NormalizerLive)
  )

  const parseAndNormalize = (url: string) =>
    Effect.gen(function* () {
      const urlParser = yield* UrlParser
      const normalizer = yield* Normalizer
      
      // First, parse the URL
      const parsed = yield* urlParser.parseUrl(url)
      
      // Then, normalize the extracted value
      const normalized = yield* normalizer.normalize(parsed.value)
      
      return normalized
    })

  it("should transform bsky.app post URL", async () => {
    const result = await Effect.runPromise(
      parseAndNormalize("https://bsky.app/profile/alice.bsky.social/post/3kt7p4fzxhh2c").pipe(
        Effect.provide(TestLayer)
      )
    )

    expect(result.handle).toBe("alice.bsky.social")
    expect(result.rkey).toBe("3kt7p4fzxhh2c")
    expect(result.nsid).toBe("app.bsky.feed.post")
    expect(result.contentType).toBe("post")
    expect(result.bskyAppPath).toBe("/profile/alice.bsky.social/post/3kt7p4fzxhh2c")
  })

  it("should transform toolify.blue feed URL", async () => {
    const result = await Effect.runPromise(
      parseAndNormalize("https://toolify.blue/profile/why.bsky.team/feed/cozy").pipe(
        Effect.provide(TestLayer)
      )
    )

    expect(result.handle).toBe("why.bsky.team")
    expect(result.rkey).toBe("cozy")
    expect(result.nsid).toBe("app.bsky.feed.generator")
    expect(result.contentType).toBe("feed")
  })

  it("should transform skythread URL with query params", async () => {
    const result = await Effect.runPromise(
      parseAndNormalize("https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23").pipe(
        Effect.provide(TestLayer)
      )
    )

    expect(result.did).toBe("did:plc:2p6idfgjfe3easltiwmnofw6")
    expect(result.rkey).toBe("3lpjntj43rs23")
    expect(result.nsid).toBe("app.bsky.feed.post")
    expect(result.contentType).toBe("post")
  })

  it("should transform pdsls.dev AT URI", async () => {
    const result = await Effect.runPromise(
      parseAndNormalize("https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u").pipe(
        Effect.provide(TestLayer)
      )
    )

    expect(result.did).toBe("did:plc:kkkcb7sys7623hcf7oefcffg")
    expect(result.rkey).toBe("3lqcw7n4gly2u")
    expect(result.atUri).toBe("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
  })

  it("should handle errors gracefully", async () => {
    const result = await Effect.runPromise(
      parseAndNormalize("https://example.com/not-supported").pipe(
        Effect.provide(TestLayer),
        Effect.either
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("UnsupportedServiceError")
    }
  })
})

/*
 * What we learned:
 * 
 * 1. Services can be composed in pipelines
 * 2. Layer.merge combines multiple service providers
 * 3. Effect.gen makes sequential operations readable
 * 4. Error types flow through the pipeline automatically
 * 5. Each service maintains its single responsibility
 */