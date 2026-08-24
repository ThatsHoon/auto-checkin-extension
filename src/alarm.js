export const ALARM_NAME = 'checkin-interval';

export async function ensureCheckInAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (existing) return;
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 30 });
}

export function onCheckInAlarm(handler) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) handler();
  });
}
