// Build-time smoke test for Filefit. No network, browser, account, or API keys needed.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const staticPages = [
  'index.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html',
  'blog/index.html',
  'tools/image-compressor/index.html',
  'tools/photo-signature-resizer/index.html',
  'tools/image-converter/index.html',
  'tools/jpg-to-pdf/index.html',
  'tools/merge-pdf/index.html',
  'tools/split-pdf/index.html',
  'guides/photo-upload-rejected/index.html',
  'guides/combine-images-into-pdf/index.html',
  'guides/resize-signature-for-online-form/index.html',
  'guides/jpg-png-webp-for-uploads/index.html',
  'guides/extract-pages-from-pdf/index.html'
];

const sitemap = await read('dist/sitemap.xml');
const config = JSON.parse(await read('ads-config.json'));
assert.equal(config.adsense.enabled, false, 'AdSense must remain off until approved');
assert.equal(config.infolinks.enabled, false, 'Infolinks ads must remain off until approved');
let verified = 0;
for (const file of staticPages) {
  const url = 'https://file-fit.pages.dev/' + file.replace(/^index\.html$/, '').replace(/\/index\.html$/, '/');
  const html = await read('dist/' + file);
  assert.match(html, /<h1\b/i, 'Expected a main heading: ' + file);
  assert.match(html, /<main\b/i, 'Expected a main region: ' + file);
  assert.match(html, /<\/main>/i, 'Expected the main region to close: ' + file);
  assert.match(html, /<title>[^<]+<\/title>/i, 'Expected a page title: ' + file);
  assert.match(html, /<meta\s+name="google-adsense-account"\s+content="ca-pub-8456971543415872"/i, 'AdSense verification missing: ' + file);
  assert.equal((html.match(/src="\/analytics-consent\.js"/g) || []).length, 1, 'GA4 preferences injected exactly once: ' + file);
  assert.ok(sitemap.includes('<loc>' + url + '</loc>'), 'Missing sitemap URL: ' + url);
  assert.ok(!html.includes('src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"'), 'Unexpected live AdSense loader');
  verified++;
}

const jsFiles = ['app.js', 'analytics-consent.js', 'infolinks-integration.js'];
for (const file of jsFiles) new Function(await read('dist/' + file));
const app = await read('dist/app.js');
for (const event of ['filefit_tool_start', 'filefit_tool_complete', 'filefit_tool_error']) {
  assert.ok(app.includes(event), 'Missing privacy-safe GA4 tool event: ' + event);
}
assert.ok(app.includes('tool_id: toolId'), 'Tool events must include only the public tool ID');
for (const token of ['MAX_IMAGE_BYTES', 'MAX_PDF_BYTES', 'MAX_TOTAL_BYTES', 'MAX_FILE_COUNT', 'MAX_IMAGE_PIXELS']) {
  assert.ok(app.includes(token), 'Missing browser safety guard: ' + token);
}
assert.ok((await stat('dist/vendor/pdf-lib.min.js')).size > 100_000, 'PDF library missing or incomplete');
const headers = await read('dist/_headers');
assert.ok(headers.includes('Content-Security-Policy'), 'Missing CSP');
assert.ok(headers.includes('X-Content-Type-Options: nosniff'), 'Missing nosniff header');
const regionConfig = JSON.parse(await read('dist/_routes.json'));
assert.deepEqual(regionConfig.include, ['/api/analytics-region'], 'Keep Pages Functions limited to the region endpoint');
console.log('Filefit QA: ' + verified + ' canonical pages, metadata, sitemap links, code syntax, file safety guards and PDF vendor passed.');
