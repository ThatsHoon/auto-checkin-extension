// popup/popup.js
import { getAccounts, setAccount, getLogs } from '../src/storage.js';

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

async function loadEndfieldForm() {
  const accounts = await getAccounts();
  const ef = accounts.endfield;
  if (ef) {
    document.getElementById('ef-role-id').value = ef.roleId || '';
    document.getElementById('ef-server').value = ef.server || '2';
  }
}

document.getElementById('ef-save').addEventListener('click', async () => {
  const roleId = document.getElementById('ef-role-id').value.trim();
  const server = document.getElementById('ef-server').value;
  const accounts = await getAccounts();
  const existing = accounts.endfield || {};
  await setAccount('endfield', { ...existing, roleId, server });
  alert('저장됨');
});

document.getElementById('run-now').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'RUN_CHECKIN_NOW' });
  setTimeout(renderLogs, 1500);
});

loadEndfieldForm();
renderLogs();
