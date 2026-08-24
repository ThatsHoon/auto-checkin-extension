const ACCOUNTS_KEY = 'accounts';
const LOGS_KEY = 'logs';
const MAX_LOGS = 50;

const DEFAULT_ACCOUNTS = { genshin: null, starrail: null, zzz: null, endfield: null, nikke: null };

export async function getAccounts() {
  const { [ACCOUNTS_KEY]: accounts } = await chrome.storage.local.get(ACCOUNTS_KEY);
  return { ...DEFAULT_ACCOUNTS, ...(accounts || {}) };
}

export async function setAccount(game, data) {
  const accounts = await getAccounts();
  accounts[game] = data;
  await chrome.storage.local.set({ [ACCOUNTS_KEY]: accounts });
}

export async function getLogs() {
  const { [LOGS_KEY]: logs } = await chrome.storage.local.get(LOGS_KEY);
  return logs || [];
}

export async function appendLog(entry) {
  const logs = await getLogs();
  logs.unshift(entry);
  await chrome.storage.local.set({ [LOGS_KEY]: logs.slice(0, MAX_LOGS) });
}

export async function clearLogs() {
  await chrome.storage.local.set({ [LOGS_KEY]: [] });
}
