export type WormholeError = NetworkError | ParseError | ValidationError | CacheError | StorageError | RuntimeError;

export interface NetworkError {
  type: 'NETWORK_ERROR';
  message: string;
  url: string;
  status?: number;
  cause?: unknown;
}

export interface ParseError {
  type: 'PARSE_ERROR';
  message: string;
  input: string;
}

export interface ValidationError {
  type: 'VALIDATION_ERROR';
  message: string;
  field: string;
  value: unknown;
}

export interface CacheError {
  type: 'CACHE_ERROR';
  message: string;
  operation: string;
  cause?: unknown;
}

export interface StorageError {
  type: 'STORAGE_ERROR';
  message: string;
  operation?: string;
  cause?: unknown;
}

export interface RuntimeError {
  type: 'RUNTIME_ERROR';
  message: string;
  cause?: unknown;
}

export const networkError = (message: string, url: string, status?: number, cause?: unknown): NetworkError => ({
  type: 'NETWORK_ERROR',
  message,
  url,
  status,
  cause,
});

export const parseError = (message: string, input: string): ParseError => ({
  type: 'PARSE_ERROR',
  message,
  input,
});

export const validationError = (message: string, field: string, value: unknown): ValidationError => ({
  type: 'VALIDATION_ERROR',
  message,
  field,
  value,
});

export const cacheError = (message: string, operation: string, cause?: unknown): CacheError => ({
  type: 'CACHE_ERROR',
  message,
  operation,
  cause,
});

export const storageError = (message: string, operation?: string, cause?: unknown): StorageError => ({
  type: 'STORAGE_ERROR',
  message,
  operation,
  cause,
});

export const runtimeError = (message: string, cause?: unknown): RuntimeError => ({
  type: 'RUNTIME_ERROR',
  message,
  cause,
});

export const isWormholeError = (error: unknown): error is WormholeError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as Record<string, unknown>).type === 'string' &&
    ['NETWORK_ERROR', 'PARSE_ERROR', 'VALIDATION_ERROR', 'CACHE_ERROR', 'STORAGE_ERROR', 'RUNTIME_ERROR'].includes(
      (error as Record<string, unknown>).type as string,
    )
  );
};
