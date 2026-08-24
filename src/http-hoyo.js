function generateRuleId() {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

export async function fetchWithHoyoCookie(request) {
  const { url, method, headers, body, cookie } = request;
  const cookieValue = Object.entries(cookie)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  const ruleId = generateRuleId();

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: 'Cookie',
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: cookieValue,
            },
          ],
        },
        condition: {
          urlFilter: url,
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.OTHER,
          ],
        },
      },
    ],
  });

  try {
    const res = await fetch(url, { method, headers, body, credentials: 'omit' });
    return await res.json();
  } finally {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
  }
}
