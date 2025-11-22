import { describe, expect, test } from 'bun:test';
import { extractAtUriFromAlternateLinks } from '../src/shared/rel-alternate';

describe('extractAtUriFromAlternateLinks', () => {
  test('returns first valid AT URI with alternate rel', () => {
    const result = extractAtUriFromAlternateLinks([
      { rel: 'stylesheet', href: 'https://example.com/app.css' },
      { rel: 'alternate', href: 'at://did:plc:example/app.bsky.feed.post/abc' },
    ]);

    expect(result?.atUri).toEqual('at://did:plc:example/app.bsky.feed.post/abc');
    expect(result?.info.did).toEqual('did:plc:example');
    expect(result?.info.nsid).toEqual('app.bsky.feed.post');
    expect(result?.info.rkey).toEqual('abc');
  });

  test('ignores entries without alternate rel tokens', () => {
    const result = extractAtUriFromAlternateLinks([
      { rel: 'icon', href: 'at://did:plc:example/app.bsky.feed.post/abc' },
      { rel: 'ALTERNATE next', href: 'https://example.com/not-at' },
    ]);

    expect(result).toBeNull();
  });

  test('handles rel tokens with mixed casing and trimmed hrefs', () => {
    const result = extractAtUriFromAlternateLinks([
      { rel: 'feed Alternate', href: '  at://did:plc:other/app.bsky.feed.generator/xyz  ' },
    ]);

    expect(result?.info.did).toEqual('did:plc:other');
    expect(result?.info.nsid).toEqual('app.bsky.feed.generator');
    expect(result?.info.rkey).toEqual('xyz');
  });
});
