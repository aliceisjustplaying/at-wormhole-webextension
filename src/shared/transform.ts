import type { TransformInfo } from './types';
import { buildDestinationsFromServices } from './services';

/**
 * Builds a list of destination link objects from canonical info.
 */
export function buildDestinations(info: TransformInfo): { label: string; url: string }[] {
  return buildDestinationsFromServices(info);
}

// Re-export functions from other modules to maintain backward compatibility
export { parseInput } from './parser';
export { resolveHandleToDid, resolveDidToHandle } from './resolver';
export { canonicalize } from './canonicalizer';
