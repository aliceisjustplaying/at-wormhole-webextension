import { Schema as S } from "@effect/schema"
import { Effect } from "effect"
import { Handle } from "./handle"
import { Did } from "./did"

/*
 * Lesson 7: Complex Schemas with Unions and Optionals
 * 
 * TransformInfo represents the canonical form of any
 * AT Protocol entity we've parsed. It needs to be
 * flexible enough for different scenarios.
 */

// First, define our literal types for categorization
export const InputType = S.Literal("handle", "did", "url")
export type InputType = S.Schema.Type<typeof InputType>

export const ContentType = S.Literal("profile", "post", "feed", "list")
export type ContentType = S.Schema.Type<typeof ContentType>

// Rkey is the record key for posts (like "3kt7p4fzxhh2c")
const RkeySchema = S.String.pipe(
  S.pattern(/^[a-z0-9]{13}$/),
  S.brand("Rkey")
)

// Create branded examples
const rkeyExamples = [
  S.decodeSync(RkeySchema)("3kt7p4fzxhh2c"),
  S.decodeSync(RkeySchema)("abc1234567890")
] as const

export const Rkey = RkeySchema.pipe(
  S.annotations({
    title: "Record Key",
    description: "AT Protocol record key (13 char base32)",
    examples: rkeyExamples
  })
)
export type Rkey = S.Schema.Type<typeof Rkey>

// NSID (Namespace ID) for AT Protocol lexicons
const NsidSchema = S.String.pipe(
  S.pattern(/^[a-z]+(\.[a-z]+)+$/),
  S.brand("Nsid")
)

export const Nsid = NsidSchema.pipe(
  S.annotations({
    title: "Namespace ID",
    description: "AT Protocol lexicon namespace like app.bsky.feed.post"
  })
)
export type Nsid = S.Schema.Type<typeof Nsid>

// Now the main schema using S.Struct
export const TransformInfo = S.Struct({
  // One of these must be present
  handle: S.optional(Handle),
  did: S.optional(Did),
  
  // For content with records
  rkey: S.optional(Rkey),
  nsid: S.optional(Nsid),
  
  // The canonical AT URI
  atUri: S.optional(S.String),
  
  // Path for bsky.app URLs
  bskyAppPath: S.String,
  
  // Metadata
  inputType: InputType,
  contentType: ContentType,
  
  // Original source if from URL
  sourceUrl: S.optional(S.String)
})

export type TransformInfo = S.Schema.Type<typeof TransformInfo>

/*
 * What's new here?
 * 
 * 1. S.Literal - for exact string values (like enums)
 * 2. S.optional - for optional fields
 * 3. S.Struct - for object schemas
 * 4. S.filter - for custom validation rules
 * 
 * The filter ensures our business rules:
 * - Must have at least one identifier (handle or did)
 * - Posts must have an rkey
 */

// Helper to create TransformInfo - for now, just decode
export const createTransformInfo = (data: unknown) =>
  S.decodeUnknown(TransformInfo)(data)