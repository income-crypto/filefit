import { cp, mkdir, rm } from 'node:fs/promises';
const files = ['index.html', '404.html', 'about.html', 'privacy.html', 'terms.html', 'styles.css', 'app.js', 'favicon.svg', 'robots.txt', '_headers', 'sitemap.xml', 'google88474be45860b44d.html'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of files) await cp(file, 'dist/' + file);
await cp('tools', 'dist/tools', { recursive: true });
await mkdir('dist/vendor', { recursive: true });
await cp('node_modules/pdf-lib/dist/pdf-lib.min.js', 'dist/vendor/pdf-lib.min.js');
console.log('Filefit SEO site built: homepage, six tool pages, sitemap and local PDF library.');
