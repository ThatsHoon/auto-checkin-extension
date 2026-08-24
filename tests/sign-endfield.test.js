import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { buildSignature } from '../src/sign-endfield.js';

function oracleSign({ path, method, body, timestamp, platform, vName, token }) {
  let stringToSign = path + (method === 'POST' ? (body || '') : '');
  stringToSign += String(timestamp);
  stringToSign += JSON.stringify({ platform, timestamp, dId: '', vName });

  const hmacHex = createHmac('sha256', token).update(stringToSign, 'utf8').digest('hex');
  return createHash('md5').update(hmacHex, 'utf8').digest('hex');
}

test('buildSignature matches independent HMAC-SHA256->MD5 oracle', async () => {
  const params = {
    path: '/web/v1/game/endfield/attendance',
    method: 'POST',
    body: JSON.stringify({ act_id: 'e202412121212121' }),
    timestamp: 1756123456,
    platform: '3',
    vName: '1.0.0',
    token: 'fake-sk-token-cache-key-value',
  };

  const expected = oracleSign(params);
  const actual = await buildSignature(params);
  assert.equal(actual, expected);
});

test('buildSignature is sensitive to timestamp (no accidental caching)', async () => {
  const base = {
    path: '/web/v1/game/endfield/attendance',
    method: 'POST',
    body: '{}',
    platform: '3',
    vName: '1.0.0',
    token: 'token-abc',
  };
  const sig1 = await buildSignature({ ...base, timestamp: 1000 });
  const sig2 = await buildSignature({ ...base, timestamp: 2000 });
  assert.notEqual(sig1, sig2);
});

test('buildSignature excludes body for non-POST methods (GET)', async () => {
  const baseParams = {
    path: '/web/v1/game/endfield/attendance',
    timestamp: 1756123456,
    platform: '3',
    vName: '1.0.0',
    token: 'token-xyz',
  };

  // GET with body should produce same signature as GET with empty body
  const sigGetWithBody = await buildSignature({
    ...baseParams,
    method: 'GET',
    body: 'should-be-ignored-for-get',
  });

  const sigGetWithoutBody = await buildSignature({
    ...baseParams,
    method: 'GET',
    body: '',
  });

  assert.equal(sigGetWithBody, sigGetWithoutBody);
});
