import { Data } from 'effect';

/*
 * Phase 3, Lesson 9: Resolver Errors
 *
 * These are the specific error types for the Resolver service.
 * Using Data.TaggedError for discriminated unions.
 */

export class NetworkError extends Data.TaggedError('NetworkError')<{
  url: string;
  method: string;
  cause: unknown;
}> {}

export class HandleNotFoundError extends Data.TaggedError('HandleNotFoundError')<{
  handle: string;
  statusCode: number;
}> {}

export class InvalidHandleError extends Data.TaggedError('InvalidHandleError')<{
  handle: string;
  reason: string;
}> {}

export class RateLimitError extends Data.TaggedError('RateLimitError')<{
  retryAfter?: number;
}> {}

export class InvalidDidDocumentError extends Data.TaggedError('InvalidDidDocumentError')<{
  did: string;
  reason: string;
}> {}

export class DidResolutionError extends Data.TaggedError('DidResolutionError')<{
  did: string;
  statusCode?: number;
  reason: string;
}> {}

export type ResolverError = NetworkError | HandleNotFoundError | InvalidHandleError | RateLimitError | InvalidDidDocumentError | DidResolutionError;
