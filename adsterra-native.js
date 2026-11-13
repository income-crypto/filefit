/* Filefit consent-aware Adsterra display placements.
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
  const isToolPage = location.pathname === '/' || location.pathname === '/index.html' || location.pathname.startsWith('/tools/');
  // Sponsored placements must not reserve a huge blank area if the provider
  // rejects a request or returns no ad creative.
  window.addEventListener('message', event => {
    if (!event.data || event.data.filefitAdFrameStatus !== 'failed' && event.data.filefitAdFrameStatus !== 'empty') return;
    const iframe = [...slot.querySelectorAll('iframe')].find(el => el.contentWindow === event.source);
    if (!iframe) return;
    iframe.hidden = true;
    iframe.style.display = 'none';
    if (iframe.classList.contains('filefit-native-ad-frame')) {
      const wrapper = iframe.closest('.filefit-hero-native-area');
      if (wrapper) wrapper.hidden = true;
    } else if (iframe.classList.contains('filefit-hero-banner-frame')) {
      const holder = iframe.closest('.filefit-hero-banner-holder');
      if (holder) {
        const heading = holder.previousElementSibling;
        if (heading && heading.classList.contains('filefit-ad-label')) heading.hidden = true;
        holder.hidden = true;
      }
    }
    if (!slot.querySelector('iframe:not([hidden])')) {
      const link = slot.querySelector('a.filefit-hero-sponsored-link');
      if (link) {
        const label = el('div', 'filefit-ad-label', 'Sponsored link');
        slot.replaceChildren(label, link);
      } else {
        slot.replaceChildren();
        slot.hidden = true;
      }
    }
  });
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
  // Additional owner-supplied hero formats. Keep the Popunder disabled: it
  // cannot display inside a rectangular hero slot and may open new windows
  // when visitors use Filefit. Never put third-party scripts in the file-tool DOM.
  const heroFormats = {
    banner: 'https://bauval.org/22/48bd9a5f41aab74f6f586af6529d4592',
    socialBar: 'https://bauval.org/14/01c683b010b0a5cffdaa8cc3396c4ce5',
    sponsoredLink: 'https://araplhn.org/4/073ae2ad4af0494cc88b680b60e9e903'
  };
  function isolatedAdFrame(title, body, className) {
    const iframe = document.createElement('iframe');
    iframe.title = title;
    iframe.className = className;
    iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    // Send only the publisher origin to display-ad providers; never send filenames.
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    // The hero's display banner should initialize without waiting for a scroll.
    iframe.setAttribute('loading', 'eager');
    iframe.srcdoc =
      '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;' +
      'font-family:system-ui,sans-serif}*{box-sizing:border-box}</style></head><body>' +
      '<script src="/ad-frame-monitor.js"><\/script>' +
      body + '</body></html>';
    return iframe;
  }
  function appendHeroFormats() {
    if (slot.dataset.filefitAdSlot !== 'hero') return;
    const nativeFrame = slot.querySelector('.filefit-native-ad-frame');
    if (!nativeFrame) return;
    const grid = el('div', 'filefit-hero-ad-grid');
    const primary = el('div', 'filefit-hero-native-area');
    primary.append(nativeFrame);
    grid.append(primary);

    const extras = el('div', 'filefit-hero-extra-ads');
    const bannerHeading = el('div', 'filefit-ad-label', 'Advertisement · 468 × 60 banner');
    const bannerHolder = el('div', 'filefit-hero-banner-holder');
    const atOptions = "{'key':'48bd9a5f41aab74f6f586af6529d4592','format':'iframe','height':60,'width':468,'params':{}}";
    const bannerBody = '<script>atOptions=' + atOptions + ';<\/script>' +
      '<script async data-cfasync="false" src="' + heroFormats.banner + '"><\/script>';
    const bannerFrame = isolatedAdFrame('Sponsored 468 by 60 banner', bannerBody, 'filefit-hero-banner-frame');
    bannerHolder.append(bannerFrame);
    const sizeBanner = () => {
      if (!bannerHolder.isConnected) return;
      const scale = Math.min(1, Math.max(1, bannerHolder.clientWidth) / 468);
      bannerFrame.style.transform = 'scale(' + scale + ')';
      bannerHolder.style.height = Math.ceil(60 * scale) + 'px';
    };
    window.addEventListener('resize', sizeBanner, { passive: true });
    requestAnimationFrame(sizeBanner);
    extras.append(bannerHeading, bannerHolder);

    const sponsored = el('a', 'filefit-hero-sponsored-link', 'Explore sponsored offers (external website)');
    sponsored.href = heroFormats.sponsoredLink;
    sponsored.target = '_blank';
    sponsored.rel = 'sponsored noopener noreferrer';
    sponsored.setAttribute('aria-label', 'Open a third-party sponsored offer in a new tab');
    extras.append(sponsored);

    const socialBox = el('div', 'filefit-social-option');
    const socialDescription = el('p', '', 'Optional Social Bar ads may display floating notices within a separate advertising box.');
    const enableSocial = el('button', 'filefit-ad-button filefit-social-enable', 'Enable optional Social Bar');
    enableSocial.type = 'button';
    enableSocial.addEventListener('click', () => {
      if (hasGlobalOptOut() || choice === 'decline') return;
      const socialBody = '<script async data-cfasync="false" src="' +
        heroFormats.socialBar + '"><\/script>';
      const socialFrame = isolatedAdFrame('Optional floating sponsored notices', socialBody, 'filefit-social-ad-frame');
      enableSocial.replaceWith(socialFrame);
    });
    socialBox.append(socialDescription, enableSocial);
    extras.append(socialBox);
    grid.append(extras);
    slot.append(grid);
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
      frame.setAttribute('loading', slot.dataset.filefitAdSlot === 'hero' ? 'eager' : 'lazy');
      frame.srcdoc =
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;' +
        'font-family:system-ui,sans-serif}*{box-sizing:border-box}</style></head><body>' +
        '<script src="/ad-frame-monitor.js"><\/script>' +
        '<div id="' + unitId + '"></div>' +
        '<script async data-cfasync="false" src="' + scriptSrc + '"><\/script>' +
        '</body></html>';
      frame.onerror = () => { title.textContent = 'Advertisement unavailable'; };
      slot.append(frame);
      appendHeroFormats();
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
  // No consent prompt is imposed on an undecided visitor. If full display ads
  // cannot lawfully run before opt-in, present a plain labeled sponsored link
  // without loading any remote tracking scripts. The footer still lets visitors
  // explicitly enable display ads via Advertising preferences.
  function showSponsoredFallback() {
    if (loaded || hasGlobalOptOut() || choice === 'decline') return;
    const label = el('div', 'filefit-ad-label', 'Advertisement');
    const sponsored = el('a', 'filefit-hero-sponsored-link', 'Explore sponsored offers (external website)');
    sponsored.href = heroFormats.sponsoredLink;
    sponsored.target = '_blank';
    sponsored.rel = 'sponsored noopener noreferrer';
    sponsored.setAttribute('aria-label', 'Open a third-party sponsored offer in a new tab');
    slot.replaceChildren(label, sponsored);
    slot.hidden = false;
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
      else if (result.adsterraMode === 'opt-in') showSponsoredFallback();
      else showSponsoredFallback();
    } catch (_) {
      if (!hasGlobalOptOut() && choice !== 'decline') showSponsoredFallback();
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
