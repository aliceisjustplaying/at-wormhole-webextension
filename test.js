// Minimal test file for transform.js
const { parseInput, resolveHandle } = require("./transform.js");

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

async function run() {
  let passed = 0,
    failed = 0;
  function check(name, actual, expected) {
    if (deepEqual(actual, expected)) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.log(`FAIL: ${name}\nExpected:`, expected, "\nGot:     ", actual);
      failed++;
    }
  }

  // Test cases for parseInput
  const tests = [
    {
      name: "parseInput/feed/cozy",
      input: "https://deer.social/profile/why.bsky.team/feed/cozy",
      expected: {
        atUri:
          "at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.generator/cozy",
        did: "did:plc:vpkhqolt662uhesyj6nxm7ys",
        handle: "why.bsky.team",
        rkey: "cozy",
        nsid: "app.bsky.feed.generator",
        bskyAppPath: "/profile/why.bsky.team/feed/cozy",
      },
    },
    {
      name: "parseInput/feed.post",
      input:
        "https://deer.social/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n",
      expected: {
        atUri:
          "at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lpe6ek6xhs2n",
        did: "did:plc:kkkcb7sys7623hcf7oefcffg",
        handle: null,
        rkey: "3lpe6ek6xhs2n",
        nsid: "app.bsky.feed.post",
        bskyAppPath:
          "/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n",
      },
    },
    {
      name: "parseInput/lists",
      input:
        "https://deer.social/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u",
      expected: {
        atUri:
          "at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/3l7vfhhfqcz2u",
        did: "did:plc:by3jhwdqgbtrcc7q4tkkv3cf",
        handle: "alice.mosphere.at",
        rkey: "3l7vfhhfqcz2u",
        nsid: "app.bsky.graph.list",
        bskyAppPath: "/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u",
      },
    },
    {
      name: "parseInput/did:web",
      input: "https://deer.social/profile/did:web:didweb.watch",
      expected: {
        atUri: "at://did:web:didweb.watch",
        did: "did:web:didweb.watch",
        handle: null,
        rkey: undefined,
        nsid: undefined,
        bskyAppPath: "/profile/did:web:didweb.watch",
      },
    },
    {
      name: "parseInput/did:web/post",
      input:
        "https://deer.social/profile/did:web:didweb.watch/post/3lpaioe62qk2j",
      expected: {
        atUri: "at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j",
        did: "did:web:didweb.watch",
        handle: null,
        rkey: "3lpaioe62qk2j",
        nsid: "app.bsky.feed.post",
        bskyAppPath: "/profile/did:web:didweb.watch/post/3lpaioe62qk2j",
      },
    },
  ];
  for (const test of tests) {
    try {
      const out = await parseInput(test.input);
      check(test.name, out, test.expected);
    } catch (e) {
      console.log(`FAIL: ${test.name} (exception)`, e);
      failed++;
    }
  }

  // Test case for resolveHandle
  try {
    const handle = "alice.mosphere.at";
    const expectedDid = "did:plc:by3jhwdqgbtrcc7q4tkkv3cf";
    const out = await resolveHandle(handle);
    check("resolveHandle", out, expectedDid);
  } catch (e) {
    console.log("FAIL: resolveHandle (exception)", e);
    failed++;
  }

  console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

run();
