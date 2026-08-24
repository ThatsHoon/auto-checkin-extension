import * as genshin from '../src/services/genshin.js';
import * as starrail from '../src/services/starrail.js';
import * as zzz from '../src/services/zzz.js';
import * as endfield from '../src/services/endfield.js';
import * as nikke from '../src/services/nikke.js';
import { getAccounts, setAccount, appendLog } from '../src/storage.js';
import { getHoyoTokens, getSkportCred } from '../src/cookies.js';
import { fetchWithHoyoCookie, fetchWithInjectedHeaders } from '../src/http-hoyo.js';
import { ensureCheckInAlarm, onCheckInAlarm } from '../src/alarm.js';

const HOYO_SERVICES = { genshin, starrail, zzz };
const HOYO_GAME_NAMES = new Set(Object.keys(HOYO_SERVICES));

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runHoyoGame(gameName, service) {
  const tokens = await getHoyoTokens();
  if (!tokens) {
    await appendLog({ game: gameName, timestamp: Date.now(), status: 'unregistered', message: '로그인 쿠키 없음' });
    return;
  }

  const req = service.buildCheckInRequest(tokens);
  let json = await fetchWithHoyoCookie(req);
  let result = service.parseCheckInResponse(json);

  if (result.status === 'rate_limited') {
    await delay(1000 + Math.floor(Math.random() * 1000));
    json = await fetchWithHoyoCookie(req);
    result = service.parseCheckInResponse(json);
  }

  await appendLog({ game: gameName, timestamp: Date.now(), status: result.status, message: result.message });
}

async function runEndfield() {
  const accounts = await getAccounts();
  const account = accounts.endfield;
  if (!account || !account.token || !account.roleId) {
    await appendLog({ game: 'endfield', timestamp: Date.now(), status: 'unregistered', message: '토큰 또는 역할ID 없음' });
    return;
  }

  const cred = await getSkportCred();
  if (!cred) {
    await appendLog({ game: 'endfield', timestamp: Date.now(), status: 'expired', message: 'SK_OAUTH_CRED_KEY 쿠키 없음' });
    return;
  }

  const req = await endfield.buildCheckInRequest({
    cred,
    token: account.token,
    roleId: account.roleId,
    server: account.server,
    lang: 'ko',
  });

  // Origin/Referer are Fetch-spec forbidden request headers — a plain fetch() call
  // silently drops them, so they must be injected via declarativeNetRequest instead.
  const res = await fetchWithInjectedHeaders(
    req.url,
    { method: req.method, headers: req.headers, body: req.body || undefined },
    [
      { header: 'Origin', value: req.headers.Origin },
      { header: 'Referer', value: req.headers.Referer },
    ],
  );
  const json = await res.json();
  const result = endfield.parseCheckInResponse(json);

  await appendLog({ game: 'endfield', timestamp: Date.now(), status: result.status, message: result.message });
}

async function runNikke() {
  const listReq = nikke.buildTaskListRequest();
  const listRes = await fetch(listReq.url, { method: listReq.method, headers: listReq.headers, credentials: 'include' });
  const listJson = await listRes.json();

  if (listJson.code === 300001) {
    await appendLog({ game: 'nikke', timestamp: Date.now(), status: 'not_logged_in', message: '블라블라링크 로그인 필요' });
    return;
  }
  if (listJson.code === 303013) {
    await appendLog({ game: 'nikke', timestamp: Date.now(), status: 'not_bound', message: 'NIKKE account not bound' });
    return;
  }
  if (listJson.code !== undefined && listJson.code !== 0) {
    await appendLog({ game: 'nikke', timestamp: Date.now(), status: 'error', message: listJson.msg || `code ${listJson.code}` });
    return;
  }

  const { taskId, alreadyCompleted } = nikke.parseTaskListResponse(listJson.data || listJson);
  if (!taskId) {
    await appendLog({ game: 'nikke', timestamp: Date.now(), status: 'error', message: '출석 태스크를 찾지 못함' });
    return;
  }
  if (alreadyCompleted) {
    await appendLog({ game: 'nikke', timestamp: Date.now(), status: 'already', message: '이미 출석 완료' });
    return;
  }

  const checkinReq = nikke.buildCheckInRequest(taskId);
  const checkinRes = await fetch(checkinReq.url, {
    method: checkinReq.method,
    headers: checkinReq.headers,
    body: checkinReq.body,
    credentials: 'include',
  });
  const checkinJson = await checkinRes.json();
  const result = nikke.parseCheckInResponse(checkinJson);

  await appendLog({ game: 'nikke', timestamp: Date.now(), status: result.status, message: result.message });
}

async function runGameSafely(gameName, fn) {
  try {
    await fn();
  } catch (error) {
    try {
      await appendLog({ game: gameName, timestamp: Date.now(), status: 'error', message: error.message || String(error) });
    } catch (logError) {
      console.error(`[runGameSafely] failed to log error for ${gameName}:`, logError);
    }
  }
}

export async function checkInAll() {
  for (const [gameName, service] of Object.entries(HOYO_SERVICES)) {
    await runGameSafely(gameName, () => runHoyoGame(gameName, service));
  }
  await runGameSafely('endfield', runEndfield);
  await runGameSafely('nikke', runNikke);
}

async function registerHoyo(gameName) {
  if (!HOYO_GAME_NAMES.has(gameName)) {
    return { ok: false, error: `unknown game: ${gameName}` };
  }
  const tokens = await getHoyoTokens();
  if (!tokens) {
    return { ok: false, error: '로그인 쿠키 없음 — hoyolab.com에 먼저 로그인하세요' };
  }
  await setAccount(gameName, { ltuid: tokens.ltuid });
  return { ok: true, ltuid: tokens.ltuid };
}

async function registerNikke() {
  const listReq = nikke.buildTaskListRequest();
  const listRes = await fetch(listReq.url, { method: listReq.method, headers: listReq.headers, credentials: 'include' });
  const listJson = await listRes.json();

  if (listJson.code === 300001) {
    return { ok: false, error: '블라블라링크 로그인 필요' };
  }
  if (listJson.code === 303013) {
    return { ok: false, error: 'NIKKE 계정 연동 필요' };
  }
  if (listJson.code !== undefined && listJson.code !== 0) {
    return { ok: false, error: listJson.msg || `code ${listJson.code}` };
  }

  await setAccount('nikke', { linked: true });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REGISTER_HOYO') {
    registerHoyo(message.game)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }
  if (message.type === 'REGISTER_NIKKE') {
    registerNikke()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }
  if (message.type === 'SKPORT_TOKEN_CAPTURED') {
    (async () => {
      const accounts = await getAccounts();
      const existing = accounts.endfield || {};
      await setAccount('endfield', { ...existing, token: message.token });
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message.type === 'RUN_CHECKIN_NOW') {
    checkInAll()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }
});

chrome.runtime.onStartup.addListener(checkInAll);
chrome.runtime.onInstalled.addListener(checkInAll);

ensureCheckInAlarm();
onCheckInAlarm(checkInAll);
