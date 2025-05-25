import { describe, it, expect } from 'vitest';
import { parseInput, resolveHandleToDid } from '../src/shared/transform';

describe('transform tests', () => {
  describe('parseInput', () => {
    const targetDid = 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf';
    const targetHandle = 'alice.mosphere.at';
    const postRkey = '3lpwwx53o3s2v';
    const postNsid = 'app.bsky.feed.post';
    const postAtUri = `at://${targetDid}/${postNsid}/${postRkey}`;
    const profileAtUri = `at://${targetDid}`; // Represents the base AT URI for the actor

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
          handle: 'now.alice.mosphere.at',
          rkey: '3lpe6ek6xhs2n',
          nsid: 'app.bsky.feed.post',
          bskyAppPath: '/profile/now.alice.mosphere.at/post/3lpe6ek6xhs2n',
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
          handle: 'didweb.watch',
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: '/profile/didweb.watch',
        },
      },
      {
        name: 'parseInput/did:web/post',
        input: 'https://deer.social/profile/did:web:didweb.watch/post/3lpaioe62qk2j',
        expected: {
          atUri: 'at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j',
          did: 'did:web:didweb.watch',
          handle: 'didweb.watch',
          rkey: '3lpaioe62qk2j',
          nsid: 'app.bsky.feed.post',
          bskyAppPath: '/profile/didweb.watch/post/3lpaioe62qk2j',
        },
      },
      {
        name: 'parseInput/queryParam/did',
        input: 'https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg',
        expected: {
          atUri: 'at://did:plc:5sk4eqsu7byvwokfcnfgywxg',
          did: 'did:plc:5sk4eqsu7byvwokfcnfgywxg',
          handle: 'ev3rmichelle.bsky.social',
          nsid: undefined,
          rkey: undefined,
          bskyAppPath: '/profile/ev3rmichelle.bsky.social',
        },
      },
      {
        name: 'parseInput/deer.social/profile/did/post',
        input: 'https://deer.social/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lpwwx53o3s2v',
        expected: {
          atUri: postAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: postRkey,
          nsid: postNsid,
          bskyAppPath: `/profile/${targetHandle}/post/${postRkey}`,
        },
      },
      {
        name: 'parseInput/deer.social/profile/handle/post',
        input: 'https://deer.social/profile/alice.mosphere.at/post/3lpwwx53o3s2v',
        expected: {
          atUri: postAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: postRkey,
          nsid: postNsid,
          bskyAppPath: `/profile/${targetHandle}/post/${postRkey}`,
        },
      },
      {
        name: 'parseInput/bsky.app/profile/did/post',
        input: 'https://bsky.app/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lpwwx53o3s2v',
        expected: {
          atUri: postAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: postRkey,
          nsid: postNsid,
          bskyAppPath: `/profile/${targetHandle}/post/${postRkey}`,
        },
      },
      {
        name: 'parseInput/bsky.app/profile/handle/post',
        input: 'https://bsky.app/profile/alice.mosphere.at/post/3lpwwx53o3s2v',
        expected: {
          atUri: postAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: postRkey,
          nsid: postNsid,
          bskyAppPath: `/profile/${targetHandle}/post/${postRkey}`,
        },
      },
      {
        name: 'parseInput/pdsls.dev/atUriAsPath/post',
        input: 'https://pdsls.dev/at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.feed.post/3lpwwx53o3s2v',
        expected: {
          atUri: postAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: postRkey,
          nsid: postNsid,
          bskyAppPath: `/profile/${targetHandle}/post/${postRkey}`,
        },
      },
      {
        name: 'parseInput/clearsky.app/did/profileWithExtraPath',
        input: 'https://clearsky.app/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/blocked-by',
        expected: {
          atUri: profileAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: `/profile/${targetHandle}`,
        },
      },
      {
        name: 'parseInput/clearsky.app/handle/profileWithExtraPath',
        input: 'https://clearsky.app/alice.mosphere.at/blocked-by',
        expected: {
          atUri: profileAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: `/profile/${targetHandle}`,
        },
      },
      {
        name: 'parseInput/blue.mackuba.eu/skythread/queryparams',
        input: 'https://blue.mackuba.eu/skythread/?author=did:plc:by3jhwdqgbtrcc7q4tkkv3cf&post=3lpwwx53o3s2v',
        expected: {
          atUri: postAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: postRkey,
          nsid: postNsid,
          bskyAppPath: `/profile/${targetHandle}/post/${postRkey}`,
        },
      },
      {
        name: 'parseInput/cred.blue/handle/profile',
        input: 'https://cred.blue/alice.mosphere.at',
        expected: {
          atUri: profileAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: `/profile/${targetHandle}`,
        },
      },
      {
        name: 'parseInput/tangled.sh/@handle/profile',
        input: 'https://tangled.sh/@alice.mosphere.at',
        expected: {
          atUri: profileAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: `/profile/${targetHandle}`,
        },
      },
      {
        name: 'parseInput/frontpage.fyi/profile/handle',
        input: 'https://frontpage.fyi/profile/alice.mosphere.at',
        expected: {
          atUri: profileAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: `/profile/${targetHandle}`,
        },
      },
      {
        name: 'parseInput/boat.kelinci.net/plc-oplogsViaQuery',
        input: 'https://boat.kelinci.net/plc-oplogs?q=did:plc:by3jhwdqgbtrcc7q4tkkv3cf',
        expected: {
          atUri: profileAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: `/profile/${targetHandle}`,
        },
      },
      {
        name: 'parseInput/plc.directory/didAsPathSegment',
        input: 'https://plc.directory/did:plc:by3jhwdqgbtrcc7q4tkkv3cf',
        expected: {
          atUri: profileAtUri,
          did: targetDid,
          handle: targetHandle,
          rkey: undefined,
          nsid: undefined,
          bskyAppPath: `/profile/${targetHandle}`,
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
        handle: 'jimmusilpainter.bsky.social',
        rkey: '3lpjntj43rs23',
        nsid: 'app.bsky.feed.post',
        bskyAppPath: '/profile/jimmusilpainter.bsky.social/post/3lpjntj43rs23',
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
