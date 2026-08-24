const ACT_ID = 'e202102251931481';
const CHECKIN_URL = 'https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us';

export function buildCheckInRequest({ ltoken, ltuid }) {
  return {
    url: CHECKIN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ act_id: ACT_ID }),
    cookie: { ltoken_v2: ltoken, ltuid_v2: ltuid },
  };
}

export function parseCheckInResponse(json) {
  const { retcode, message } = json;
  switch (retcode) {
    case 0:
      return { status: 'success', message };
    case -5003:
      return { status: 'already', message };
    case -100:
    case 10001:
      return { status: 'expired', message };
    case -500004:
      return { status: 'rate_limited', message };
    case 5001:
      return { status: 'need_captcha', message };
    default:
      return { status: 'error', message: `${retcode}: ${message}` };
  }
}
