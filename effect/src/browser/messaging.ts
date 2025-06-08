import { Context, Effect, Data, Layer, Fiber, Ref } from 'effect';
import { Schema as S, ParseResult } from '@effect/schema';
import { Request, Response as MessageResponse, ErrorResponse } from '@/model/messages';

/*
 * Phase 5, Lesson 14: Message Passing Service
 *
 * This service provides type-safe message passing between
 * extension components using chrome.runtime.sendMessage.
 *
 * Key features:
 * - Request/response correlation with unique IDs
 * - Automatic timeout handling
 * - Schema validation on both ends
 * - Error propagation across boundaries
 */

// Error types
export class MessagingError extends Data.TaggedError('MessagingError')<{
  operation: 'send' | 'receive' | 'timeout';
  reason: string;
  cause?: unknown;
}> {}

// Message with correlation ID
interface PendingMessage {
  id: string;
  resolve: (response: MessageResponse) => void;
  reject: (error: MessagingError) => void;
  timeoutFiber?: Fiber.RuntimeFiber<void>;
}

// Service interface
export interface MessagingService {
  // Send a request and wait for response
  sendRequest: (request: Request) => Effect.Effect<MessageResponse, MessagingError | ParseResult.ParseError>;

  // Listen for incoming requests (for service worker)
  onRequest: (handler: (request: Request) => Effect.Effect<MessageResponse>) => Effect.Effect<void, MessagingError>;

  // Send a response (for service worker)
  sendResponse: (response: MessageResponse) => Effect.Effect<void, MessagingError | ParseResult.ParseError>;
}

// Service tag
export class Messaging extends Context.Tag('Messaging')<Messaging, MessagingService>() {}

// Helper to create client implementation
const makeMessagingClient = (): Effect.Effect<MessagingService> =>
  Effect.gen(function* () {
    // Track pending requests
    const pendingRef = yield* Ref.make<Map<string, PendingMessage>>(new Map());

    // Track if listener is set up
    const listenerSetupRef = yield* Ref.make(false);

    // Setup response listener
    const setupListener = (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const isSetup = yield* Ref.get(listenerSetupRef);
        if (isSetup) return;

        yield* Ref.set(listenerSetupRef, true);

        const listener = (message: unknown): void => {
          Effect.gen(function* () {
            // Try to parse as MessageResponse
            const parseResult = yield* S.decodeUnknown(MessageResponse)(message).pipe(Effect.either);

            if (parseResult._tag === 'Right') {
              const response = parseResult.right;
              const pending = yield* Ref.get(pendingRef);
              const pendingMessage = pending.get(response.id);

              if (pendingMessage) {
                // Cancel timeout
                if (pendingMessage.timeoutFiber) {
                  yield* Fiber.interrupt(pendingMessage.timeoutFiber);
                }

                // Remove from pending
                yield* Ref.update(pendingRef, (map) => {
                  const newMap = new Map(map);
                  newMap.delete(response.id);
                  return newMap;
                });

                // Resolve promise
                pendingMessage.resolve(response);
              }
            }
          }).pipe(
            Effect.catchAll(() => Effect.void), // Ignore parse errors for non-response messages
            Effect.runFork,
          );
        };

        chrome.runtime.onMessage.addListener(listener);
      });

    const sendRequest = (request: Request): Effect.Effect<MessageResponse, MessagingError | ParseResult.ParseError> => {
      return Effect.gen(function* () {
        // Ensure listener is set up
        yield* setupListener();

        // Set default timeout (30 seconds)
        const TIMEOUT_MS = 30000;

        // Create promise for response
        const responsePromise = Effect.async<MessageResponse, MessagingError>((resume) => {
          const pending: PendingMessage = {
            id: request.id,
            resolve: (response) => {
              resume(Effect.succeed(response));
            },
            reject: (error) => {
              resume(Effect.fail(error));
            },
          };

          // Add to pending map
          Effect.gen(function* () {
            yield* Ref.update(pendingRef, (map) => {
              const newMap = new Map(map);
              newMap.set(request.id, pending);
              return newMap;
            });

            // Set timeout
            const timeoutFiber = yield* Effect.gen(function* () {
              yield* Effect.sleep(TIMEOUT_MS);
              yield* Ref.update(pendingRef, (map) => {
                const newMap = new Map(map);
                newMap.delete(request.id);
                return newMap;
              });
              pending.reject(
                new MessagingError({
                  operation: 'timeout',
                  reason: `Request ${request.id} timed out after ${TIMEOUT_MS}ms`,
                }),
              );
            }).pipe(Effect.fork);

            pending.timeoutFiber = timeoutFiber;
          }).pipe(Effect.runSync);
        });

        // Encode and send request
        const encoded = yield* S.encode(Request)(request);

        yield* Effect.async((resume: (effect: Effect.Effect<void, MessagingError>) => void) => {
          try {
            chrome.runtime.sendMessage(encoded, () => {
              if (chrome.runtime.lastError) {
                resume(
                  Effect.fail(
                    new MessagingError({
                      operation: 'send',
                      reason: chrome.runtime.lastError.message ?? 'Failed to send message',
                    }),
                  ),
                );
              } else {
                resume(Effect.void);
              }
            });
          } catch (cause) {
            resume(
              Effect.fail(
                new MessagingError({
                  operation: 'send',
                  reason: 'Failed to send message',
                  cause,
                }),
              ),
            );
          }
        });

        // Wait for response
        return yield* responsePromise;
      });
    };

    return {
      sendRequest,
      onRequest: () =>
        Effect.fail(
          new MessagingError({
            operation: 'receive',
            reason: 'Client cannot handle requests',
          }),
        ),
      sendResponse: () =>
        Effect.fail(
          new MessagingError({
            operation: 'send',
            reason: 'Client cannot send responses',
          }),
        ),
    };
  });

// Layer for client-side messaging
export const MessagingClientLive = Layer.effect(Messaging, makeMessagingClient());

// Helper to create server implementation
const makeMessagingServer = (): Effect.Effect<MessagingService> => {
  const sendResponse = (response: MessageResponse): Effect.Effect<void, MessagingError | ParseResult.ParseError> =>
    Effect.gen(function* () {
      const encoded = yield* S.encode(MessageResponse)(response);

      // In service worker, we need to keep track of the sender
      // This would typically be stored when receiving the request
      // For now, we'll broadcast to all tabs
      const tabs = yield* Effect.tryPromise({
        try: () => chrome.tabs.query({}),
        catch: (cause) =>
          new MessagingError({
            operation: 'send',
            reason: 'Failed to query tabs',
            cause,
          }),
      });

      yield* Effect.forEach(tabs, (tab) =>
        Effect.async((resume: (effect: Effect.Effect<void, MessagingError>) => void) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, encoded, () => {
              if (chrome.runtime.lastError) {
                resume(
                  Effect.fail(
                    new MessagingError({
                      operation: 'send',
                      reason: chrome.runtime.lastError.message ?? 'Failed to send response',
                    }),
                  ),
                );
              } else {
                resume(Effect.void);
              }
            });
          } else {
            resume(Effect.void);
          }
        }),
      );
    });

  const onRequest = (handler: (request: Request) => Effect.Effect<MessageResponse>): Effect.Effect<void, MessagingError> =>
    Effect.async<never>(() => {
      const listener = (message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void): boolean => {
        // Handle the request
        void Effect.gen(function* () {
          const request = yield* S.decodeUnknown(Request)(message);
          const response = yield* handler(request);
          const encoded = yield* S.encode(MessageResponse)(response);
          sendResponse(encoded);
        }).pipe(
          Effect.catchAll((error) => {
            // Send error response
            const errorResponse: ErrorResponse = {
              id: (message as { id?: string }).id ?? 'unknown',
              timestamp: Date.now(),
              type: 'error',
              error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                details: error,
              },
            };

            return S.encode(MessageResponse)(errorResponse).pipe(
              Effect.map((encoded) => {
                sendResponse(encoded);
              }),
              Effect.catchAll(() => Effect.void),
            );
          }),
          Effect.runPromise,
        );

        // Return true to indicate async response
        return true;
      };

      chrome.runtime.onMessage.addListener(listener);

      // Never completes
      return Effect.void;
    });

  return Effect.succeed({
    sendRequest: () =>
      Effect.fail(
        new MessagingError({
          operation: 'send',
          reason: 'Server cannot send requests',
        }),
      ),
    onRequest,
    sendResponse,
  });
};

// Layer for server-side messaging
export const MessagingServerLive = Layer.effect(Messaging, makeMessagingServer());

/*
 * What we learned:
 *
 * 1. Effect.async for wrapping chrome's callback APIs
 * 2. Ref for managing mutable state (pending requests)
 * 3. Fiber for timeout management with cancellation
 * 4. Schema validation ensures type safety across boundaries
 * 5. Different implementations for client/server sides
 * 6. Error handling that propagates across extension components
 */
