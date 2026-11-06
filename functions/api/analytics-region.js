// Cloudflare Pages Function: region-aware GA4 setup for Filefit.
// Country classification is used only for optional analytics/ad consent selection.
// No IP address, analytics ID, or visitor identity is logged or stored here.
// IMPORTANT: Reassess India automatic ad loading before DPDP consent rules commence in May 2027.
const automaticAnalyticsCountries = new Set(['IN']);

export function onRequestGet({ request }) {
  const country = String(request.cf?.country || '').toUpperCase();
  const eligible = automaticAnalyticsCountries.has(country);

  return new Response(JSON.stringify({
    analyticsMode: eligible ? 'automatic' : 'opt-in',
    // Independent ad policy. Fail-closed in the browser if classification is unavailable.
    adsterraMode: country === 'IN' ? 'automatic' : 'opt-in'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
