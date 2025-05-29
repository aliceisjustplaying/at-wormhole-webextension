import { test, expect, describe, beforeEach } from 'bun:test';
import { parseInput, resolveHandleToDid, buildDestinations } from '../src/shared/transform';

// Mock data for handle resolution
const mockResponses = {
  'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=why.bsky.team': {
    did: 'did:plc:vpkhqolt662uhesyj6nxm7ys',
  },
  'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=alice.mosphere.at': {
    did: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf',
  },
  'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=now.alice.mosphere.at': {
    did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
  },
  'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=bob.test': {
    did: 'did:plc:bobtestdid',
  },
  'https://didweb.watch/.well-known/did.json': {
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
  },
  'https://fail-did-web.com/.well-known/did.json': null, // 404 response
};

beforeEach(() => {
  const mockFetch = (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    if (url in mockResponses) {
      const data = mockResponses[url as keyof typeof mockResponses];
      if (data === null) {
        return Promise.resolve(new Response('Not found', { status: 404, statusText: 'Not Found' }));
      }
      return Promise.resolve(new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    
    // Default fallback for unmocked URLs
    return Promise.resolve(new Response(JSON.stringify({}), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));
  };
  
  globalThis.fetch = mockFetch as typeof fetch;
});

describe('parseInput', () => {
  test('should parse feed URLs with handle', async () => {
    const result = await parseInput('https://deer.social/profile/why.bsky.team/feed/cozy');
    expect(result).toEqual({
      atUri: 'at://did:plc:vpkhqolt662uhesyj6nxm7ys/app.bsky.feed.generator/cozy',
      did: 'did:plc:vpkhqolt662uhesyj6nxm7ys',
      handle: 'why.bsky.team',
      rkey: 'cozy',
      nsid: 'app.bsky.feed.generator',
      bskyAppPath: '/profile/why.bsky.team/feed/cozy',
    });
  });

  test('should parse post URLs with DID', async () => {
    const result = await parseInput('https://deer.social/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n');
    expect(result).toEqual({
      atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lpe6ek6xhs2n',
      did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
      handle: null,
      rkey: '3lpe6ek6xhs2n',
      nsid: 'app.bsky.feed.post',
      bskyAppPath: '/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lpe6ek6xhs2n',
    });
  });

  test('should parse list URLs with handle', async () => {
    const result = await parseInput('https://deer.social/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u');
    expect(result).toEqual({
      atUri: 'at://did:plc:by3jhwdqgbtrcc7q4tkkv3cf/app.bsky.graph.list/3l7vfhhfqcz2u',
      did: 'did:plc:by3jhwdqgbtrcc7q4tkkv3cf',
      handle: 'alice.mosphere.at',
      rkey: '3l7vfhhfqcz2u',
      nsid: 'app.bsky.graph.list',
      bskyAppPath: '/profile/alice.mosphere.at/lists/3l7vfhhfqcz2u',
    });
  });

  test('should parse did:web profile URLs', async () => {
    const result = await parseInput('https://deer.social/profile/did:web:didweb.watch');
    expect(result).toEqual({
      atUri: 'at://did:web:didweb.watch',
      did: 'did:web:didweb.watch',
      handle: null,
      rkey: undefined,
      nsid: undefined,
      bskyAppPath: '/profile/did:web:didweb.watch',
    });
  });

  test('should parse did:web post URLs', async () => {
    const result = await parseInput('https://deer.social/profile/did:web:didweb.watch/post/3lpaioe62qk2j');
    expect(result).toEqual({
      atUri: 'at://did:web:didweb.watch/app.bsky.feed.post/3lpaioe62qk2j',
      did: 'did:web:didweb.watch',
      handle: null,
      rkey: '3lpaioe62qk2j',
      nsid: 'app.bsky.feed.post',
      bskyAppPath: '/profile/did:web:didweb.watch/post/3lpaioe62qk2j',
    });
  });

  test('should parse query parameter DIDs', async () => {
    const result = await parseInput('https://boat.kelinci.net/plc-oplogs?q=did:plc:5sk4eqsu7byvwokfcnfgywxg');
    expect(result).toEqual({
      atUri: 'at://did:plc:5sk4eqsu7byvwokfcnfgywxg',
      did: 'did:plc:5sk4eqsu7byvwokfcnfgywxg',
      handle: null,
      nsid: undefined,
      rkey: undefined,
      bskyAppPath: '/profile/did:plc:5sk4eqsu7byvwokfcnfgywxg',
    });
  });

  test('should parse skythread URLs', async () => {
    const result = await parseInput('https://blue.mackuba.eu/skythread/?author=did:plc:2p6idfgjfe3easltiwmnofw6&post=3lpjntj43rs23');
    expect(result).toEqual({
      atUri: 'at://did:plc:2p6idfgjfe3easltiwmnofw6/app.bsky.feed.post/3lpjntj43rs23',
      did: 'did:plc:2p6idfgjfe3easltiwmnofw6',
      handle: null,
      rkey: '3lpjntj43rs23',
      nsid: 'app.bsky.feed.post',
      bskyAppPath: '/profile/did:plc:2p6idfgjfe3easltiwmnofw6/post/3lpjntj43rs23',
    });
  });

  describe('real service URLs', () => {
    test('should parse bsky.app post URL', async () => {
      const result = await parseInput('https://bsky.app/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u');
      expect(result).toEqual({
        atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u',
        did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
        handle: 'now.alice.mosphere.at',
        rkey: '3lqcw7n4gly2u',
        nsid: 'app.bsky.feed.post',
        bskyAppPath: '/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u',
      });
    });

    test('should parse deer.social post URL', async () => {
      const result = await parseInput('https://deer.social/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u');
      expect(result).toEqual({
        atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u',
        did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
        handle: 'now.alice.mosphere.at',
        rkey: '3lqcw7n4gly2u',
        nsid: 'app.bsky.feed.post',
        bskyAppPath: '/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u',
      });
    });

    test('should parse pdsls.dev AT URI', async () => {
      const result = await parseInput('https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
      expect(result).toEqual({
        atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u',
        did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
        handle: null,
        rkey: '3lqcw7n4gly2u',
        nsid: 'app.bsky.feed.post',
        bskyAppPath: '/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lqcw7n4gly2u',
      });
    });

    test('should parse atp.tools malformed AT URI', async () => {
      const result = await parseInput('https://atp.tools/at:/did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
      expect(result).toEqual({
        atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u',
        did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
        handle: null,
        rkey: '3lqcw7n4gly2u',
        nsid: 'app.bsky.feed.post',
        bskyAppPath: '/profile/did:plc:kkkcb7sys7623hcf7oefcffg/post/3lqcw7n4gly2u',
      });
    });
  });
});

describe('resolveHandleToDid', () => {
  test('should resolve regular handle to DID', async () => {
    const result = await resolveHandleToDid('alice.mosphere.at');
    expect(result).toBe('did:plc:by3jhwdqgbtrcc7q4tkkv3cf');
  });

  test('should resolve another handle to DID', async () => {
    const result = await resolveHandleToDid('bob.test');
    expect(result).toBe('did:plc:bobtestdid');
  });

  test('should handle did:web successfully', async () => {
    const result = await resolveHandleToDid('did:web:didweb.watch');
    expect(result).toBe('did:web:didweb.watch');
  });

  test('should handle did:web failure', async () => {
    const result = await resolveHandleToDid('did:web:fail-did-web.com');
    expect(result).toBe('did:web:fail-did-web.com');
  });

  test('should resolve now.alice.mosphere.at', async () => {
    const result = await resolveHandleToDid('now.alice.mosphere.at');
    expect(result).toBe('did:plc:kkkcb7sys7623hcf7oefcffg');
  });
});

describe('buildDestinations', () => {
  const realPostInfo = {
    atUri: 'at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u',
    did: 'did:plc:kkkcb7sys7623hcf7oefcffg',
    handle: 'now.alice.mosphere.at',
    rkey: '3lqcw7n4gly2u',
    nsid: 'app.bsky.feed.post',
    bskyAppPath: '/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u',
  };

  test('should generate correct URLs for all services', () => {
    const destinations = buildDestinations(realPostInfo);
    const destMap = destinations.reduce<Record<string, string>>((acc, dest) => {
      // Extract service identifier from label or URL
      if (dest.label.includes('deer.social')) acc['deer.social'] = dest.url;
      else if (dest.label.includes('bsky.app')) acc['bsky.app'] = dest.url;
      else if (dest.label.includes('pdsls.dev')) acc['pdsls.dev'] = dest.url;
      else if (dest.label.includes('atp.tools')) acc['atp.tools'] = dest.url;
      else if (dest.label.includes('clearsky')) acc.clearsky = dest.url;
      else if (dest.label.includes('skythread')) acc.skythread = dest.url;
      else if (dest.label.includes('cred.blue')) acc['cred.blue'] = dest.url;
      else if (dest.label.includes('tangled.sh')) acc['tangled.sh'] = dest.url;
      else if (dest.label.includes('frontpage.fyi')) acc['frontpage.fyi'] = dest.url;
      else if (dest.label.includes('boat.kelinci')) acc['boat.kelinci'] = dest.url;
      else if (dest.label.includes('plc.directory')) acc['plc.directory'] = dest.url;
      return acc;
    }, {});

    // Verify URLs match those from urls.txt
    expect(destMap['deer.social']).toBe('https://deer.social/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u');
    expect(destMap['bsky.app']).toBe('https://bsky.app/profile/now.alice.mosphere.at/post/3lqcw7n4gly2u');
    expect(destMap['pdsls.dev']).toBe('https://pdsls.dev/at://did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
    expect(destMap['atp.tools']).toBe('https://atp.tools/at:/did:plc:kkkcb7sys7623hcf7oefcffg/app.bsky.feed.post/3lqcw7n4gly2u');
    expect(destMap.clearsky).toBe('https://clearsky.app/did:plc:kkkcb7sys7623hcf7oefcffg/blocked-by');
    expect(destMap.skythread).toBe('https://blue.mackuba.eu/skythread/?author=did:plc:kkkcb7sys7623hcf7oefcffg&post=3lqcw7n4gly2u');
    expect(destMap['cred.blue']).toBe('https://cred.blue/now.alice.mosphere.at');
    expect(destMap['tangled.sh']).toBe('https://tangled.sh/@now.alice.mosphere.at');
    expect(destMap['frontpage.fyi']).toBe('https://frontpage.fyi/profile/now.alice.mosphere.at');
    expect(destMap['boat.kelinci']).toBe('https://boat.kelinci.net/plc-oplogs?q=did:plc:kkkcb7sys7623hcf7oefcffg');
    expect(destMap['plc.directory']).toBe('https://plc.directory/did:plc:kkkcb7sys7623hcf7oefcffg');
  });

  test('should exclude skythread when no rkey', () => {
    const profileOnlyInfo = { ...realPostInfo, rkey: undefined, nsid: undefined };
    const destinations = buildDestinations(profileOnlyInfo);
    const hasSkythreadUrl = destinations.some(dest => dest.url.includes('skythread'));
    expect(hasSkythreadUrl).toBe(false);
  });

  test('should exclude handle-based services when no handle', () => {
    const didOnlyInfo = { ...realPostInfo, handle: null };
    const destinations = buildDestinations(didOnlyInfo);
    const handleBasedUrls = destinations.filter(dest => 
      dest.url.includes('cred.blue') || 
      dest.url.includes('tangled.sh') || 
      dest.url.includes('frontpage.fyi')
    );
    expect(handleBasedUrls).toHaveLength(0);
  });

  test('should exclude plc-specific services for did:web', () => {
    const didWebInfo = { 
      ...realPostInfo, 
      did: 'did:web:example.com',
      atUri: 'at://did:web:example.com/app.bsky.feed.post/3lqcw7n4gly2u'
    };
    const destinations = buildDestinations(didWebInfo);
    const plcUrls = destinations.filter(dest => 
      dest.url.includes('boat.kelinci') || 
      dest.url.includes('plc.directory')
    );
    expect(plcUrls).toHaveLength(0);
  });
});