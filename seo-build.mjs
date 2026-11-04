import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
const files = ['index.html', '404.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html', 'styles.css', 'app.js', 'analytics-consent.js', 'infolinks-integration.js', 'favicon.svg', 'robots.txt', '_headers', '_routes.json', 'sitemap.xml', 'google88474be45860b44d.html', '5f8a5f095675483641f756916c816e49.txt'];
console.log('Filefit build: preparing output directory');
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of files) await cp(file, 'dist/' + file);
await cp('tools', 'dist/tools', { recursive: true });
await cp('guides', 'dist/guides', { recursive: true });
await cp('blog', 'dist/blog', { recursive: true });
console.log('Filefit build: copied site pages and tool guides');
await mkdir('dist/vendor', { recursive: true });
await cp('node_modules/pdf-lib/dist/pdf-lib.min.js', 'dist/vendor/pdf-lib.min.js');
// Include the same optional analytics-consent script on every published HTML page.
// Google Analytics never loads until a visitor grants consent.
async function addConsentScriptToHtml(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = dir + '/' + item.name;
    if (item.isDirectory()) { await addConsentScriptToHtml(path); continue; }
    if (!item.name.endsWith('.html') || item.name.startsWith('google')) continue;
    let html = await readFile(path, 'utf8');
    // Cloudflare Pages redirects these .html aliases to extensionless URLs.
    // Use the final URLs for internal links and canonical metadata to avoid
    // unnecessary 308 hops and mixed canonical hints to search engines.
    for (const slug of ['about', 'contact', 'privacy', 'terms']) {
      html = html.replaceAll(`href="/${slug}.html"`, `href="/${slug}"`);
      html = html.replaceAll(
        `href="https://file-fit.pages.dev/${slug}.html"`,
        `href="https://file-fit.pages.dev/${slug}"`
      );
    }
    if (!html.toLowerCase().includes('</head>')) continue;
    // Keep the owner-supplied AdSense verification metadata on all published pages.
    // This metadata is inert: it does not load advertising or change consent.
    const adsenseTag = '<meta name="google-adsense-account" content="ca-pub-8456971543415872">';
    const verifiedHtml = html.includes('name="google-adsense-account"')
      ? html
      : html.replace(/<[/]head>/i, adsenseTag + '</head>');
    const updated = verifiedHtml.replace(/<[/]head>/i, '<script defer src="/analytics-consent.js"></script></head>');
    await writeFile(path, updated);
  }
}
await addConsentScriptToHtml('dist');
console.log('Filefit build: analytics-consent script injected into HTML');
await import('./ad-prep.mjs');
await import('./qa-smoke.mjs');
console.log('Filefit SEO site built: homepage, six tool pages, sitemap and local PDF library.');
