// shirt-checker.js — team autocomplete for the Shirt Value Checker page
const TEAMS_API = 'https://kitfinder-search.wearekitfinder.workers.dev/teams';
const SHIRT_CHECK_API = 'https://kitfinder-search.wearekitfinder.workers.dev/shirt-check';

let ALL_TEAMS = [];
let teamsState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
let selectedTeam = null;
let teamDropdownOpen = false;

let selectedSizes = new Set();
let selectedSeason = '';
let selectedVersion = '';

// Currency: mirrors the main site's fmtPrice() logic (app.js) rather than
// loading all of app.js here. Reads the same 'kf_country' selection and the
// same exchange-rate cache keys, so if the user already visited the main
// site the rates are already warm — no extra fetch. priceEUR from the API
// is already in EUR, so only the EUR->target leg (DISPLAY_RATES) is needed.
let DISPLAY_RATES = {EUR:1,USD:1.1386,GBP:0.8627,AUD:1.6515,CAD:1.6156,CHF:0.9222,JPY:184.1935,CNY:7.7443,KRW:1750.3697,MXN:19.9328,BRL:5.8982,PLN:4.2872,SEK:11.0819,NOK:11.3113,DKK:7.4609,CZK:24.2492,HUF:353.8573,RON:5.241,BGN:1.9558,TRY:53.0657,INR:107.4938,IDR:20381.8665,THB:38.0167,ZAR:18.7456,NZD:2.0179,SGD:1.4736,HKD:8.9292,RUB:88.5614,UAH:51.1697,ARS:1679.1643,CLP:1049.7401,COP:3930.3729,PEN:3.8912,ALL:94.2736,DZD:151.9776,SAR:4.2699,AMD:419.3635,BOB:7.8771,BAM:1.9558,GTQ:8.6966,ISK:144.0133,MKD:61.695,MDL:20.1365,NIO:41.9171,PYG:6923.6968,RSD:117.395,UYU:45.6762,VES:710.1021,AED:4.1816};
let currentCountry = JSON.parse(localStorage.getItem('kf_country') || 'null') || {symbol: '€', currency: 'EUR'};

function loadExchangeRates() {
  const KEY_DISP = 'kf_display_rates', KEY_TIME = 'kf_exchange_rates_time';
  const cachedD = localStorage.getItem(KEY_DISP), cachedT = localStorage.getItem(KEY_TIME);
  if (cachedD && cachedT && Date.now() - parseInt(cachedT) < 36e5) {
    try {
      const dd = JSON.parse(cachedD);
      if (!dd.USD || !dd.GBP) throw new Error('bad cache');
      Object.assign(DISPLAY_RATES, dd);
      return;
    } catch (err) { /* fall through to live fetch */ }
  }
  const APIS = ['https://open.er-api.com/v6/latest/EUR', 'https://api.frankfurter.dev/v1/latest?from=EUR'];
  (async function () {
    for (const apiUrl of APIS) {
      try {
        const resp = await Promise.race([fetch(apiUrl), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 6000); })]);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        const raw = data.rates || {};
        if (!raw.USD || !raw.GBP) throw new Error('rates missing');
        const fromEUR = {EUR: 1};
        for (const [cur, val] of Object.entries(raw)) {
          if (val > 0) fromEUR[cur] = Math.round(val * 10000) / 10000;
        }
        Object.assign(DISPLAY_RATES, fromEUR);
        localStorage.setItem(KEY_DISP, JSON.stringify(fromEUR));
        localStorage.setItem(KEY_TIME, Date.now().toString());
        return;
      } catch (err) { /* try next API */ }
    }
  })();
}

function fmtPriceFromEUR(priceEUR) {
  const n = priceEUR * (DISPLAY_RATES[currentCountry.currency] || 1);
  return currentCountry.symbol + (n >= 1000 ? Math.round(n).toLocaleString() : n.toFixed(2));
}

function loadTeamsOnce() {
  if (teamsState === 'loading' || teamsState === 'loaded') return;
  teamsState = 'loading';
  fetch(TEAMS_API)
    .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
    .then(function (data) {
      ALL_TEAMS = Array.isArray(data.teams) ? data.teams : [];
      teamsState = 'loaded';
      if (teamDropdownOpen) renderTeamDropdown(document.getElementById('teamSearchInput').value);
    })
    .catch(function () {
      teamsState = 'error';
      if (teamDropdownOpen) renderTeamDropdown(document.getElementById('teamSearchInput').value);
    });
}

function matchesTeam(team, q) {
  if (team.name.toLowerCase().includes(q)) return true;
  return (team.aliases || []).some(function (a) { return a.toLowerCase().includes(q); });
}

function renderTeamDropdown(query) {
  const dd = document.getElementById('teamSearchDropdown');
  if (!dd) return;
  dd.innerHTML = '';

  if (teamsState === 'loading' || teamsState === 'idle') {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = 'Loading teams…';
    dd.appendChild(d);
    return;
  }
  if (teamsState === 'error') {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = 'Could not load teams. Try again.';
    dd.appendChild(d);
    return;
  }

  const q = (query || '').trim().toLowerCase();
  const results = q === ''
    ? []
    : ALL_TEAMS.filter(function (t) { return matchesTeam(t, q); }).slice(0, 8);

  if (results.length === 0) {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = q === '' ? 'Start typing a team name…' : 'No teams found';
    dd.appendChild(d);
    return;
  }

  results.forEach(function (t) {
    const opt = document.createElement('div');
    opt.className = 'sc-team-opt';
    opt.innerHTML = '<span>' + t.name + '</span><span class="sc-team-country">' + (t.country || '') + '</span>';
    opt.addEventListener('mousedown', function (e) {
      e.preventDefault();
      selectTeam(t);
    });
    dd.appendChild(opt);
  });
}

function selectTeam(team) {
  selectedTeam = team;
  document.getElementById('teamSearchInput').value = team.name;
  closeTeamDropdown();
  onFiltersChanged();
}

function onTeamInput(value) {
  selectedTeam = null;
  openTeamDropdown();
  renderTeamDropdown(value);
}

function onTeamFocus() {
  openTeamDropdown();
  renderTeamDropdown(document.getElementById('teamSearchInput').value);
}

function onTeamBlur() {
  closeTeamDropdown();
}

function openTeamDropdown() {
  document.getElementById('teamSearchDropdown').classList.add('open');
  document.getElementById('teamSearchInput').classList.add('open');
  teamDropdownOpen = true;
}

function closeTeamDropdown() {
  document.getElementById('teamSearchDropdown').classList.remove('open');
  document.getElementById('teamSearchInput').classList.remove('open');
  teamDropdownOpen = false;
}

// Size, Season and Version are collapsed dropdowns (closed/compact by
// default, like a native <select>) rather than pills sitting loose on the
// page. Only one panel is open at a time; clicking outside closes it.
const DD_NAMES = ['size', 'season', 'version'];
let openDd = null;

function toggleDd(name) {
  const isOpen = openDd === name;
  closeAllDd();
  if (!isOpen) {
    document.getElementById(name + 'Panel').classList.add('open');
    document.getElementById(name + 'Trigger').classList.add('open');
    openDd = name;
  }
}

function closeAllDd() {
  DD_NAMES.forEach(function (name) {
    document.getElementById(name + 'Panel').classList.remove('open');
    document.getElementById(name + 'Trigger').classList.remove('open');
  });
  openDd = null;
}

document.addEventListener('click', function (e) {
  if (!openDd) return;
  const trigger = document.getElementById(openDd + 'Trigger');
  const panel = document.getElementById(openDd + 'Panel');
  if (!trigger.contains(e.target) && !panel.contains(e.target)) closeAllDd();
});

// Size is multi-select: each option toggles independently, and the filter
// matches a product if it has ANY of the selected sizes. The dropdown stays
// open after a pick so multiple sizes can be selected in one go. Version
// stays single-select: clicking the active option again clears it back to
// "any", and picking one closes the dropdown (like a native <select>).
//
// Every option click below calls e.stopPropagation(). Without it the click
// bubbles to the document-level "click outside closes the dropdown"
// listener (see toggleDd/closeAllDd) — harmless for Size/Version since
// their elements survive the click, but season's decade/pair options get
// torn down and rebuilt by renderSeasonList() on every click, so by the
// time the bubbled event reaches document, e.target is a detached node
// that no longer tests as "inside" the panel, and the dropdown incorrectly
// slams shut. Stopping propagation at the source sidesteps that entirely.
function pickSize(el, e) {
  if (e) e.stopPropagation();
  const value = el.dataset.size;
  if (selectedSizes.has(value)) {
    selectedSizes.delete(value);
    el.classList.remove('active');
  } else {
    selectedSizes.add(value);
    el.classList.add('active');
  }
  document.getElementById('sizeTriggerText').textContent = selectedSizes.size ? Array.from(selectedSizes).join(', ') : 'Any size';
  onFiltersChanged();
}

function pickVersion(el, e) {
  if (e) e.stopPropagation();
  const value = el.dataset.version;
  const alreadyActive = el.classList.contains('active');
  document.querySelectorAll('#versionList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  if (alreadyActive) {
    selectedVersion = '';
    document.getElementById('versionTriggerText').textContent = 'Any version';
  } else {
    el.classList.add('active');
    selectedVersion = value;
    document.getElementById('versionTriggerText').textContent = el.textContent;
  }
  closeAllDd();
  onFiltersChanged();
}

// Season picker: decades in a left column, and clicking one opens a second
// column to its right with that decade's 10 season-pairs (a side flyout,
// not a section that pushes content down). Only one decade's pairs show at
// a time — picking another decade swaps the flyout's contents in place.
// selectedSeason holds the pair's start year as a string (e.g. "1997" for
// "1997/1998") — same value the /shirt-check API already expects.
const SEASON_DECADES = [2020, 2010, 2000, 1990, 1980, 1970];
let selectedDecade = null;

function renderSeasonList() {
  const wrap = document.getElementById('seasonList');
  wrap.innerHTML = '';
  document.getElementById('seasonPanel').classList.toggle('wide', selectedDecade !== null);

  const decadeCol = document.createElement('div');
  decadeCol.className = 'sc-dd-list sc-decade-col';
  SEASON_DECADES.forEach(function (decade) {
    const expanded = selectedDecade === decade;
    const header = document.createElement('div');
    header.className = 'sc-dd-option sc-decade-option' + (expanded ? ' expanded' : '');
    header.innerHTML = '<span>' + decade + 's</span>' +
      '<svg class="sc-accordion-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>';
    header.onclick = function (e) { e.stopPropagation(); toggleDecade(decade); };
    decadeCol.appendChild(header);
  });
  wrap.appendChild(decadeCol);

  if (selectedDecade !== null) {
    const pairsCol = document.createElement('div');
    pairsCol.className = 'sc-dd-list sc-pairs-col';
    for (let y = selectedDecade + 9; y >= selectedDecade; y--) {
      const opt = document.createElement('div');
      opt.className = 'sc-dd-option' + (selectedSeason === String(y) ? ' active' : '');
      opt.textContent = y + '/' + (y + 1);
      opt.onclick = function (e) { e.stopPropagation(); pickSeasonPair(y); };
      pairsCol.appendChild(opt);
    }
    wrap.appendChild(pairsCol);
  }
}

function toggleDecade(decade) {
  selectedDecade = (selectedDecade === decade) ? null : decade;
  renderSeasonList();
}

function pickSeasonPair(year) {
  selectedSeason = (selectedSeason === String(year)) ? '' : String(year);
  renderSeasonList();
  document.getElementById('seasonTriggerText').textContent = selectedSeason ? (selectedSeason + '/' + (year + 1)) : 'Any season';
  closeAllDd();
  onFiltersChanged();
}

// Resets all 4 fields to "any" in one go and re-runs the live count (which
// then reflects the global total, same as a fresh page load). Also clears
// any results from a previous search, since they'd no longer match the
// (now empty) filters shown on screen.
function clearAllFilters() {
  selectedTeam = null;
  document.getElementById('teamSearchInput').value = '';

  selectedSizes.clear();
  document.querySelectorAll('#sizeList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('sizeTriggerText').textContent = 'Any size';

  selectedDecade = null;
  selectedSeason = '';
  renderSeasonList();
  document.getElementById('seasonTriggerText').textContent = 'Any season';

  selectedVersion = '';
  document.querySelectorAll('#versionList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('versionTriggerText').textContent = 'Any version';

  closeAllDd();
  document.getElementById('avgBox').style.display = 'none';
  document.getElementById('resultsBox').innerHTML = '';

  onFiltersChanged();
}

function getFilters() {
  return {
    team: selectedTeam ? selectedTeam.id : '',
    size: Array.from(selectedSizes).join(','),
    season: selectedSeason,
    version: selectedVersion,
  };
}

function buildShirtCheckParams(mode) {
  const filters = getFilters();
  const params = new URLSearchParams({ mode: mode });
  if (filters.team) params.set('team', filters.team);
  if (filters.size) params.set('size', filters.size);
  if (filters.season) params.set('season', filters.season);
  if (filters.version) params.set('version', filters.version);
  return params;
}

// Guards against a slow earlier request landing after a newer one (e.g. user
// flips two filters quickly) and overwriting the live number with stale data.
let liveCountRequestId = 0;

// Rolls the visible number from whatever it currently shows to the new
// value over ~600ms (ease-out, so it settles rather than stopping abruptly)
// instead of snapping straight to it — most noticeable when a filter drops
// the count and the digits count down rather than jump.
let displayedCount = 0;
let countAnimFrame = null;

function animateCountTo(target) {
  if (countAnimFrame) cancelAnimationFrame(countAnimFrame);
  const numEl = document.getElementById('liveCountNum');
  const start = displayedCount;
  const delta = target - start;
  if (!delta) {
    numEl.textContent = target.toLocaleString('en-US');
    return;
  }
  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    numEl.textContent = Math.round(start + delta * eased).toLocaleString('en-US');
    if (t < 1) {
      countAnimFrame = requestAnimationFrame(step);
    } else {
      displayedCount = target;
      countAnimFrame = null;
    }
  }
  countAnimFrame = requestAnimationFrame(step);
}

function updateLiveCount() {
  const requestId = ++liveCountRequestId;
  const numEl = document.getElementById('liveCountNum');
  numEl.classList.add('sc-count-loading');

  fetch(SHIRT_CHECK_API + '?' + buildShirtCheckParams('count').toString())
    .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
    .then(function (data) {
      if (requestId !== liveCountRequestId) return;
      const count = data.count || 0;
      animateCountTo(count);
      document.getElementById('countLabel').textContent = count === 1 ? 'shirt available' : 'shirts available';
      numEl.classList.remove('sc-count-loading');
    })
    .catch(function () {
      if (requestId !== liveCountRequestId) return;
      if (countAnimFrame) cancelAnimationFrame(countAnimFrame);
      numEl.textContent = '—';
      displayedCount = 0;
      numEl.classList.remove('sc-count-loading');
    });
}

function onFiltersChanged() {
  updateLiveCount();
}

// Product name/store/etc come straight from scraped external store pages,
// not curated data — escape before inserting into innerHTML. Same helper
// and convention as escHtml() in the main site's app.js.
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function runSearch() {
  const box = document.getElementById('resultsBox');
  const avgBox = document.getElementById('avgBox');
  avgBox.style.display = 'none';
  box.innerHTML = '<div class="sc-results-loading">Searching…</div>';

  fetch(SHIRT_CHECK_API + '?' + buildShirtCheckParams('list').toString())
    .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
    .then(function (data) {
      renderResults(data);
    })
    .catch(function () {
      box.innerHTML = '<div class="sc-results-empty">Something went wrong. Try again.</div>';
    });
}

function renderResults(data) {
  const box = document.getElementById('resultsBox');
  const avgBox = document.getElementById('avgBox');

  if (!data.total) {
    avgBox.style.display = 'none';
    box.innerHTML = '<div class="sc-results-loading">Checking history…</div>';
    fetchHistoryFallback();
    return;
  }

  avgBox.style.display = 'block';
  document.getElementById('avgValue').textContent = fmtPriceFromEUR(data.avgPriceEUR);

  box.innerHTML = data.products.map(function (p) {
    return '<a class="sc-result-card" href="' + escHtml(p.url) + '" target="_blank" rel="noopener">' +
      '<img class="sc-result-img" src="' + escHtml(p.image || '') + '" alt="" loading="lazy"/>' +
      '<div class="sc-result-info">' +
        '<div class="sc-result-name">' + escHtml(p.name) + '</div>' +
        '<div class="sc-result-store">' + escHtml(p.store) + '</div>' +
      '</div>' +
      '<div class="sc-result-price">' + escHtml(fmtPriceFromEUR(p.priceEUR)) + '</div>' +
    '</a>';
  }).join('');
}

// Nothing currently for sale matching the 4 filters — fall back to the most
// recent products_history row instead of leaving the user with a dead end.
// Same team/size/season/version filters apply; priceEUR comes pre-converted
// from the backend (mirrors the eurPriceExpr() used for live results) so it
// goes through the same fmtPriceFromEUR() currency conversion as everything
// else on the page.
function fetchHistoryFallback() {
  const box = document.getElementById('resultsBox');
  fetch(SHIRT_CHECK_API + '?' + buildShirtCheckParams('history').toString())
    .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
    .then(function (data) {
      renderHistoryFallback(data.lastSeen);
    })
    .catch(function () {
      box.innerHTML = '<div class="sc-results-empty">No shirts currently listed for these filters.</div>';
    });
}

function renderHistoryFallback(lastSeen) {
  const box = document.getElementById('resultsBox');
  if (!lastSeen) {
    box.innerHTML = '<div class="sc-results-empty">No shirts currently listed for these filters.</div>';
    return;
  }
  const dateStr = formatHistoryDate(lastSeen.removed_at);
  box.innerHTML =
    '<div class="sc-history-box">' +
      '<div class="sc-history-name">' + escHtml(lastSeen.name) + '</div>' +
      '<div class="sc-history-detail">Last seen: ' + escHtml(lastSeen.store) + ', ' +
        '<span class="sc-history-price">' + escHtml(fmtPriceFromEUR(lastSeen.priceEUR)) + '</span>, ' +
        escHtml(dateStr) +
      '</div>' +
    '</div>';
}

function formatHistoryDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', function () {
  loadTeamsOnce();
  loadExchangeRates();
  renderSeasonList();
  updateLiveCount();
});
