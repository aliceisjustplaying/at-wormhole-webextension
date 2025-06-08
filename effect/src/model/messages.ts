import { Schema as S } from '@effect/schema';
import { Data } from 'effect';
import { Handle } from './handle';
import { Did } from './did';
import { TransformInfo } from './transform-info';

/*
 * Phase 5, Lesson 14: Message Schema Definitions
 *
 * This defines all message types for communication between
 * the popup and service worker. Using Schema ensures:
 * - Type safety across extension boundaries
 * - Automatic validation of messages
 * - Clear contract between components
 */

// Error types that can occur during message handling
export class MessageError extends Data.TaggedError('MessageError')<{
  reason: string;
  cause?: unknown;
}> {}

// Base message structure with discriminated union
const BaseMessage = S.Struct({
  id: S.String, // Unique request ID for matching responses
  timestamp: S.Number,
});

// Request types
export const TransformRequest = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('transform'),
  input: S.String, // URL, handle, DID, or AT URI
});

export const ResolveHandleRequest = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('resolveHandle'),
  handle: Handle,
});

export const ResolveDidRequest = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('resolveDid'),
  did: Did,
});

export const ClearCacheRequest = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('clearCache'),
});

export const GetCacheStatsRequest = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('getCacheStats'),
});

// Union of all request types
export const Request = S.Union(TransformRequest, ResolveHandleRequest, ResolveDidRequest, ClearCacheRequest, GetCacheStatsRequest);

// Response types
export const TransformResponse = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('transform'),
  result: TransformInfo,
  cached: S.Boolean, // Was this result from cache?
});

export const ResolveHandleResponse = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('resolveHandle'),
  did: Did,
  cached: S.Boolean,
});

export const ResolveDidResponse = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('resolveDid'),
  handle: Handle,
  cached: S.Boolean,
});

export const ClearCacheResponse = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('clearCache'),
  success: S.Boolean,
});

export const CacheStatsResponse = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('getCacheStats'),
  stats: S.Struct({
    size: S.Number,
    hits: S.Number,
    misses: S.Number,
    hitRate: S.Number,
  }),
});

export const ErrorResponse = S.Struct({
  ...BaseMessage.fields,
  type: S.Literal('error'),
  error: S.Struct({
    message: S.String,
    code: S.optional(S.String),
    details: S.optional(S.Unknown),
  }),
});

// Union of all response types
export const Response = S.Union(TransformResponse, ResolveHandleResponse, ResolveDidResponse, ClearCacheResponse, CacheStatsResponse, ErrorResponse);

// Type exports for convenience
export type Request = S.Schema.Type<typeof Request>;
export type Response = S.Schema.Type<typeof Response>;
export type TransformRequest = S.Schema.Type<typeof TransformRequest>;
export type TransformResponse = S.Schema.Type<typeof TransformResponse>;
export type ErrorResponse = S.Schema.Type<typeof ErrorResponse>;

/*
 * What we learned:
 *
 * 1. Schema unions create type-safe discriminated unions
 * 2. Sharing fields with spread operator reduces duplication
 * 3. Branded types (Handle, Did) work seamlessly in messages
 * 4. Optional fields handle cases where data might not exist
 * 5. Clear message contracts prevent runtime errors
 */
