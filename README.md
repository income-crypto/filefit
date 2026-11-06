# Filefit — free browser-based image and PDF tools

Production: https://file-fit.pages.dev/  
Repository: income-crypto/filefit  
Hosting: Cloudflare Pages, deployed from `main`.

## Features

- Compress images with 20, 50, 100, 200 KB and custom best-effort size targets.
- Resize photos and signatures to exact pixel dimensions.
- Convert JPG, PNG and WebP images, plus rasterize self-contained SVG (up to 5 MiB) into PNG/JPG/WebP.
- Combine images into PDFs, merge PDFs and extract selected PDF pages.
- Process files within the visitor's browser without accounts or uploading file contents.

## Build and deployment

Requires Node.js 18+.

```sh
npm install
npm run build
npm run preview
```

Cloudflare Pages builds using `npm run build` and publishes `dist`. The `seo-build.mjs` build includes static site assets and pages, bundles the locally installed `pdf-lib@1.17.1` at `/vendor/pdf-lib.min.js`, and executes `qa-smoke.mjs`. The browser's PDF processing code does not require a third-party CDN.

## Privacy and advertising

Cloudflare Web Analytics is present. GA4 is governed by `analytics-consent.js` and `functions/api/analytics-region.js`, including country-dependent settings. Feature-use analytics must not contain names, contents, dimensions or sizes of private files. Reassess regional analytics requirements as laws and policies evolve.

Both AdSense and Infolinks serving remain **disabled** through `ads-config.json`. Owner-supplied AdSense verification metadata remains in the site. The rejected Infolinks advertising integration is not published. Provider approval, consent and privacy checks are necessary before activating ads.

## Limitations

Browser input limits: 50 MiB per image, 80 MiB per PDF, 20 files and 150 MiB total per batch, with a 40-megapixel decoded image cap. Large PDFs can still exceed mobile device memory. WebP encoding varies by browser, PDF encryption is not supported in all cases, and the PDF split tool produces one PDF containing selected pages rather than a ZIP of individual pages. Compression targets are best effort. SVG import is restricted to safe self-contained graphics; linked files, scripted/animated SVGs, foreign objects, and SVG output/vector tracing are not supported.

For search discovery maintain the `robots.txt`, `sitemap.xml`, canonical tags and useful tool-guide content. Successful build tests do not confirm Google indexing.
