import { test } from 'node:test';
import assert from 'node:assert/strict';

function installFakeChromeAlarms({ existing = null } = {}) {
  const state = { created: null, listeners: [] };
  globalThis.chrome = {
    alarms: {
      async get() {
        return existing;
      },
      async create(name, options) {
        state.created = { name, options };
      },
      onAlarm: {
        addListener(fn) {
          state.listeners.push(fn);
        },
      },
    },
  };
  return state;
}

test('ensureCheckInAlarm creates alarm with 30min period when none exists', async () => {
  const state = installFakeChromeAlarms({ existing: undefined });
  const { ensureCheckInAlarm, ALARM_NAME } = await import('../src/alarm.js?t=' + Math.random());
  await ensureCheckInAlarm();
  assert.equal(state.created.name, ALARM_NAME);
  assert.equal(state.created.options.periodInMinutes, 30);
});

test('ensureCheckInAlarm does nothing when alarm already exists', async () => {
  const state = installFakeChromeAlarms({ existing: { name: 'checkin-interval' } });
  const { ensureCheckInAlarm } = await import('../src/alarm.js?t=' + Math.random());
  await ensureCheckInAlarm();
  assert.equal(state.created, null);
});

test('onCheckInAlarm only fires handler for matching alarm name', async () => {
  const state = installFakeChromeAlarms({ existing: undefined });
  const { onCheckInAlarm } = await import('../src/alarm.js?t=' + Math.random());
  let fired = false;
  onCheckInAlarm(() => {
    fired = true;
  });
  state.listeners[0]({ name: 'checkin-interval' });
  assert.equal(fired, true);

  fired = false;
  state.listeners[0]({ name: 'something-else' });
  assert.equal(fired, false);
});
