import { vi } from 'vitest';

/*
 * Test Helper: Fetch Mock
 *
 * Creates a properly typed fetch mock that satisfies TypeScript
 * by implementing a minimal fetch-compatible interface.
 *
 * We use Object.create to inherit from Function.prototype
 * and then add the necessary methods, which is more idiomatic
 * than excessive type casting.
 */

export interface MockResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  headers?: Headers | Record<string, string>;
  json?: () => Promise<unknown>;
}

export function mockFetchResponse(response: MockResponse): Response {
  const headers = response.headers instanceof Headers ? response.headers : new Headers(response.headers);

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText ?? '',
    headers,
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => mockFetchResponse(response),
    body: null,
    bodyUsed: false,
    json: response.json ?? (() => Promise.resolve({})),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

export function installFetchMock(): typeof fetch & ReturnType<typeof vi.fn> {
  // Create a vi.fn mock for the core function behavior
  const mockImplementation = vi.fn((): Promise<Response> => {
    throw new Error('Mock not implemented - use mockReturnValue or mockResolvedValue');
  });

  // Create a complete fetch-compatible object by adding required properties
  const fetchMock = Object.assign(mockImplementation, {
    // Add the missing 'preconnect' property that TypeScript requires
    preconnect: vi.fn(() => undefined),
  }) as typeof fetch;

  global.fetch = fetchMock;

  // Return the full fetch mock with vi.fn methods
  return fetchMock as typeof fetch & ReturnType<typeof vi.fn>;
}
