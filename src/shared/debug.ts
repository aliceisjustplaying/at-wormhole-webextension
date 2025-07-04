/**
 * Centralized debug logging utility for the extension
 * Controls debug output by category with build-time and runtime flags
 */

import type { DebugConfig } from './types';
import { isWormholeError, storageError, type StorageError } from './errors';
import { ResultAsync } from 'neverthrow';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class Debug {
  private static getDefaultConfig(): DebugConfig {
    return {
      theme: import.meta.env.MODE === 'development' || import.meta.env.VITE_DEBUG_THEME === 'true',
      cache: import.meta.env.MODE === 'development' || import.meta.env.VITE_DEBUG_CACHE === 'true',
      parsing: import.meta.env.MODE === 'development' || import.meta.env.VITE_DEBUG_PARSING === 'true',
      popup: import.meta.env.MODE === 'development' || import.meta.env.VITE_DEBUG_POPUP === 'true',
      serviceWorker: import.meta.env.MODE === 'development' || import.meta.env.VITE_DEBUG_SW === 'true',
      transform: import.meta.env.MODE === 'development' || import.meta.env.VITE_DEBUG_TRANSFORM === 'true',
    };
  }

  private static config: DebugConfig = this.getDefaultConfig();

  /**
   * Load runtime debug overrides from chrome.storage
   * Call this in popup and service worker initialization
   */
  static loadRuntimeConfig(): ResultAsync<void, StorageError> {
    return ResultAsync.fromPromise(chrome.storage.local.get('debugConfig'), (error) =>
      storageError('Failed to load debug config', 'get', error),
    ).map((result) => {
      if (result.debugConfig && typeof result.debugConfig === 'object') {
        // Use stored config completely, with defaults as fallback
        this.config = { ...this.getDefaultConfig(), ...(result.debugConfig as Partial<DebugConfig>) };
      }
      return undefined;
    });
  }

  /**
   * Save current debug config to storage for runtime persistence
   */
  static saveRuntimeConfig(): ResultAsync<void, StorageError> {
    return ResultAsync.fromPromise(chrome.storage.local.set({ debugConfig: this.config }), (error) =>
      storageError('Failed to save debug config', 'set', error),
    ).map(() => undefined);
  }

  /**
   * Enable/disable debug category at runtime
   */
  static setCategory(category: keyof DebugConfig, enabled: boolean): void {
    this.config[category] = enabled;
    // Fire and forget - we don't need to wait for the save
    void this.saveRuntimeConfig().match(
      () => undefined, // Success - no action needed
      (error) => console.error('Failed to save debug config:', error),
    );
  }

  /**
   * Get current debug configuration
   */
  static getConfig(): Readonly<DebugConfig> {
    return { ...this.config };
  }

  // Category-specific debug methods
  static theme = (...args: unknown[]): void => {
    if (this.config.theme) console.log('🎨 [THEME]', ...args);
  };

  static cache = (...args: unknown[]): void => {
    if (this.config.cache) console.log('💾 [CACHE]', ...args);
  };

  static parsing = (...args: unknown[]): void => {
    if (this.config.parsing) console.log('📝 [PARSING]', ...args);
  };

  static popup = (...args: unknown[]): void => {
    if (this.config.popup) console.log('🔧 [POPUP]', ...args);
  };

  static serviceWorker = (...args: unknown[]): void => {
    if (this.config.serviceWorker) console.log('⚙️ [SW]', ...args);
  };

  static transform = (...args: unknown[]): void => {
    if (this.config.transform) console.log('🔄 [TRANSFORM]', ...args);
  };

  // Utility methods for common debugging patterns
  static error = (category: keyof DebugConfig, ...args: unknown[]): void => {
    if (this.config[category]) console.error(`❌ [${category.toUpperCase()}]`, ...args);
  };

  static warn = (category: keyof DebugConfig, ...args: unknown[]): void => {
    if (this.config[category]) console.warn(`⚠️ [${category.toUpperCase()}]`, ...args);
  };

  static time = (category: keyof DebugConfig, label: string): void => {
    if (this.config[category]) console.time(`⏱️ [${category.toUpperCase()}] ${label}`);
  };

  static timeEnd = (category: keyof DebugConfig, label: string): void => {
    if (this.config[category]) console.timeEnd(`⏱️ [${category.toUpperCase()}] ${label}`);
  };
}

/**
 * Debug log utility function that integrates with the Debug class
 * Used internally by logError and other functions
 */
export const debugLog = (category: string, level: string, ...args: unknown[]): void => {
  const categoryKey = category.toLowerCase() as keyof DebugConfig;
  if (Debug.getConfig()[categoryKey]) {
    console.log(`🔍 [${category}] ${level}:`, ...args);
  }
};

/**
 * Centralized error logging function that handles both WormholeError and unknown errors
 * Provides structured logging for typed errors and fallback for unexpected errors
 */
export const logError = (category: string, error: unknown, context?: Record<string, unknown>): void => {
  const errorInfo = isWormholeError(error) ? error : { raw: String(error) };

  // Format a readable error message
  let errorMessage = '';
  if (isWormholeError(error)) {
    errorMessage = `${error.type}: ${error.message}`;
    if ('url' in error && error.url) {
      errorMessage += ` (URL: ${error.url})`;
    }
    if ('status' in error && error.status) {
      errorMessage += ` [Status: ${error.status}]`;
    }
  } else {
    errorMessage = String(error);
  }

  console.error(`❌ [${category}] ${errorMessage}`, context);

  if (import.meta.env.DEV) {
    debugLog(category, 'ERROR', errorInfo, context);
  }
};
