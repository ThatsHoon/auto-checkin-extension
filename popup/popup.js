// popup/popup.js
import { getAccounts, setAccount, getLogs } from '../src/storage.js';

const GAMES = [
  { key: 'genshin', label: '원신' },
  { key: 'starrail', label: '붕괴: 스타레일' },
  { key: 'zzz', label: '젠레스 존 제로' },
  { key: 'endfield', label: '엔드필드' },
  { key: 'nikke', label: '니케' },
];

function maskId(id) {
  const str = String(id);
  if (str.length <= 4) return str;
  return `${'*'.repeat(str.length - 4)}${str.slice(-4)}`;
}

function statusLabel(game, accountData) {
  if (!accountData) return null;
  if (game === 'endfield') {
    if (!accountData.roleId) return null;
    return `✓ Role ${accountData.roleId}`;
  }
  if (game === 'nikke') {
    return accountData.linked ? '✓ 연동됨' : null;
  }
  if (accountData.ltuid) {
    return `✓ UID ${maskId(accountData.ltuid)}`;
  }
  return null;
}

async function renderGameList() {
  const accounts = await getAccounts();
  const list = document.getElementById('game-list');
  list.innerHTML = '';

  for (const { key, label } of GAMES) {
    const li = document.createElement('li');

    const icon = document.createElement('div');
    icon.className = 'game-icon';
    icon.textContent = label[0];
    li.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'game-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'game-name';
    nameEl.textContent = label;
    info.appendChild(nameEl);

    const statusEl = document.createElement('div');
    const label2 = statusLabel(key, accounts[key]);
    if (label2) {
      statusEl.className = 'game-status';
      statusEl.textContent = label2;
    } else {
      statusEl.className = 'game-status unregistered';
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = '계정 등록하기';
      link.dataset.game = key;
      statusEl.appendChild(link);
    }
    info.appendChild(statusEl);

    li.appendChild(info);
    list.appendChild(li);
  }
}

async function renderLogs() {
  const logs = await getLogs();
  const list = document.getElementById('logs');
  list.innerHTML = '';
  for (const entry of logs) {
    const li = document.createElement('li');
    const time = new Date(entry.timestamp).toLocaleString('ko-KR');
    li.textContent = `[${time}] ${entry.game}: ${entry.status} — ${entry.message}`;
    list.appendChild(li);
  }
}

function showEndfieldForm() {
  document.getElementById('endfield-form').classList.remove('hidden');
}

function hideEndfieldForm() {
  document.getElementById('endfield-form').classList.add('hidden');
}

async function loadEndfieldForm() {
  const accounts = await getAccounts();
  const ef = accounts.endfield;
  if (ef) {
    document.getElementById('ef-role-id').value = ef.roleId || '';
    document.getElementById('ef-server').value = ef.server || '2';
  }
}

document.getElementById('game-list').addEventListener('click', async (event) => {
  const link = event.target.closest('a[data-game]');
  if (!link) return;
  event.preventDefault();
  const game = link.dataset.game;

  if (game === 'endfield') {
    showEndfieldForm();
    return;
  }

  if (game === 'nikke') {
    const result = await chrome.runtime.sendMessage({ type: 'REGISTER_NIKKE' });
    if (!result.ok) alert(result.error);
    await renderGameList();
    return;
  }

  const result = await chrome.runtime.sendMessage({ type: 'REGISTER_HOYO', game });
  if (!result.ok) alert(result.error);
  await renderGameList();
});

document.getElementById('ef-save').addEventListener('click', async () => {
  const roleId = document.getElementById('ef-role-id').value.trim();
  const server = document.getElementById('ef-server').value;
  const accounts = await getAccounts();
  const existing = accounts.endfield || {};
  await setAccount('endfield', { ...existing, roleId, server });
  hideEndfieldForm();
  await renderGameList();
});

document.getElementById('ef-cancel').addEventListener('click', () => {
  hideEndfieldForm();
});

document.getElementById('run-now').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'RUN_CHECKIN_NOW' });
  setTimeout(() => {
    renderGameList();
    renderLogs();
  }, 1500);
});

loadEndfieldForm();
renderGameList();
renderLogs();
