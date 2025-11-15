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
  | { type: 'PROBE_PAGE_FOR_AT_URI'; tabId: number; tabUrl?: string; force?: boolean };

export type ProbeSource = 'rel-alternate';

export interface PageProbeResponse {
  info: TransformInfo | null;
  atUri: string | null;
  source: ProbeSource | null;
  cached: boolean;
}

export interface Destination {
  url: string;
  label: string;
}

export interface BrowserTheme {
  colors?: {
    popup?: string;
    popup_text?: string;
    popup_border?: string;
    popup_highlight?: string;
    popup_highlight_text?: string;
    toolbar?: string;
    toolbar_text?: string;
    toolbar_field?: string;
    toolbar_field_text?: string;
    toolbar_field_border?: string;
    button_background_hover?: string;
  };
}

export interface BrowserThemeAPI {
  getCurrent(): Promise<BrowserTheme>;
}

export interface BrowserWithTheme {
  theme?: BrowserThemeAPI;
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
