import { Context, Effect, Data } from "effect"
import { Schema as S } from "@effect/schema"
import { TransformInfo, createTransformInfo } from "@/model/transform-info"
import { Handle, parseHandle } from "@/model/handle"
import { Did, parseDid } from "@/model/did"
import { Rkey } from "@/model/transform-info"
import { Nsid } from "@/model/transform-info"

/*
 * Phase 3: Normalizer Service Implementation
 * 
 * The Normalizer transforms any valid AT Protocol input
 * into a normalized TransformInfo structure.
 */

// Define our error types using Data.TaggedEnum
export class InvalidInputError extends Data.TaggedError("InvalidInputError")<{
  input: string
  reason: string
}> {}

export class InvalidAtUriError extends Data.TaggedError("InvalidAtUriError")<{
  uri: string
  reason: string
}> {}

export type NormalizeError = InvalidInputError | InvalidAtUriError

// NSID shortcuts mapping
const NSID_SHORTCUTS: Record<string, string> = {
  'p': 'app.bsky.feed.post',
  'f': 'app.bsky.feed.generator',
  'l': 'app.bsky.graph.list',
}

// Service interface
export interface NormalizerService {
  normalize: (input: string) => Effect.Effect<TransformInfo, NormalizeError>
}

// Service tag
export class Normalizer extends Context.Tag("Normalizer")<
  Normalizer,
  NormalizerService
>() {}

// Helper to detect input type
const detectInputType = (input: string): "at-uri" | "did" | "handle" | "fragment" => {
  if (input.startsWith("at://")) return "at-uri"
  if (input.includes("/")) return "fragment"
  if (input.startsWith("did:")) return "did"
  return "handle"
}

// Parse AT URI into components
const parseAtUri = (uri: string) => Effect.gen(function* () {
  const match = uri.match(/^at:\/\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/)
  
  if (!match) {
    return yield* Effect.fail(new InvalidAtUriError({
      uri,
      reason: "Invalid AT URI format"
    }))
  }

  const [, identifier, nsidOrShortcut, rkey] = match
  
  if (!identifier) {
    return yield* Effect.fail(new InvalidAtUriError({
      uri,
      reason: "Missing identifier in AT URI"
    }))
  }
  
  // Resolve NSID shortcut if present
  const nsid = nsidOrShortcut 
    ? (NSID_SHORTCUTS[nsidOrShortcut] || nsidOrShortcut)
    : undefined

  return { identifier, nsid, rkey }
})

// Build bskyAppPath based on content type
const buildBskyAppPath = (
  identifier: string,
  contentType: string,
  rkey?: string
): string => {
  const base = `/profile/${identifier}`
  
  switch (contentType) {
    case "post":
      return rkey ? `${base}/post/${rkey}` : base
    case "feed":
      return rkey ? `${base}/feed/${rkey}` : base
    case "list":
      return rkey ? `${base}/lists/${rkey}` : base
    default:
      return base
  }
}

// Determine content type from NSID
const getContentType = (nsid?: string, hasRkey?: boolean): string => {
  if (!nsid) return "profile"
  
  switch (nsid) {
    case "app.bsky.feed.post":
      return "post"
    case "app.bsky.feed.generator":
      return "feed"
    case "app.bsky.graph.list":
      return "list"
    default:
      return hasRkey ? "post" : "profile"
  }
}

// Service implementation
export const NormalizerLive: NormalizerService = {
  normalize: (input: string) => Effect.gen(function* () {
    // Validate input
    const trimmed = input.trim()
    if (!trimmed) {
      return yield* Effect.fail(new InvalidInputError({
        input,
        reason: "Input cannot be empty"
      }))
    }

    // Remove @ prefix if present
    const cleaned = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed
    const inputType = detectInputType(cleaned)

    let handle: Handle | undefined
    let did: Did | undefined
    let rkey: string | undefined
    let nsid: string | undefined
    let atUri: string | undefined

    switch (inputType) {
      case "handle": {
        // Simple handle
        const parsed = yield* parseHandle(cleaned).pipe(
          Effect.mapError(() => new InvalidInputError({
            input: cleaned,
            reason: "Invalid handle format"
          }))
        )
        handle = parsed.value
        atUri = `at://${handle}`
        break
      }

      case "did": {
        // Simple DID
        const parsed = yield* parseDid(cleaned).pipe(
          Effect.mapError(() => new InvalidInputError({
            input: cleaned,
            reason: "Invalid DID format"
          }))
        )
        did = parsed.value
        atUri = `at://${did}`
        break
      }

      case "at-uri": {
        // Full AT URI
        const { identifier, nsid: parsedNsid, rkey: parsedRkey } = yield* parseAtUri(cleaned)
        
        // Parse identifier as handle or DID
        if (identifier.startsWith("did:")) {
          const parsed = yield* parseDid(identifier).pipe(
            Effect.mapError(() => new InvalidAtUriError({
              uri: cleaned,
              reason: "Invalid DID in AT URI"
            }))
          )
          did = parsed.value
        } else {
          const parsed = yield* parseHandle(identifier).pipe(
            Effect.mapError(() => new InvalidAtUriError({
              uri: cleaned,
              reason: "Invalid handle in AT URI"
            }))
          )
          handle = parsed.value
        }

        nsid = parsedNsid
        rkey = parsedRkey
        atUri = cleaned
        break
      }

      case "fragment": {
        // Handle fragment like "alice.bsky.social/post/123" or "did:plc:xyz/post/123"
        const parts = cleaned.split("/")
        
        if (parts.length !== 3 || !parts[0]) {
          return yield* Effect.fail(new InvalidInputError({
            input: cleaned,
            reason: "Invalid fragment format"
          }))
        }
        
        // Parse the identifier part (handle or DID)
        if (parts[0].startsWith("did:")) {
          const parsed = yield* parseDid(parts[0]).pipe(
            Effect.mapError(() => new InvalidInputError({
              input: cleaned,
              reason: "Invalid DID in fragment"
            }))
          )
          did = parsed.value
        } else {
          const parsed = yield* parseHandle(parts[0]).pipe(
            Effect.mapError(() => new InvalidInputError({
              input: cleaned,
              reason: "Invalid handle in fragment"
            }))
          )
          handle = parsed.value
        }

        // Parse the rest of the path
        const [, contentPath, id] = parts
          
          // Map content path to NSID
          switch (contentPath) {
            case "post":
              nsid = "app.bsky.feed.post"
              break
            case "feed":
              nsid = "app.bsky.feed.generator"
              break
            case "lists":
            case "list":
              nsid = "app.bsky.graph.list"
              break
            default:
              return yield* Effect.fail(new InvalidInputError({
                input: cleaned,
                reason: `Unknown content type: ${contentPath}`
              }))
          }
          
        rkey = id
        const identifier = handle || did!
        atUri = `at://${identifier}/${nsid}/${rkey}`
        break
      }
    }

    // Determine content type
    const contentType = getContentType(nsid, !!rkey)
    
    // Build bskyAppPath
    const identifier = handle || did!
    const bskyAppPath = buildBskyAppPath(identifier, contentType, rkey)

    // Validate rkey and nsid if present
    let validatedRkey: S.Schema.Type<typeof Rkey> | undefined
    let validatedNsid: S.Schema.Type<typeof Nsid> | undefined

    if (rkey) {
      validatedRkey = yield* S.decodeUnknown(Rkey)(rkey).pipe(
        Effect.mapError(() => new InvalidInputError({
          input,
          reason: "Invalid rkey format"
        }))
      )
    }

    if (nsid) {
      validatedNsid = yield* S.decodeUnknown(Nsid)(nsid).pipe(
        Effect.mapError(() => new InvalidInputError({
          input,
          reason: "Invalid NSID format"
        }))
      )
    }

    // Create TransformInfo
    const info = yield* createTransformInfo({
      handle,
      did,
      rkey: validatedRkey,
      nsid: validatedNsid,
      atUri,
      bskyAppPath,
      inputType: inputType === "fragment" ? "handle" : inputType === "at-uri" ? "url" : inputType,
      contentType
    }).pipe(
      Effect.mapError(() => new InvalidInputError({
        input,
        reason: "Failed to create TransformInfo"
      }))
    )

    return info
  })
}

/*
 * What we learned:
 * 
 * 1. Data.TaggedError for creating error types
 * 2. Effect.gen for sequential operations
 * 3. Pattern matching on input types
 * 4. Error mapping with mapError
 * 5. Service implementation with dependency injection
 */