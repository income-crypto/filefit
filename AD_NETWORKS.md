# Filefit multi-network advertising: AdSense + Infolinks

Created 2026-11-04. Live website: https://file-fit.pages.dev/.

## Infolinks integration details received (2026-11-04)
The Filefit publisher welcome screen and support email provided the following account-specific script values:

```html
<script type="text/javascript">var infolinks_pid = 3449243; var infolinks_wsid = 0;</script>
<script type="text/javascript" src="https://resources.infolinks.com/js/infolinks_main.js"></script>
```

These exact values are saved in `ads-config.json` for a later reviewed integration. **The loader is not installed or executed**, and publisher approval status is not independently verified from the screenshot alone. Infolinks' standard integration guidance says to insert the script before `</body>` after approval; it may automatically display ads based on enabled products.

Before enabling: open the Infolinks Publisher Center and confirm the site is approved under Websites/Sites and review **Customize / Products**. Disable intrusive overlays, popunders, forced redirects, auto-interstitials or notification formats; assess privacy and ad-consent requirements. Restrict future script placement to content-rich guides initially, not file upload/download pages. Confirm ads do not conflict with AdSense publisher rules while Google's site review is pending. Verify no ad cookies/network requests before applicable consent. Any activation requires a separate audited code change and testing.

## Domain correction and verification stage — 2026-11-04
The owner corrected the Infolinks application website to `https://file-fit.pages.dev/`. The support email requested its publisher script before closing `</body>` for ownership validation. Filefit's homepage now contains the exact code **inside an inert HTML `<template>`**, which is visible in page source but does not execute automatically. A local `infolinks-integration.js` script exposes **Advertising preferences** in the homepage footer, permitting visitors to explicitly opt in to loading the external Infolinks script. Default behavior makes no Infolinks requests, and AdSense remains disabled. The provider may require a different active verification method; this implementation does not guarantee approval or automated script detection. Its script loader may trigger ads after approval only for users who consented.

The owner should reply to Infolinks with the corrected URL and explain the consent-gated integration. If Infolinks cannot verify an opt-in integration, get clarification from support before enabling site-wide script loading; any active change needs an advertising-consent/CMP assessment.

## Current status
- AdSense: **not connected / not verified / site not approved** (account status unknown).
- Infolinks: **site-specific publisher code received**, but integration inactive and approval status not independently confirmed.
- Both providers are **disabled** in `ads-config.json`.
- No ads.txt records or ad-network scripts are deployed.
- Each eligible homepage, tool page, blog and guide page contains an **invisible** post-content mount point generated during Cloudflare's build. It is inert, has no height and makes no network requests. This is not a functioning ad unit.
- Cloudflare Web Analytics and opt-in GA4 remain independent.

## Why multiple ad networks are possible
Google permits other providers alongside AdSense if the site follows its publisher policies, ad inventory limits, traffic rules and acceptable placements. Infolinks does **not** supply a universal script: it issues a **unique, site-specific integration script only after site approval**.

## Publisher-account actions (must be completed by the owner)
### Google AdSense
1. Sign in at https://adsense.google.com/start/ and select **Sites > New site**.
2. Enter `file-fit.pages.dev`. Domain eligibility and application approval are decided by Google, not by this repository.
3. When Google provides a meta verification tag, obtain the exact `ca-pub-...` identifier. Share only the public meta tag; never share login credentials or personal documents.
4. We add that tag to the homepage and any other pages Google requires, deploy it, verify the public source, then you click **Verify** and **Request review** in your own AdSense account.
5. Only after AdSense shows **Ready** can you enable ad serving. Google offers manual display ad units and Auto Ads; start with **one manual unit** after the main tool or article content rather than letting ads appear near upload/download controls.
6. Configure Google Privacy & messaging for consent in applicable regions. A Google-certified TCF CMP is required for personalized ads in the EEA, UK and Switzerland. The existing GA4 analytics consent prompt is **not** an advertising CMP.
7. Copy the actual `ads.txt` authorized seller line from your AdSense account; when available, create `ads.txt` and copy it to `dist/` in `seo-build.mjs`.

### Infolinks
1. Apply at https://www.infolinks.com/ with `https://file-fit.pages.dev/` as the site. Their team reviews every application; acceptance is not guaranteed.
2. When approved, get **the exact integration script assigned to this website** from the account's Integrate tab and confirm each enabled ad product in Customize.
3. Avoid popunders, forced redirects and other aggressive formats. Restrict Infolinks initially to text-heavy `/guides/` pages so it cannot overlay the file processing and download interface.
4. Review provider privacy terms, consent obligations, ad script destinations, CSP allowances and any ads.txt lines they specifically request.
5. Test the second provider in a separate branch and add it only if the incremental revenue merits any speed or usability cost.

## Planned integration rules (not enabled yet)
- Provider-specific code may not be deployed until verified IDs/scripts, site approvals, valid privacy messaging, legitimate ad formats and CSP endpoints have been inspected.
- **Never** add the GA4 measurement ID as an ad publisher ID; they are different systems.
- **Never** fabricate `ca-pub-...`, Infolinks script URLs, ad slot IDs or `ads.txt` seller records.
- The `ads-config.json` file is an explicit checklist, **not an activation switch**. The build will intentionally fail if someone changes an `enabled` flag to true without completing a separately reviewed integration.
- Ads must not appear on the upload area or resemble any file action or download button. Do not overwhelm content with ads.
- All ad units must be clearly labeled, privacy disclosures updated, and mobile behavior tested.
- Test after approval: no ad-network traffic before permitted consent (where required), no overlapping UI, safe redirects, PDFs/images remain locally processed, Lighthouse and CLS regression checks.
- Track revenue per 1,000 **real** pageviews, not synthetic traffic. Use authentic visitors only; invalid traffic can lead to suspension.

## Official resources
- Google's coexistence rules: https://support.google.com/adsense/answer/9728
- Google site verification: https://support.google.com/adsense/answer/7584263
- Google ads.txt guidance: https://support.google.com/adsense/answer/12171612
- Google CMP requirements: https://support.google.com/adsense/answer/13554116
- Infolinks publisher eligibility: https://sites0001.infolinks.com/support/quality/what-are-the-eligibility-criteria-for-my-site-to-qualify-with-infolinks
- Infolinks integration instructions: https://sites0001.infolinks.com/support/integration/how-do-i-integrate-infolinks-into-my-website

## Next item needed to actually connect anything
The owner must obtain an **AdSense verification meta tag** and/or **Infolinks approval plus site-specific script**. Without them, the site is only prepared, not monetized.
