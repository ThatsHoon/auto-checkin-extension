// content-scripts/skport-capture.js
(function captureSkportToken() {
  const token = localStorage.getItem('SK_TOKEN_CACHE_KEY');
  if (!token) return;

  chrome.runtime.sendMessage({ type: 'SKPORT_TOKEN_CAPTURED', token });
})();
