# Filefit GA4 region-aware tracking policy

Implemented 4 November 2026 for Filefit (https://file-fit.pages.dev).

## Region classification
- Cloudflare Pages Function: `functions/api/analytics-region.js` exposes `GET /api/analytics-region`.
- The Function uses **only** `request.cf.country` (country-level request metadata already available to Cloudflare). No location or IP address is stored in the Function or logged by Filefit.
- The allowlist for **automatic Google Analytics 4** is deliberately restricted to **India (IN)** as of November 2026, considering the staged commencement of India's DPDP Act, with consent provisions scheduled for May 2027.
- All other countries (including EEA/UK/Switzerland), missing or unrecognized countries, Functions failures, network errors, and timeouts require explicit opt-in. Never infer location from browser locale or timezone.
- `dist/_routes.json` limits Worker invocations to this endpoint to protect Filefit's free static-hosting use.
- The response is `Cache-Control: private, no-store, max-age=0` and only returns the UI mode `automatic` or `opt-in`. A session's current region is checked at every new page load.

## Preferences and privacy
- Existing Google Analytics preferences under `filefit_google_analytics_choice_v1` are preserved. An explicit **decline** disables GA4 regardless of region. An explicit **allow** lets GA4 run unless the browser sends Global Privacy Control.
- Auto tracking does **not** save an artificial "consent". Visitors in an automatic region see no popup, but can opt out through the existing **Analytics preferences** footer control. Opt-out persists in local storage and reloads the page to unload the Google tag.
- A browser **Global Privacy Control** signal prevents GA4 from loading; the visitor can see this restriction in their footer preferences.
- When allowed, Google Consent Mode v2 grants `analytics_storage` while denying `ad_storage`, `ad_user_data`, and `ad_personalization`. It also disables Google Signals and advertising-personalization signals in the GA4 config.
- No first-party image or PDF content is sent to GA4. Page location is limited to the origin + pathname to avoid capturing private query strings.
- This change **does not activate Google AdSense or Infolinks advertisements**, and the existing separate Infolinks preferences stay unchanged.
- Cloudflare Web Analytics remains enabled separately, cookie-free.

## Things to test
1. From a known India network (without an existing preference), open Filefit: no GA4 popup; analytics script loads after the `/api/analytics-region` response.
2. From a non-India network: popup appears before GA4 loads; "Not now" sends no Google tag request; "Allow analytics" loads it.
3. Force the region endpoint to fail: do not load GA4; show the consent option.
4. Save a decline, reload from India: GA4 stays off; clicking Analytics preferences can opt in.
5. Save allow, reload: GA4 runs, unless Global Privacy Control is active.
6. Disable tracking using footer preferences after GA4 ran: page reloads without the tag and attempts to clear common GA4 first-party cookies.
7. Confirm no changes to Infolinks, AdSense approval, tool uploads/downloads, mobile layout, accessibility or site indexability.

## Follow-up / policy review
**Review the India automatic allowlist before 13 May 2027**, when more DPDP Act consent provisions are scheduled to commence. Do not assume the country allowlist proves legal compliance in every use case or that Cloudflare geolocation is infallible. Other local privacy rules and user preferences may impose additional conditions.

## Official documentation
- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/get-started/
- Cloudflare routing / `_routes.json`: https://developers.cloudflare.com/pages/functions/routing/
- Cloudflare incoming request country: https://developers.cloudflare.com/workers/runtime-apis/request/
- Google EU consent: https://www.google.com/about/company/user-consent-policy/
- Google Consent Mode Basic: https://support.google.com/analytics/answer/10000067
- Indian staged DPDP commencement: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014
