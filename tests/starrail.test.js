import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckInRequest, parseCheckInResponse } from '../src/services/starrail.js';

test('buildCheckInRequest targets starrail sign API', () => {
  const req = buildCheckInRequest({ ltoken: 'LT', ltuid: 'UID' });
  assert.equal(req.url, 'https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=en-us');
  assert.deepEqual(JSON.parse(req.body), { act_id: 'e202303301540311' });
});

test('parseCheckInResponse maps success', () => {
  assert.equal(parseCheckInResponse({ retcode: 0, message: 'OK' }).status, 'success');
});
