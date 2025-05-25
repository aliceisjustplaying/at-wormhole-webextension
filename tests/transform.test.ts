import { describe, it, expect } from 'vitest';
import { parseInput, resolveHandleToDid } from '../src/shared/transform';

describe('transform tests', () => {
  describe('parseInput', () => {
    const parseInputTests = [
      {
        name: 'parseInput/feed/cozy',
        input: 'https://deer.social/profile/why.bsky.team/feed/cozy',
        expected: {
          atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.generator/cozy',
          did: 'did:plc:vpkhqolt662uhesyj6nxm7ys',
          handle: 'why.bsky.team',
          rkey: 'cozy',
          nsid: 'app.bsky.feed.generator',
          bskyAppPath: '/profile/why.bsky.team/feed/cozy',
        },
      },
      {
        name: 'parseInput/feed.post',
        input: 'https://deer.social/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n',
        expected: {
          atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lpe6ek6xhs2n',
          did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
          handle: null,
          rkey: '3lpe6ek6xhs2n',
          nsid: 'app.bsky.feed.post',
          bskyAppPath: '/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n',
        },
      },
      {
        name: 'parseInput/lists',
        input: 'https://deer.social/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u',
        expected: {
          atUri: 'at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/3l7vfhhfqcz2u',
          did: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf',
          handle: 'alice.mosphere.at',
          rkey: '3l7vfhhfqcz2u',
          nsid: 'app.bsky.graph.list',
          bskyAppPath: '/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u',
        },
      },
      {
        name: 'parseInput/did:web',
        input: 'https://deer.social/profile/did:web:didweb.watch',
        expected: {
          atUri: 'at://did:web:didweb.watch',
          did: 'did:web:didweb.watch',
          handle: null,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: '/profile/did:web:didweb.watch',
        },
      },
      {
        name: 'parseInput/did:web/post',
        input: 'https://deer.social/profile/did:web:didweb.watch/post/3lpaioe62qk2j',
        expected: {
          atUri: 'at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j',
          did: 'did:web:didweb.watch',
          handle: null,
          rkey: '3lpaioe62qk2j',
          nsid: 'app.bsky.feed.post',
          bskyAppPath: '/profile/did:web:didweb.watch/post/3lpaioe62qk2j',
        },
      },
      {
        name: 'parseInput/queryParam/did',
        input: 'https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg',
        expected: {
          atUri: 'at://did:plc:5sk4eqsu7byvwokfcnfgywxg',
          did: 'did:plc:5sk4eqsu7byvwokfcnfgywxg',
          handle: null,
          nsid: undefined,
          rkey: undefined,
          bskyAppPath: '/profile/did:plc:5sk4eqsu7byvwokfcnfgywxg',
        },
      },
    ];

    for (const test of parseInputTests) {
      it(test.name, async () => {
        const out = await parseInput(test.input);
        expect(out).toEqual(test.expected);
      });
    }

    it('parseInput/skythread', async () => {
      const out = await parseInput(
        'https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23',
      );
      expect(out).toEqual({
        atUri: 'at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23',
        did: 'did:plc:2p6idfgjfe3easltiwmnofw6',
        handle: null,
        rkey: '3lpjntj43rs23',
        nsid: 'app.bsky.feed.post',
        bskyAppPath: '/profile/did:plc:2p6idfgjfe3easltiwmnofw6/post/3lpjntj43rs23',
      });
    });
  });

  describe('resolveHandleToDid', () => {
    const resolveHandleTests = [
      {
        name: 'resolveHandle/plc/alice',
        input: 'alice.mosphere.at',
        expected: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf',
      },
      {
        name: 'resolveHandle/did-web/success',
        input: 'did:web:didweb.watch',
        expected: 'did:web:didweb.watch',
      },
      {
        name: 'resolveHandle/did-web/failure',
        input: 'did:web:fail-did-web.com',
        expected: null,
      },
    ];

    for (const test of resolveHandleTests) {
      it(test.name, async () => {
        const out = await resolveHandleToDid(test.input);
        expect(out).toEqual(test.expected);
      });
    }
  });
});
