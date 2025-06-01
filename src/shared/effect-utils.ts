import { Effect, pipe } from 'effect';
import { NetworkError, ParseError, ValidationError, CacheError } from './errors-effect.js';

export const sleep = (ms: number) => Effect.sleep(`${ms} millis`);

export const tryCatch = <A>(
  fn: () => A,
  onError: (e: unknown) => NetworkError | ParseError | ValidationError | CacheError,
): Effect.Effect<A, NetworkError | ParseError | ValidationError | CacheError> =>
  Effect.try({ try: fn, catch: onError });

export const tryCatchPromise = <A>(
  fn: () => Promise<A>,
  onError: (e: unknown) => NetworkError | ParseError | ValidationError | CacheError,
): Effect.Effect<A, NetworkError | ParseError | ValidationError | CacheError> =>
  Effect.tryPromise({ try: fn, catch: onError });

export const parseJson = (json: string) =>
  tryCatch(
    () => JSON.parse(json) as unknown,
    (e) => ParseError.make({ message: `Invalid JSON: ${String(e)}`, input: json }),
  );

export const validateUrl = (input: string) =>
  tryCatch(
    () => new URL(input),
    () => ValidationError.make({ message: 'Invalid URL format', field: 'url', value: input }),
  );

export const retryWithBackoff = <A, E>(effect: Effect.Effect<A, E>, maxRetries = 3, baseDelay = 1000) =>
  pipe(effect, Effect.retry({ times: maxRetries }), Effect.delay(`${baseDelay} millis`));

export const tapLog =
  <A, E>(message: string) =>
  (effect: Effect.Effect<A, E>) =>
    pipe(
      effect,
      Effect.tap((value) =>
        Effect.sync(() => {
          console.log(message, value);
        }),
      ),
    );

export const tapError =
  <A, E>(message: string) =>
  (effect: Effect.Effect<A, E>) =>
    pipe(
      effect,
      Effect.tapError((error) =>
        Effect.sync(() => {
          console.error(message, error);
        }),
      ),
    );
