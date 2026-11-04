/* Infolinks ownership verification on Filefit.
   The provider script is never loaded until an explicit visitor opt-in.
   This must not be interpreted as Infolinks approval or as AdSense consent. */
(() => {
  'use strict';
  const key = 'filefit_infolinks_ad_consent_v1';
  const loaderUrl = 'https://resources.infolinks.com/js/infolinks_main.js';
  let preference = null;
  let loaded = false;
  let panel = null;
  try { preference = localStorage.getItem(key); } catch (_) {}

  function save(value) {
    preference = value;
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function loadProvider() {
    if (loaded || preference !== 'allow') return;
    loaded = true;
    // Exact values provided by the Filefit publisher welcome email.
    window.infolinks_pid = 3449243;
    window.infolinks_wsid = 0;
    const element = document.createElement('script');
    element.src = loaderUrl;
    element.async = true;
    element.referrerPolicy = 'strict-origin-when-cross-origin';
    document.body.appendChild(element);
  }

  function close() { if (panel) { panel.remove(); panel = null; } }

  function choose(value) {
    const wasLoaded = loaded;
    save(value);
    close();
    if (value === 'allow') loadProvider();
    else if (wasLoaded) window.location.reload();
  }

  function openPanel() {
    if (panel) return;
    panel = document.createElement('section');
    panel.className = 'analytics-consent-banner infolinks-consent-banner';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Optional advertising preferences');
    panel.innerHTML =
      '<div class="analytics-consent-copy">' +
      '<strong>Optional Infolinks advertising</strong>' +
      '<p>Only if you choose Allow, Filefit will load an Infolinks script. It may use cookies and show sponsored content after approval. You can decline and continue using all tools. <a href="/privacy.html">Privacy details</a>.</p>' +
      '</div>' +
      '<div class="analytics-consent-actions">' +
      '<button class="infolinks-decline" type="button">No thanks</button>' +
      '<button class="analytics-consent-allow infolinks-allow" type="button">Allow Infolinks</button>' +
      '</div>';
    panel.querySelector('.infolinks-decline').addEventListener('click', () => choose('decline'));
    panel.querySelector('.infolinks-allow').addEventListener('click', () => choose('allow'));
    document.body.appendChild(panel);
  }

  function init() {
    const parent = document.querySelector('.site-footer .footer-links');
    if (!parent) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'analytics-preferences-button';
    button.textContent = 'Advertising preferences';
    button.setAttribute('aria-label', 'Configure optional Infolinks advertising');
    button.addEventListener('click', openPanel);
    parent.appendChild(button);
    if (preference === 'allow') loadProvider();
    // Do not show another banner automatically alongside existing GA4 consent.
    // Reviewers and visitors can activate the provider in Advertising preferences.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();