import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { parseHandle } from "@/model/handle"

/*
 * Lesson 1: Branded Types with Schema
 * 
 * Problem: In regular TypeScript, a string is just a string.
 * We can't distinguish between a valid handle and any random string.
 * 
 * Solution: Effect's Schema lets us create "branded types" - 
 * types that look like strings but carry extra compile-time guarantees.
 */

describe("Learning Effect: Handle Parsing", () => {
  it("should parse a valid handle", async () => {
    // Effect.runPromise runs an Effect and returns a Promise
    // This is how we bridge Effect world to test world
    const result = await Effect.runPromise(
      parseHandle("alice.bsky.social")
    )
    
    expect(result).toEqual({
      value: "alice.bsky.social",
      type: "handle"
    })
  })

  it("should fail on invalid handle", async () => {
    // Lesson 2: Error handling in Effect
    // 
    // In regular TypeScript, we'd use try/catch and hope for the best.
    // With Effect, errors are part of the type signature!
    
    // Effect.runPromise throws on failure, so we need to handle it
    await expect(
      Effect.runPromise(parseHandle("not a handle"))
    ).rejects.toThrow()
    
    // But that's not very informative. Let's see the actual error...
  })

  it("should provide detailed error information", async () => {
    // Better approach: use Effect.either to convert to Either type
    const result = await Effect.runPromise(
      parseHandle("not@valid").pipe(Effect.either)
    )
    
    // Either has two cases: Right (success) or Left (failure)
    expect(result._tag).toBe("Left")
    
    // The error contains detailed information about what went wrong
    if (result._tag === "Left") {
      // TypeScript knows this is the error case!
      const error = result.left
      
      // Schema errors include the actual validation failure
      expect(error).toBeDefined()
      console.log("Error details:", error)
    }
  })

  it("should validate various handle formats", async () => {
    // Test various valid handles
    const validHandles = [
      "alice.bsky.social",
      "bob.test.example.com",
      "user123.domain.co.uk",
      "hello-world.example.com"
    ]
    
    for (const handle of validHandles) {
      const result = await Effect.runPromise(parseHandle(handle))
      expect(result.value).toBe(handle)
    }
  })

  it("should reject invalid handle formats", async () => {
    // Test various invalid formats
    const invalidHandles = [
      "no-dots",
      ".starts-with-dot",
      "ends-with-dot.",
      "has spaces.com",
      "special@chars.com",
      "under_scores.com",
      ""
    ]
    
    for (const handle of invalidHandles) {
      const result = await Effect.runPromise(
        parseHandle(handle).pipe(Effect.either)
      )
      expect(result._tag).toBe("Left")
    }
  })
})