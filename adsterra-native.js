/* Filefit's opt-in Adsterra Native Banner, on public pages.
 * Third-party ad code is requested only after explicit visitor opt-in.
 * Keep banners below page content, never near upload or download controls. */
(() => {
  'use strict';
  const slot = document.querySelector('[data-filefit-ad-slot="after-content"]');
  if (!slot) return;
  const key = 'filefit_adsterra_sitewide_choice_v1';
  const unitId = 'container-59f82937b99fbf55529d074d93094c6b';
  const scriptSrc = 'https://bauval.org/21/59f82937b99fbf55529d074d93094c6b';
  let loaded = false;
  let choice = null;
  try {
    const value = localStorage.getItem(key);
    if (value === 'allow' || value === 'decline') choice = value;
  } catch (_) {}

  function save(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function optOut() {
    save('decline');
    // Removing third-party JS cannot undo already executed code.
    // A reload stops additional ad loading on this site.
    if (loaded) { location.reload(); return; }
    slot.hidden = true;
    slot.replaceChildren();
  }
  function showPrompt() {
    if (loaded) {
      if (slot.querySelector('.filefit-ad-preferences')) return;
      const box = element('div', 'filefit-ad-consent filefit-ad-preferences');
      box.append(
        element('strong', '', 'Advertising preferences'),
        element('p', '', 'Sponsored recommendations are enabled on Filefit pages. You can turn them off for future visits.')
      );
      const disable = element('button', 'filefit-ad-button', 'Turn off sponsored content');
      disable.type = 'button';
      disable.addEventListener('click', optOut);
      box.append(disable);
      // Keep the displayed ad intact while reviewing preferences.
      slot.appendChild(box);
      slot.hidden = false;
      return;
    }
    const box = element('div', 'filefit-ad-consent');
    box.append(
      element('strong', '', 'Optional sponsored recommendations'),
      element('p', '', 'If you choose to show them, Adsterra will load third-party advertising code that can access information on this page and may use cookies or similar technology. Do not enable it when working with sensitive files. Filefit tools work without ads.')
    );
    const link = document.createElement('a');
    link.href = '/privacy';
    link.textContent = 'Privacy details';
    box.append(link);
    const buttons = element('div', 'filefit-ad-consent-actions');
    const accept = element('button', 'filefit-ad-button', 'Show sponsored content');
    accept.type = 'button';
    accept.addEventListener('click', () => { save('allow'); showNativeAds(); });
    const decline = element('button', 'filefit-ad-button filefit-ad-secondary', 'Not now');
    decline.type = 'button';
    decline.addEventListener('click', optOut);
    buttons.append(accept, decline);
    box.append(buttons);
    slot.replaceChildren(box);
    slot.hidden = false;
  }
  function showNativeAds() {
    if (loaded) return;
    loaded = true;
    const title = element('div', 'filefit-ad-label', 'Advertisement');
    const container = document.createElement('div');
    container.id = unitId;
    container.className = 'filefit-native-ad';
    slot.replaceChildren(title, container);
    slot.hidden = false;
    const script = document.createElement('script');
    script.async = true;
    script.dataset.cfasync = 'false';
    script.src = scriptSrc;
    script.onerror = () => {
      title.textContent = 'Advertisement unavailable';
    };
    // Append only after the target container exists.
    slot.appendChild(script);
  }
  function initialize() {
    const footer = document.querySelector('.site-footer .footer-links');
    if (footer) {
      const settings = element('button', 'analytics-preferences-button', 'Advertising preferences');
      settings.type = 'button';
      settings.addEventListener('click', showPrompt);
      footer.appendChild(settings);
    }
    if (choice === 'allow') showNativeAds();
    else if (choice !== 'decline') showPrompt();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else initialize();
})();