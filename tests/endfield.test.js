import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckInRequest, parseCheckInResponse } from '../src/services/endfield.js';
import { buildSignature } from '../src/sign-endfield.js';

test('buildCheckInRequest assembles headers with role/server and valid signature', async () => {
  const fixedNow = () => 1756123456;
  const req = await buildCheckInRequest({
    cred: 'CRED123',
    token: 'TOKEN456',
    roleId: 'RID789',
    server: '2',
    lang: 'ko',
    now: fixedNow,
  });

  assert.equal(req.url, 'https://zonai.skport.com/web/v1/game/endfield/attendance');
  assert.equal(req.method, 'POST');
  assert.equal(req.headers.cred, 'CRED123');
  assert.equal(req.headers['sk-game-role'], '3_RID789_2');
  assert.equal(req.headers['sk-language'], 'ko');
  assert.equal(req.headers.timestamp, '1756123456');
  assert.equal(req.headers.platform, '3');
  assert.equal(req.headers.vName, '1.0.0');

  // timestamp passed as a STRING here, matching req.headers.timestamp exactly —
  // this is the actual contract buildCheckInRequest must honor (see comment in
  // src/services/endfield.js). A number here would silently produce a
  // different, wrong signature.
  const expectedSig = await buildSignature({
    path: '/web/v1/game/endfield/attendance',
    method: 'POST',
    body: '',
    timestamp: '1756123456',
    platform: '3',
    vName: '1.0.0',
    token: 'TOKEN456',
  });
  assert.equal(req.headers.sign, expectedSig);

  // Regression guard: passing timestamp as a Number instead of a String changes
  // the JSON embedded in the signed payload (unquoted vs quoted), so it MUST
  // produce a different signature. If this assertion ever fails, the string/number
  // distinction has stopped mattering to buildSignature and the bug above could
  // silently reappear.
  const wrongTypeSig = await buildSignature({
    path: '/web/v1/game/endfield/attendance',
    method: 'POST',
    body: '',
    timestamp: 1756123456,
    platform: '3',
    vName: '1.0.0',
    token: 'TOKEN456',
  });
  assert.notEqual(req.headers.sign, wrongTypeSig);
});

test('parseCheckInResponse maps codes', () => {
  assert.equal(parseCheckInResponse({ code: 0, message: 'OK' }).status, 'success');
  assert.equal(parseCheckInResponse({ code: 10000, message: 'token expired' }).status, 'expired');
  assert.equal(parseCheckInResponse({ code: 1, message: 'Already signed' }).status, 'already');
  assert.equal(parseCheckInResponse({ code: 999, message: 'Unknown error' }).status, 'error');
});

test('buildCheckInRequest default now uses unix seconds not milliseconds', async () => {
  const req = await buildCheckInRequest({
    cred: 'CRED123',
    token: 'TOKEN456',
    roleId: 'RID789',
    server: '2',
    lang: 'ko',
  });

  const timestamp = Number(req.headers.timestamp);
  assert(timestamp < 99999999999, 'timestamp should be 10-digit unix seconds, not 13-digit milliseconds');
  assert.equal(String(timestamp).length, 10, 'timestamp should be 10 digits');
});
