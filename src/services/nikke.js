const BASE = 'https://api.blablalink.com/api';
const TASK_LIST_URL = `${BASE}/lip/proxy/lipass/Points/GetTaskListWithStatusV2?get_top=true&intl_game_id=29080`;
const CHECKIN_URL = `${BASE}/lip/proxy/lipass/Points/DailyCheckIn`;
const COLLECTION_STATUS_URL = `${BASE}/lip/proxy/lipass/Points/GetUserCollection`;
const COLLECTION_CLAIM_URL = `${BASE}/lip/proxy/lipass/Points/UserCompleteCollection`;
const DAILY_CHECK_IN_TASK_TYPE = 1;
const COLLECTION_STATUS_COMPLETE = 1;

function commonParams() {
  return JSON.stringify({
    game_id: '16',
    area_id: 'global',
    source: 'pc',
    intl_game_id: '29080',
    language: 'ko',
    env: 'prod',
    data_statistics_scene: 'outer',
    data_statistics_page_id: 'https://www.blablalink.com/mission',
    data_statistics_client_type: 'pc',
    data_statistics_lang: 'ko',
  });
}

function commonHeaders() {
  return {
    'x-common-params': commonParams(),
    'x-language': 'ko',
    'x-channel-type': '2',
  };
}

export function buildTaskListRequest() {
  return { url: TASK_LIST_URL, method: 'GET', headers: commonHeaders() };
}

export function parseTaskListResponse(json) {
  const task = (json.tasks || []).find((t) => t.task_type === DAILY_CHECK_IN_TASK_TYPE);
  if (!task) return { taskId: null, alreadyCompleted: false };
  return { taskId: task.task_id, alreadyCompleted: !!task.is_completed };
}

export function buildCheckInRequest(taskId) {
  return {
    url: CHECKIN_URL,
    method: 'POST',
    headers: { ...commonHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId }),
  };
}

export function parseCheckInResponse(json) {
  const { code, msg } = json;
  if (code === 0) return { status: 'success', message: msg || 'OK' };
  if (code === 303013) return { status: 'not_bound', message: msg || 'NIKKE account not bound' };
  if (code === 300001) return { status: 'not_logged_in', message: msg || 'game not logged in' };
  // blablalink's own production frontend treats this exact code as "already
  // checked in today" (its catch handler sets is_completed=true on 1001009
  // instead of showing an error) — confirmed by reading its live JS bundle.
  if (code === 1001009) return { status: 'already', message: msg || 'Already checked in today' };
  return { status: 'error', message: `${code}: ${msg}` };
}

// The DailyCheckIn call only marks the day as attended — the actual reward item
// is granted through a separate "collection" claim step (verified from the live
// blablalink.com bundle: every successful check-in is followed by a
// GetUserCollection status check, and if complete, a UserCompleteCollection call).
// Without this second step the check-in shows as done but the reward is never
// actually received.
export function buildCollectionStatusRequest(taskId) {
  return {
    url: `${COLLECTION_STATUS_URL}?task_id=${encodeURIComponent(taskId)}`,
    method: 'GET',
    headers: commonHeaders(),
  };
}

export function parseCollectionStatusResponse(json) {
  return { complete: json.status === COLLECTION_STATUS_COMPLETE };
}

export function buildCollectionClaimRequest(taskId) {
  return {
    url: COLLECTION_CLAIM_URL,
    method: 'POST',
    headers: { ...commonHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId }),
  };
}
