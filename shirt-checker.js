// shirt-checker.js — team + player autocomplete for the Advanced Search page
const TEAMS_API = 'https://kitfinder-search.wearekitfinder.workers.dev/teams';
const SHIRT_CHECK_API = 'https://kitfinder-search.wearekitfinder.workers.dev/shirt-check';

// Translated text (kfT comes from /i18n.js; falls back to English if it didn't load)
function scT(key, fallback, vars) {
  if (typeof kfT === 'function') return kfT(key, fallback, vars);
  let out = fallback;
  if (vars) Object.keys(vars).forEach(function (k) { out = out.split('{' + k + '}').join(vars[k]); });
  return out;
}
function scLocale() { return document.documentElement.lang || 'en'; }
function scSizeLabel(v) { return v === 'Kids' ? scT('size_kids', 'Kids') : v === 'Woman' ? scT('size_woman', 'Woman') : v; }

let ALL_TEAMS = [];
let teamsState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
let selectedTeam = null;
let selectedPlayer = null;
let teamDropdownOpen = false;

// Static list of the 128 players player_extract.py (kitfinder-automation)
// recognizes in product titles and backfills into products.player — kept
// as a plain array here (no /players endpoint exists on the Worker, unlike
// /teams) since it's small, fixed, and needs no country/alias metadata: a
// case-insensitive substring match against each full canonical name is
// enough for the same "start typing, see suggestions" flow as teams (e.g.
// "Mess" -> "Lionel Messi"). Must stay a byte-for-byte match with the
// canonical names in that file's PLAYERS table (+ the ambiguous-name
// resolvers' outputs) since the Worker's ?player= filter does a plain
// p.player = ? equality check, not a fuzzy match.
const PLAYERS = [
  'Santiago Cañizares', 'Cosmin Contra', 'Sami Hyypiä', 'Patrik Andersson',
  'Bixente Lizarazu', 'David Beckham', 'Patrick Vieira', 'Zinedine Zidane',
  'Kily González', 'Thierry Henry', 'David Trezeguet', 'Rüştü Reçber',
  'Carles Puyol', 'Alessandro Nesta', 'Cristian Chivu', 'Roberto Carlos',
  'Clarence Seedorf', 'Michael Ballack', 'Damien Duff', 'Gianluigi Buffon',
  'Paulo Ferreira', 'Paolo Maldini', 'Luís Figo', 'Pavel Nedvěd',
  'Ruud van Nistelrooy', 'Cafu', 'Ricardo Carvalho', 'Ashley Cole',
  'Maniche', 'Andriy Shevchenko', 'Petr Čech', 'John Terry', 'Luís García',
  'Steven Gerrard', 'Samuel Eto\'o', 'Gianluca Zambrotta', 'Fabio Cannavaro', 'Philipp Lahm',
  'Cesc Fàbregas', 'Kaká', 'Iker Casillas', 'Dani Alves', 'Eric Abidal',
  'Zlatan Ibrahimović', 'Didier Drogba', 'Sergio Ramos', 'Xavi',
  'Franck Ribéry', 'Lionel Messi', 'Fernando Torres', 'Patrice Evra',
  'Andrés Iniesta', 'Maicon', 'Gerard Piqué', 'Wesley Sneijder',
  'David Villa', 'Marcelo', 'Arjen Robben', 'Gareth Bale', 'Andrea Pirlo',
  'Mesut Özil', 'Manuel Neuer', 'David Alaba', 'Marco Reus', 'Diego Godín',
  'Toni Kroos', 'Ángel Di María', 'Paul Pogba', 'James Rodríguez', 'Neymar',
  'Jérôme Boateng', 'Leonardo Bonucci', 'Luka Modrić', 'Antoine Griezmann',
  'Giorgio Chiellini', 'Kevin De Bruyne', 'Eden Hazard',
  'Marc-André ter Stegen', 'Virgil van Dijk', 'Raphaël Varane',
  'N\'Golo Kanté', 'Kylian Mbappé', 'Alisson', 'Trent Alexander-Arnold', 'Matthijs de Ligt',
  'Andy Robertson', 'Frenkie de Jong', 'Robert Lewandowski', 'Sadio Mané',
  'Joshua Kimmich', 'Alphonso Davies', 'Thibaut Courtois',
  'Antonio Rüdiger', 'Fabinho', 'Karim Benzema', 'Vinícius Júnior',
  'Kyle Walker', 'Rúben Dias', 'Alessandro Bastoni', 'Federico Dimarco',
  'John Stones', 'Rodri', 'Erling Haaland', 'Gregor Kobel', 'Dani Carvajal',
  'Mats Hummels', 'Ian Maatsen', 'Marcel Sabitzer', 'Jude Bellingham',
  'Vitinha', 'Phil Foden', 'Harry Kane', 'Gianluigi Donnarumma',
  'Achraf Hakimi', 'Marquinhos', 'Nuno Mendes', 'Declan Rice',
  'Lamine Yamal', 'Raphinha', 'Désiré Doué', 'Ousmane Dembélé',
  'Michael Owen', 'Ronaldo', 'Cristiano Ronaldo', 'Ronaldinho',
  'Thiago Silva', 'Bernardo Silva', 'Thiago',
];

let selectedSizes = new Set();
let selectedSeason = '';
let selectedVersion = '';
let selectedSleeve = '';

// Currency: mirrors the main site's fmtPrice() logic (app.js) rather than
// loading all of app.js here. Reads the same 'kf_country' selection and the
// same exchange-rate cache keys, so if the user already visited the main
// site the rates are already warm — no extra fetch. priceEUR from the API
// is already in EUR, so only the EUR->target leg (DISPLAY_RATES) is needed.
let DISPLAY_RATES = {EUR:1,USD:1.1386,GBP:0.8627,AUD:1.6515,CAD:1.6156,CHF:0.9222,JPY:184.1935,CNY:7.7443,KRW:1750.3697,MXN:19.9328,BRL:5.8982,PLN:4.2872,SEK:11.0819,NOK:11.3113,DKK:7.4609,CZK:24.2492,HUF:353.8573,RON:5.241,BGN:1.9558,TRY:53.0657,INR:107.4938,IDR:20381.8665,THB:38.0167,ZAR:18.7456,NZD:2.0179,SGD:1.4736,HKD:8.9292,RUB:88.5614,UAH:51.1697,ARS:1679.1643,CLP:1049.7401,COP:3930.3729,PEN:3.8912,ALL:94.2736,DZD:151.9776,SAR:4.2699,AMD:419.3635,BOB:7.8771,BAM:1.9558,GTQ:8.6966,ISK:144.0133,MKD:61.695,MDL:20.1365,NIO:41.9171,PYG:6923.6968,RSD:117.395,UYU:45.6762,VES:710.1021,AED:4.1816};
let currentCountry = JSON.parse(localStorage.getItem('kf_country') || 'null') || {symbol: '€', currency: 'EUR'};

// Favourites: same 'kf_favs' localStorage key and object shape (id, name,
// price, currency, image, url, store) as the main site (app.js), so hearts
// saved here also show up in the main site's favourites panel.
let FAVOURITES = [];
try { FAVOURITES = JSON.parse(localStorage.getItem('kf_favs') || '[]'); } catch (err) { FAVOURITES = []; }
let LAST_RESULTS_BY_ID = {};

function isFavourited(id) {
  return FAVOURITES.some(function (f) { return f.id === id; });
}

function toggleFavourite(e, btn) {
  e.preventDefault();
  e.stopPropagation();
  const id = btn.dataset.favId;
  const idx = FAVOURITES.findIndex(function (f) { return f.id === id; });
  if (idx === -1) {
    const p = LAST_RESULTS_BY_ID[id];
    if (!p) return;
    FAVOURITES.push({ id: p.id, name: p.name, price: p.price, currency: p.currency, image: p.image, url: p.url, store: p.store });
    btn.classList.add('active');
  } else {
    FAVOURITES.splice(idx, 1);
    btn.classList.remove('active');
  }
  localStorage.setItem('kf_favs', JSON.stringify(FAVOURITES));
}

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
      _initTeamFromUrl();
    })
    .catch(function () {
      teamsState = 'error';
      if (teamDropdownOpen) renderTeamDropdown(document.getElementById('teamSearchInput').value);
    });
}

// Deep-link entry point for the /teams/<slug> static pages' "Advanced
// Search" button (?team=<teams.id>, e.g. cl_realmadrid) -- preselects the
// team exactly like a manual dropdown pick, then runs the search
// immediately so the link lands on real results, not just a prefilled
// filter. Runs once, right after ALL_TEAMS is ready (loadTeamsOnce's own
// resolution), since matching needs the id already loaded.
function _initTeamFromUrl() {
  var teamId = new URLSearchParams(window.location.search).get('team');
  if (!teamId) return;
  var team = ALL_TEAMS.find(function (t) { return t.id === teamId; });
  if (!team) return;
  selectTeam(team);
  runSearch();
}

function matchesTeam(team, q) {
  if (team.name.toLowerCase().includes(q)) return true;
  return (team.aliases || []).some(function (a) { return a.toLowerCase().includes(q); });
}

function matchesPlayer(name, q) {
  return name.toLowerCase().includes(q);
}

// Same input/dropdown drives both team and player suggestions: player
// matches come from the static PLAYERS list (always available, no fetch),
// team matches depend on teamsState like before. Results are combined into
// one list capped at 8, teams first — mirrors how a real "team or player"
// search would prioritize teams (the page's original purpose) while still
// surfacing players for a name like "Messi" that matches no team.
function renderTeamDropdown(query) {
  const dd = document.getElementById('teamSearchDropdown');
  if (!dd) return;
  dd.innerHTML = '';

  const q = (query || '').trim().toLowerCase();

  if (q === '') {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = scT('sc_start_typing', 'Start typing a team or player…');
    dd.appendChild(d);
    return;
  }

  const playerMatches = PLAYERS.filter(function (name) { return matchesPlayer(name, q); })
    .map(function (name) { return { type: 'player', name: name }; });

  let teamMatches = [];
  let teamStatusMsg = null;
  if (teamsState === 'loading' || teamsState === 'idle') {
    teamStatusMsg = scT('sc_loading_teams', 'Loading teams…');
  } else if (teamsState === 'error') {
    teamStatusMsg = scT('sc_teams_failed', 'Could not load teams. Try again.');
  } else {
    teamMatches = ALL_TEAMS.filter(function (t) { return matchesTeam(t, q); })
      .map(function (t) { return Object.assign({ type: 'team' }, t); });
  }

  const results = teamMatches.concat(playerMatches).slice(0, 8);

  if (results.length === 0) {
    const d = document.createElement('div');
    d.className = 'sc-team-empty';
    d.textContent = teamStatusMsg || scT('sc_no_teams', 'No teams or players found');
    dd.appendChild(d);
    return;
  }

  results.forEach(function (item) {
    const opt = document.createElement('div');
    opt.className = 'sc-team-opt';
    if (item.type === 'player') {
      opt.innerHTML = '<span>' + item.name + '</span><span class="sc-team-country">' + scT('sc_player', 'Player') + '</span>';
      opt.addEventListener('mousedown', function (e) {
        e.preventDefault();
        selectPlayer(item.name);
      });
    } else {
      opt.innerHTML = '<span>' + item.name + '</span><span class="sc-team-country">' + (item.country || '') + '</span>';
      opt.addEventListener('mousedown', function (e) {
        e.preventDefault();
        selectTeam(item);
      });
    }
    dd.appendChild(opt);
  });
}

function selectTeam(team) {
  selectedTeam = team;
  selectedPlayer = null;
  document.getElementById('teamSearchInput').value = team.name;
  closeTeamDropdown();
  onFiltersChanged();
}

function selectPlayer(name) {
  selectedPlayer = name;
  selectedTeam = null;
  document.getElementById('teamSearchInput').value = name;
  closeTeamDropdown();
  onFiltersChanged();
}

function onTeamInput(value) {
  selectedTeam = null;
  selectedPlayer = null;
  openTeamDropdown();
  renderTeamDropdown(value);
  updateFieldClearButtons();
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
const DD_NAMES = ['size', 'season', 'version', 'sleeve'];
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
  document.getElementById('sizeTriggerText').textContent = selectedSizes.size ? Array.from(selectedSizes).map(scSizeLabel).join(', ') : scT('sc_any_size', 'Any size');
  onFiltersChanged();
}

function pickVersion(el, e) {
  if (e) e.stopPropagation();
  const value = el.dataset.version;
  const alreadyActive = el.classList.contains('active');
  document.querySelectorAll('#versionList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  if (alreadyActive) {
    selectedVersion = '';
    document.getElementById('versionTriggerText').textContent = scT('sc_any_version', 'Any version');
  } else {
    el.classList.add('active');
    selectedVersion = value;
    document.getElementById('versionTriggerText').textContent = el.textContent;
  }
  closeAllDd();
  onFiltersChanged();
}

function pickSleeve(el, e) {
  if (e) e.stopPropagation();
  const value = el.dataset.sleeve;
  const alreadyActive = el.classList.contains('active');
  document.querySelectorAll('#sleeveList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  if (alreadyActive) {
    selectedSleeve = '';
    document.getElementById('sleeveTriggerText').textContent = scT('sc_any_sleeve', 'Any sleeve');
  } else {
    el.classList.add('active');
    selectedSleeve = value;
    document.getElementById('sleeveTriggerText').textContent = el.textContent;
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
  document.getElementById('seasonTriggerText').textContent = selectedSeason ? (selectedSeason + '/' + (year + 1)) : scT('sc_any_season', 'Any season');
  closeAllDd();
  onFiltersChanged();
}

// Resets all 4 fields to "any" in one go and re-runs the live count (which
// then reflects the global total, same as a fresh page load). Also clears
// any results from a previous search, since they'd no longer match the
// (now empty) filters shown on screen.
function clearAllFilters() {
  selectedTeam = null;
  selectedPlayer = null;
  document.getElementById('teamSearchInput').value = '';

  selectedSizes.clear();
  document.querySelectorAll('#sizeList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('sizeTriggerText').textContent = scT('sc_any_size', 'Any size');

  selectedDecade = null;
  selectedSeason = '';
  renderSeasonList();
  document.getElementById('seasonTriggerText').textContent = scT('sc_any_season', 'Any season');

  selectedVersion = '';
  document.querySelectorAll('#versionList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('versionTriggerText').textContent = scT('sc_any_version', 'Any version');

  selectedSleeve = '';
  document.querySelectorAll('#sleeveList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('sleeveTriggerText').textContent = scT('sc_any_sleeve', 'Any sleeve');

  closeAllDd();
  document.getElementById('avgBox').style.display = 'none';
  document.getElementById('resultsBox').innerHTML = '';

  onFiltersChanged();
}

function getFilters() {
  return {
    team: selectedTeam ? selectedTeam.id : '',
    player: selectedPlayer || '',
    size: Array.from(selectedSizes).join(','),
    season: selectedSeason,
    version: selectedVersion,
    sleeve: selectedSleeve,
  };
}

function buildShirtCheckParams(mode) {
  const filters = getFilters();
  const params = new URLSearchParams({ mode: mode });
  if (filters.team) params.set('team', filters.team);
  if (filters.player) params.set('player', filters.player);
  if (filters.size) params.set('size', filters.size);
  if (filters.season) params.set('season', filters.season);
  if (filters.version) params.set('version', filters.version);
  if (filters.sleeve) params.set('sleeve', filters.sleeve);
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
      lastCountData = { count: count, storeCount: data.storeCount || 0 };
      renderCountLabels();
      numEl.classList.remove('sc-count-loading');
    })
    .catch(function () {
      if (requestId !== liveCountRequestId) return;
      if (countAnimFrame) cancelAnimationFrame(countAnimFrame);
      numEl.textContent = '—';
      displayedCount = 0;
      document.getElementById('storeCountLabel').textContent = '';
      numEl.classList.remove('sc-count-loading');
    });
}

// Text next to the live count ("shirts available across N stores")
let lastCountData = null;
function renderCountLabels() {
  const label = document.getElementById('countLabel');
  const stores = document.getElementById('storeCountLabel');
  const count = lastCountData ? lastCountData.count : 0;
  label.textContent = count === 1 ? scT('sc_shirt_available', 'shirt available') : scT('sc_shirts_available', 'shirts available');
  if (!lastCountData) return;
  const n = lastCountData.storeCount.toLocaleString(scLocale());
  stores.textContent = ' ' + (lastCountData.storeCount === 1
    ? scT('sc_across_store', 'across {n} store', { n: n })
    : scT('sc_across_stores', 'across {n} stores', { n: n }));
}

// Re-draw the texts this file writes itself (i18n.js only handles data-i18n)
function scRefreshTexts() {
  document.getElementById('sizeTriggerText').textContent = selectedSizes.size
    ? Array.from(selectedSizes).map(scSizeLabel).join(', ') : scT('sc_any_size', 'Any size');
  const v = document.querySelector('#versionList .sc-dd-option.active');
  document.getElementById('versionTriggerText').textContent = v ? v.textContent : scT('sc_any_version', 'Any version');
  const sl = document.querySelector('#sleeveList .sc-dd-option.active');
  document.getElementById('sleeveTriggerText').textContent = sl ? sl.textContent : scT('sc_any_sleeve', 'Any sleeve');
  if (!selectedSeason) document.getElementById('seasonTriggerText').textContent = scT('sc_any_season', 'Any season');
  renderCountLabels();
}
window.kfOnLanguageChange = scRefreshTexts;

function onFiltersChanged() {
  updateLiveCount();
  updateFieldClearButtons();
}

// Each field's own X only appears once that specific field has something
// set — team checks the input's raw text too (not just selectedTeam),
// since a team can be "filled" from the user's point of view before a
// dropdown option is actually picked.
function updateFieldClearButtons() {
  const teamVal = document.getElementById('teamSearchInput').value.trim();
  document.getElementById('teamFieldClear').classList.toggle('visible', !!teamVal);
  document.getElementById('sizeFieldClear').classList.toggle('visible', selectedSizes.size > 0);
  document.getElementById('seasonFieldClear').classList.toggle('visible', !!selectedSeason);
  document.getElementById('versionFieldClear').classList.toggle('visible', !!selectedVersion);
  document.getElementById('sleeveFieldClear').classList.toggle('visible', !!selectedSleeve);
}

// Each clears only its own field (not the other 3) and re-runs the live
// count, same as picking/unpicking a value normally would.
function clearTeamField(e) {
  if (e) e.stopPropagation();
  selectedTeam = null;
  selectedPlayer = null;
  document.getElementById('teamSearchInput').value = '';
  closeTeamDropdown();
  onFiltersChanged();
}

function clearSizeField(e) {
  if (e) e.stopPropagation();
  selectedSizes.clear();
  document.querySelectorAll('#sizeList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('sizeTriggerText').textContent = scT('sc_any_size', 'Any size');
  onFiltersChanged();
}

function clearSeasonField(e) {
  if (e) e.stopPropagation();
  selectedDecade = null;
  selectedSeason = '';
  renderSeasonList();
  document.getElementById('seasonTriggerText').textContent = scT('sc_any_season', 'Any season');
  onFiltersChanged();
}

function clearVersionField(e) {
  if (e) e.stopPropagation();
  selectedVersion = '';
  document.querySelectorAll('#versionList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('versionTriggerText').textContent = scT('sc_any_version', 'Any version');
  onFiltersChanged();
}

function clearSleeveField(e) {
  if (e) e.stopPropagation();
  selectedSleeve = '';
  document.querySelectorAll('#sleeveList .sc-dd-option').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('sleeveTriggerText').textContent = scT('sc_any_sleeve', 'Any sleeve');
  onFiltersChanged();
}

// Product name/store/etc come straight from scraped external store pages,
// not curated data — escape before inserting into innerHTML. Same helper
// and convention as escHtml() in the main site's app.js.
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Size shown on result cards ──────────────────────────────────────────────
// D1's `sizes` column is not clean: besides real sizes it also holds "One size",
// brand/team names, colours, poster formats, years... (audit in kitfinder-search:
// SIZES_AUDIT.md). The home cards (buildCard() in app.js) only print values from
// a fixed vocabulary and, when the array has none, fall back to a size found in
// the product title. Advanced Search used to print the raw array, so the garbage
// and "One size" leaked onto its cards. This mirrors the home behaviour.
//
// Vocabulary (Miguel, 2026-09-25): Kids, Woman, XXS, XS, S, M, L, XL, 2XL, 3XL,
// 4XL, 5XL. Legacy XXL/XXXL are shown as 2XL/3XL.
const SC_SIZE_VOCAB = ['Kids', 'Woman', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const SC_SIZE_LEGACY = { XXL: '2XL', XXXL: '3XL' };

// Verbatim copy of extractSizeFromText() from the main site's app.js (only the
// name changes, this page doesn't load app.js). Keep both in sync.
function scExtractSizeFromText(a,e){const n=a||"",r=e||"",t=[/\b(youth|junior|kids?|child|children|boys?|girls?|infant|toddler|baby)\b/i,/\bY(XS|S|M|L|XL)\b/i,/\bXYL\b|\bYL\b/i,/\b(age|aged?)\s*\d+/i,/\b\d+[-\/]\d+\s*(years?|yrs?|yr)\b/i,/\b(1[46][0-9]|1[78][0-9]|1[23][0-9])\s*cm\b/i,/\b(Y|youth)[-]?(S|M|L|XL|XS)\b/i,/\b(1[0-9]{2})\b(?=.*kit|.*shirt|.*jersey)/i];for(const a of t)if(n.match(a)||r.match(a))return"Kids";const w=[/\b(women'?s?|ladies|femme)\b/i];for(const a of w)if(n.match(a)||r.match(a))return"Woman";const o=[{pattern:/\bXXXXXL\s*=\s*EXTRA\s*EXTRA\s*EXTRA\s*EXTRA\s*EXTRA\s*LARGE\b/i,size:"5XL"},{pattern:/\bXXXXL\s*=\s*EXTRA\s*EXTRA\s*EXTRA\s*EXTRA\s*LARGE\b/i,size:"4XL"},{pattern:/\bXXXL\s*=\s*EXTRA\s*EXTRA\s*EXTRA\s*LARGE\b/i,size:"3XL"},{pattern:/\bXXL\s*=\s*EXTRA\s*EXTRA\s*LARGE\b/i,size:"2XL"},{pattern:/\bXL\s*=\s*EXTRA\s*LARGE\b/i,size:"XL"},{pattern:/\bL\s*=\s*LARGE\b/i,size:"L"},{pattern:/\bM\s*=\s*MEDIUM\b/i,size:"M"},{pattern:/\bS\s*=\s*SMALL\b/i,size:"S"},{pattern:/\bXS\s*=\s*EXTRA\s*SMALL\b/i,size:"XS"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(XXXXXL|5XL)\b/i,size:"5XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(XXXXL|4XL)\b/i,size:"4XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(XXXL|3XL)\b/i,size:"3XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(XXL|2XL)\b/i,size:"2XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*XL\b/i,size:"XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*XS\b/i,size:"XS"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*L\b/i,size:"L"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*M\b/i,size:"M"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*S\b/i,size:"S"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:extra\s*extra\s*extra\s*extra\s*extra\s*large|xxxxxl|5xl)\b/i,size:"5XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:extra\s*extra\s*extra\s*extra\s*large|xxxxl|4xl)\b/i,size:"4XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:extra\s*extra\s*large|xxxl|3xl)\b/i,size:"3XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:extra\s*large|x-large|xxl|2xl)\b/i,size:"2XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:x-large|extra\s*large|xl)\b/i,size:"XL"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:large|\bl\b)(?!\w)/i,size:"L"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:medium|\bm\b)(?!\w)/i,size:"M"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:small|\bs\b)(?!\w)/i,size:"S"},{pattern:/\b(?:size|taille|talla|größe|taglia)\s*:?\s*(?:extra\s*small|x-small|xs)\b/i,size:"XS"},{pattern:/[-|•·]\s*(XXXXXL|5XL)\s*[-|•·\n]/i,size:"5XL"},{pattern:/[-|•·]\s*(XXXXL|4XL)\s*[-|•·\n]/i,size:"4XL"},{pattern:/[-|•·]\s*(XXXL|3XL)\s*[-|•·\n]/i,size:"3XL"},{pattern:/[-|•·]\s*(XXL|2XL)\s*[-|•·\n]/i,size:"2XL"},{pattern:/[-|•·]\s*XL\s*[-|•·\n]/i,size:"XL"},{pattern:/[-|•·]\s*XS\s*[-|•·\n]/i,size:"XS"},{pattern:/[-|•·]\s*(?<![A-Z])L(?![A-Z])\s*[-|•·\n]/i,size:"L"},{pattern:/[-|•·]\s*(?<![A-Z])M(?![A-Z])\s*[-|•·\n]/i,size:"M"},{pattern:/[-|•·]\s*(?<![A-Z])S(?![A-Z])\s*[-|•·\n]/i,size:"S"}];for(const{pattern:a,size:e}of o)if(r.match(a))return e;const i=[{pattern:/\bTAM\s+(XXXXXL|5XL)\b/i,size:"5XL"},{pattern:/\bTAM\s+(XXXXL|4XL)\b/i,size:"4XL"},{pattern:/\bTAM\s+(XXXL|3XL|EEG)\b/i,size:"3XL"},{pattern:/\bTAM\s+(XXL|2XL|EG|GGG)\b/i,size:"2XL"},{pattern:/\bTAM\s+(XL|GG)\b/i,size:"XL"},{pattern:/\bTAM\s+(L|G)(?=\b|\s|$)/i,size:"L"},{pattern:/\bTAM\s+(M)(?=\b|\s|$)/i,size:"M"},{pattern:/\bTAM\s+(S|P)(?=\b|\s|$)/i,size:"S"},{pattern:/\bTAM\s+(XS)(?=\b|\s|$)/i,size:"XS"},{pattern:/\(XXXXXL\)|\(5XL\)|\[XXXXXL\]|\[5XL\]/i,size:"5XL"},{pattern:/\(XXXXL\)|\(4XL\)|\[XXXXL\]|\[4XL\]/i,size:"4XL"},{pattern:/\(XXXL\)|\(3XL\)|\[XXXL\]|\[3XL\]/i,size:"3XL"},{pattern:/\(XXL\)|\(2XL\)|\[XXL\]|\[2XL\]/i,size:"2XL"},{pattern:/\(XL\)|\[XL\]/i,size:"XL"},{pattern:/\(XS\)|\[XS\]/i,size:"XS"},{pattern:/\(XXS\)|\[XXS\]/i,size:"XXS"},{pattern:/\(L\)|\[L\]/,size:"L"},{pattern:/\(M\)|\[M\]/,size:"M"},{pattern:/\(S\)|\[S\]/,size:"S"},{pattern:/\bXXXXXL\b|\b5XL\b/i,size:"5XL"},{pattern:/\bXXXXL\b|\b4XL\b/i,size:"4XL"},{pattern:/\bXXXL\b|\b3XL\b/i,size:"3XL"},{pattern:/\bXXL\b|\b2XL\b/i,size:"2XL"},{pattern:/\bX-?Large\b|\bExtra\s*Large\b/i,size:"XL"},{pattern:/\bXL\b/,size:"XL"},{pattern:/\bLarge\b/i,size:"L"},{pattern:/\bMedium\b/i,size:"M"},{pattern:/\bSmall\b/i,size:"S"},{pattern:/\bX-?Small\b|\bExtra\s*Small\b/i,size:"XS"},{pattern:/\bXXS\b/i,size:"XXS"},{pattern:/[-\s](XXXXXL)\b/i,size:"5XL"},{pattern:/[-\s](XXXXL)\b/i,size:"4XL"},{pattern:/[-\s](XXXL)\b/i,size:"3XL"},{pattern:/[-\s](XXL)\b/,size:"2XL"},{pattern:/[-\s](XL)\b/,size:"XL"},{pattern:/[-\s](XS)\b/,size:"XS"},{pattern:/[-\s#]([SMLX])\b(?!\w)/,size:null,group:1}],s={s:"S",m:"M",l:"L",x:"XL"};for(const{pattern:a,size:e,group:r}of i){const t=n.match(a);if(t){if(e)return e;if(r)return s[t[r].toLowerCase()]||t[r].toUpperCase()}}return null}

function scDisplaySizes(p) {
  const raw = Array.isArray(p.sizes) ? p.sizes : [];
  let out = [];
  raw.forEach(function (s) {
    const v = SC_SIZE_LEGACY[s] || s;
    if (SC_SIZE_VOCAB.indexOf(v) >= 0 && out.indexOf(v) < 0) out.push(v);
  });
  const t0 = scExtractSizeFromText(p.name || '', null);
  const t = t0 ? (SC_SIZE_LEGACY[t0] || t0) : null;
  const tOk = !!t && SC_SIZE_VOCAB.indexOf(t) >= 0;
  if (out.length === 1 && out[0] === 'Kids' && tOk && t !== 'Kids') out = [t];
  if (out.length === 0 && tOk) out = [t];
  return out;
}

function runSearch() {
  const box = document.getElementById('resultsBox');
  const avgBox = document.getElementById('avgBox');
  avgBox.style.display = 'none';
  box.classList.remove('sc-results-grid');
  box.innerHTML = '<div class="sc-results-loading">' + scT('sc_searching', 'Searching…') + '</div>';

  fetch(SHIRT_CHECK_API + '?' + buildShirtCheckParams('list').toString())
    .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
    .then(function (data) {
      renderResults(data);
    })
    .catch(function () {
      box.innerHTML = '<div class="sc-results-empty">' + scT('js_something_wrong', 'Something went wrong. Try again.') + '</div>';
    });
}

function renderResults(data) {
  const box = document.getElementById('resultsBox');
  const avgBox = document.getElementById('avgBox');

  if (!data.total) {
    avgBox.style.display = 'none';
    box.classList.remove('sc-results-grid');
    box.innerHTML = '<div class="sc-results-loading">' + scT('sc_checking_history', 'Checking history…') + '</div>';
    fetchHistoryFallback();
    return;
  }

  avgBox.style.display = 'block';
  document.getElementById('avgValue').textContent = fmtPriceFromEUR(data.avgPriceEUR);

  // Cheapest first — the API doesn't guarantee price order.
  const sorted = data.products.slice().sort(function (a, b) { return (a.priceEUR || 0) - (b.priceEUR || 0); });

  LAST_RESULTS_BY_ID = {};
  sorted.forEach(function (p) { LAST_RESULTS_BY_ID[p.id] = p; });

  // Same markup/classes as the /search result card (buildCard() in app.js):
  // card-img-wrap (image + store badge + fav heart) then card-body with a
  // price/size meta-row and a "View in store" button — just smaller.
  box.classList.add('sc-results-grid');
  box.innerHTML = sorted.map(function (p) {
    const size = scDisplaySizes(p).join(' · ');
    return '<div class="card">' +
      '<div class="card-img-wrap" style="background:#f4f5f7;position:relative;">' +
        '<img src="' + escHtml(p.image || '') + '" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:var(--radius-sm);" loading="lazy" onerror="this.onerror=null;this.src=\'/images/placeholder.png\';this.style.width=\'60%\';this.style.height=\'60%\';this.style.margin=\'auto\';"/>' +
        '<span class="badge-store" style="background:var(--green);color:#fff;">' + escHtml(p.store) + '</span>' +
        '<button class="card-fav-btn' + (isFavourited(p.id) ? ' active' : '') + '" data-fav-id="' + escHtml(p.id) + '" onclick="toggleFavourite(event,this)" aria-label="' + escHtml(scT('js_save_to_favourites', 'Save to favourites')) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-meta-row">' +
          '<span class="card-price">' + escHtml(fmtPriceFromEUR(p.priceEUR)) + '</span>' +
          (size ? '<span class="card-size" style="margin-left:auto">' + escHtml(size) + '</span>' : '') +
        '</div>' +
        '<a class="card-btn" href="' + escHtml(p.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' + scT('js_view_in_store', 'View in store') +
        '</a>' +
      '</div>' +
    '</div>';
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
      box.innerHTML = '<div class="sc-results-empty">' + scT('sc_no_listed', 'No shirts currently listed for these filters.') + '</div>';
    });
}

function renderHistoryFallback(lastSeen) {
  const box = document.getElementById('resultsBox');
  if (!lastSeen) {
    box.innerHTML = '<div class="sc-results-empty">' + scT('sc_no_listed', 'No shirts currently listed for these filters.') + '</div>';
    return;
  }
  const dateStr = formatHistoryDate(lastSeen.removed_at);
  box.innerHTML =
    '<div class="sc-history-box">' +
      '<div class="sc-history-name">' + escHtml(lastSeen.name) + '</div>' +
      '<div class="sc-history-detail">' + scT('sc_last_seen', 'Last seen:') + ' ' + escHtml(lastSeen.store) + ', ' +
        '<span class="sc-history-price">' + escHtml(fmtPriceFromEUR(lastSeen.priceEUR)) + '</span>, ' +
        escHtml(dateStr) +
      '</div>' +
    '</div>';
}

function formatHistoryDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(scLocale() === 'en' ? 'en-GB' : scLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', function () {
  loadTeamsOnce();
  loadExchangeRates();
  renderSeasonList();
  scRefreshTexts();
  updateLiveCount();
});
