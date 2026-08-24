import { test } from 'node:test';
import assert from 'node:assert/strict';

function installFakeChromeDNR() {
  const calls = { add: [], remove: [] };
  globalThis.chrome = {
    declarativeNetRequest: {
      RuleActionType: { MODIFY_HEADERS: 'modifyHeaders' },
      HeaderOperation: { SET: 'set' },
      ResourceType: { XMLHTTPREQUEST: 'xmlhttprequest', OTHER: 'other' },
      async updateSessionRules({ addRules, removeRuleIds }) {
        if (addRules) calls.add.push(...addRules);
        if (removeRuleIds) calls.remove.push(...removeRuleIds);
      },
    },
  };
  return calls;
}

test('fetchWithHoyoCookie injects Cookie header rule then cleans it up', async () => {
  const calls = installFakeChromeDNR();
  let fetchedUrl, fetchedOptions;
  globalThis.fetch = async (url, options) => {
    fetchedUrl = url;
    fetchedOptions = options;
    return { json: async () => ({ retcode: 0, message: 'OK' }) };
  };

  const { fetchWithHoyoCookie } = await import('../src/http-hoyo.js?t=' + Math.random());

  const result = await fetchWithHoyoCookie({
    url: 'https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"act_id":"x"}',
    cookie: { ltoken_v2: 'LT', ltuid_v2: 'UID' },
  });

  assert.deepEqual(result, { retcode: 0, message: 'OK' });
  assert.equal(fetchedUrl, 'https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us');
  assert.equal(fetchedOptions.credentials, 'omit');

  assert.equal(calls.add.length, 1);
  const rule = calls.add[0];
  const cookieHeader = rule.action.requestHeaders.find((h) => h.header === 'Cookie');
  assert.equal(cookieHeader.value, 'ltoken_v2=LT; ltuid_v2=UID');

  assert.equal(calls.remove.length, 1);
  assert.equal(calls.remove[0], rule.id);
});
