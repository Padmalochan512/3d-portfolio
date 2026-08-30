/**
 * Visitor Telemetry & Analytics Tracking Module
 * Tracks visitor metadata, page interactions, and persists analytics in localStorage.
 */

const STORAGE_KEY = 'portfolio_analytics_data_v1';
const VISITOR_ID_KEY = 'portfolio_visitor_uuid';

// Helper to generate unique IDs
function generateUUID() {
  return 'v-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

// Parse device and OS details from navigator
function parseClientInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceType = 'Desktop';

  // Detect OS
  if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua) && !/Android/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';

  // Detect Device
  if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'Tablet';
  }

  // Detect Browser
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  // Timezone and Country/Location estimate
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    // fallback
  }

  return {
    os,
    browser,
    deviceType,
    timezone,
    language: navigator.language || 'en-US',
    screenRes: `${window.screen.width}x${window.screen.height}`,
    colorDepth: `${window.screen.colorDepth}-bit`
  };
}

// Get or create persistent visitor ID
export function getVisitorId() {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

// Initial realistic dataset generator so dashboard is populated on first load
function generateSeedData() {
  const sampleLocations = [
    { city: 'San Francisco', country: 'United States', code: 'US', flag: '🇺🇸', tz: 'America/Los_Angeles' },
    { city: 'London', country: 'United Kingdom', code: 'GB', flag: '🇬🇧', tz: 'Europe/London' },
    { city: 'Tokyo', country: 'Japan', code: 'JP', flag: '🇯🇵', tz: 'Asia/Tokyo' },
    { city: 'Berlin', country: 'Germany', code: 'DE', flag: '🇩🇪', tz: 'Europe/Berlin' },
    { city: 'Toronto', country: 'Canada', code: 'CA', flag: '🇨🇦', tz: 'America/Toronto' },
    { city: 'Bengaluru', country: 'India', code: 'IN', flag: '🇮🇳', tz: 'Asia/Kolkata' },
    { city: 'Sydney', country: 'Australia', code: 'AU', flag: '🇦🇺', tz: 'Australia/Sydney' },
    { city: 'Singapore', country: 'Singapore', code: 'SG', flag: '🇸🇬', tz: 'Asia/Singapore' },
    { city: 'Amsterdam', country: 'Netherlands', code: 'NL', flag: '🇳🇱', tz: 'Europe/Amsterdam' },
  ];

  const browsers = ['Google Chrome', 'Apple Safari', 'Mozilla Firefox', 'Microsoft Edge'];
  const osList = ['macOS', 'Windows', 'iOS', 'Android', 'Linux'];
  const referrers = ['Direct', 'github.com', 'linkedin.com', 'google.com', 'twitter.com / X', 'dribbble.com'];
  
  const visits = [];
  const now = Date.now();

  for (let i = 24; i >= 1; i--) {
    const loc = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
    const os = osList[Math.floor(Math.random() * osList.length)];
    const deviceType = (os === 'iOS' || os === 'Android') ? 'Mobile' : 'Desktop';
    const timestamp = new Date(now - (i * 3600 * 1000) + Math.random() * 1800000).toISOString();
    const durationSec = Math.floor(20 + Math.random() * 240);

    visits.push({
      id: generateUUID(),
      timestamp,
      location: loc,
      os,
      browser: browsers[Math.floor(Math.random() * browsers.length)],
      deviceType,
      screenRes: deviceType === 'Desktop' ? '1920x1080' : '390x844',
      referrer: referrers[Math.floor(Math.random() * referrers.length)],
      durationSec,
      pagesVisited: ['/ (Hero)', '/#projects', '/#about'],
      interactionCount: Math.floor(2 + Math.random() * 8),
      isLive: false
    });
  }

  return visits;
}

// Load all recorded visits from storage
export function getStoredVisits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = generateSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse analytics data:', err);
    return [];
  }
}

// Save visits to storage
function saveVisits(visits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch (err) {
    console.error('Failed to save analytics data:', err);
  }
}

// Record current page visit
export function trackPageView() {
  const client = parseClientInfo();
  const visitorId = getVisitorId();
  const visits = getStoredVisits();

  // Determine referrer label
  let referrer = 'Direct';
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      referrer = refUrl.hostname;
    } catch (e) {
      referrer = document.referrer;
    }
  }

  const newVisit = {
    id: visitorId,
    timestamp: new Date().toISOString(),
    location: {
      city: 'Local Client',
      country: 'Your Location',
      code: 'LOC',
      flag: '📍',
      tz: client.timezone
    },
    os: client.os,
    browser: client.browser,
    deviceType: client.deviceType,
    screenRes: client.screenRes,
    referrer,
    durationSec: 5, // initial start
    pagesVisited: [window.location.pathname || '/'],
    interactionCount: 1,
    isLive: true
  };

  // Add to beginning of list
  visits.unshift(newVisit);
  if (visits.length > 100) visits.pop(); // keep last 100

  saveVisits(visits);

  // Dispatch custom event for real-time dashboard listeners
  window.dispatchEvent(new CustomEvent('portfolio_visit_logged', { detail: newVisit }));

  // Track session duration periodically
  let sessionSeconds = 5;
  const timer = setInterval(() => {
    sessionSeconds += 5;
    const currentVisits = getStoredVisits();
    const target = currentVisits.find(v => v.id === visitorId);
    if (target) {
      target.durationSec = sessionSeconds;
      saveVisits(currentVisits);
    }
  }, 5000);

  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
  });
}

// Record user interactions (e.g. clicking a project or submitting contact form)
export function trackInteraction(eventType, details = '') {
  const visitorId = getVisitorId();
  const visits = getStoredVisits();
  const target = visits.find(v => v.id === visitorId);
  if (target) {
    target.interactionCount = (target.interactionCount || 0) + 1;
    saveVisits(visits);
  }
}

// Simulate a live incoming visitor (for testing/demoing the dashboard)
export function simulateVisitor() {
  const sampleLocations = [
    { city: 'San Francisco', country: 'United States', code: 'US', flag: '🇺🇸', tz: 'America/Los_Angeles' },
    { city: 'Tokyo', country: 'Japan', code: 'JP', flag: '🇯🇵', tz: 'Asia/Tokyo' },
    { city: 'Berlin', country: 'Germany', code: 'DE', flag: '🇩🇪', tz: 'Europe/Berlin' },
    { city: 'Bengaluru', country: 'India', code: 'IN', flag: '🇮🇳', tz: 'Asia/Kolkata' },
    { city: 'Paris', country: 'France', code: 'FR', flag: '🇫🇷', tz: 'Europe/Paris' },
    { city: 'Seoul', country: 'South Korea', code: 'KR', flag: '🇰🇷', tz: 'Asia/Seoul' },
    { city: 'Stockholm', country: 'Sweden', code: 'SE', flag: '🇸🇪', tz: 'Europe/Stockholm' }
  ];
  
  const browsers = ['Google Chrome', 'Apple Safari', 'Mozilla Firefox', 'Microsoft Edge'];
  const osList = ['macOS', 'Windows', 'iOS', 'Android'];
  const referrers = ['github.com', 'linkedin.com', 'google.com', 'twitter.com / X', 'Direct'];
  
  const loc = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
  const os = osList[Math.floor(Math.random() * osList.length)];
  const deviceType = (os === 'iOS' || os === 'Android') ? 'Mobile' : 'Desktop';
  
  const fakeVisit = {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    location: loc,
    os,
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    deviceType,
    screenRes: deviceType === 'Desktop' ? '1920x1080' : '390x844',
    referrer: referrers[Math.floor(Math.random() * referrers.length)],
    durationSec: Math.floor(10 + Math.random() * 45),
    pagesVisited: ['/ (Hero)', '/#projects'],
    interactionCount: Math.floor(1 + Math.random() * 4),
    isLive: true
  };

  const visits = getStoredVisits();
  visits.unshift(fakeVisit);
  if (visits.length > 100) visits.pop();
  saveVisits(visits);

  window.dispatchEvent(new CustomEvent('portfolio_visit_logged', { detail: fakeVisit }));
  return fakeVisit;
}

// Reset analytics data
export function clearAllAnalytics() {
  localStorage.removeItem(STORAGE_KEY);
}
