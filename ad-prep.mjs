/* Filefit ad preparation: builds inert ad mount points only.
   AdSense and Infolinks scripts are NOT installed by this script.
   Provider IDs, explicit site approval, CMP and policy review are prerequisites
   to any future live ad-serving change. */
import { readFile, readdir, writeFile } from 'node:fs/promises';

const cfg = JSON.parse(await readFile('ads-config.json', 'utf8'));
if (cfg.schemaVersion !== 1 || cfg.site !== 'https://file-fit.pages.dev/') {
  throw new Error('Unexpected ads-config.json schema or domain');
}
for (const [name, settings] of [
  ['AdSense', cfg.adsense],
  ['Infolinks', cfg.infolinks]
]) {
  if (!settings || typeof settings.enabled !== 'boolean') {
    throw new Error('Missing ' + name + ' enabled setting');
  }
  if (settings.enabled) {
    // Deliberate safety barrier. Activation must be a separately reviewed PR
    // that adds exact verified ad snippets, approved ad formats and required CMP.
    throw new Error(name + ' ad serving is not configured. See AD_NETWORKS.md before enabling any provider.');
  }
}

const unit = cfg.adsterra;
if (unit?.enabled && (!unit.websiteApproved || !unit.optInOnly || !unit.allPublicPages || unit.contentPagesOnly ||
  unit.format !== 'NativeBanner' || unit.siteId !== '6180788' ||
  unit.scriptUrl !== 'https://bauval.org/21/59f82937b99fbf55529d074d93094c6b')) {
  throw new Error('Adsterra unit must be approved, opt-in, and scoped to public pages.');
}
let count = 0;
let adsterraPages = 0;
async function prepare(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = dir + '/' + item.name;
    if (item.isDirectory()) { await prepare(file); continue; }
    if (!item.name.endsWith('.html')) continue;
    const regularPages = new Set([
      'dist/index.html', 'dist/about.html', 'dist/contact.html',
      'dist/privacy.html', 'dist/terms.html', 'dist/blog/index.html'
    ]);
    const eligible = regularPages.has(file) ||
      file.startsWith('dist/tools/') || file.startsWith('dist/guides/');
    if (!eligible) continue;
    const html = await readFile(file, 'utf8');
    if (!html.includes('</main>')) throw new Error('Missing </main> in ' + file);
    if (html.includes('data-filefit-ad-slot=')) throw new Error('Ad slot already exists in ' + file);
    // Keep the future placement after content, not beside the file picker,
    // action buttons or generated download links. It must remain invisible
    // and make no remote requests until a reviewed activation.
    const marker = '<section class="shell filefit-ad-slot" data-filefit-ad-slot="after-content" aria-label="Advertisement" hidden></section>\n';
    // Every regular public page gets one post-content placement. Never load the
    // third-party script without opt-in, and never show ads on the 404 page.
    const loader = unit?.enabled
      ? '<script defer src="/adsterra-native.js"></script>\n'
      : '';
    await writeFile(file, html.replace('</main>', marker + loader + '</main>'));
    if (loader) adsterraPages++;
    count++;
  }
}
await prepare('dist');
// Infolinks rejected this pages.dev site. Never inject its loader, verification
// script or advertising preference into the published site until a new
// provider approval and compliance review have been completed.
console.log('Ad groundwork: ' + count + ' post-content slots; ' + adsterraPages + ' public pages with consent-gated Adsterra loader; AdSense and rejected Infolinks remain off.');
