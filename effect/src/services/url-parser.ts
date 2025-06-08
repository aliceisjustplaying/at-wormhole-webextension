import { Context, Effect, Data } from 'effect';

/*
 * Phase 3, Lesson 8: URL Parser Service
 *
 * This service parses URLs from various AT Protocol services
 * and extracts the relevant identifiers for normalization.
 */

// Error types
export class InvalidUrlError extends Data.TaggedError('InvalidUrlError')<{
  input: string;
  reason: string;
}> {}

export class UnsupportedServiceError extends Data.TaggedError('UnsupportedServiceError')<{
  url: string;
  hostname: string;
}> {}

export type UrlParseError = InvalidUrlError | UnsupportedServiceError;

// Result type - what kind of input we extracted
export type ParsedInput = { kind: 'handle'; value: string } | { kind: 'did'; value: string } | { kind: 'at-uri'; value: string } | { kind: 'fragment'; value: string };

// Service interface
export interface UrlParserService {
  parseUrl: (url: string) => Effect.Effect<ParsedInput, UrlParseError>;
}

// Service tag
export class UrlParser extends Context.Tag('UrlParser')<UrlParser, UrlParserService>() {}

// Service-specific parsers
const parseBskyApp = (url: URL): ParsedInput | null => {
  const match = /^\/profile\/([^/]+)(?:\/(\w+)\/([^/]+))?/.exec(url.pathname);
  if (!match) return null;

  const [, identifier, contentType, rkey] = match;

  if (!identifier) return null;

  // If we have content type and rkey, it's a fragment
  if (contentType && rkey) {
    return { kind: 'fragment', value: `${identifier}/${contentType}/${rkey}` };
  }

  // Otherwise, it's just an identifier
  return identifier.startsWith('did:') ? { kind: 'did', value: identifier } : { kind: 'handle', value: identifier };
};

const parseDeerSocial = parseBskyApp; // Same pattern as bsky.app

const parseToolifyBlue = parseBskyApp; // Same pattern as bsky.app

const parsePdslsDev = (url: URL): ParsedInput | null => {
  // pdsls.dev embeds AT URIs in the path
  const atUri = url.pathname.slice(1); // Remove leading /
  if (atUri.startsWith('at://')) {
    return { kind: 'at-uri', value: atUri };
  }
  return null;
};

const parseAtpTools = (url: URL): ParsedInput | null => {
  // atp.tools has malformed AT URIs with at:/ instead of at://
  const malformed = url.pathname.slice(1); // Remove leading /
  if (malformed.startsWith('at:/')) {
    // Fix the malformed URI
    const fixed = malformed.replace(/^at:\//, 'at://');
    return { kind: 'at-uri', value: fixed };
  }
  return null;
};

const parseSkythread = (url: URL): ParsedInput | null => {
  // Skythread uses query parameters
  const author = url.searchParams.get('author');
  const post = url.searchParams.get('post');

  if (author && post) {
    // Construct AT URI for the post
    return {
      kind: 'at-uri',
      value: `at://${author}/app.bsky.feed.post/${post}`,
    };
  }

  return null;
};

const parseBoatKelinci = (url: URL): ParsedInput | null => {
  // boat.kelinci.net uses ?q= for DIDs
  const q = url.searchParams.get('q');
  if (q?.startsWith('did:')) {
    return { kind: 'did', value: q };
  }
  return null;
};

const parseClearsky = (url: URL): ParsedInput | null => {
  // clearsky.app has DIDs in the path
  const match = /^\/(did:[^/]+)/.exec(url.pathname);
  if (match?.[1]) {
    return { kind: 'did', value: match[1] };
  }
  return null;
};

const parsePlcDirectory = (url: URL): ParsedInput | null => {
  // plc.directory has DIDs in the path
  const match = /^\/(did:plc:[^/]+)/.exec(url.pathname);
  if (match?.[1]) {
    return { kind: 'did', value: match[1] };
  }
  return null;
};

// Map of hostname to parser function
const SERVICE_PARSERS: Record<string, (url: URL) => ParsedInput | null> = {
  'bsky.app': parseBskyApp,
  'deer.social': parseDeerSocial,
  'toolify.blue': parseToolifyBlue,
  'pdsls.dev': parsePdslsDev,
  'atp.tools': parseAtpTools,
  'blue.mackuba.eu': parseSkythread,
  'boat.kelinci.net': parseBoatKelinci,
  'clearsky.app': parseClearsky,
  'plc.directory': parsePlcDirectory,
};

// Service implementation
export const UrlParserLive: UrlParserService = {
  parseUrl: (input: string) =>
    Effect.gen(function* () {
      // Parse the URL
      let url: URL;
      try {
        url = new URL(input);
      } catch {
        return yield* Effect.fail(
          new InvalidUrlError({
            input,
            reason: 'Invalid URL format',
          }),
        );
      }

      // Find the appropriate parser
      const parser = SERVICE_PARSERS[url.hostname];
      if (!parser) {
        return yield* Effect.fail(
          new UnsupportedServiceError({
            url: input,
            hostname: url.hostname,
          }),
        );
      }

      // Parse the URL
      const result = parser(url);
      if (!result) {
        return yield* Effect.fail(
          new InvalidUrlError({
            input,
            reason: 'Could not extract AT Protocol identifier from URL',
          }),
        );
      }

      return result;
    }),
};

/*
 * What we learned:
 *
 * 1. Different services require different parsing strategies
 * 2. Some use path patterns, others use query parameters
 * 3. We normalize all outputs to a common format
 * 4. The parser focuses on extraction, not validation
 * 5. Tagged unions (ParsedInput) make the output type-safe
 */
