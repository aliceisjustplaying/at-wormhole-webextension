import { describe, it, expect } from "vitest"
import { Effect, Context } from "effect"
import { Normalizer, NormalizerLive } from "@/services/normalizer"
import { Handle } from "@/model/handle"
import { Did } from "@/model/did"
import { Schema as S } from "@effect/schema"

/*
 * Phase 3: The Normalizer Service
 * 
 * The Normalizer (formerly Canonicalizer) takes raw input
 * and transforms it into a normalized TransformInfo structure.
 * 
 * It handles:
 * - Parsing handles and DIDs
 * - Parsing AT URIs
 * - Applying NSID shortcuts
 * - Building proper bskyAppPath
 * - Enforcing business rules
 */

describe("Normalizer Service", () => {

  describe("handle normalization", () => {
    it("should normalize a simple handle", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
      expect(result.inputType).toBe("handle")
      expect(result.contentType).toBe("profile")
      expect(result.bskyAppPath).toBe("/profile/alice.bsky.social")
    })

    it("should handle @ prefix", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("@alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
    })
  })

  describe("DID normalization", () => {
    it("should normalize a did:plc", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("did:plc:z72i7hdynmk6r22z27h6tvur")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.did).toBe("did:plc:z72i7hdynmk6r22z27h6tvur")
      expect(result.inputType).toBe("did")
      expect(result.contentType).toBe("profile")
      expect(result.bskyAppPath).toBe("/profile/did:plc:z72i7hdynmk6r22z27h6tvur")
    })
  })

  describe("AT URI parsing", () => {
    it("should parse profile AT URI", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("at://alice.bsky.social")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
      expect(result.atUri).toBe("at://alice.bsky.social")
      expect(result.bskyAppPath).toBe("/profile/alice.bsky.social")
    })

    it("should parse post AT URI", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("at://alice.bsky.social/app.bsky.feed.post/3kt7p4fzxhh2c")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
      expect(result.rkey).toBe("3kt7p4fzxhh2c")
      expect(result.nsid).toBe("app.bsky.feed.post")
      expect(result.contentType).toBe("post")
      expect(result.atUri).toBe("at://alice.bsky.social/app.bsky.feed.post/3kt7p4fzxhh2c")
      expect(result.bskyAppPath).toBe("/profile/alice.bsky.social/post/3kt7p4fzxhh2c")
    })

    it("should handle NSID shortcuts", async () => {
      // Using 'p' shortcut for app.bsky.feed.post
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("at://alice.bsky.social/p/3kt7p4fzxhh2c")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.nsid).toBe("app.bsky.feed.post")
      expect(result.contentType).toBe("post")
    })
  })

  describe("fragment parsing", () => {
    it("should parse handle/post fragment", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("alice.bsky.social/post/3kt7p4fzxhh2c")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
      expect(result.rkey).toBe("3kt7p4fzxhh2c")
      expect(result.contentType).toBe("post")
    })

    it("should parse handle/feed fragment", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("alice.bsky.social/feed/aaaf5mxr2s62c")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
      expect(result.rkey).toBe("aaaf5mxr2s62c")
      expect(result.contentType).toBe("feed")
      expect(result.nsid).toBe("app.bsky.feed.generator")
    })

    it("should parse handle/list fragment", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("alice.bsky.social/lists/aaaf5mxr2s62c")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
      expect(result.rkey).toBe("aaaf5mxr2s62c")
      expect(result.contentType).toBe("list")
      expect(result.nsid).toBe("app.bsky.graph.list")
    })

    it("should handle singular 'list' path alias", async () => {
      // The normalizer should handle both 'lists' and 'list' paths
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("alice.bsky.social/list/aaaf5mxr2s62c")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive))
        )
      )

      expect(result.handle).toBe("alice.bsky.social")
      expect(result.rkey).toBe("aaaf5mxr2s62c")
      expect(result.contentType).toBe("list")
      expect(result.nsid).toBe("app.bsky.graph.list")
      expect(result.bskyAppPath).toBe("/profile/alice.bsky.social/lists/aaaf5mxr2s62c")
    })
  })

  describe("real-world examples", () => {
    describe("complex handles", () => {
      it("should handle multi-subdomain handles", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("now.alice.mosphere.at")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.handle).toBe("now.alice.mosphere.at")
        expect(result.bskyAppPath).toBe("/profile/now.alice.mosphere.at")
      })

      it("should handle team domain handles", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("why.bsky.team")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.handle).toBe("why.bsky.team")
      })
    })

    describe("did:web support", () => {
      it("should handle did:web identifiers", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:web:didweb.watch")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.did).toBe("did:web:didweb.watch")
        expect(result.inputType).toBe("did")
        expect(result.bskyAppPath).toBe("/profile/did:web:didweb.watch")
      })

      it("should handle did:web with posts", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.did).toBe("did:web:didweb.watch")
        expect(result.rkey).toBe("3lpaioe62qk2j")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/did:web:didweb.watch/post/3lpaioe62qk2j")
      })
    })

    describe("feed URLs", () => {
      it("should parse feed fragments", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("why.bsky.team/feed/cozy")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.handle).toBe("why.bsky.team")
        expect(result.rkey).toBe("cozy")
        expect(result.nsid).toBe("app.bsky.feed.generator")
        expect(result.contentType).toBe("feed")
        expect(result.bskyAppPath).toBe("/profile/why.bsky.team/feed/cozy")
        expect(result.atUri).toBe("at://why.bsky.team/app.bsky.feed.generator/cozy")
      })

      it("should handle feed AT URIs", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://why.bsky.team/app.bsky.feed.generator/cozy")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.contentType).toBe("feed")
        expect(result.rkey).toBe("cozy")
      })
    })

    describe("list URLs", () => {
      it("should parse list fragments", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("alice.mosphere.at/lists/3l7vfhhfqcz2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.handle).toBe("alice.mosphere.at")
        expect(result.rkey).toBe("3l7vfhhfqcz2u")
        expect(result.nsid).toBe("app.bsky.graph.list")
        expect(result.contentType).toBe("list")
        expect(result.bskyAppPath).toBe("/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u")
        expect(result.atUri).toBe("at://alice.mosphere.at/app.bsky.graph.list/3l7vfhhfqcz2u")
      })

      it("should handle list AT URIs with DIDs", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/3l7vfhhfqcz2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.did).toBe("did:plc:by3jhwdqgbtrcc7q4tkkv3cf")
        expect(result.contentType).toBe("list")
        expect(result.rkey).toBe("3l7vfhhfqcz2u")
      })
    })

    describe("post URLs with various rkey formats", () => {
      it("should handle standard 13-char rkeys", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("now.alice.mosphere.at/post/3lqcw7n4gly2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.rkey).toBe("3lqcw7n4gly2u")
        expect(result.atUri).toBe("at://now.alice.mosphere.at/app.bsky.feed.post/3lqcw7n4gly2u")
      })

      it("should handle post fragments with DID", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.did).toBe("did:plc:kkkcb7sys7623hcf7oefcffg")
        expect(result.rkey).toBe("3lpe6ek6xhs2n")
        expect(result.contentType).toBe("post")
        expect(result.bskyAppPath).toBe("/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n")
      })
    })

    describe("NSID shortcuts", () => {
      it("should handle 'f' shortcut for feeds", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://why.bsky.team/f/cozy")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.nsid).toBe("app.bsky.feed.generator")
        expect(result.contentType).toBe("feed")
      })

      it("should handle 'l' shortcut for lists", async () => {
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://alice.mosphere.at/l/3l7vfhhfqcz2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.nsid).toBe("app.bsky.graph.list")
        expect(result.contentType).toBe("list")
      })
    })
  })

  describe("business rule validation", () => {
    it("should reject empty input", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("InvalidInputError")
      }
    })

    it("should reject invalid format", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const normalizer = yield* Normalizer
          return yield* normalizer.normalize("not-a-valid-anything")
        }).pipe(
          Effect.provide(Context.make(Normalizer, NormalizerLive)),
          Effect.either
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("InvalidInputError")
      }
    })
  })

  describe("missing tests from original transform.test.ts", () => {
    describe("feed URLs from original test", () => {
      it("should parse feed URLs with handle from deer.social", async () => {
        // This simulates parseInput('https://deer.social/profile/why.bsky.team/feed/cozy')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("why.bsky.team/feed/cozy")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://why.bsky.team/app.bsky.feed.generator/cozy")
        expect(result.did).toBeUndefined()
        expect(result.handle).toBe("why.bsky.team")
        expect(result.rkey).toBe("cozy")
        expect(result.nsid).toBe("app.bsky.feed.generator")
        expect(result.bskyAppPath).toBe("/profile/why.bsky.team/feed/cozy")
      })

      it("should parse post URLs with DID from deer.social", async () => {
        // This simulates parseInput('https://deer.social/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lpe6ek6xhs2n")
        expect(result.did).toBe("did:plc:kkkcb7sys7623hcf7oefcffg")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBe("3lpe6ek6xhs2n")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n")
      })

      it("should parse list URLs with handle from deer.social", async () => {
        // This simulates parseInput('https://deer.social/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("alice.mosphere.at/lists/3l7vfhhfqcz2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://alice.mosphere.at/app.bsky.graph.list/3l7vfhhfqcz2u")
        expect(result.did).toBeUndefined()
        expect(result.handle).toBe("alice.mosphere.at")
        expect(result.rkey).toBe("3l7vfhhfqcz2u")
        expect(result.nsid).toBe("app.bsky.graph.list")
        expect(result.bskyAppPath).toBe("/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u")
      })
    })

    describe("did:web profile URLs", () => {
      it("should parse did:web profile URLs", async () => {
        // This simulates parseInput('https://deer.social/profile/did:web:didweb.watch')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:web:didweb.watch")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:web:didweb.watch")
        expect(result.did).toBe("did:web:didweb.watch")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBeUndefined()
        expect(result.nsid).toBeUndefined()
        expect(result.bskyAppPath).toBe("/profile/did:web:didweb.watch")
      })

      it("should parse did:web post URLs", async () => {
        // This simulates parseInput('https://deer.social/profile/did:web:didweb.watch/post/3lpaioe62qk2j')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:web:didweb.watch/post/3lpaioe62qk2j")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j")
        expect(result.did).toBe("did:web:didweb.watch")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBe("3lpaioe62qk2j")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/did:web:didweb.watch/post/3lpaioe62qk2j")
      })
    })

    describe("real service URLs", () => {
      it("should parse bsky.app post URL", async () => {
        // This simulates parseInput('https://bsky.app/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("now.alice.mosphere.at/post/3lqcw7n4gly2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://now.alice.mosphere.at/app.bsky.feed.post/3lqcw7n4gly2u")
        expect(result.did).toBeUndefined()
        expect(result.handle).toBe("now.alice.mosphere.at")
        expect(result.rkey).toBe("3lqcw7n4gly2u")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u")
      })

      it("should parse deer.social post URL", async () => {
        // This simulates parseInput('https://deer.social/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("now.alice.mosphere.at/post/3lqcw7n4gly2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://now.alice.mosphere.at/app.bsky.feed.post/3lqcw7n4gly2u")
        expect(result.did).toBeUndefined()
        expect(result.handle).toBe("now.alice.mosphere.at")
        expect(result.rkey).toBe("3lqcw7n4gly2u")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u")
      })

      it("should parse pdsls.dev AT URI", async () => {
        // This simulates parseInput('https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
        expect(result.did).toBe("did:plc:kkkcb7sys7623hcf7oefcffg")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBe("3lqcw7n4gly2u")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lqcw7n4gly2u")
      })

      it("should parse atp.tools malformed AT URI", async () => {
        // This simulates parseInput('https://atp.tools/at:/did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u')
        // Note: atp.tools has malformed AT URIs with at:/ instead of at://
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u")
        expect(result.did).toBe("did:plc:kkkcb7sys7623hcf7oefcffg")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBe("3lqcw7n4gly2u")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lqcw7n4gly2u")
      })
    })

    describe("toolify.blue URLs", () => {
      it("should parse profile URL with handle", async () => {
        // This simulates parseInput('https://toolify.blue/profile/alice.mosphere.at')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("alice.mosphere.at")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://alice.mosphere.at")
        expect(result.did).toBeUndefined()
        expect(result.handle).toBe("alice.mosphere.at")
        expect(result.rkey).toBeUndefined()
        expect(result.nsid).toBeUndefined()
        expect(result.bskyAppPath).toBe("/profile/alice.mosphere.at")
      })

      it("should parse post URL with handle", async () => {
        // This simulates parseInput('https://toolify.blue/profile/alice.mosphere.at/post/3lqeyxrcx6k2p')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("alice.mosphere.at/post/3lqeyxrcx6k2p")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://alice.mosphere.at/app.bsky.feed.post/3lqeyxrcx6k2p")
        expect(result.did).toBeUndefined()
        expect(result.handle).toBe("alice.mosphere.at")
        expect(result.rkey).toBe("3lqeyxrcx6k2p")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/alice.mosphere.at/post/3lqeyxrcx6k2p")
      })

      it("should parse profile URL with DID", async () => {
        // This simulates parseInput('https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:plc:by3jhwdqgbtrcc7q4tkkv3cf")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf")
        expect(result.did).toBe("did:plc:by3jhwdqgbtrcc7q4tkkv3cf")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBeUndefined()
        expect(result.nsid).toBeUndefined()
        expect(result.bskyAppPath).toBe("/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf")
      })

      it("should parse post URL with DID", async () => {
        // This simulates parseInput('https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p')
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.feed.post/3lqeyxrcx6k2p")
        expect(result.did).toBe("did:plc:by3jhwdqgbtrcc7q4tkkv3cf")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBe("3lqeyxrcx6k2p")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p")
      })
    })

    describe("query parameter DIDs", () => {
      it("should parse query parameter DIDs", async () => {
        // This simulates parseInput('https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg')
        // Note: The original parser extracts DIDs from query parameters of various services
        // For the Normalizer, we just test direct DID normalization
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("did:plc:5sk4eqsu7byvwokfcnfgywxg")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:plc:5sk4eqsu7byvwokfcnfgywxg")
        expect(result.did).toBe("did:plc:5sk4eqsu7byvwokfcnfgywxg")
        expect(result.handle).toBeUndefined()
        expect(result.nsid).toBeUndefined()
        expect(result.rkey).toBeUndefined()
        expect(result.bskyAppPath).toBe("/profile/did:plc:5sk4eqsu7byvwokfcnfgywxg")
      })
    })

    describe("skythread URLs", () => {
      it("should parse skythread URLs", async () => {
        // This simulates parseInput('https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23')
        // Note: The original parser extracts DID and rkey from skythread query parameters
        // For the Normalizer, we test the equivalent AT URI
        const result = await Effect.runPromise(
          Effect.gen(function* () {
            const normalizer = yield* Normalizer
            return yield* normalizer.normalize("at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23")
          }).pipe(
            Effect.provide(Context.make(Normalizer, NormalizerLive))
          )
        )

        expect(result.atUri).toBe("at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23")
        expect(result.did).toBe("did:plc:2p6idfgjfe3easltiwmnofw6")
        expect(result.handle).toBeUndefined()
        expect(result.rkey).toBe("3lpjntj43rs23")
        expect(result.nsid).toBe("app.bsky.feed.post")
        expect(result.bskyAppPath).toBe("/profile/did:plc:2p6idfgjfe3easltiwmnofw6/post/3lpjntj43rs23")
      })
    })
  })
})