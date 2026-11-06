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
const authorizedSellers = await read('dist/ads.txt');
assert.equal(authorizedSellers.trim(), 'google.com, pub-8456971543415872, DIRECT, f08c47fec0942fa0', 'Ads.txt must authorize the correct AdSense publisher');
const robots = await read('dist/robots.txt');
assert.match(robots, /^User-agent: \*/m, 'Robots rules missing');
assert.ok(robots.includes('Sitemap: https://file-fit.pages.dev/sitemap.xml'), 'Robots sitemap hint missing');
assert.match(sitemap, /^<\?xml version="1.0" encoding="UTF-8"\?>/, 'Sitemap should be UTF-8 XML');
assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Sitemap namespace missing');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(urls.length, staticPages.length, 'Expected one sitemap URL per public page');
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URL');
assert.ok(urls.every(url => url.startsWith('https://file-fit.pages.dev/')), 'Incorrect sitemap hostname');

assert.equal(config.adsense.enabled, false, 'AdSense must remain off until approved');
assert.equal(config.infolinks.enabled, false, 'Infolinks ads must remain off until approved');
let verified = 0;
for (const file of staticPages) {
  const url = 'https://file-fit.pages.dev/' + file.replace(/^index\.html$/, '').replace(/\/index\.html$/, '/').replace(/^(about|contact|privacy|terms)\.html$/, '$1');
  const html = await read('dist/' + file);
  assert.match(html, /<h1\b/i, 'Expected a main heading: ' + file);
  assert.match(html, /<main\b/i, 'Expected a main region: ' + file);
  assert.match(html, /<\/main>/i, 'Expected the main region to close: ' + file);
  assert.match(html, /<title>[^<]+<\/title>/i, 'Expected a page title: ' + file);
  assert.match(html, /<meta\s+name="google-adsense-account"\s+content="ca-pub-8456971543415872"/i, 'AdSense verification missing: ' + file);
  assert.equal((html.match(/src="\/analytics-consent\.js"/g) || []).length, 1, 'GA4 preferences injected exactly once: ' + file);
  assert.ok(sitemap.includes('<loc>' + url + '</loc>'), 'Missing sitemap URL: ' + url);
  if (/^(about|contact|privacy|terms)\.html$/.test(file)) {
    assert.ok(html.includes('<link rel="canonical" href="' + url + '">'), 'Canonical must match final URL: ' + file);
  }
  for (const slug of ['about', 'contact', 'privacy', 'terms']) {
    assert.ok(!html.includes('href="/' + slug + '.html"'), 'Redirecting internal HTML link: ' + file);
  }
  assert.ok(!html.includes('src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"'), 'Unexpected live AdSense loader');
  const nativeLoaderCount = (html.match(/src="\/adsterra-native\.js"/g) || []).length;
  const contentPage = file === 'blog/index.html' || file.startsWith('guides/');
  assert.equal(nativeLoaderCount, contentPage ? 1 : 0, 'Adsterra loader must be content-only: ' + file);
  assert.ok(!html.includes('bauval.org'), 'Never embed third-party advertising directly in HTML: ' + file);
  verified++;
}

const jsFiles = ['app.js', 'analytics-consent.js', 'adsterra-native.js'];
for (const file of jsFiles) new Function(await read('dist/' + file));
assert.equal(config.adsterra.websiteApproved, true, 'Adsterra site must be approved');
assert.equal(config.adsterra.enabled, true, 'Adsterra guide loader should be enabled');
assert.equal(config.adsterra.optInOnly, true, 'Adsterra must always require opt-in');
assert.equal(config.adsterra.contentPagesOnly, true, 'No ads on file processing pages');
const nativeAds = await read('dist/adsterra-native.js');
assert.ok(nativeAds.includes("choice === 'allow'"), 'Opt-in gate missing');
assert.ok(nativeAds.includes("script.src = scriptSrc"), 'Native ad script must only be injected on opt-in');
assert.ok(nativeAds.includes("localStorage.setItem(key, value)"), 'Ad consent preference is not stored');
assert.ok(nativeAds.includes("location.reload()"), 'Ad preference revocation requires a reload');
const app = await read('dist/app.js');
for (const event of ['filefit_tool_start', 'filefit_tool_complete', 'filefit_tool_error']) {
  assert.ok(app.includes(event), 'Missing privacy-safe GA4 tool event: ' + event);
}
assert.ok(app.includes('tool_id: toolId'), 'Tool events must include only the public tool ID');
for (const token of ['MAX_IMAGE_BYTES', 'MAX_PDF_BYTES', 'MAX_TOTAL_BYTES', 'MAX_FILE_COUNT', 'MAX_IMAGE_PIXELS']) {
  assert.ok(app.includes(token), 'Missing browser safety guard: ' + token);
}
assert.ok((await stat('dist/vendor/pdf-lib.min.js')).size > 100_000, 'PDF library missing or incomplete');
const home = await read('dist/index.html');
assert.ok(!home.includes('infolinks-integration.js'), 'Rejected Infolinks loader must not be published');
assert.ok(!home.includes('filefit-infolinks-verification-code'), 'Rejected Infolinks verification must not be published');
assert.ok(app.includes('remove.disabled = processing'), 'File removal must be locked during processing');
assert.ok(app.includes('button.disabled = processing'), 'File reordering must be locked during processing');
assert.ok(app.includes('const bestEncoded'), 'Image compression must avoid unnecessary size increase');
assert.ok(app.includes("action.setAttribute('aria-busy'"), 'Processing button needs accessible busy state');
const css = await read('dist/styles.css');
assert.ok(css.includes('.download-button{overflow-wrap:anywhere'), 'Long filenames must wrap on mobile');
assert.ok(css.includes('.file-size,.result-sub,.field .helper{color:#455e4d}'), 'Small status text must use accessible contrast');

// SVG must be accepted only by the converter, and checked before rasterization.
const converterPage = await read('dist/tools/image-converter/index.html');
assert.ok(converterPage.includes('image/svg+xml,.svg'), 'Converter upload input must allow SVG');
assert.ok(converterPage.includes('SVG to PNG'), 'SVG support must be explained to visitors');
assert.ok(app.includes("currentTool === 'convert' && isSvg(file)"), 'SVG must be limited to the converter');
assert.ok(app.includes('safeSvgBlob(file)'), 'SVG must pass safe XML validation before loading');
assert.ok(app.includes('DOMParser'), 'SVG must be parsed rather than injected into the DOM');
assert.ok(app.includes('MAX_SVG_BYTES'), 'SVG byte-size guard is mandatory');
assert.ok(app.includes("'foreignobject'"), 'Active SVG content must be rejected');
assert.ok(app.includes("'script'"), 'SVG scripts must not be supported');
assert.ok(app.includes("root.namespaceURI !== namespace"), 'SVG namespace validation is required');
const headers = await read('dist/_headers');
assert.ok(headers.includes('Content-Security-Policy'), 'Missing CSP');
assert.ok(headers.includes('/guides/*') && headers.includes('/blog/*'), 'Content-only CSP must be present');
assert.ok(headers.includes('https://bauval.org'), 'Native banner origin missing in content CSP');

const policies = [...headers.matchAll(/^([/][^\n]+)\n  Content-Security-Policy: (.+)$/gm)]
  .map(([, path, policy]) => ({ path, policy }));
const policyFor = page => policies.filter(rule =>
  rule.path.endsWith('*')
    ? page.startsWith(rule.path.slice(0, -1))
    : page === rule.path
);
for (const file of staticPages) {
  const page = file === 'index.html' ? '/' :
    '/' + file.replace(/\/index\.html$/, '/').replace(/^(about|contact|privacy|terms)\.html$/, '$1');
  const matches = policyFor(page);
  assert.equal(matches.length, 1, 'Exactly one CSP is required for ' + page);
  const isContent = page.startsWith('/guides/') || page.startsWith('/blog/');
  assert.equal(matches[0].policy.includes('https://bauval.org'), isContent,
    'Adsterra host must be permitted only on content pages: ' + page);
}
assert.equal(policyFor('/404.html').length, 1, '404 response should retain CSP');
assert.ok(!headers.match(/^\/\*\n  Content-Security-Policy:/m),
  'Wildcard CSP collides with guide-level CSP (Cloudflare concatenates duplicates)');

const globalCsp = headers.split('/guides/*')[0];
assert.ok(!globalCsp.includes('https://bauval.org'), 'Never relax the tool pages global CSP');
const privacy = await read('dist/privacy.html');
assert.ok(privacy.includes('Adsterra Native Banner'), 'Privacy must explain native advertisements');
assert.ok(headers.includes('X-Content-Type-Options: nosniff'), 'Missing nosniff header');
const regionConfig = JSON.parse(await read('dist/_routes.json'));
assert.deepEqual(regionConfig.include, ['/api/analytics-region'], 'Keep Pages Functions limited to the region endpoint');
console.log('Filefit QA: ' + verified + ' canonical pages, metadata, sitemap links, code syntax, file safety guards and PDF vendor passed.');
