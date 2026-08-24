import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckInRequest } from '../src/services/zzz.js';

test('buildCheckInRequest targets zzz sign API with x-rpc-signgame header', () => {
  const req = buildCheckInRequest({ ltoken: 'LT', ltuid: 'UID' });
  assert.equal(req.url, 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?lang=en-us');
  assert.equal(req.headers['x-rpc-signgame'], 'zzz');
  assert.deepEqual(JSON.parse(req.body), { act_id: 'e202406031448091' });
});
