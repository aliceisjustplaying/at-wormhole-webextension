const isDev = import.meta.env.MODE === 'development';

export const debugLog = (category: string, ...args: unknown[]): void => {
  if (isDev) {
    console.log(`[${category}]`, ...args);
  }
};

export const logError = (category: string, error: unknown, context?: Record<string, unknown>): void => {
  if (isDev) {
    console.error(`[${category}]`, error, context);
  } else {
    console.error(error);
  }
};
