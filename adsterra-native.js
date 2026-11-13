/* Filefit Adsterra Native Banner.
 * India: show automatically after a same-origin country-level check.
 * Other/unknown regions: never load before explicit user permission.
 * Respect prior opt-outs and Global Privacy Control. On file-processing
 * pages (including the homepage), an opaque-origin sandbox isolates
 * advertising from user-selected files. */
(() => {
  'use strict';
  const slot = document.querySelector('[data-filefit-ad-slot="hero"], [data-filefit-ad-slot="after-content"]');
  if (!slot) return;

  const key = 'filefit_adsterra_sitewide_choice_v1';
  const unitId = 'container-59f82937b99fbf55529d074d93094c6b';
  const scriptSrc = 'https://bauval.org/21/59f82937b99fbf55529d074d93094c6b';
  const isToolPage = location.pathname === '/' || location.pathname.startsWith('/tools/');
  let loaded = false;
  let choice = null;
  let pendingRequest = null;
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'allow' || stored === 'decline') choice = stored;
  } catch (_) {}

  const el = (tag, className = '', text = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  function save(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function hasGlobalOptOut() {
    return navigator.globalPrivacyControl === true;
  }
  function optOut() {
    save('decline');
    if (pendingRequest) pendingRequest.abort();
    // Reload to end further third-party activity in this tab.
    if (loaded) { location.reload(); return; }
    slot.hidden = true;
    slot.replaceChildren();
  }
  function showNativeAds() {
    if (loaded || hasGlobalOptOut() || choice === 'decline') return;
    loaded = true;
    const title = el('div', 'filefit-ad-label', 'Advertisement');
    slot.replaceChildren(title);
    slot.hidden = false;

    if (isToolPage) {
      // A sandboxed frame without allow-same-origin cannot inspect the
      // parent tool DOM or its selected local files.
      const frame = document.createElement('iframe');
      frame.className = 'filefit-native-ad-frame';
      frame.title = 'Sponsored advertisements';
      frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.setAttribute('loading', 'lazy');
      frame.srcdoc =
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;' +
        'font-family:system-ui,sans-serif}*{box-sizing:border-box}</style></head><body>' +
        '<div id="' + unitId + '"></div>' +
        '<script async data-cfasync="false" src="' + scriptSrc + '"><\/script>' +
        '</body></html>';
      frame.onerror = () => { title.textContent = 'Advertisement unavailable'; };
      slot.append(frame);
      return;
    }

    const container = el('div', 'filefit-native-ad');
    container.id = unitId;
    slot.append(container);
    const script = document.createElement('script');
    script.async = true;
    script.dataset.cfasync = 'false';
    script.src = scriptSrc;
    script.onerror = () => { title.textContent = 'Advertisement unavailable'; };
    slot.append(script);
  }
  function showPrompt() {
    if (hasGlobalOptOut() || choice === 'decline') return;
    if (loaded) {
      if (slot.querySelector('.filefit-ad-preferences')) return;
      const preferences = el('div', 'filefit-ad-consent filefit-ad-preferences');
      preferences.append(el('strong', '', 'Advertising preferences'),
        el('p', '', 'Advertisements are enabled. You can disable sponsored content on future visits.'));
      const disable = el('button', 'filefit-ad-button', 'Turn off sponsored content');
      disable.type = 'button';
      disable.addEventListener('click', optOut);
      preferences.append(disable);
      slot.append(preferences);
      return;
    }

    const prompt = el('div', 'filefit-ad-consent');
    prompt.append(
      el('strong', '', 'Optional sponsored recommendations'),
      el('p', '', 'In your region, advertising needs your permission. Adsterra may use cookies or similar technologies. Filefit works without advertising.')
    );
    const privacy = el('a', '', 'Privacy details');
    privacy.href = '/privacy';
    prompt.append(privacy);
    const buttons = el('div', 'filefit-ad-consent-actions');
    const accept = el('button', 'filefit-ad-button', 'Show sponsored content');
    accept.type = 'button';
    accept.addEventListener('click', () => { save('allow'); showNativeAds(); });
    const decline = el('button', 'filefit-ad-button filefit-ad-secondary', 'Not now');
    decline.type = 'button';
    decline.addEventListener('click', optOut);
    buttons.append(accept, decline);
    prompt.append(buttons);
    slot.replaceChildren(prompt);
    slot.hidden = false;
  }
  function showPreferences() {
    if (hasGlobalOptOut()) return;
    if (choice === 'decline') {
      const box = el('div', 'filefit-ad-consent');
      box.append(el('strong', '', 'Advertising is disabled'));
      const enable = el('button', 'filefit-ad-button', 'Enable advertisements');
      enable.type = 'button';
      enable.addEventListener('click', () => { save('allow'); showNativeAds(); });
      box.append(enable);
      slot.replaceChildren(box);
      slot.hidden = false;
      return;
    }
    showPrompt();
  }

  async function checkRegion() {
    const controller = new AbortController();
    pendingRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch('/api/analytics-region', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Region lookup unavailable');
      const result = await response.json();
      // Never infer consent from analyticsMode or the browser locale.
      if (hasGlobalOptOut() || choice === 'decline') return;
      if (choice === 'allow' || result.adsterraMode === 'automatic') showNativeAds();
      else if (result.adsterraMode === 'opt-in') showPrompt();
      else showPrompt();
    } catch (_) {
      if (!hasGlobalOptOut() && choice !== 'decline') showPrompt();
    } finally {
      clearTimeout(timeout);
      if (pendingRequest === controller) pendingRequest = null;
    }
  }

  function initialize() {
    const footer = document.querySelector('.site-footer .footer-links');
    if (footer) {
      const preferences = el('button', 'analytics-preferences-button', 'Advertising preferences');
      preferences.type = 'button';
      preferences.addEventListener('click', showPreferences);
      footer.append(preferences);
    }
    if (hasGlobalOptOut() || choice === 'decline') return;
    if (choice === 'allow') { showNativeAds(); return; }
    checkRegion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else initialize();
})();
