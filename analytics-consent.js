/* Filefit: optional Google Analytics 4. Cloudflare Web Analytics is separate.
   The Google tag is never requested before the visitor explicitly opts in. */
(() => {
  'use strict';

  const measurementId = 'G-Y134R5WL5D';
  const storageKey = 'filefit_google_analytics_choice_v1';
  let loaded = false;
  let banner = null;
  let choice = null;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'allow' || saved === 'decline') choice = saved;
  } catch (_) {
    // Storage may be disabled. Ask again on the next visit.
  }

  function persist(value) {
    choice = value;
    try { localStorage.setItem(storageKey, value); } catch (_) {}
  }

  function startGoogleAnalytics() {
    if (loaded) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    // Consent Mode v2, Basic: no Google request is made before opt-in.
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
    window.gtag('config', measurementId, { send_page_view: true });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function hideBanner() {
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  function revokeGoogleCookies() {
    // Clear common first-party GA cookies; Google Consent Mode also stops future storage.
    const gaCookies = document.cookie.split(';').map(item => item.trim().split('=')[0]);
    for (const name of gaCookies) {
      if (name === '_ga' || name.startsWith('_ga_')) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      }
    }
  }

  function selectChoice(value) {
    const wasAllowed = choice === 'allow';
    persist(value);
    hideBanner();
    if (value === 'allow') {
      if (!loaded) startGoogleAnalytics();
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
    revokeGoogleCookies();
    // Discard the previously loaded tag when consent is withdrawn.
    if (wasAllowed || loaded) window.location.reload();
  }

  function showBanner() {
    if (banner) return;
    banner = document.createElement('section');
    banner.className = 'analytics-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Optional analytics preferences');
    banner.innerHTML =
      '<div class="analytics-consent-copy">' +
      '<strong>Optional website analytics</strong>' +
      '<p>Filefit uses cookie-free Cloudflare Analytics. With your permission, we\'d also use Google Analytics cookies to understand site visits. Your selected files stay on your device. <a href="/privacy.html">Privacy details</a>.</p>' +
      '</div>' +
      '<div class="analytics-consent-actions">' +
      '<button type="button" class="analytics-consent-decline">Not now</button>' +
      '<button type="button" class="analytics-consent-allow">Allow analytics</button>' +
      '</div>';
    banner.querySelector('.analytics-consent-allow').addEventListener('click', () => selectChoice('allow'));
    banner.querySelector('.analytics-consent-decline').addEventListener('click', () => selectChoice('decline'));
    document.body.appendChild(banner);
  }

  function addPreferencesControl() {
    const footerLinks = document.querySelector('.site-footer .footer-links');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'analytics-preferences-button';
    button.textContent = 'Analytics preferences';
    button.addEventListener('click', showBanner);
    if (footerLinks) footerLinks.appendChild(button);
    else document.body.appendChild(button);
  }

  function init() {
    addPreferencesControl();
    if (choice === 'allow') startGoogleAnalytics();
    else if (choice === null) showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
