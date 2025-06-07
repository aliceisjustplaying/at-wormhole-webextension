import { Context, Effect } from "effect"
import { ParseError } from "@effect/schema/ParseResult"
import { Handle, parseHandle } from "@/model/handle"
import { Did, parseDid } from "@/model/did"

/*
 * Lesson 4: Services with Context.Tag
 * 
 * A service in Effect has three parts:
 * 1. An interface (what it can do)
 * 2. A tag (how to identify it)
 * 3. An implementation (how it does it)
 */

// Step 1: Define the service interface
export interface ParserService {
  // For now, just one method that can parse handles or DIDs
  parseInput: (input: string) => Effect.Effect<
    | { type: "handle"; value: Handle }
    | { type: "did"; value: Did; method: "plc" | "web" },
    ParseError
  >
}

// Step 2: Create a unique tag for this service
export class Parser extends Context.Tag("Parser")<
  Parser,
  ParserService
>() {}

/*
 * What's Context.Tag?
 * 
 * It's like a unique ID for your service that TypeScript
 * can track. When you need a Parser, you ask for it by
 * this tag, and Effect ensures you get one.
 * 
 * The string "Parser" is for debugging - it shows up in
 * error messages. The type parameters tell TypeScript
 * what interface this tag represents.
 */

// Step 3: Create an implementation
export const ParserLive = Parser.of({
  parseInput: (input: string) => {
    // Try parsing as handle first, then as DID
    return parseHandle(input).pipe(
      Effect.orElse(() => parseDid(input))
    )
  }
})

/*
 * Next up: We'll learn how to "provide" this service
 * to code that needs it, and how to test with mock
 * implementations.
 */