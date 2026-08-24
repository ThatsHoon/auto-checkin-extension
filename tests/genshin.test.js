import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckInRequest, parseCheckInResponse } from '../src/services/genshin.js';

test('buildCheckInRequest targets genshin sign API with act_id body', () => {
  const req = buildCheckInRequest({ ltoken: 'LT', ltuid: 'UID' });
  assert.equal(req.url, 'https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us');
  assert.equal(req.method, 'POST');
  assert.deepEqual(JSON.parse(req.body), { act_id: 'e202102251931481' });
});

test('parseCheckInResponse maps retcodes', () => {
  assert.equal(parseCheckInResponse({ retcode: 0, message: 'OK', data: {} }).status, 'success');
  assert.equal(parseCheckInResponse({ retcode: -5003, message: 'Already', data: {} }).status, 'already');
  assert.equal(parseCheckInResponse({ retcode: -100, message: 'Auth expired', data: {} }).status, 'expired');
  assert.equal(parseCheckInResponse({ retcode: 10001, message: 'Not logged in', data: {} }).status, 'expired');
  assert.equal(parseCheckInResponse({ retcode: -500004, message: 'Too many', data: {} }).status, 'rate_limited');
  assert.equal(parseCheckInResponse({ retcode: 5001, message: 'Captcha', data: {} }).status, 'need_captcha');
  assert.equal(parseCheckInResponse({ retcode: -99999, message: 'Weird', data: {} }).status, 'error');
});
