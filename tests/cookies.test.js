import { test } from 'node:test';
import assert from 'node:assert/strict';

function installFakeChromeCookies(cookiesByDomain) {
  globalThis.chrome = {
    cookies: {
      async getAll({ domain }) {
        return cookiesByDomain[domain] || [];
      },
    },
  };
}

test('getHoyoTokens returns null when cookies missing', async () => {
  installFakeChromeCookies({ '.hoyolab.com': [] });
  const { getHoyoTokens } = await import('../src/cookies.js?t=' + Math.random());
  assert.equal(await getHoyoTokens(), null);
});

test('getHoyoTokens maps ltoken_v2/ltuid_v2', async () => {
  installFakeChromeCookies({
    '.hoyolab.com': [
      { name: 'ltoken_v2', value: 'LT' },
      { name: 'ltuid_v2', value: 'UID' },
      { name: 'unrelated', value: 'x' },
    ],
  });
  const { getHoyoTokens } = await import('../src/cookies.js?t=' + Math.random());
  assert.deepEqual(await getHoyoTokens(), { ltoken: 'LT', ltuid: 'UID' });
});

test('getSkportCred reads SK_OAUTH_CRED_KEY', async () => {
  installFakeChromeCookies({
    '.skport.com': [{ name: 'SK_OAUTH_CRED_KEY', value: 'CRED' }],
  });
  const { getSkportCred } = await import('../src/cookies.js?t=' + Math.random());
  assert.equal(await getSkportCred(), 'CRED');
});

test('getSkportCred returns null when absent', async () => {
  installFakeChromeCookies({ '.skport.com': [] });
  const { getSkportCred } = await import('../src/cookies.js?t=' + Math.random());
  assert.equal(await getSkportCred(), null);
});
