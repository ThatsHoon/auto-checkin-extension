export async function getHoyoTokens() {
  const cookies = await chrome.cookies.getAll({ domain: '.hoyolab.com' });
  const ltoken = cookies.find((c) => c.name === 'ltoken_v2')?.value;
  const ltuid = cookies.find((c) => c.name === 'ltuid_v2')?.value;
  if (!ltoken || !ltuid) return null;
  return { ltoken, ltuid };
}

export async function getSkportCred() {
  const cookies = await chrome.cookies.getAll({ domain: '.skport.com' });
  const cred = cookies.find((c) => c.name === 'SK_OAUTH_CRED_KEY')?.value;
  return cred || null;
}
