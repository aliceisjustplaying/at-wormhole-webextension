import { Data, Schema } from 'effect';

export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly message: string;
  readonly url: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {
  static make = (params: { message: string; url: string; status?: number; cause?: unknown }) =>
    new NetworkError(params);
}

export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string;
  readonly input: string;
}> {
  static make = (params: { message: string; input: string }) => new ParseError(params);
}

export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string;
  readonly field: string;
  readonly value: unknown;
}> {
  static make = (params: { message: string; field: string; value: unknown }) => new ValidationError(params);
}

export class CacheError extends Data.TaggedError('CacheError')<{
  readonly message: string;
  readonly operation: string;
  readonly cause?: unknown;
}> {
  static make = (params: { message: string; operation: string; cause?: unknown }) => new CacheError(params);
}

export type WormholeError = NetworkError | ParseError | ValidationError | CacheError;

export const UrlSchema = Schema.String.pipe(
  Schema.filter(
    (s): s is string => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    },
    { message: () => 'Invalid URL format' },
  ),
);

export const DidSchema = Schema.String.pipe(
  Schema.startsWith('did:'),
  Schema.filter((s): s is string => s.includes(':') && s.split(':').length >= 3, {
    message: () => 'Invalid DID format',
  }),
);

export const HandleSchema = Schema.String.pipe(
  Schema.filter((s): s is string => s.includes('.') && !s.startsWith('.') && !s.endsWith('.'), {
    message: () => 'Invalid handle format',
  }),
);
