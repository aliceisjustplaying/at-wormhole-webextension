import { describe, it, expect } from "vitest"
import { Effect, Context } from "effect"
import { ParseError } from "@effect/schema/ParseResult"
import { Parser, ParserLive } from "@/services/parser"

/*
 * Phase 2, Lesson 4: Creating Services
 * 
 * In Effect, a "service" is a container for related functionality
 * that can be injected as a dependency. This solves the problem
 * of testability and modularity without global state.
 * 
 * Key concepts:
 * 1. Services are identified by unique "tags" (Context.Tag)
 * 2. Services can depend on other services
 * 3. Services are provided through "layers"
 */

describe("Parser Service", () => {
  it("should parse a handle", async () => {
    // To use a service, we need to:
    // 1. Access it with its tag
    // 2. Provide an implementation
    
    const program = Effect.gen(function* () {
      // Get the Parser service from the context
      const parser = yield* Parser
      
      // Use it to parse input
      return yield* parser.parseInput("alice.bsky.social")
    })
    
    // Run the program with the live implementation
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(Context.make(Parser, ParserLive))
      )
    )
    
    // It should recognize this as a handle
    expect(result.type).toBe("handle")
    expect(result.value).toBe("alice.bsky.social")
  })

  it("should parse a DID", async () => {
    const program = Parser.pipe(
      Effect.flatMap(parser => 
        parser.parseInput("did:plc:z72i7hdynmk6r22z27h6tvur")
      )
    )
    
    const result = await Effect.runPromise(
      Effect.provide(program, Context.make(Parser, ParserLive))
    )
    
    expect(result.type).toBe("did")
    // Type guard to access method property
    if (result.type === "did") {
      expect(result.method).toBe("plc")
    }
  })

  /*
   * Lesson 5: Dependency Injection
   * 
   * Notice how we "provide" the ParserLive implementation?
   * This means we can easily swap it for a mock in tests!
   */
  
  it("should use a mock implementation", async () => {
    // Create a mock that always returns a specific handle
    const ParserMock = Parser.of({
      parseInput: (_input: string) => 
        Effect.succeed({
          type: "handle" as const,
          value: "mock.handle" as any // We're cheating on the brand for the mock
        })
    })
    
    const program = Effect.gen(function* () {
      const parser = yield* Parser
      return yield* parser.parseInput("anything")
    })
    
    const result = await Effect.runPromise(
      Effect.provide(program, Context.make(Parser, ParserMock))
    )
    
    // No matter what input, we get our mock response
    expect(result.value).toBe("mock.handle")
  })
})