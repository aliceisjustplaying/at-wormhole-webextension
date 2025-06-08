import { describe, it, expect } from "vitest"
import { Effect, Context } from "effect"
import { UrlParser, UrlParserLive } from "@/services/url-parser"

/*
 * Phase 3, Lesson 8: URL Parser Service
 * 
 * The URL Parser extracts AT Protocol identifiers from service-specific URLs.
 * Each service has its own URL structure that we need to understand.
 * 
 * This service will:
 * - Parse URLs from different AT Protocol services
 * - Extract handles, DIDs, rkeys, and content types
 * - Handle query parameters (like skythread)
 * - Return normalized input for the Normalizer
 */

describe("UrlParser Service", () => {

  describe("bsky.app URLs", () => {
    it("should parse profile URL with handle", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://bsky.app/profile/alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("handle")
      expect(result.value).toBe("alice.bsky.social")
    })

    it("should parse post URL with handle", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://bsky.app/profile/alice.bsky.social/post/3kt7p4fzxhh2c")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("fragment")
      expect(result.value).toBe("alice.bsky.social/post/3kt7p4fzxhh2c")
    })

    it("should parse feed URL", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://bsky.app/profile/why.bsky.team/feed/cozy")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("fragment")
      expect(result.value).toBe("why.bsky.team/feed/cozy")
    })

    it("should parse list URL", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://bsky.app/profile/alice.bsky.social/lists/3l7vfhhfqcz2u")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("fragment")
      expect(result.value).toBe("alice.bsky.social/lists/3l7vfhhfqcz2u")
    })

    it("should parse profile URL with DID", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("did")
      expect(result.value).toBe("did:plc:z72i7hdynmk6r22z27h6tvur")
    })
  })

  describe("deer.social URLs", () => {
    it("should parse post URL", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://deer.social/profile/alice.bsky.social/post/3kt7p4fzxhh2c")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("fragment")
      expect(result.value).toBe("alice.bsky.social/post/3kt7p4fzxhh2c")
    })
  })

  describe("toolify.blue URLs", () => {
    it("should parse profile URL", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://toolify.blue/profile/alice.mosphere.at")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("handle")
      expect(result.value).toBe("alice.mosphere.at")
    })

    it("should parse post URL with DID", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("fragment")
      expect(result.value).toBe("did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p")
    })
  })

  describe("pdsls.dev URLs", () => {
    it("should parse AT URI from URL", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("at-uri")
      expect(result.value).toBe("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
    })
  })

  describe("atp.tools URLs", () => {
    it("should parse malformed AT URI", async () => {
      // atp.tools uses at:/ instead of at://
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://atp.tools/at:/did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("at-uri")
      expect(result.value).toBe("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
    })
  })

  describe("skythread URLs", () => {
    it("should parse skythread query parameters", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("at-uri")
      expect(result.value).toBe("at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23")
    })
  })

  describe("boat.kelinci.net URLs", () => {
    it("should parse DID from query parameter", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("did")
      expect(result.value).toBe("did:plc:5sk4eqsu7byvwokfcnfgywxg")
    })
  })

  describe("clearsky.app URLs", () => {
    it("should parse DID from URL path", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://clearsky.app/did:plc:kkkcb7sys7623hcf7oefcffg/blocked-by")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("did")
      expect(result.value).toBe("did:plc:kkkcb7sys7623hcf7oefcffg")
    })
  })

  describe("plc.directory URLs", () => {
    it("should parse DID from URL path", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://plc.directory/did:plc:kkkcb7sys7623hcf7oefcffg")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive))
        )
      )

      expect(result.kind).toBe("did")
      expect(result.value).toBe("did:plc:kkkcb7sys7623hcf7oefcffg")
    })
  })

  describe("error handling", () => {
    it("should reject non-URLs", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("not a url")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("InvalidUrlError")
      }
    })

    it("should reject unsupported domains", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const parser = yield* UrlParser
          return yield* parser.parseUrl("https://example.com/something")
        }).pipe(
          Effect.provide(Context.make(UrlParser, UrlParserLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("UnsupportedServiceError")
      }
    })
  })
})

/*
 * What we're learning:
 * 
 * 1. Different services have different URL patterns
 * 2. Some services use query parameters (skythread, boat.kelinci)
 * 3. Some services have malformed AT URIs (atp.tools)
 * 4. The parser needs to normalize these into standard formats
 * 5. The output should be ready for the Normalizer service
 */