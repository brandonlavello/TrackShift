const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

/** Load Cloudflare Web Analytics when a beacon token is configured (production only). */
export function initCloudflareAnalytics(): void {
  const token = import.meta.env.VITE_CF_BEACON_TOKEN;
  if (!import.meta.env.PROD || !token) return;

  if (document.querySelector(`script[src="${BEACON_SRC}"]`)) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = BEACON_SRC;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  document.head.appendChild(script);
}
