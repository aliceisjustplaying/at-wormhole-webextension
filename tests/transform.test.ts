import assert from 'assert';
import { parseInput, resolveHandleToDid } from '../src/shared/transform';

function mockFetchResponse(data = {}, isOk = true, httpStatus = 200) {
  return () =>
    Promise.resolve({
      ok: isOk,
      status: httpStatus,
      json: () => Promise.resolve(data),
    });
}

const fetchMockConfigs = [
  {
    condition: (url: string) => url.includes('resolveHandle?handle=why.bsky.team'),
    response: mockFetchResponse({ did: 'did:plc:vpkhqolt662uhesyj6nxm7ys' }),
  },
  {
    condition: (url: string) => url.includes('resolveHandle?handle=alice.mosphere.at'),
    response: mockFetchResponse({ did: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf' }),
  },
  {
    condition: (url: string) => url === 'https://didweb.watch/.well-known/did.json',
    response: mockFetchResponse({
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/multikey/v1',
        'https://w3id.org/security/suites/secp256k1-2019/v1',
      ],
      id: 'did:web:didweb.watch',
      alsoKnownAs: ['at://didweb.watch'],
      verificationMethod: [
        {
          id: 'did:web:didweb.watch#atproto',
          type: 'Multikey',
          controller: 'did:web:didweb.watch',
          publicKeyMultibase: 'zQ3shPLyZu2EbgJ75P61bMZP4yvBwmtd22ph5sEnY6oLz4YLo',
        },
      ],
      service: [
        {
          id: '#atproto_pds',
          type: 'AtprotoPersonalDataServer',
          serviceEndpoint: 'https://zio.blue',
        },
      ],
    }),
  },
  {
    condition: (url: string) => url === 'https://fail-did-web.com/.well-known/did.json',
    response: mockFetchResponse({}, false, 404),
  },
  {
    condition: (url: string) => url.includes('resolveHandle?handle=bob.test'),
    response: mockFetchResponse({ did: 'did:plc:bobtestdid' }),
  },
];

// Define typed fetch mock with preconnect
type FetchFn = ((url: URL | RequestInfo) => Promise<Response>) & { preconnect: () => void };
const fetchWithPreconnect = ((url: URL | RequestInfo) => {
  // Normalize URL to string
  const urlStr =
    typeof url === 'string' ? url
    : url instanceof URL ? url.href
    : '';
  const mock = fetchMockConfigs.find((m) => m.condition(urlStr));
  if (mock) {
    return mock.response();
  }
  console.warn('Unhandled fetch mock for URL: ' + urlStr);
  return Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}) as FetchFn;
fetchWithPreconnect.preconnect = () => {
  /* no-op */
};
globalThis.fetch = fetchWithPreconnect;

async function run() {
  let passed = 0,
    failed = 0;

  function check(name: string, actual: unknown, expected: unknown) {
    try {
      assert.deepStrictEqual(actual, expected);
      console.log(`PASS: ${name}`);
      passed++;
    } catch {
      console.error(`FAIL: ${name}`);
      console.log(`EXPECTED: ${JSON.stringify(expected, null, 2)}`);
      console.log(`ACTUAL: ${JSON.stringify(actual, null, 2)}`);
      failed++;
    }
  }

  // Test cases for parseInput
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
    try {
      const out = await parseInput(test.input);
      check(test.name, out, test.expected);
    } catch {
      console.log(`FAIL: ${test.name} (exception)`);
      failed++;
    }
  }

  try {
    const out = await parseInput(
      'https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23',
    );
    check('parseInput/skythread', out, {
      atUri: 'at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23',
      did: 'did:plc:2p6idfgjfe3easltiwmnofw6',
      handle: null,
      rkey: '3lpjntj43rs23',
      nsid: 'app.bsky.feed.post',
      bskyAppPath: '/profile/did:plc:2p6idfgjfe3easltiwmnofw6/post/3lpjntj43rs23',
    });
  } catch {
    console.log('FAIL: parseInput/skythread (exception)');
    failed++;
  }

  // Test cases for resolveHandle
  const resolveHandleTests = [
    {
      name: 'resolveHandle/plc/alice',
      input: 'alice.mosphere.at',
      expected: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf',
    },
    {
      name: 'resolveHandle/plc/bob',
      input: 'bob.test',
      expected: 'did:plc:bobtestdid',
    },
    {
      name: 'resolveHandle/did-web/success',
      input: 'did:web:didweb.watch',
      expected: 'did:web:didweb.watch',
    },
    {
      name: 'resolveHandle/did-web/failure',
      input: 'did:web:fail-did-web.com',
      expected: 'did:web:fail-did-web.com',
    },
  ];

  for (const test of resolveHandleTests) {
    try {
      const out = await resolveHandleToDid(test.input);
      check(test.name, out, test.expected);
    } catch {
      console.log(`FAIL: ${test.name} (exception)`);
      failed++;
    }
  }

  console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

void run();
