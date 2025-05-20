import assert from 'assert';
import { parseInput, resolveHandleToDid, canonicalize, resolveDidToHandle, buildDestinations, TransformInfo } from '../src/shared/transform';

// --- Mocking Setup ---
function mockFetchResponse(data = {}, isOk = true, httpStatus = 200) {
  return () =>
    Promise.resolve({
      ok: isOk,
      status: httpStatus,
      json: () => Promise.resolve(data),
    });
}

const fetchMockConfigs = [
  { condition: (url: string) => url.includes('resolveHandle?handle=why.bsky.team'), response: mockFetchResponse({ did: 'did:plc:vpkhqolt662uhesyj6nxm7ys' }), },
  { condition: (url: string) => url.includes('resolveHandle?handle=alice.mosphere.at'), response: mockFetchResponse({ did: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf' }), },
  { condition: (url: string) => url === 'https://didweb.watch/.well-known/did.json', response: mockFetchResponse({ '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1', 'https://w3id.org/security/suites/secp256k1-2019/v1',], id: 'did:web:didweb.watch', alsoKnownAs: ['at://didweb.watch'], verificationMethod: [{ id: 'did:web:didweb.watch#atproto', type: 'Multikey', controller: 'did:web:didweb.watch', publicKeyMultibase: 'zQ3shPLyZu2EbgJ75P61bMZP4yvBwmtd22ph5sEnY6oLz4YLo', },], service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://zio.blue', },], }), },
  { condition: (url: string) => url === 'https://fail-did-web.com/.well-known/did.json', response: mockFetchResponse({}, false, 404), },
  { condition: (url: string) => url.includes('resolveHandle?handle=bob.test'), response: mockFetchResponse({ did: 'did:plc:bobtestdid' }), },
  { condition: (url: string) => url.includes('resolveHandle?handle=nonexistent.bsky.social'), response: mockFetchResponse({}, false, 404), },
  { condition: (url: string) => url.includes('resolveHandle?handle=invalid-for-canonicalize.bsky.social'), response: mockFetchResponse({}, false, 404), },
  { condition: (url: string) => url.includes('resolveHandle?handle=testcanonical.bsky.social'), response: mockFetchResponse({ did: 'did:plc:testcanonicaldid' }), },
  { condition: (url: string) => url === 'https://plc.directory/did%3Aplc%3Aresolvedplcdid', response: mockFetchResponse({ alsoKnownAs: ['at://resolvedhandle.bsky.social'] }), },
  { condition: (url: string) => url === 'https://plc.directory/did%3Aplc%3Anoaturi_plcdid', response: mockFetchResponse({ alsoKnownAs: ['mailto:test@example.com'] }), },
  { condition: (url: string) => url === 'https://plc.directory/did%3Aplc%3Aempty_aka_plcdid', response: mockFetchResponse({ alsoKnownAs: [] }), },
  { condition: (url: string) => url === 'https://plc.directory/did%3Aplc%3Amissing_aka_plcdid', response: mockFetchResponse({ id: 'did:plc:missing_aka_plcdid' }), },
  { condition: (url: string) => url === 'https://plc.directory/did%3Aplc%3Amalformed_plcdid', response: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error("Malformed JSON")) }), },
  { condition: (url: string) => url === 'https://plc.directory/did%3Aplc%3Aerror_plcdid', response: mockFetchResponse({}, false, 404), },
  { condition: (url: string) => url === 'https://resolvedweb.com/.well-known/did.json', response: mockFetchResponse({ id: 'did:web:resolvedweb.com', alsoKnownAs: ['at://webhandle.bsky.social'] }), },
  { condition: (url: string) => url === 'https://noaturiweb.com/.well-known/did.json', response: mockFetchResponse({ id: 'did:web:noaturiweb.com', alsoKnownAs: ['mailto:test@example.com'] }), },
  { condition: (url: string) => url === 'https://emptyakaweb.com/.well-known/did.json', response: mockFetchResponse({ id: 'did:web:emptyakaweb.com', alsoKnownAs: [] }), },
  { condition: (url: string) => url === 'https://missingakaweb.com/.well-known/did.json', response: mockFetchResponse({ id: 'did:web:missingakaweb.com' }), },
  { condition: (url: string) => url === 'https://malformedweb.com/.well-known/did.json', response: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error("Malformed JSON")) }), },
  { condition: (url: string) => url === 'https://errorweb.com/.well-known/did.json', response: mockFetchResponse({}, false, 404), },
  { condition: (url: string) => url === 'https://pathweb.com/8080/path/to/did/.well-known/did.json', response: mockFetchResponse({ id: 'did:web:pathweb.com:8080:path:to:did' }), },
  { condition: (url: string) => url.includes('resolveHandle?handle='), response: mockFetchResponse({}, false, 404), }, // Catch-all, must be last for handles
];

type FetchFn = ((url: URL | RequestInfo) => Promise<Response>) & { preconnect: () => void };
const fetchWithPreconnect = ((url: URL | RequestInfo) => {
  const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : '';
  const mock = fetchMockConfigs.find((m) => m.condition(urlStr));
  if (mock) return mock.response();
  console.warn('Unhandled fetch mock for URL: ' + urlStr);
  return Promise.resolve(new Response(JSON.stringify({}), { status: 500, headers: { 'Content-Type': 'application/json' } }));
}) as FetchFn;
fetchWithPreconnect.preconnect = () => { /* no-op */ };
globalThis.fetch = fetchWithPreconnect;
// --- End Mocking Setup ---


// --- Simple describe/it implementation for structure ---
let currentDescribePath: string[] = [];
let currentItDescription = ''; 
let globalState: { passed: number; failed: number };

async function describe(description: string, fn: () => Promise<void> | void) {
  const originalDescribePath = [...currentDescribePath];
  currentDescribePath.push(description);
  console.log(`\nDESCRIBE: ${currentDescribePath.join(' > ')}`);
  await fn(); 
  currentDescribePath = originalDescribePath;
}

async function it(description: string, fn: () => Promise<void> | void) {
  currentItDescription = description;
  try {
    await fn(); 
  } catch (e: any) {
    // Pass original test name for context if available, otherwise current 'it' description
    _check(description, 'UNEXPECTED_EXCEPTION_IN_IT_BLOCK', null, e);
  }
  currentItDescription = ''; 
}
// --- End describe/it implementation ---

// --- Centralized Check Function ---
function _check(originalTestNameHint: string, actual: unknown, expected: unknown, exceptionIfThrown: Error | null = null) {
  const testPathDescription = `${currentDescribePath.join(' > ')} > ${currentItDescription}`;

  if (actual === 'UNEXPECTED_EXCEPTION_IN_IT_BLOCK') { // Error from 'it's own catch block
     console.error(`  ✗ FAIL: ${testPathDescription} (UNEXPECTED ERROR IN TEST BLOCK)`);
     if (exceptionIfThrown) console.error("    Error:", exceptionIfThrown);
     globalState.failed++;
     return;
  }

  if (expected === null) {
    if (actual === null || exceptionIfThrown) {
      const detail = exceptionIfThrown ? ` (expected exception: ${exceptionIfThrown.message || "Unknown error"})` : "";
      console.log(`  ✓ PASS: ${testPathDescription}${detail}`);
      globalState.passed++;
    } else {
      console.error(`  ✗ FAIL: ${testPathDescription} (expected null or exception, but got: ${JSON.stringify(actual)})`);
      globalState.failed++;
    }
    return;
  }
  
  if (exceptionIfThrown) { 
      console.error(`  ✗ FAIL: ${testPathDescription} (UNEXPECTED EXCEPTION)`);
      console.error("    Test data name for context:", originalTestNameHint);
      console.error("    Error:", exceptionIfThrown);
      globalState.failed++;
      return;
  }

  try {
    assert.deepStrictEqual(actual, expected);
    console.log(`  ✓ PASS: ${testPathDescription}`);
    globalState.passed++;
  } catch (error: any) {
    console.error(`  ✗ FAIL: ${testPathDescription}`);
    if (error.generatedMessage) {
      console.error("    Details:", error.message);
    } else {
      console.error(`    EXPECTED: ${JSON.stringify(expected, null, 2)}`);
      console.error(`    ACTUAL: ${JSON.stringify(actual, null, 2)}`);
    }
    globalState.failed++;
  }
}
// --- End Centralized Check Function ---

// --- Main Test Execution Logic ---
async function runAllTests() {
  await describe('parseInput', async () => {
    const tests = [ /* Using 'name' from test data for 'it' description */
      { name: 'feed/cozy', input: 'https://deer.social/profile/why.bsky.team/feed/cozy', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.generator/cozy', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: 'cozy', nsid: 'app.bsky.feed.generator', bskyAppPath: '/profile/why.bsky.team/feed/cozy',}, },
      { name: 'feed.post', input: 'https://deer.social/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n', expected: { atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lpe6ek6xhs2n', did: 'did:plc:kkkcb7sys7623hcf7oefcffg', handle: null, rkey: '3lpe6ek6xhs2n', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n',}, },
      { name: 'lists', input: 'https://deer.social/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u', expected: { atUri: 'at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/3l7vfhhfqcz2u', did: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf', handle: 'alice.mosphere.at', rkey: '3l7vfhhfqcz2u', nsid: 'app.bsky.graph.list', bskyAppPath: '/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u',}, },
      { name: 'did:web', input: 'https://deer.social/profile/did:web:didweb.watch', expected: { atUri: 'at://did:web:didweb.watch', did: 'did:web:didweb.watch', handle: null, rkey: undefined, nsid: undefined, bskyAppPath: '/profile/did:web:didweb.watch',}, },
      { name: 'did:web/post', input: 'https://deer.social/profile/did:web:didweb.watch/post/3lpaioe62qk2j', expected: { atUri: 'at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j', did: 'did:web:didweb.watch', handle: null, rkey: '3lpaioe62qk2j', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/did:web:didweb.watch/post/3lpaioe62qk2j',}, },
      { name: 'queryParam/did', input: 'https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg', expected: { atUri: 'at://did:plc:5sk4eqsu7byvwokfcnfgywxg', did: 'did:plc:5sk4eqsu7byvwokfcnfgywxg', handle: null, nsid: undefined, rkey: undefined, bskyAppPath: '/profile/did:plc:5sk4eqsu7byvwokfcnfgywxg',}, },
      { name: 'no_schema', input: 'deer.social/profile/why.bsky.team/feed/cozy', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.generator/cozy', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: 'cozy', nsid: 'app.bsky.feed.generator', bskyAppPath: '/profile/why.bsky.team/feed/cozy',}, },
      { name: 'handle_only', input: 'why.bsky.team', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: undefined, nsid: undefined, bskyAppPath: '/profile/why.bsky.team',}, },
      { name: 'at_uri_simple', input: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: undefined, nsid: undefined, bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys',}, },
      { name: 'at_uri_with_collection_and_rkey', input: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/3lpe6ek6xhs2n', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/3lpe6ek6xhs2n', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: '3lpe6ek6xhs2n', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys/post/3lpe6ek6xhs2n',}, },
      { name: 'cred.blue/handle_and_rkey', input: 'https://cred.blue/post/3k2xkz7k7oq2o/by/why.bsky.team', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/3k2xkz7k7oq2o', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: '3k2xkz7k7oq2o', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/why.bsky.team/post/3k2xkz7k7oq2o',}, },
      { name: 'tangled.sh/handle_and_rkey', input: 'https://tangled.sh/post/3k2xkz7k7oq2o/by/why.bsky.team', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/3k2xkz7k7oq2o', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: '3k2xkz7k7oq2o', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/why.bsky.team/post/3k2xkz7k7oq2o',}, },
      { name: 'blue.mackuba.eu/handle_and_rkey_from_query', input: 'https://blue.mackuba.eu/skythread/?author=why.bsky.team&post=3k2xkz7k7oq2o', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/3k2xkz7k7oq2o', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: '3k2xkz7k7oq2o', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/why.bsky.team/post/3k2xkz7k7oq2o',}, },
      { name: 'blue.mackuba.eu/did_and_rkey_from_query', input: 'https://blue.mackuba.eu/skythread/?author=did:plc:vpkhqolt662uhesyj6nxm7ys&post=3k2xkz7k7oq2o', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/3k2xkz7k7oq2o', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: '3k2xkz7k7oq2o', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys/post/3k2xkz7k7oq2o',}, },
      { name: 'empty_string', input: '', expected: null, },
      { name: 'invalid_url', input: 'this is not a url', expected: null, },
      { name: 'invalid_at_uri_malformed', input: 'at://invalid', expected: null, },
      { name: 'handle_nonexistent', input: 'nonexistent.bsky.social', expected: null, },
      { name: 'url_with_nonexistent_handle', input: 'https://bsky.app/profile/nonexistent.bsky.social', expected: null, },
      { name: 'profile_handle_no_path', input: 'https://bsky.app/profile/why.bsky.team', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: undefined, nsid: undefined, bskyAppPath: '/profile/why.bsky.team',}, },
      { name: 'just_handle_as_path', input: 'https://bsky.app/why.bsky.team', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: undefined, nsid: undefined, bskyAppPath: '/profile/why.bsky.team',}, },
      { name: 'root_path_bsky.app', input: 'https://bsky.app/', expected: null, },
      { name: 'root_path_deer.social', input: 'https://deer.social/', expected: null, },
      { name: 'cred.blue/invalid_path_format', input: 'https://cred.blue/post/by/why.bsky.team', expected: null, },
      { name: 'tangled.sh/invalid_path_format', input: 'https://tangled.sh/post/by/why.bsky.team', expected: null, },
      { name: 'blue.mackuba.eu/missing_post_param', input: 'https://blue.mackuba.eu/skythread/?author=why.bsky.team', expected: null, },
      { name: 'blue.mackuba.eu/missing_author_param', input: 'https://blue.mackuba.eu/skythread/?post=3k2xkz7k7oq2o', expected: null, },
      { name: 'did_with_path_but_no_handle_resolution', input: 'https://bsky.app/profile/did:plc:vpkhqolt662uhesyj6nxm7ys/post/3lpe6ek6xhs2n', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/3lpe6ek6xhs2n', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: '3lpe6ek6xhs2n', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys/post/3lpe6ek6xhs2n',}, },
    ];

    for (const test of tests) {
      await it(test.name, async () => {
        let out;
        let exceptionOccurred: Error | null = null;
        try {
          out = await parseInput(test.input);
        } catch (e: any) {
          exceptionOccurred = e;
        }
        _check(test.name, out, test.expected, exceptionOccurred);
      });
    }
  });

  await describe('resolveHandleToDid', async () => {
    const tests = [
      { name: 'plc/alice', input: 'alice.mosphere.at', expected: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf', },
      { name: 'plc/bob', input: 'bob.test', expected: 'did:plc:bobtestdid', },
      { name: 'did-web/success', input: 'did:web:didweb.watch', expected: 'did:web:didweb.watch', },
      { name: 'did-web/failure', input: 'did:web:fail-did-web.com', expected: 'did:web:fail-did-web.com', },
    ];

    for (const test of tests) {
      await it(test.name, async () => {
        const out = await resolveHandleToDid(test.input);
        _check(test.name, out, test.expected);
      });
    }
  });

  await describe('canonicalize', async () => {
    const tests = [
      { name: 'did_only', input: 'did:plc:vpkhqolt662uhesyj6nxm7ys', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: undefined, nsid: undefined, bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys',}, },
      { name: 'handle_only', input: 'why.bsky.team', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: undefined, nsid: undefined, bskyAppPath: '/profile/why.bsky.team',}, },
      { name: 'at_did_only', input: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: undefined, nsid: undefined, bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys',}, },
      { name: 'at_handle_only', input: 'at://why.bsky.team', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: undefined, nsid: undefined, bskyAppPath: '/profile/why.bsky.team',}, },
      { name: 'did_and_path_full_nsid', input: 'did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/mypost123', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/mypost123', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: 'mypost123', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys/post/mypost123',}, },
      { name: 'handle_and_path_shortcut_post', input: 'why.bsky.team/post/mypost123', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/mypost123', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: 'mypost123', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/why.bsky.team/post/mypost123',}, },
      { name: 'handle_and_path_shortcut_feed', input: 'testcanonical.bsky.social/feed/myfeedgen', expected: { atUri: 'at://did:plc:testcanonicaldid/app.bsky.feed.generator/myfeedgen', did: 'did:plc:testcanonicaldid', handle: 'testcanonical.bsky.social', rkey: 'myfeedgen', nsid: 'app.bsky.feed.generator', bskyAppPath: '/profile/testcanonical.bsky.social/feed/myfeedgen',}, },
      { name: 'handle_and_path_shortcut_list', input: 'testcanonical.bsky.social/lists/mylistid', expected: { atUri: 'at://did:plc:testcanonicaldid/app.bsky.graph.list/mylistid', did: 'did:plc:testcanonicaldid', handle: 'testcanonical.bsky.social', rkey: 'mylistid', nsid: 'app.bsky.graph.list', bskyAppPath: '/profile/testcanonical.bsky.social/lists/mylistid',}, },
      { name: 'at_handle_and_path_full_nsid_profile', input: 'at://testcanonical.bsky.social/app.bsky.actor.profile/self', expected: { atUri: 'at://did:plc:testcanonicaldid/app.bsky.actor.profile/self', did: 'did:plc:testcanonicaldid', handle: 'testcanonical.bsky.social', rkey: 'self', nsid: 'app.bsky.actor.profile', bskyAppPath: '/profile/testcanonical.bsky.social',}, },
      { name: 'invalid_handle_for_resolution', input: 'invalid-for-canonicalize.bsky.social', expected: null, },
      { name: 'at_invalid_handle_for_resolution', input: 'at://invalid-for-canonicalize.bsky.social', expected: null, },
      { name: 'empty_string', input: '', expected: null, },
      { name: 'at_slash_slash_slash', input: 'at:///', expected: null, },
      { name: 'just_slashes_and_spaces', input: ' / / ', expected: null, },
      { name: 'did_invalid_format_no_resolve', input: 'did:invalid:format', expected: { atUri: 'at://did:invalid:format', did: 'did:invalid:format', handle: null, rkey: undefined, nsid: undefined, bskyAppPath: '/profile/did:invalid:format',} },
      { name: 'handle_without_dot_fails_resolution', input: 'cozy', expected: null, },
      { name: 'bskyAppPath_did_with_post', input: 'did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/postrkey1', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.post/postrkey1', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: null, rkey: 'postrkey1', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/did:plc:vpkhqolt662uhesyj6nxm7ys/post/postrkey1',}, },
      { name: 'bskyAppPath_handle_with_feed', input: 'why.bsky.team/feed/feedrkey1', expected: { atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.generator/feedrkey1', did: 'did:plc:vpkhqolt662uhesyj6nxm7ys', handle: 'why.bsky.team', rkey: 'feedrkey1', nsid: 'app.bsky.feed.generator', bskyAppPath: '/profile/why.bsky.team/feed/feedrkey1',}, },
      { name: 'at_did_with_list_path', input: 'at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/listrkey1', expected: { atUri: 'at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/listrkey1', did: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf', handle: null, rkey: 'listrkey1', nsid: 'app.bsky.graph.list', bskyAppPath: '/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/lists/listrkey1',}, },
    ];

    for (const test of tests) {
      await it(test.name, async () => {
        let out;
        let exceptionOccurred: Error | null = null;
        try {
          out = await canonicalize(test.input);
        } catch (e: any) {
          exceptionOccurred = e;
        }
        _check(test.name, out, test.expected, exceptionOccurred);
      });
    }
  });

  // Note: buildDestinations is synchronous, so its describe callback does not need to be async.
  describe('buildDestinations', () => { 
    const basePlcDidInfo: TransformInfo = { atUri: 'at://did:plc:abcdef123456/app.bsky.feed.post/postrkey1', did: 'did:plc:abcdef123456', handle: 'handleplc.bsky.social', rkey: 'postrkey1', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/handleplc.bsky.social/post/postrkey1', };
    const baseWebDidInfo: TransformInfo = { atUri: 'at://did:web:example.com/app.bsky.feed.post/postrkey2', did: 'did:web:example.com', handle: 'handleweb.bsky.social', rkey: 'postrkey2', nsid: 'app.bsky.feed.post', bskyAppPath: '/profile/handleweb.bsky.social/post/postrkey2', };

    const tests = [
      { name: 'plc_did_with_handle_and_rkey', input: basePlcDidInfo, expected: [ { label: '🦌 deer.social', url: 'https://deer.social/profile/handleplc.bsky.social/post/postrkey1' }, { label: '🦋 bsky.app', url: 'https://bsky.app/profile/handleplc.bsky.social/post/postrkey1' }, { label: '⚙️ pdsls.dev', url: 'https://pdsls.dev/at://did:plc:abcdef123456/app.bsky.feed.post/postrkey1' }, { label: '🛠️ atp.tools', url: 'https://atp.tools/at://did:plc:abcdef123456/app.bsky.feed.post/postrkey1' }, { label: '☀️ clearsky', url: 'https://clearsky.app/did:plc:abcdef123456/blocked-by' }, { label: '☁️ skythread', url: 'https://blue.mackuba.eu/skythread/?author=did:plc:abcdef123456&post=postrkey1' }, { label: '🍥 cred.blue', url: 'https://cred.blue/handleplc.bsky.social' }, { label: '🪢 tangled.sh', url: 'https://tangled.sh/@handleplc.bsky.social' }, { label: '📰 frontpage.fyi', url: 'https://frontpage.fyi/profile/handleplc.bsky.social' }, { label: '⛵ boat.kelinci', url: 'https://boat.kelinci.net/plc-oplogs?q=did:plc:abcdef123456' }, { label: '🪪 plc.directory', url: 'https://plc.directory/did:plc:abcdef123456' }, ], },
      { name: 'plc_did_no_handle_with_rkey', input: { ...basePlcDidInfo, handle: null, bskyAppPath: '/profile/did:plc:abcdef123456/post/postrkey1' }, expected: [ { label: '🦌 deer.social', url: 'https://deer.social/profile/did:plc:abcdef123456/post/postrkey1' }, { label: '🦋 bsky.app', url: 'https://bsky.app/profile/did:plc:abcdef123456/post/postrkey1' }, { label: '⚙️ pdsls.dev', url: 'https://pdsls.dev/at://did:plc:abcdef123456/app.bsky.feed.post/postrkey1' }, { label: '🛠️ atp.tools', url: 'https://atp.tools/at://did:plc:abcdef123456/app.bsky.feed.post/postrkey1' }, { label: '☀️ clearsky', url: 'https://clearsky.app/did:plc:abcdef123456/blocked-by' }, { label: '☁️ skythread', url: 'https://blue.mackuba.eu/skythread/?author=did:plc:abcdef123456&post=postrkey1' }, { label: '⛵ boat.kelinci', url: 'https://boat.kelinci.net/plc-oplogs?q=did:plc:abcdef123456' }, { label: '🪪 plc.directory', url: 'https://plc.directory/did:plc:abcdef123456' }, ], },
      { name: 'plc_did_with_handle_no_rkey', input: { ...basePlcDidInfo, rkey: undefined, nsid: undefined, atUri: 'at://did:plc:abcdef123456', bskyAppPath: '/profile/handleplc.bsky.social' }, expected: [ { label: '🦌 deer.social', url: 'https://deer.social/profile/handleplc.bsky.social' }, { label: '🦋 bsky.app', url: 'https://bsky.app/profile/handleplc.bsky.social' }, { label: '⚙️ pdsls.dev', url: 'https://pdsls.dev/at://did:plc:abcdef123456' }, { label: '🛠️ atp.tools', url: 'https://atp.tools/at://did:plc:abcdef123456' }, { label: '☀️ clearsky', url: 'https://clearsky.app/did:plc:abcdef123456/blocked-by' }, { label: '🍥 cred.blue', url: 'https://cred.blue/handleplc.bsky.social' }, { label: '🪢 tangled.sh', url: 'https://tangled.sh/@handleplc.bsky.social' }, { label: '📰 frontpage.fyi', url: 'https://frontpage.fyi/profile/handleplc.bsky.social' }, { label: '⛵ boat.kelinci', url: 'https://boat.kelinci.net/plc-oplogs?q=did:plc:abcdef123456' }, { label: '🪪 plc.directory', url: 'https://plc.directory/did:plc:abcdef123456' }, ], },
      { name: 'web_did_with_handle_and_rkey', input: baseWebDidInfo, expected: [ { label: '🦌 deer.social', url: 'https://deer.social/profile/handleweb.bsky.social/post/postrkey2' }, { label: '🦋 bsky.app', url: 'https://bsky.app/profile/handleweb.bsky.social/post/postrkey2' }, { label: '⚙️ pdsls.dev', url: 'https://pdsls.dev/at://did:web:example.com/app.bsky.feed.post/postrkey2' }, { label: '🛠️ atp.tools', url: 'https://atp.tools/at://did:web:example.com/app.bsky.feed.post/postrkey2' }, { label: '☀️ clearsky', url: 'https://clearsky.app/did:web:example.com/blocked-by' }, { label: '☁️ skythread', url: 'https://blue.mackuba.eu/skythread/?author=did:web:example.com&post=postrkey2' }, { label: '🍥 cred.blue', url: 'https://cred.blue/handleweb.bsky.social' }, { label: '🪢 tangled.sh', url: 'https://tangled.sh/@handleweb.bsky.social' }, { label: '📰 frontpage.fyi', url: 'https://frontpage.fyi/profile/handleweb.bsky.social' }, ], },
      { name: 'web_did_no_handle_with_rkey', input: { ...baseWebDidInfo, handle: null, bskyAppPath: '/profile/did:web:example.com/post/postrkey2' }, expected: [ { label: '🦌 deer.social', url: 'https://deer.social/profile/did:web:example.com/post/postrkey2' }, { label: '🦋 bsky.app', url: 'https://bsky.app/profile/did:web:example.com/post/postrkey2' }, { label: '⚙️ pdsls.dev', url: 'https://pdsls.dev/at://did:web:example.com/app.bsky.feed.post/postrkey2' }, { label: '🛠️ atp.tools', url: 'https://atp.tools/at://did:web:example.com/app.bsky.feed.post/postrkey2' }, { label: '☀️ clearsky', url: 'https://clearsky.app/did:web:example.com/blocked-by' }, { label: '☁️ skythread', url: 'https://blue.mackuba.eu/skythread/?author=did:web:example.com&post=postrkey2' }, ], },
      { name: 'web_did_with_handle_no_rkey', input: { ...baseWebDidInfo, rkey: undefined, nsid: undefined, atUri: 'at://did:web:example.com', bskyAppPath: '/profile/handleweb.bsky.social' }, expected: [ { label: '🦌 deer.social', url: 'https://deer.social/profile/handleweb.bsky.social' }, { label: '🦋 bsky.app', url: 'https://bsky.app/profile/handleweb.bsky.social' }, { label: '⚙️ pdsls.dev', url: 'https://pdsls.dev/at://did:web:example.com' }, { label: '🛠️ atp.tools', url: 'https://atp.tools/at://did:web:example.com' }, { label: '☀️ clearsky', url: 'https://clearsky.app/did:web:example.com/blocked-by' }, { label: '🍥 cred.blue', url: 'https://cred.blue/handleweb.bsky.social' }, { label: '🪢 tangled.sh', url: 'https://tangled.sh/@handleweb.bsky.social' }, { label: '📰 frontpage.fyi', url: 'https://frontpage.fyi/profile/handleweb.bsky.social' }, ], },
    ];

    for (const test of tests) {
      it(test.name, () => { // 'it' callback is sync
        const out = buildDestinations(test.input);
        _check(test.name, out, test.expected);
      });
    }
  });

  await describe('resolveDidToHandle', async () => {
    const tests = [
      { name: 'plc/success', input: 'did:plc:resolvedplcdid', expected: 'resolvedhandle.bsky.social' },
      { name: 'plc/no_at_uri_in_alsoKnownAs', input: 'did:plc:noaturi_plcdid', expected: null },
      { name: 'plc/empty_alsoKnownAs', input: 'did:plc:empty_aka_plcdid', expected: null },
      { name: 'plc/missing_alsoKnownAs', input: 'did:plc:missing_aka_plcdid', expected: null },
      { name: 'plc/malformed_json_response', input: 'did:plc:malformed_plcdid', expected: null },
      { name: 'plc/fetch_error', input: 'did:plc:error_plcdid', expected: null },
      { name: 'web/success_with_handle', input: 'did:web:resolvedweb.com', expected: 'webhandle.bsky.social' },
      { name: 'web/no_at_uri_in_alsoKnownAs_fallback', input: 'did:web:noaturiweb.com', expected: 'noaturiweb.com' },
      { name: 'web/empty_alsoKnownAs_fallback', input: 'did:web:emptyakaweb.com', expected: 'emptyakaweb.com' },
      { name: 'web/missing_alsoKnownAs_fallback', input: 'did:web:missingakaweb.com', expected: 'missingakaweb.com' },
      { name: 'web/malformed_json_response_fallback', input: 'did:web:malformedweb.com', expected: 'malformedweb.com' },
      { name: 'web/fetch_error_fallback', input: 'did:web:errorweb.com', expected: 'errorweb.com' },
      { name: 'web/with_path_no_handle_fallback', input: 'did:web:pathweb.com:8080:path:to:did', expected: 'pathweb.com:8080:path:to:did' },
      { name: 'invalid/empty_string', input: '', expected: null },
      { name: 'invalid/null_input', input: null as any, expected: null },
      { name: 'invalid/unsupported_did_method', input: 'did:foo:bar', expected: null },
      { name: 'invalid/just_a_handle', input: 'handle.bsky.social', expected: null },
    ];

    for (const test of tests) {
      await it(test.name, async () => {
        let out;
        let exceptionOccurred: Error | null = null;
        try {
          out = await resolveDidToHandle(test.input);
        } catch (e: any) {
          exceptionOccurred = e;
        }
        _check(test.name, out, test.expected, exceptionOccurred);
      });
    }
  });

  // Final results
  console.log(`\nTotal Test results: ${globalState.passed} passed, ${globalState.failed} failed.`);
  if (globalState.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0); // Ensure exit code 0 on success
  }
}

// Initialize globalState and run all tests
globalState = { passed: 0, failed: 0 };
void runAllTests();
