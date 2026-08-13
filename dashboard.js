/* Kit Finder — Dashboard interno de analytics.
   Standalone (no depende de app.js/auth.js): gate propio con Firebase Auth
   (allowlist por email) + fetch directo al endpoint /analytics del Worker
   kitfinder-search, mismo patrón que shirt-checker.js usa para /shirt-check. */

var API_BASE = 'https://kitfinder-search.wearekitfinder.workers.dev';
var ADMIN_EMAILS = ['miguelsasaiz@gmail.com'];

var firebaseConfig = {
  apiKey: "AIzaSyBGrY_Az2x7O9sszMOsz550FGSNS5r3VPY",
  authDomain: "kit-finder-82298.firebaseapp.com",
  projectId: "kit-finder-82298",
  storageBucket: "kit-finder-82298.firebasestorage.app",
  messagingSenderId: "729482193363",
  appId: "1:729482193363:web:8650b9a981e349e5baa726"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();

var GREEN = '#1FAF6D';
var GREEN_FADE = 'rgba(31,175,109,.12)';

function fmtNum(n) {
  return (n == null) ? '—' : Number(n).toLocaleString('es-ES');
}

function setGateError(msg) {
  var el = document.getElementById('dbGateError');
  if (el) el.textContent = msg || '';
}

// ── Auth gate ────────────────────────────────────────────────────────────
document.getElementById('dbSignInBtn').addEventListener('click', function () {
  setGateError('');
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(function (e) {
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      setGateError(e.message.replace('Firebase: ', ''));
    }
  });
});

document.getElementById('dbSignOutBtn').addEventListener('click', function () {
  auth.signOut();
});

auth.onAuthStateChanged(function (user) {
  var gate = document.getElementById('dbGate');
  var dash = document.getElementById('kfDashboard');
  var userBox = document.getElementById('dbUserBox');

  if (!user) {
    gate.style.display = 'block';
    dash.style.display = 'none';
    userBox.style.display = 'none';
    document.getElementById('dbGateMsg').textContent = 'Inicia sesión con la cuenta autorizada para ver el dashboard de analytics.';
    document.getElementById('dbSignInBtn').style.display = 'inline-flex';
    return;
  }

  if (ADMIN_EMAILS.indexOf(user.email) === -1) {
    gate.style.display = 'block';
    dash.style.display = 'none';
    userBox.style.display = 'none';
    document.getElementById('dbGateMsg').textContent = 'La cuenta ' + user.email + ' no tiene acceso a este dashboard.';
    document.getElementById('dbSignInBtn').style.display = 'none';
    setGateError('');
    return;
  }

  gate.style.display = 'none';
  dash.style.display = 'block';
  userBox.style.display = 'flex';
  document.getElementById('dbUserEmail').textContent = user.email;
  document.getElementById('dbUserAvatar').src = user.photoURL || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email) + '&background=1FAF6D&color=fff');

  loadDashboard();
});

// ── Data loading ─────────────────────────────────────────────────────────
function fetchAnalytics(type, limit) {
  return fetch(API_BASE + '/analytics?type=' + type + '&limit=' + limit)
    .then(function (r) { return r.json(); })
    .then(function (d) { return (d && d.snapshots) || []; })
    .catch(function () { return []; });
}

var loaded = false;
function loadDashboard() {
  if (loaded) return; // el gate puede re-disparar onAuthStateChanged
  loaded = true;

  Promise.all([
    fetchAnalytics('rolling30d', 90),
    fetchAnalytics('month', 24)
  ]).then(function (res) {
    var rolling = res[0].slice().sort(function (a, b) { return a.period_key < b.period_key ? -1 : 1; }); // asc
    var monthly = res[1].slice().sort(function (a, b) { return a.period_key < b.period_key ? -1 : 1; }); // asc

    renderUpdated(rolling);
    renderKpis(rolling);
    renderTrendCharts(rolling);
    renderStores(rolling);
    renderCountries(rolling);
    renderCities(rolling);
    renderMonthly(monthly);
    renderSources(monthly);
  });
}

function renderUpdated(rolling) {
  var el = document.getElementById('dbUpdated');
  if (!rolling.length) { el.textContent = 'Sin datos todavía.'; return; }
  var last = rolling[rolling.length - 1];
  el.textContent = 'Último snapshot: ' + last.period_key + ' (capturado ' + (last.captured_at || '').slice(0, 16).replace('T', ' ') + ' UTC)';
}

// ── KPI cards ────────────────────────────────────────────────────────────
var KPI_DEFS = [
  { key: 'users_active', label: 'Usuarios activos' },
  { key: 'users_new', label: 'Usuarios nuevos' },
  { key: 'events_total', label: 'Eventos totales' },
  { key: 'store_click_total', label: 'Clics a tienda' }
];

function renderKpis(rolling) {
  var row = document.getElementById('dbKpiRow');
  row.innerHTML = '';

  if (!rolling.length) {
    row.innerHTML = '<div class="db-empty" style="grid-column:1/-1;">Sin snapshots de los últimos 30 días todavía.</div>';
    return;
  }

  var latest = rolling[rolling.length - 1];
  var prev = rolling.length > 7 ? rolling[rolling.length - 1 - 7] : null;

  KPI_DEFS.forEach(function (def) {
    var val = latest[def.key];
    var deltaHtml = '';
    if (prev && prev[def.key] > 0) {
      var pct = ((val - prev[def.key]) / prev[def.key]) * 100;
      var cls = pct > 0.5 ? 'up' : (pct < -0.5 ? 'down' : 'flat');
      var sign = pct > 0 ? '+' : '';
      deltaHtml = '<div class="db-kpi-delta ' + cls + '">' + sign + pct.toFixed(1) + '% vs hace 7 días</div>';
    }
    var card = document.createElement('div');
    card.className = 'db-kpi';
    card.innerHTML = '<div class="db-kpi-label">' + def.label + '</div>' +
      '<div class="db-kpi-value">' + fmtNum(val) + '</div>' + deltaHtml;
    row.appendChild(card);
  });
}

// ── Trend charts (rolling30d, ventana móvil) ────────────────────────────
var chartRefs = {};
function lineChart(canvasId, labels, data, label) {
  var ctx = document.getElementById(canvasId).getContext('2d');
  if (chartRefs[canvasId]) chartRefs[canvasId].destroy();
  chartRefs[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: GREEN,
        backgroundColor: GREEN_FADE,
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderTrendCharts(rolling) {
  if (!rolling.length) return;
  var labels = rolling.map(function (r) { return r.period_key; });
  lineChart('dbChartActive', labels, rolling.map(function (r) { return r.users_active; }), 'Usuarios activos');
  lineChart('dbChartEvents', labels, rolling.map(function (r) { return r.events_total; }), 'Eventos totales');
}

function hBarChart(canvasId, labels, data) {
  var ctx = document.getElementById(canvasId).getContext('2d');
  if (chartRefs[canvasId]) chartRefs[canvasId].destroy();
  chartRefs[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ data: data, backgroundColor: GREEN, borderRadius: 4 }] },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { font: { size: 11 } } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderStores(rolling) {
  var box = document.getElementById('dbChartStores').parentNode;
  if (!rolling.length || !rolling[rolling.length - 1].store_clicks.length) {
    box.querySelector('canvas').style.display = 'none';
    if (!box.querySelector('.db-empty')) box.insertAdjacentHTML('beforeend', '<div class="db-empty">Sin datos de tiendas.</div>');
    return;
  }
  var top = rolling[rolling.length - 1].store_clicks.slice(0, 10);
  hBarChart('dbChartStores', top.map(function (s) { return s[0]; }), top.map(function (s) { return s[1]; }));
}

function renderCountries(rolling) {
  var box = document.getElementById('dbChartCountries').parentNode;
  if (!rolling.length || !rolling[rolling.length - 1].top_countries.length) {
    box.querySelector('canvas').style.display = 'none';
    if (!box.querySelector('.db-empty')) box.insertAdjacentHTML('beforeend', '<div class="db-empty">Sin datos de países.</div>');
    return;
  }
  var top = rolling[rolling.length - 1].top_countries.slice(0, 10);
  hBarChart('dbChartCountries', top.map(function (c) { return c[0]; }), top.map(function (c) { return c[1]; }));
}

function renderCities(rolling) {
  var box = document.getElementById('dbCitiesTable');
  var cities = rolling.length ? rolling[rolling.length - 1].top_cities : null;
  if (!cities || !cities.length) {
    box.innerHTML = '<div class="db-empty">Sin datos de ciudades en el último snapshot.</div>';
    return;
  }
  var html = '<table class="db-table"><thead><tr><th>Ciudad</th><th class="num">Usuarios activos</th></tr></thead><tbody>';
  cities.slice(0, 10).forEach(function (c) {
    html += '<tr><td>' + c[0] + '</td><td class="num">' + fmtNum(c[1]) + '</td></tr>';
  });
  html += '</tbody></table>';
  box.innerHTML = html;
}

// ── Histórico mensual ────────────────────────────────────────────────────
function renderMonthly(monthly) {
  var box = document.getElementById('dbMonthlyTable');
  if (!monthly.length) {
    box.innerHTML = '<div class="db-empty">Sin meses cerrados todavía.</div>';
    return;
  }
  var html = '<table class="db-table"><thead><tr><th>Mes</th><th class="num">Usuarios activos</th><th class="num">Usuarios nuevos</th><th class="num">Eventos</th><th class="num">Clics a tienda</th></tr></thead><tbody>';
  monthly.slice().reverse().forEach(function (m) {
    html += '<tr><td>' + m.period_key + '</td><td class="num">' + fmtNum(m.users_active) + '</td><td class="num">' + fmtNum(m.users_new) + '</td><td class="num">' + fmtNum(m.events_total) + '</td><td class="num">' + fmtNum(m.store_click_total) + '</td></tr>';
  });
  html += '</tbody></table>';
  box.innerHTML = html;
}

function renderSources(monthly) {
  var box = document.getElementById('dbSourcesTable');
  var last = monthly.length ? monthly[monthly.length - 1] : null;
  var sources = last ? last.top_sources : null;
  if (!sources || !sources.length) {
    box.innerHTML = '<div class="db-empty">Sin datos de fuentes de tráfico todavía (se calculan al cerrar cada mes).</div>';
    return;
  }
  var html = '<table class="db-table"><thead><tr><th>Fuente / medio</th><th class="num">Usuarios activos</th></tr></thead><tbody>';
  sources.slice(0, 10).forEach(function (s) {
    html += '<tr><td>' + s[0] + '</td><td class="num">' + fmtNum(s[1]) + '</td></tr>';
  });
  html += '</tbody></table>';
  box.innerHTML = html;
}
