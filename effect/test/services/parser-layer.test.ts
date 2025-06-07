import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { Parser } from "@/services/parser"
import { ParserLayer } from "@/services/parser-layer"

/*
 * Testing with Layers
 * 
 * This shows the preferred way to use services in Effect:
 * provide them as layers rather than manual Context.make
 */

describe("Parser Layer", () => {
  it("should provide Parser service through a layer", async () => {
    const program = Effect.gen(function* () {
      const parser = yield* Parser
      return yield* parser.parseInput("alice.bsky.social")
    })
    
    // Using Layer is cleaner than Context.make
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(ParserLayer))
    )
    
    expect(result.type).toBe("handle")
  })
  
  it("should handle errors properly", async () => {
    const program = Effect.gen(function* () {
      const parser = yield* Parser
      return yield* parser.parseInput("not-a-valid-input")
    })
    
    // Effect.either converts failure to a data structure
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(ParserLayer),
        Effect.either
      )
    )
    
    expect(result._tag).toBe("Left") // Left = error
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("ParseError")
    }
  })
})