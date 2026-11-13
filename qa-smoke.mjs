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
  assert.equal(nativeLoaderCount, 1, 'Each regular page must have exactly one opt-in Adsterra loader: ' + file);
  assert.equal((html.match(/data-filefit-ad-slot="/g) || []).length, 1,
    'Exactly one advertisement placement per public page: ' + file);
  if (file === 'index.html') {
    assert.ok(html.includes('data-filefit-ad-slot="hero"'), 'Homepage ad must be in the hero');
    assert.ok(!html.includes('data-filefit-ad-slot="after-content"'), 'No duplicate homepage ad after content');
    assert.ok(html.indexOf('data-filefit-ad-slot="hero"') > html.indexOf('class="trust-strip"'),
      'Ad must follow the hero CTA and trust messages');
    assert.ok(html.indexOf('data-filefit-ad-slot="hero"') < html.indexOf('class="tool-section'),
      'Homepage ad must stay within the hero');
  } else {
    assert.ok(html.includes('data-filefit-ad-slot="after-content"'),
      'All other pages must keep post-content ad placements: ' + file);
  }
  assert.ok(html.indexOf('data-filefit-ad-slot=') > html.indexOf('id="workspace"') || !file.startsWith('tools/'),
    'Advertising must not be placed in the tool workspace: ' + file);
  assert.ok(!html.includes('bauval.org'), 'Never embed third-party advertising directly in HTML: ' + file);
  verified++;
}

// Answer-first content must be visible and connected to accurate schema.
const hubHtml = await read('dist/index.html');
assert.ok(hubHtml.includes('id="choose-tool"'), 'Homepage tool decision hub missing');
assert.equal((hubHtml.match(/<article><h3>/g) || []).length, 6, 'Six tool-selection answers required');
const websiteJson = hubHtml.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
assert.ok(websiteJson, 'WebSite structured data required');
assert.equal(JSON.parse(websiteJson)['@id'], 'https://file-fit.pages.dev/#website', 'Website identity inconsistent');
for (const file of staticPages.filter(p => p.startsWith('tools/'))) {
  const html = await read('dist/' + file);
  assert.equal((html.match(/class="direct-answer"/g) || []).length, 1, 'One direct answer required: ' + file);
  assert.ok(html.indexOf('class="direct-answer"') > html.indexOf('id="guide-title"'), 'Answer should follow guide heading: ' + file);
  const schemaText = html.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
  assert.ok(schemaText, 'Tool schema missing: ' + file);
  const graph = JSON.parse(schemaText)['@graph'];
  assert.ok(graph.some(e => e.isPartOf?.['@id'] === 'https://file-fit.pages.dev/#website'), 'Website entity link missing: ' + file);
}
for(const url of ["https://file-fit.pages.dev/","https://file-fit.pages.dev/about","https://file-fit.pages.dev/tools/image-compressor/","https://file-fit.pages.dev/tools/photo-signature-resizer/","https://file-fit.pages.dev/tools/image-converter/","https://file-fit.pages.dev/tools/jpg-to-pdf/","https://file-fit.pages.dev/tools/merge-pdf/","https://file-fit.pages.dev/tools/split-pdf/"]) {
  assert.ok(sitemap.includes('<loc>' + url + '</loc><lastmod>2026-11-09</lastmod>'), 'Updated page lastmod missing: ' + url);
}
const jsFiles = ['app.js', 'analytics-consent.js', 'adsterra-native.js'];
for (const file of jsFiles) new Function(await read('dist/' + file));
assert.equal(config.adsterra.websiteApproved, true, 'Adsterra site must be approved');
assert.equal(config.adsterra.enabled, true, 'Adsterra guide loader should be enabled');
assert.equal(config.adsterra.regionAware, true, 'Automatic ads must remain region-gated');
assert.deepEqual(config.adsterra.automaticCountries, ['IN'], 'Only India is in the automatic-ad allowlist');
assert.equal(config.adsterra.sandboxToolAds, true, 'Third-party ads must be isolated from tool uploads');
assert.equal(config.adsterra.contentPagesOnly, false, 'Tool-page advertising must be enabled');
assert.equal(config.adsterra.allPublicPages, true, 'Adsterra must cover all regular site pages');
const nativeAds = await read('dist/adsterra-native.js');
assert.ok(nativeAds.includes("choice === 'allow'"), 'Previously consented ads must be recognized');
assert.ok(nativeAds.includes("result.adsterraMode === 'automatic'"), 'India auto-loading gate missing');
assert.ok(nativeAds.includes("result.adsterraMode === 'opt-in'"), 'Opt-in fallback for other locations missing');
assert.ok(nativeAds.includes('hasGlobalOptOut()'), 'Global Privacy Control must be respected');
assert.ok(nativeAds.includes("choice === 'decline'"), 'Prior opt-out must take precedence');
assert.ok(nativeAds.includes("frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox')"), 'Tool ads require sandbox isolation');
assert.ok(!nativeAds.includes("'allow-scripts allow-same-origin'"), 'Ad frames must not gain same-origin access');
const regionApi = await read('functions/api/analytics-region.js');
assert.ok(regionApi.includes("adsterraMode: country === 'IN' ? 'automatic' : 'opt-in'"), 'Only India may be automatically served');
assert.ok(!regionApi.includes("console.log("), 'No request logging in region API');
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

const policies = [...headers.matchAll(/^([/][^\n]*)\n  Content-Security-Policy: (.+)$/gm)]
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
  assert.ok(matches[0].policy.includes('https://bauval.org'),
    'Adsterra host must be permitted on every regular page: ' + page);
}
assert.equal(policyFor('/404.html').length, 1, '404 response should retain CSP');
assert.ok(!policyFor('/404.html')[0].policy.includes('https://bauval.org'),
  '404 error page must not allow ad scripts');
assert.ok(!(await read('dist/404.html')).includes('/adsterra-native.js'),
  '404 error page must not include native advertisements');
assert.ok(!headers.match(/^\/\*\n  Content-Security-Policy:/m),
  'Wildcard CSP collides with guide-level CSP (Cloudflare concatenates duplicates)');

assert.ok(!headers.match(/^\/\*\n  Content-Security-Policy:/m),
  'A wildcard CSP conflicts with page-specific ad policies');
const privacy = await read('dist/privacy.html');
assert.ok(privacy.includes('Adsterra Native Banner'), 'Privacy must explain native advertisements');
assert.ok(privacy.includes('homepage hero'), 'Privacy must identify the updated homepage ad position');
assert.ok(privacy.includes('automatically without a confirmation prompt'), 'Privacy must disclose India auto ads');
assert.ok(privacy.includes('sandboxed iframe'), 'Privacy must explain tool-page script isolation');
assert.ok(nativeAds.includes("location.pathname === '/' || location.pathname.startsWith('/tools/')"),
  'Homepage must sandbox third-party ad scripts from the built-in file workspace');
assert.ok(nativeAds.includes('data-filefit-ad-slot="hero"'), 'Native loader must find hero placement');
assert.ok(nativeAds.includes('https://bauval.org/22/48bd9a5f41aab74f6f586af6529d4592'), '468x60 banner must use owner-provided tag');
assert.ok(nativeAds.includes('https://bauval.org/14/01c683b010b0a5cffdaa8cc3396c4ce5'), 'Social Bar must use owner-provided tag');
assert.ok(nativeAds.includes('https://araplhn.org/4/073ae2ad4af0494cc88b680b60e9e903'), 'Sponsored link must use owner-provided destination');
assert.ok(!nativeAds.includes('https://abscloud.org/1/'), 'Intrusive Popunder must not load silently');
assert.ok(nativeAds.includes("sponsored.rel = 'sponsored noopener noreferrer'"), 'Outbound sponsored link must be labeled and isolated');
assert.ok(nativeAds.includes('filefit-social-enable'), 'Social Bar must require an explicit click');
assert.ok(nativeAds.includes('bannerFrame.style.transform'), '468-pixel banner must scale on phones');

assert.ok(nativeAds.includes('filefit_adsterra_sitewide_choice_v1'),
  'New site-wide consent must not reuse narrow guide-only consent');
assert.ok(!nativeAds.includes('filefit_adsterra_native_choice_v1'),
  'Older guide-only choice must not grant site-wide consent');
assert.ok(headers.includes('X-Content-Type-Options: nosniff'), 'Missing nosniff header');
const regionConfig = JSON.parse(await read('dist/_routes.json'));
assert.deepEqual(regionConfig.include, ['/api/analytics-region'], 'Keep Pages Functions limited to the region endpoint');
console.log('Filefit QA: ' + verified + ' canonical pages, metadata, sitemap links, code syntax, file safety guards and PDF vendor passed.');
