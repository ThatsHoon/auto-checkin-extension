const ACT_ID = 'e202406031448091';
const CHECKIN_URL = 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?lang=en-us';

export function buildCheckInRequest({ ltoken, ltuid }) {
  return {
    url: CHECKIN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-rpc-signgame': 'zzz' },
    body: JSON.stringify({ act_id: ACT_ID }),
    cookie: { ltoken_v2: ltoken, ltuid_v2: ltuid },
  };
}

export { parseCheckInResponse } from './genshin.js';
