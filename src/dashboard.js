import './dashboard.css';
import { getStoredVisits, simulateVisitor, clearAllAnalytics } from './tracker.js';

document.addEventListener('DOMContentLoaded', () => {
  // Authentication Elements
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const adminUserInput = document.getElementById('admin-user');
  const adminPassInput = document.getElementById('admin-pass');
  const loginError = document.getElementById('login-error');
  const loginCard = document.querySelector('.login-card');
  const btnLogout = document.getElementById('btn-logout');

  const AUTH_KEY = 'portfolio_admin_auth';

  // Check auth state
  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'granted';
  }

  // Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loginError.textContent = '';

      const user = adminUserInput.value.trim();
      const pass = adminPassInput.value.trim();

      // Check credentials (default: admin / admin)
      if (user.toLowerCase() === 'admin' && pass === 'admin') {
        sessionStorage.setItem(AUTH_KEY, 'granted');
        loginOverlay.classList.add('hidden');
        showToast('Access Granted. Decrypting telemetry console...', '🔓');
        refreshDashboard();
      } else {
        // Show error and shake animation
        loginError.textContent = 'Invalid credentials. Access Denied.';
        if (loginCard) {
          loginCard.classList.remove('shake');
          void loginCard.offsetWidth; // trigger reflow
          loginCard.classList.add('shake');
        }
      }
    });
  }

  // Handle Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_KEY);
      loginOverlay.classList.remove('hidden');
      adminPassInput.value = '';
      showToast('Session locked. Administrator logged out.', '🔒');
    });
  }

  // Elements
  const valTotalVisitors = document.getElementById('val-total-visitors');
  const valLiveVisitors = document.getElementById('val-live-visitors');
  const valAvgDuration = document.getElementById('val-avg-duration');
  const valInteractions = document.getElementById('val-interactions');
  const tableBody = document.getElementById('visitors-table-body');
  const recordCount = document.getElementById('table-record-count');
  const searchInput = document.getElementById('visitor-search');
  const referrersContainer = document.getElementById('referrers-list');
  const locationsContainer = document.getElementById('locations-list');
  const deviceLegendContainer = document.getElementById('device-legend');
  const toastContainer = document.getElementById('toast-container');

  const btnSimulate = document.getElementById('btn-simulate');
  const btnExport = document.getElementById('btn-export');
  const btnReset = document.getElementById('btn-reset');

  const trafficCanvas = document.getElementById('chart-traffic');
  const devicesCanvas = document.getElementById('chart-devices');

  // Helper: Show notification toast
  function showToast(message, icon = '✓') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Format relative time
  function timeAgo(isoString) {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 30) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // Format seconds to M:SS
  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }

  // ==========================================================================
  // RENDER KPI STATS
  // ==========================================================================
  function updateKPIs(visits) {
    const total = visits.length;
    valTotalVisitors.textContent = total.toLocaleString();

    // Active in last 10 mins
    const now = Date.now();
    const live = visits.filter(v => (now - new Date(v.timestamp).getTime()) < 10 * 60 * 1000 || v.isLive).length;
    valLiveVisitors.textContent = Math.max(1, live);

    // Avg duration
    const totalDuration = visits.reduce((acc, v) => acc + (v.durationSec || 20), 0);
    const avgSec = total > 0 ? totalDuration / total : 0;
    valAvgDuration.textContent = formatDuration(avgSec);

    // Total interactions
    const totalInteractions = visits.reduce((acc, v) => acc + (v.interactionCount || 1), 0);
    valInteractions.textContent = totalInteractions.toLocaleString();
  }

  // ==========================================================================
  // RENDER TRAFFIC LINE CHART (CANVAS)
  // ==========================================================================
  function renderTrafficChart(visits) {
    if (!trafficCanvas) return;
    const ctx = trafficCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = trafficCanvas.getBoundingClientRect();
    
    trafficCanvas.width = rect.width * dpr;
    trafficCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Group visits into 12 buckets over 24 hours
    const buckets = new Array(12).fill(0);
    const now = Date.now();
    const twoHoursMs = 2 * 3600 * 1000;

    visits.forEach(v => {
      const ageMs = now - new Date(v.timestamp).getTime();
      const bucketIdx = 11 - Math.floor(ageMs / twoHoursMs);
      if (bucketIdx >= 0 && bucketIdx < 12) {
        buckets[bucketIdx]++;
      }
    });

    // Ensure baseline aesthetic line if few points
    const data = buckets.map(v => Math.max(1, v));
    const maxVal = Math.max(...data, 5);

    // Clear
    ctx.clearRect(0, 0, w, h);

    const padLeft = 40;
    const padRight = 20;
    const padTop = 30;
    const padBottom = 30;

    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padTop + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#565d7a';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      const labelVal = Math.round(maxVal - (maxVal / 3) * i);
      ctx.fillText(labelVal, padLeft - 10, y + 3);
    }

    // Coordinates
    const points = data.map((val, idx) => {
      const x = padLeft + (chartW / (data.length - 1)) * idx;
      const y = padTop + chartH - (val / maxVal) * chartH;
      return { x, y };
    });

    // Area Fill Gradient
    const gradient = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, h - padBottom);
    ctx.lineTo(points[0].x, h - padBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line Stroke
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Draw Points
    points.forEach((p, idx) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#06060e';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Time X labels for every 3rd point
      if (idx % 3 === 0 || idx === points.length - 1) {
        ctx.fillStyle = '#8c93b3';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        const hoursAgo = (11 - idx) * 2;
        const label = hoursAgo === 0 ? 'Now' : `-${hoursAgo}h`;
        ctx.fillText(label, p.x, h - 10);
      }
    });
  }

  // ==========================================================================
  // RENDER DEVICE BREAKDOWN DONUT CHART (CANVAS)
  // ==========================================================================
  function renderDeviceChart(visits) {
    if (!devicesCanvas) return;
    const ctx = devicesCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = devicesCanvas.getBoundingClientRect();

    devicesCanvas.width = rect.width * dpr;
    devicesCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Count device types
    let desktop = 0, mobile = 0, tablet = 0;
    visits.forEach(v => {
      if (v.deviceType === 'Mobile') mobile++;
      else if (v.deviceType === 'Tablet') tablet++;
      else desktop++;
    });

    const total = Math.max(1, visits.length);
    const desktopPct = Math.round((desktop / total) * 100);
    const mobilePct = Math.round((mobile / total) * 100);
    const tabletPct = 100 - desktopPct - mobilePct;

    // Segments
    const segments = [
      { label: 'Desktop', pct: desktopPct, color: '#00f0ff', count: desktop },
      { label: 'Mobile', pct: mobilePct, color: '#bd00ff', count: mobile },
      { label: 'Tablet', pct: tabletPct, color: '#00ff88', count: tablet }
    ].filter(s => s.count > 0);

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 - 10;
    const outerRadius = Math.min(w, h) / 2.8;
    const innerRadius = outerRadius * 0.65;

    let currentAngle = -Math.PI / 2;

    segments.forEach(seg => {
      const sliceAngle = (seg.pct / 100) * (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.shadowColor = seg.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      currentAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = '#f0f2ff';
    ctx.font = 'bold 16px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total}`, centerX, centerY - 5);
    ctx.font = '9px JetBrains Mono';
    ctx.fillStyle = '#8c93b3';
    ctx.fillText('VISITS', centerX, centerY + 12);

    // Update HTML legend
    deviceLegendContainer.innerHTML = segments.map(seg => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${seg.color}; box-shadow:0 0 6px ${seg.color}"></span>
        <span>${seg.label}: <strong>${seg.pct}%</strong></span>
      </div>
    `).join('');
  }

  // ==========================================================================
  // RENDER REFERRERS & LOCATIONS LISTS
  // ==========================================================================
  function renderBreakdowns(visits) {
    // 1. Top Referrers
    const refCounts = {};
    visits.forEach(v => {
      const r = v.referrer || 'Direct';
      refCounts[r] = (refCounts[r] || 0) + 1;
    });

    const sortedRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxRef = sortedRefs[0] ? sortedRefs[0][1] : 1;

    referrersContainer.innerHTML = sortedRefs.map(([source, count]) => {
      const pct = Math.round((count / visits.length) * 100);
      const widthPct = Math.round((count / maxRef) * 100);
      return `
        <div class="bar-row">
          <div class="bar-info">
            <span class="bar-name">${source}</span>
            <span class="bar-val">${count} (${pct}%)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${widthPct}%"></div>
          </div>
        </div>
      `;
    }).join('');

    // 2. Geographic Locations
    const locCounts = {};
    visits.forEach(v => {
      const key = v.location ? `${v.location.flag || '📍'} ${v.location.city}, ${v.location.country}` : '📍 Unknown';
      locCounts[key] = (locCounts[key] || 0) + 1;
    });

    const sortedLocs = Object.entries(locCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    locationsContainer.innerHTML = sortedLocs.map(([label, count]) => {
      const parts = label.split(' ');
      const flag = parts[0];
      const name = parts.slice(1).join(' ');
      return `
        <div class="loc-item">
          <div class="loc-left">
            <span class="loc-flag">${flag}</span>
            <div>
              <div class="loc-city">${name}</div>
            </div>
          </div>
          <span class="loc-count">${count} visits</span>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // RENDER ACTIVITY TABLE
  // ==========================================================================
  function renderTable(visits, query = '') {
    const filtered = visits.filter(v => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (v.id && v.id.toLowerCase().includes(q)) ||
        (v.browser && v.browser.toLowerCase().includes(q)) ||
        (v.os && v.os.toLowerCase().includes(q)) ||
        (v.referrer && v.referrer.toLowerCase().includes(q)) ||
        (v.location && (v.location.city.toLowerCase().includes(q) || v.location.country.toLowerCase().includes(q)))
      );
    });

    recordCount.textContent = `Showing ${filtered.length} of ${visits.length} records`;

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color:#565d7a;">No matching visitors found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.slice(0, 25).map(v => {
      const tagClass = v.deviceType === 'Mobile' ? 'tag-mobile' : (v.deviceType === 'Tablet' ? 'tag-tablet' : 'tag-desktop');
      const isLive = v.isLive || (Date.now() - new Date(v.timestamp).getTime() < 5 * 60 * 1000);
      const statusBadge = isLive 
        ? `<span class="badge-live"><span class="live-indicator"></span> LIVE</span>`
        : `<span class="badge-recent">RECENT</span>`;

      return `
        <tr>
          <td>${statusBadge}</td>
          <td><span class="visitor-id-pill">${v.id.substring(0, 10)}</span></td>
          <td>${v.location ? `${v.location.flag || ''} ${v.location.city}, ${v.location.code || ''}` : 'Unknown'}</td>
          <td><span class="device-tag ${tagClass}">${v.deviceType}</span> ${v.os}</td>
          <td>${v.browser}</td>
          <td style="font-family: var(--font-mono); font-size:0.75rem;">${v.screenRes || '1920x1080'}</td>
          <td>${v.referrer || 'Direct'}</td>
          <td>
            <div>${timeAgo(v.timestamp)}</div>
            <div style="font-size:0.7rem; color:#565d7a;">${formatDuration(v.durationSec || 15)} active</div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Master refresh function
  function refreshDashboard() {
    const visits = getStoredVisits();
    updateKPIs(visits);
    renderTrafficChart(visits);
    renderDeviceChart(visits);
    renderBreakdowns(visits);
    renderTable(visits, searchInput ? searchInput.value : '');
  }

  // Initial load — only render dashboard if already authenticated
  if (isAuthenticated()) {
    loginOverlay.classList.add('hidden');
    refreshDashboard();
  }
  // Otherwise login overlay stays visible until credentials are entered

  // Handle search input filtering
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const visits = getStoredVisits();
      renderTable(visits, e.target.value);
    });
  }

  // ==========================================================================
  // ACTION BUTTONS
  // ==========================================================================

  // Simulate incoming live visitor
  if (btnSimulate) {
    btnSimulate.addEventListener('click', () => {
      const newV = simulateVisitor();
      refreshDashboard();
      showToast(`New visitor from ${newV.location.city}, ${newV.location.country} (${newV.browser}) detected!`, '⚡');
    });
  }

  // Export Analytics JSON
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const visits = getStoredVisits();
      const blob = new Blob([JSON.stringify(visits, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-visitor-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported analytics JSON successfully.', '📥');
    });
  }

  // Reset Analytics Data
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset and regenerate fresh analytics data?')) {
        clearAllAnalytics();
        refreshDashboard();
        showToast('Analytics data reset to default seed.', '🗑️');
      }
    });
  }

  // Listen to live visit events from other pages or simulator
  window.addEventListener('portfolio_visit_logged', () => {
    refreshDashboard();
  });

  // Re-draw charts on window resize
  window.addEventListener('resize', () => {
    const visits = getStoredVisits();
    renderTrafficChart(visits);
    renderDeviceChart(visits);
  });
});
