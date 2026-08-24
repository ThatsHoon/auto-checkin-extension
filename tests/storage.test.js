import { test } from 'node:test';
import assert from 'node:assert/strict';

function installFakeChromeStorage() {
  const store = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          if (typeof keys === 'string') return { [keys]: store[keys] };
          const result = {};
          for (const k of keys) result[k] = store[k];
          return result;
        },
        async set(items) {
          Object.assign(store, items);
        },
      },
    },
  };
  return store;
}

test('getAccounts returns defaults when empty', async () => {
  installFakeChromeStorage();
  const { getAccounts } = await import('../src/storage.js?t=' + Math.random());
  const accounts = await getAccounts();
  assert.deepEqual(accounts, { genshin: null, starrail: null, zzz: null, endfield: null, nikke: null });
});

test('setAccount persists and getAccounts reflects it', async () => {
  installFakeChromeStorage();
  const { getAccounts, setAccount } = await import('../src/storage.js?t=' + Math.random());
  await setAccount('endfield', { cred: 'C', roleId: 'R', server: '2' });
  const accounts = await getAccounts();
  assert.deepEqual(accounts.endfield, { cred: 'C', roleId: 'R', server: '2' });
});

test('appendLog caps at 50 entries, newest first', async () => {
  installFakeChromeStorage();
  const { appendLog, getLogs } = await import('../src/storage.js?t=' + Math.random());
  for (let i = 0; i < 55; i++) {
    await appendLog({ game: 'genshin', timestamp: i, status: 'success', message: `n${i}` });
  }
  const logs = await getLogs();
  assert.equal(logs.length, 50);
  assert.equal(logs[0].message, 'n54');
  assert.equal(logs[49].message, 'n5');
});

test('clearLogs empties the log list', async () => {
  installFakeChromeStorage();
  const { appendLog, clearLogs, getLogs } = await import('../src/storage.js?t=' + Math.random());
  await appendLog({ game: 'genshin', timestamp: 1, status: 'success', message: 'x' });
  await clearLogs();
  const logs = await getLogs();
  assert.deepEqual(logs, []);
});
