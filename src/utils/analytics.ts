import { VisitorAnalyticsData } from '../types/analytics';

const VISITOR_ID_KEY = 'md_studio_visitor_uuid';
let lastTrackedPath = '';
let lastTrackedTime = 0;

/**
 * Returns or generates an anonymous, unique visitor identifier
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return 'temp_' + Date.now();
  }
}

/**
 * Detects visitor device type (Mobile, Tablet, Desktop)
 */
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua) || (width >= 640 && width <= 1024)) {
    return 'tablet';
  }
  if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo)/.test(ua) || width < 640) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Detects browser name (Chrome, Safari, Firefox, Edge, etc.)
 */
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'Desconhecido';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Google Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Opera') || ua.includes('OPR/')) return 'Opera';
  return 'Navegador Web';
}

/**
 * Sends a visit tracking beacon to the server
 */
export async function trackSiteVisit(path: string = 'home'): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  // Throttle duplicate path tracking within 5 seconds
  if (path === lastTrackedPath && now - lastTrackedTime < 5000) {
    return;
  }
  lastTrackedPath = path;
  lastTrackedTime = now;

  const visitorId = getOrCreateVisitorId();
  const device = detectDeviceType();
  const browser = detectBrowser();
  const referrer = document.referrer ? new URL(document.referrer, window.location.href).hostname : 'Direto';

  try {
    await fetch('/api/analytics/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        path,
        device,
        browser,
        referrer,
      }),
      // Use keepalive so page unloads still send telemetry
      keepalive: true,
    });
  } catch (err) {
    // Non-blocking error handling
    console.debug('[Analytics notice]: Tracking failed silently', err);
  }
}

/**
 * Fetches aggregated visitor statistics from server
 */
export async function fetchVisitorStats(): Promise<VisitorAnalyticsData | null> {
  try {
    const res = await fetch('/api/analytics/stats', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.stats) {
      return data.stats as VisitorAnalyticsData;
    }
  } catch (err) {
    console.warn('[Analytics] Failed to fetch visitor statistics:', err);
  }
  return null;
}

/**
 * Resets visitor analytics (Admin only)
 */
export async function resetVisitorStatsApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/analytics/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}
