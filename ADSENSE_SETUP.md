# Filefit — AdSense launch checklist (created 2026-11-04)

Project: https://file-fit.pages.dev/
Production source: income-crypto/filefit (main)
Deploy: Cloudflare Pages (build command: `npm run build`, output directory: `dist`)

For the two-provider AdSense + Infolinks preparation, see [AD_NETWORKS.md](AD_NETWORKS.md) and [ads-config.json](ads-config.json). The provider enable flags deliberately fail the build until a separately reviewed integration exists.

## Current state (do not mark complete without Google account evidence)
- [x] Public website, original tools, blog, About, Privacy, Terms and Contact pages
- [x] HTTPS, sitemap, Google Search Console and Cloudflare Web Analytics
- [x] Optional Google Analytics consent flow (GA4 consent is NOT advertising consent)
- [ ] Google AdSense account created / site added and ownership verification issued
- [ ] Verification snippet or meta tag containing the **real** publisher identifier deployed
- [ ] Google confirms site status **Ready** after review
- [ ] Real publisher-specific ads.txt entries created at `/ads.txt`
- [ ] Correct ad consent / Privacy & messaging configured for affected visitors
- [ ] Final ad scripts and clearly labeled, non-deceptive placements implemented
- [ ] Test ad performance, CLS, accessibility, browser console and file download flows
- [ ] Payment identity, payee and bank info completed in AdSense

## Application sequence
1. The publisher signs in personally at https://adsense.google.com/start/ and enters real legal and bank/payee details where requested. Never share passwords, government IDs or bank login details in GitHub.
2. Under **Sites > New site**, submit `https://file-fit.pages.dev/`. If rejected as an unsupported domain, the account's explanation controls: do not assume subdomain eligibility guarantees approval. Official docs allow subdomains of platforms on the Public Suffix List in principle.
3. Choose an ownership verification method (Google offers a meta tag, code snippet or ads.txt). Prefer the **meta tag** if shown, since it verifies site ownership without loading an ad-serving script before review. Capture the exact `ca-pub-...` value from the real account.
4. Add the exact verification metadata to the HTML head through GitHub; redeploy; confirm on the public domain. Never invent or guess publisher IDs.
5. Click Verify / Request review in AdSense. Expect approval or requested changes, not automatic acceptance.
6. Only after ownership details are available, add an authorized-seller `ads.txt` line exactly as provided, and add it to `seo-build.mjs`'s copied file list. AdSense commonly expects `google.com, pub-..., DIRECT, f08c47fec0942fa0`; replace the placeholders with the publisher's actual account data.
7. Ads are only enabled after Google marks the site **Ready**. Set up the applicable Google-certified CMP through AdSense Privacy & messaging for EEA, UK and Switzerland personalized ads and update the privacy disclosure. GA4's existing optional-analytics prompt does not satisfy ad-consent obligations.
8. Add ads after the tool workspace, never around upload/download controls. Avoid forced redirects, popunders or deceptive buttons. Update CSP to permit only the actual Google ad endpoints and keep image/PDF processing local.
9. Watch for invalid traffic; do not buy traffic or encourage clicks on ads.

## Verified external references
- AdSense new site: https://support.google.com/adsense/answer/12169212
- AdSense site review and Ready status: https://support.google.com/adsense/answer/12131223
- Google ads.txt: https://support.google.com/adsense/answer/12171612
- Google certified CMP: https://support.google.com/adsense/answer/13554116
- Subdomains on Public Suffix List: https://support.google.com/adsense/answer/12170421

## Operational limitation
AdSense account signup/identity verification and submission are account-specific workflows. This repository can't complete them without the account owner. Do not claim an application was submitted or accepted on the basis of website changes alone.
