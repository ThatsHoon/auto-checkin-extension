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

  const expectedSig = await buildSignature({
    path: '/web/v1/game/endfield/attendance',
    method: 'POST',
    body: '',
    timestamp: 1756123456,
    platform: '3',
    vName: '1.0.0',
    token: 'TOKEN456',
  });
  assert.equal(req.headers.sign, expectedSig);
});

test('parseCheckInResponse maps codes', () => {
  assert.equal(parseCheckInResponse({ code: 0, message: 'OK' }).status, 'success');
  assert.equal(parseCheckInResponse({ code: 10000, message: 'token expired' }).status, 'expired');
  assert.equal(parseCheckInResponse({ code: 1, message: 'Already signed' }).status, 'already');
});
