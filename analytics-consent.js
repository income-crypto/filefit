/* Filefit GA4 region-aware collection.
   Cloudflare Web Analytics stays independent and cookie-free.
   Explicit visitor choices always take precedence over country classification.
   No GA4 request is made before a country check or affirmative consent.
   India only auto mode is a cautious, time-limited policy; review by May 2027. */
(() => {
  'use strict';

  const measurementId = 'G-Y134R5WL5D';
  const storageKey = 'filefit_google_analytics_choice_v1';
  const consentHistoryKey = 'filefit_ga4_consent_choice_time_v1';
  let choice = null;
  let regionMode = 'pending';
  let loaded = false;
  let banner = null;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'allow' || stored === 'decline') choice = stored;
  } catch (_) {}

  function persist(value) {
    choice = value;
    try {
      localStorage.setItem(storageKey, value);
      localStorage.setItem(consentHistoryKey, new Date().toISOString());
    } catch (_) {}
  }

  function hasGlobalOptOut() {
    return navigator.globalPrivacyControl === true;
  }

  function startGoogleAnalytics() {
    if (loaded || hasGlobalOptOut()) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    // GA4 only. AdSense and Google advertising consent are separate.
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Do not transmit upload URLs or arbitrary query-string values.
      page_location: window.location.origin + window.location.pathname
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function closeBanner() {
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  function revokeAnalyticsCookies() {
    const names = document.cookie.split(';').map(item => item.trim().split('=')[0]);
    for (const name of names) {
      if (name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name === '_gat') {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      }
    }
  }

  function setChoice(value) {
    const wasRunning = loaded;
    persist(value);
    closeBanner();
    if (value === 'allow') {
      startGoogleAnalytics();
      return;
    }
    if (loaded && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
    revokeAnalyticsCookies();
    // A loaded Google library must be discarded before subsequent pageviews.
    if (wasRunning) window.location.reload();
  }

  function showBanner() {
    if (banner) return;

    const gpc = hasGlobalOptOut();
    const running = loaded;
    const header = gpc ? 'Browser privacy preference' :
      running ? 'Google Analytics preferences' : 'Optional website analytics';
    const description = gpc ?
      'Your browser has requested no tracking. Filefit is respecting that signal and will not load Google Analytics.' :
      running ?
        'Google Analytics is enabled for this visit. You can turn it off at any time. Your selected files stay on your device.' :
        choice === 'decline' ?
          'Google Analytics is off because you previously declined. You can change your preference here.' :
          'Filefit uses cookie-free Cloudflare Analytics. You can also allow optional Google Analytics cookies to measure website visits. Your selected files stay on your device.';
    const declineLabel = running ? 'Turn off analytics' : 'Not now';
    const allowLabel = running ? 'Keep analytics on' : 'Allow analytics';

    banner = document.createElement('section');
    banner.className = 'analytics-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Google Analytics preferences');
    // Static, authored markup only; no visitor data is interpolated.
    banner.innerHTML =
      '<div class="analytics-consent-copy">' +
      '<strong>' + header + '</strong>' +
      '<p>' + description + ' <a href="/privacy">Privacy details</a>.</p>' +
      '</div>' +
      '<div class="analytics-consent-actions">' +
      '<button type="button" class="analytics-consent-decline"></button>' +
      '<button type="button" class="analytics-consent-allow"></button>' +
      '</div>';
    const deny = banner.querySelector('.analytics-consent-decline');
    const allow = banner.querySelector('.analytics-consent-allow');
    deny.textContent = gpc ? 'Close' : declineLabel;
    allow.textContent = gpc ? 'Analytics disabled' : allowLabel;
    deny.addEventListener('click', () => {
      if (gpc) closeBanner();
      else setChoice('decline');
    });
    allow.disabled = gpc;
    if (!gpc) allow.addEventListener('click', () => setChoice('allow'));
    document.body.appendChild(banner);
  }

  function addPreferencesControl() {
    const parent = document.querySelector('.site-footer .footer-links');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'analytics-preferences-button';
    button.textContent = 'Analytics preferences';
    button.addEventListener('click', showBanner);
    if (parent) parent.appendChild(button);
    else document.body.appendChild(button);
  }

  async function determineRegion() {
    let timeout;
    let controller;
    try {
      controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch('/api/analytics-region', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Region service unavailable');
      const result = await response.json();
      if (result?.analyticsMode !== 'automatic' && result?.analyticsMode !== 'opt-in') {
        throw new Error('Invalid region policy');
      }
      regionMode = result.analyticsMode;
      if (choice !== null) return; // Respect preference changed while resolving.
      if (regionMode === 'automatic') startGoogleAnalytics();
      else showBanner();
    } catch (_) {
      regionMode = 'unavailable';
      if (choice === null) showBanner(); // Fail closed: require explicit permission.
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  function init() {
    addPreferencesControl();
    if (hasGlobalOptOut()) return;
    if (choice === 'decline') return;
    if (choice === 'allow') {
      startGoogleAnalytics();
      return;
    }
    // No prior decision: ask Cloudflare for a coarse, server-side country
    // classification. Never infer location from browser language or timezone.
    determineRegion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
