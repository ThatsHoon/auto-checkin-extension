import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTaskListRequest,
  parseTaskListResponse,
  buildCheckInRequest,
  parseCheckInResponse,
} from '../src/services/nikke.js';

test('buildTaskListRequest targets GetTaskListWithStatusV2 with intl_game_id=29080', () => {
  const req = buildTaskListRequest();
  assert.equal(
    req.url,
    'https://api.blablalink.com/lip/proxy/lipass/Points/GetTaskListWithStatusV2?get_top=true&intl_game_id=29080',
  );
  assert.equal(req.method, 'GET');
  const params = JSON.parse(req.headers['x-common-params']);
  assert.equal(params.game_id, '16');
  assert.equal(params.area_id, 'global');
  assert.equal(params.intl_game_id, '29080');
});

test('parseTaskListResponse finds DailyCheckIn task and completion state', () => {
  const notDone = parseTaskListResponse({
    tasks: [
      { task_id: 't-other', task_type: 2 },
      { task_id: 't-daily', task_type: 1, is_completed: false },
    ],
  });
  assert.equal(notDone.taskId, 't-daily');
  assert.equal(notDone.alreadyCompleted, false);

  const done = parseTaskListResponse({
    tasks: [{ task_id: 't-daily', task_type: 1, is_completed: true }],
  });
  assert.equal(done.alreadyCompleted, true);

  const missing = parseTaskListResponse({ tasks: [{ task_id: 't-other', task_type: 2 }] });
  assert.equal(missing.taskId, null);
});

test('buildCheckInRequest posts task_id to DailyCheckIn endpoint', () => {
  const req = buildCheckInRequest('t-daily');
  assert.equal(req.url, 'https://api.blablalink.com/lip/proxy/lipass/Points/DailyCheckIn');
  assert.equal(req.method, 'POST');
  assert.deepEqual(JSON.parse(req.body), { task_id: 't-daily' });
});

test('parseCheckInResponse maps codes', () => {
  assert.equal(parseCheckInResponse({ code: 0, msg: '' }).status, 'success');
  assert.equal(parseCheckInResponse({ code: 303013, msg: 'not bound' }).status, 'not_bound');
  assert.equal(parseCheckInResponse({ code: 300001, msg: 'not logged in' }).status, 'not_logged_in');
  assert.equal(parseCheckInResponse({ code: 999, msg: 'weird' }).status, 'error');
});
