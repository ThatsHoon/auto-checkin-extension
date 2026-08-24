function generateRuleId() {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

// Injects forbidden request headers (Cookie, Origin, Referer, ...) via a temporary
// declarativeNetRequest session rule scoped to `url`, runs the fetch, then removes
// the rule. Plain fetch() cannot set these headers (Fetch spec forbidden headers) —
// Chrome silently strips them — so this is the only way to send them from a
// service worker's fetch() call.
export async function fetchWithInjectedHeaders(url, options, headersToInject) {
  const ruleId = generateRuleId();

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: headersToInject.map(({ header, value }) => ({
            header,
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value,
          })),
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
    return await fetch(url, options);
  } finally {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
  }
}

export async function fetchWithHoyoCookie(request) {
  const { url, method, headers, body, cookie } = request;
  const cookieValue = Object.entries(cookie)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const res = await fetchWithInjectedHeaders(url, { method, headers, body, credentials: 'omit' }, [
    { header: 'Cookie', value: cookieValue },
  ]);
  return await res.json();
}
