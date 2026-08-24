import { buildSignature } from '../sign-endfield.js';

const CHECKIN_PATH = '/web/v1/game/endfield/attendance';
const CHECKIN_URL = `https://zonai.skport.com${CHECKIN_PATH}`;
const PLATFORM = '3';
const V_NAME = '1.0.0';

export async function buildCheckInRequest({ cred, token, roleId, server, lang, now = () => Math.floor(Date.now() / 1000) }) {
  const timestamp = String(now());
  const body = '';

  const headers = {
    Accept: '*/*',
    'Content-Type': 'application/json',
    Referer: 'https://game.skport.com/',
    Origin: 'https://game.skport.com',
    platform: PLATFORM,
    vName: V_NAME,
    cred,
    'sk-game-role': `3_${roleId}_${server}`,
    'sk-language': lang,
    timestamp,
  };

  headers.sign = await buildSignature({
    path: CHECKIN_PATH,
    method: 'POST',
    body,
    timestamp: Number(timestamp),
    platform: PLATFORM,
    vName: V_NAME,
    token,
  });

  return { url: CHECKIN_URL, method: 'POST', headers, body };
}

export function parseCheckInResponse(json) {
  const { code, message } = json;
  if (code === 10000) return { status: 'expired', message: message || 'token expired' };
  if (code === 0) return { status: 'success', message: message || 'OK' };
  if (message === 'OK') return { status: 'success', message };
  if (code === 1) return { status: 'already', message: message || 'Already signed' };
  return { status: 'error', message: message || `code ${code}` };
}
