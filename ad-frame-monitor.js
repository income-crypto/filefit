/* Observe sandboxed advertising frames without exposing uploaded files.
 * Report vendor script failures or no visible creative; do not simulate ads. */
(() => {
  'use strict';
  let sent = false;
  const report = status => {
    if (sent) return;
    sent = true;
    window.parent.postMessage({ filefitAdFrameStatus: status }, '*');
  };
  window.addEventListener('error', event => {
    const target = event.target;
    if (target?.tagName === 'SCRIPT' && /bauval\.org/i.test(target.src || '')) {
      report('failed');
    }
  }, true);
  // The vendor may respond with 200 and no creative. Give it time to render,
  // but don't leave hundreds of pixels of empty advertising on a tool page.
  const hasCreative = () => {
    const container = document.getElementById('container-59f82937b99fbf55529d074d93094c6b');
    if (container) {
      return !!container.querySelector('img, iframe, a[href], video') ||
        [...container.children].some(node => node.tagName !== 'SCRIPT' && node.getBoundingClientRect().height > 0);
    }
    return !!document.body.querySelector('iframe, img, a[href], video');
  };
  setTimeout(() => report(hasCreative() ? 'ready' : 'empty'), 8500);
})();
