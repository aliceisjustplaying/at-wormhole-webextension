import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { parseDid } from "@/model/did"

/*
 * Lesson 3: Union Types and Pattern Matching
 * 
 * Problem: We have two types of DIDs - did:plc: and did:web:
 * We need to handle both but they have different formats.
 * 
 * Solution: Effect's Schema.Union and pattern matching with Match
 */

describe("Learning Effect: DID Parsing", () => {
  it("should parse a valid did:plc", async () => {
    const result = await Effect.runPromise(
      parseDid("did:plc:z72i7hdynmk6r22z27h6tvur")
    )
    
    expect(result).toEqual({
      value: "did:plc:z72i7hdynmk6r22z27h6tvur",
      type: "did",
      method: "plc"
    })
  })

  it("should parse a valid did:web", async () => {
    const result = await Effect.runPromise(
      parseDid("did:web:example.com")
    )
    
    expect(result).toEqual({
      value: "did:web:example.com", 
      type: "did",
      method: "web"
    })
  })

  it("should reject invalid DID formats", async () => {
    const invalidDids = [
      "not-a-did",
      "did:invalid:method",
      "did:plc:",  // missing identifier
      "did:web:",  // missing domain
      "did:plc:UPPERCASE",  // PLCs are lowercase
      "did:web:with spaces.com"
    ]
    
    for (const did of invalidDids) {
      const result = await Effect.runPromise(
        parseDid(did).pipe(Effect.either)
      )
      expect(result._tag).toBe("Left")
    }
  })
})