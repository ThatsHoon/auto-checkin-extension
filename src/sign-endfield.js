import { md5 } from './md5.js';

async function hmacSha256Hex(message, key) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildSignature({ path, method, body, timestamp, platform, vName, token }) {
  let stringToSign = path + (method === 'POST' ? (body || '') : '');
  stringToSign += String(timestamp);
  stringToSign += JSON.stringify({ platform, timestamp, dId: '', vName });

  const hmacHex = await hmacSha256Hex(stringToSign, token);
  return md5(hmacHex);
}
