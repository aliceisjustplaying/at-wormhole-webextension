export interface TransformInfo {
  atUri: string | null;
  did: string | null;
  handle: string | null;
  rkey?: string;
  nsid?: string;
  bskyAppPath: string;
}

export interface CacheEntry {
  handle: string;
  lastAccessed: number;
}

export type SWMessage =
  | { type: 'UPDATE_CACHE'; did: string; handle: string }
  | { type: 'GET_HANDLE'; did: string }
  | { type: 'GET_DID'; handle: string }
  | { type: 'CLEAR_CACHE' }
  | { type: 'DEBUG_LOG'; message: string };

export interface ThemeColors {
  accentcolor?: string;
  textcolor?: string;
  toolbar?: string;
  toolbar_text?: string;
  toolbar_field?: string;
  toolbar_field_text?: string;
  toolbar_field_border?: string;
  popup?: string;
  popup_text?: string;
  popup_border?: string;
  popup_highlight?: string;
  popup_highlight_text?: string;
  button_background_hover?: string;
  button_background_active?: string;
}

export interface BrowserTheme {
  colors?: ThemeColors;
}

export interface BrowserThemeAPI {
  getCurrent(): Promise<BrowserTheme>;
}

export interface BrowserWithTheme {
  theme?: BrowserThemeAPI;
}

export interface Destination {
  url: string;
  label: string;
}

export interface DebugConfig {
  theme: boolean;
  cache: boolean;
  parsing: boolean;
  popup: boolean;
  serviceWorker: boolean;
  transform: boolean;
}

export interface WindowWithDebug extends Window {
  wormholeDebug: {
    theme: (enable: boolean) => void;
    cache: (enable: boolean) => void;
    parsing: (enable: boolean) => void;
    popup: (enable: boolean) => void;
    serviceWorker: (enable: boolean) => void;
    transform: (enable: boolean) => void;
    all: (enable: boolean) => void;
    getConfig: () => DebugConfig;
  };
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
