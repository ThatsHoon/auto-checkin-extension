const ACT_ID = 'e202303301540311';
const CHECKIN_URL = 'https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=en-us';

export function buildCheckInRequest({ ltoken, ltuid }) {
  return {
    url: CHECKIN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ act_id: ACT_ID }),
    cookie: { ltoken_v2: ltoken, ltuid_v2: ltuid },
  };
}

export { parseCheckInResponse } from './genshin.js';
