// Cloudflare Pages Function: region-aware GA4 setup for Filefit.
// Country classification is used only for consent UI selection.
// No IP address, analytics ID, or visitor identity is logged or stored here.
// IMPORTANT: Review the India allowlist ahead of DPDP consent provisions in May 2027.
const automaticAnalyticsCountries = new Set(['IN']);

export function onRequestGet({ request }) {
  const country = String(request.cf?.country || '').toUpperCase();
  const eligible = automaticAnalyticsCountries.has(country);

  return new Response(JSON.stringify({
    analyticsMode: eligible ? 'automatic' : 'opt-in'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
