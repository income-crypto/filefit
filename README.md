# Filefit — free image and PDF tools

A small privacy-first, no-login website with six working tools:

1. Image compressor with 20/50/100/200 KB and custom limits (best effort)
2. Photo and signature resizer with pixel presets and custom dimensions
3. JPG/PNG/WebP image converter
4. Images to PDF
5. PDF merger
6. PDF page extractor/splitter

All selected files are processed locally in the browser. No app backend, server-side uploads, account, paid API, or watermark.

**Important:** This is a new portable implementation based on the functional requirements of the earlier Filefit site, **not an exact export of the original hosted project's source code**.

## Upload to GitHub

Open your empty `income-crypto/filefit` repo → **uploading an existing file** → upload all project files from inside this folder, preserving paths. `package.json` must be at the repository root; `index.html` is inside `public/`. Do not upload this ZIP as one file.

For nested folders, the simplest method is to use Git from a Mac terminal in the unzipped folder:

```bash
cd /path/to/filefit-source
git init
git branch -M main
git add .
git commit -m "Initial Filefit site"
git remote add origin https://github.com/income-crypto/filefit.git
git push -u origin main
```

Your GitHub authentication may be required. Never paste personal access tokens in chat.

## Deploy on Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Authorize GitHub and choose `income-crypto/filefit`.
3. Set **production branch** to `main`.
4. Set **framework preset** to `None` (this is a plain static website, *not* React/Vite).
5. Set **build command** to `npm run build`.
6. Set **build output directory** to `dist`.
7. Set **root directory** to `/` (repository root).
8. Deploy. Pages will publish the generated `dist/` files.

### Local preview

```bash
npm run preview
```

Visit `http://localhost:4173`. No `npm install` is necessary (no package dependencies).

### Build test

```bash
npm run build
```

## Important notes

- PDF tools load `pdf-lib@1.17.1` from `cdn.jsdelivr.net`, falling back to `unpkg.com`. This third-party library is free and open-source (MIT license), but **an internet connection is needed for PDF features** unless you self-host the JS file. The CDN requests fetch only JS code, not user files. Official source: https://github.com/Hopding/pdf-lib
- For the image compressor, extremely small size limits may not be achievable, especially with PNGs; the tool displays the actual output size and warns if still above the target.
- Image resizing uses pixel dimensions. For document-photo specifications requiring precise physical DPI metadata, additional metadata support would be needed.
- The PDF splitter extracts selected ranges into a **single PDF**, rather than creating a ZIP of individual pages.
- Very large files may be slow or run out of browser memory. Encrypted PDFs are not supported.
- The site currently has **no advertisements**, so update `privacy.html` and add any required consent management before inserting ad code. Don't claim ad approval until reviewed by the network.
- Before publishing publicly, edit the Privacy Policy to add a legitimate owner contact method; connect your actual domain and then add a matching `sitemap.xml`.
- Do not upload `.env`, keys, account credentials, or `node_modules` to the GitHub repository.
- The Cloudflare `_headers` security settings are in `public/_headers`.

## File tree

```text
filefit-source/
├── package.json
├── README.md
├── .gitignore
├── scripts/
│   ├── build.mjs
│   └── serve.mjs
└── public/
    ├── index.html
    ├── app.js
    ├── styles.css
    ├── favicon.svg
    ├── about.html
    ├── privacy.html
    ├── terms.html
    ├── robots.txt
    └── _headers
```
