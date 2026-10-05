// Kit Finder — Idiomas y divisa (independiente de Firebase)
// - KF_LANGUAGES: idiomas disponibles en el globo de la cabecera y en Ajustes.
// - KF_TRANSLATIONS: textos de toda la interfaz por idioma (claves = data-i18n).
// - kfT(clave, texto_ingles): para textos que genera app.js.
// - El globo de la cabecera (idioma + divisa) está al final de este archivo.

var KF_LANGUAGES = [
  { code:'en', label:'English' },
  { code:'es', label:'Español' },
  { code:'de', label:'Deutsch' },
  { code:'fr', label:'Français' },
  { code:'it', label:'Italiano' },
  { code:'pt', label:'Português' },
  { code:'nl', label:'Nederlands' },
  { code:'pl', label:'Polski' }
];

  // ── Language translations system ─────────────────────────────────────────────
  // Approach: store language preference and reload page to apply translations
  // This avoids the bug where switching between languages gets stuck
  
  var KF_TRANSLATIONS = {
    en: {
      // Search
      'search_placeholder': 'Search football shirts (team, player, brand…)',
      'globe_title': 'Language & currency',
      'search_currency': 'Search currency…',
      "auth_forgot": "Forgot password?",
      "res_filters": "Filters",
      "as_hero_sub": "Filter shirts by team, size, season and version — see live stock counts and average prices",
      "as_hero_cta": "Try Advanced Search",
      "lsc_title": "Long Sleeve Football Shirts Collection",
      "sort_relevant": "Most relevant",
      "fav_alerts_title": "Price & restock alerts",
      "filter_close": "✕ Close filters",
      "fav_remove_all": "Remove all",
      "nl_kicker": "KIT FINDER BLOG",
      "nl_nospam": "No spam. Unsubscribe any time.",
      "nl_subscribe": "Subscribe",
      "footer_teams": "Teams",
      "chip_asia": "Asia",
      "chip_oceania": "Oceania",
      "chip_home": "Home",
      "chip_away": "Away",
      "chip_third": "Third",
      "chip_fourth": "Fourth",
      "chip_goalkeeper": "Goalkeeper",
      "chip_other": "Other",
      "size_kids": "Kids",
      "size_woman": "Woman",
      "footer_blurb": "Kit Finder is a football shirt search engine. We aggregate listings from specialist vintage, retro and classic football shirt stores so you can find any kit in one search. From Premier League to Serie A, from 1960s classics to the latest releases.",
      "footer_copy": "© 2026 Kit Finder. We earn commissions from affiliate partner stores. All trademarks belong to their respective owners.",
      "marquee_text": "THE ULTIMATE FOOTBALL SHIRT SEARCH ENGINE — 100% ORIGINAL VINTAGE & RETRO KITS — 240+ SPECIALIST STORES — SEARCH BY PHOTO WITH AI — COMPARE PRICES ACROSS EVERY CLUB, ERA & SIZE — NO FAKES, NO REPLICAS — FREE TO USE, ALWAYS",
      "lsc_desc": "Long sleeve football shirts have been a staple on cold winter nights and rainy pitches for decades, from classic 1990s long-sleeve club jerseys to today's technical long sleeve kits. Browse long sleeve shirts from clubs and national teams alike, spanning vintage retro gems to the latest releases. Whether you're after an L/S classic or a modern long sleeve kit, find it here.",
      "fav_alerts_text": "Sign in and we'll email you when a shirt in your favourites drops in price or shows up in another store. Alerts are free and you can cancel any time.",
      "nl_sub_1": "The history, culture and stories behind football shirts.",
      "nl_sub_2": "From iconic kits to forgotten gems.",
      "auth_google": "Continue with Google",
      "auth_or": "or",
      "auth_legal_1": "By signing in you accept our",
      "auth_terms": "Terms of Use",
      "auth_and": "and",
      "auth_privacy": "Privacy Policy",
      "aria_open_menu": "Open menu",
      "auth_signin_title": "Sign in",
      "aria_prev": "Previous",
      "aria_next": "Next",
      "zoom_out": "Zoom out",
      "zoom_in": "Zoom in",
      "ph_brand": "Search brand…",
      "ph_min": "Min",
      "ph_max": "Max",
      "ph_search_shirts": "Search shirts…",
      "ph_nickname": "How should we call you?",
      "ph_email_nl": "your@email.com",
      "auth_ph_email": "Email address",
      "auth_ph_password": "Password",
      "auth_ph_name": "Your name (optional)",
      "auth_ph_password_min": "Password (min. 6 characters)",
      "auth_sign_in": "Sign In",
      "auth_create_account": "Create Account",
      "js_no_brands_found": "No brands found",
      "js_view_in_store": "View in store",
      "js_no_image": "No image",
      "js_save_to_favourites": "Save to favourites",
      "js_no_shirts_found": "No shirts found",
      "js_try_adjusting": "Try adjusting your filters or search term",
      "js_searching_specialist": "Searching specialist stores…",
      "js_continent_europe": "Europe",
      "js_continent_america": "America",
      "js_continent_africa": "Africa",
      "js_continent_asia": "Asia",
      "js_continent_oceania": "Oceania",
      "js_chip_league": "League: {v}",
      "js_chip_version": "Version: {v}",
      "js_chip_size": "Size: {v}",
      "js_chip_brand": "Brand: {v}",
      "js_chip_decade": "Decade: {v}",
      "js_remove_filter": "Remove filter",
      "js_clear_all": "Clear all",
      "js_remove_favourite": "Remove from favourites",
      "js_no_saved_shirts": "No saved shirts yet.",
      "js_tap_heart": "Tap the heart on any shirt to save it here.",
      "js_search_currency": "Search currency…",
      "js_menu": "Menu",
      "js_valid_email": "Please enter a valid email.",
      "js_subscribing": "Subscribing…",
      "js_subscribed": "✅ Subscribed! We'll email you when new articles go live.",
      "js_something_wrong": "Something went wrong. Try again.",
      "js_analysing_shirt": "Analysing your shirt",
      "js_detecting_team": "Detecting team",
      "js_reading_badge": "Reading badge and sponsor",
      "js_identifying_season": "Identifying the season",
      "js_home_or_away": "Home or away kit?",
      "js_almost_there": "Almost there",
      "js_identifying_shirt": "Identifying shirt...",
      "js_analysing_team": "Analysing team, season & version",
      "js_match_found": "Match found!",
      "js_searching_stores": "Searching across 240+ stores",
      "js_could_not_identify": "Could not identify the shirt. Try a clearer photo showing the front of the shirt.",
      "js_image_search_failed": "Image search failed: {msg}",
      "js_image_load_failed": "Couldn't load that image from the other site (it may block cross-site access). Try saving it and uploading it instead.",
      "js_shirts_found": "<strong>{n}</strong> shirts found",
      "js_size_kids": "Kids",
      "js_size_woman": "Woman",
      "js_shop_by_league": "Shop by League",
      "js_shop_by_country": "Shop by Country",
      "js_continent_asia_oceania": "Asia & Oceania",
      "js_shirt_found": "<strong>{n}</strong> shirt found",
      "auth_err_localhost_hint": "In Firebase Console → Authentication → Authorized domains, add: localhost. Also check Google Cloud Console → OAuth 2.0 → Authorized redirect URIs includes http://localhost:{port}/__/auth/handler",
      "auth_err_add_domain": "Add this domain in Firebase Console → Authentication → Authorized domains.",
      "auth_err_popup_blocked": "Popup blocked. Trying redirect login...",
      "auth_err_google_disabled": "Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
      "auth_err_fill_all": "Please fill in all fields.",
      "auth_err_enter_email": "Enter your email first.",
      "auth_reset_sent": "Reset email sent! Check your inbox.",
      "auth_default_user": "Kit Finder User",
      "menu_settings": "Settings",
      "menu_signout": "Sign out",
      "nav_blog": "La Grada",
      'search_btn': 'Search',
      'search_by_photo': 'Search by photo',
      // Landing
      'landing_title_1': 'Find any',
      'landing_title_2': 'football shirt',
      'landing_title_3': 'in one search',
      'landing_subtitle': 'Search over 320,000 vintage, retro & classic football shirts across 240+ specialist stores',
      // Football Giants
      'fg_title': 'Football Giants',
      'fg_subtitle': 'Browse vintage & retro football shirts from the world\'s greatest clubs — Barcelona, Real Madrid, Bayern Munich, Liverpool, Man United and more',
      // Results
      'results_count_shirts': 'shirts found',
      'results_count_shirt': 'shirt found',
      'no_shirts': 'No shirts found',
      'no_shirts_sub': 'Try adjusting your filters or search term',
      'view_in_store': 'View in store',
      'load_more': 'Load more',
      'clear_all': 'Clear all',
      // Sort
      'sort_relevance': 'Relevance',
      'sort_price_asc': 'Price: Low to High',
      'sort_price_desc': 'Price: High to Low',
      'sort_newest': 'Newest',
      'sort_oldest': 'Oldest',
      // Filters
      'filter_league': 'League',
      'filter_version': 'Version',
      'filter_size': 'Size',
      'filter_brand': 'Brand',
      'filter_decade': 'Decade',
      'filter_price': 'Price',
      'filter_home': 'Home', 'filter_away': 'Away', 'filter_third': 'Third',
      'filter_fourth': 'Fourth', 'filter_gk': 'Goalkeeper', 'filter_other': 'Other',
      // Nav
      'nav_new_in': 'New In', 'nav_blog': 'La Grada',
      // Profile
      'menu_profile': 'Profile', 'menu_settings': 'Settings',
      'menu_favs': 'My favourites', 'menu_signout': 'Sign out',
      'profile_title': 'Edit Profile', 'profile_nickname': 'Nickname',
      'profile_placeholder': 'How should we call you?',
      'profile_save': 'Save changes',
      'profile_drag': 'Drag to reposition · Pinch to zoom',
      'profile_tap_photo': 'Tap the camera to change photo',
      // Settings
      'settings_title': 'Settings',
      'settings_currency': '💱 Currency',
      'settings_currency_desc': 'Prices across all stores will be shown in your selected currency.',
      'settings_lang': '🌐 Language',
      'settings_lang_desc': 'Choose your preferred language for the interface.',
      'settings_save': 'Save settings',
      'settings_saved': '✓ Saved!',
      // Favs
      'favs_empty': 'No saved shirts yet.',
      'favs_empty_sub': 'Tap the heart on any shirt to save it here.',
      'back': '← Back to Kit Finder',
      'signin': 'Sign in',
      "nav_shop_league": "Shop by League",
      "nav_shop_country": "Shop by Country",
      "nav_match_worn": "Match Worn/Issued",
      "nav_world_cup": "Long Sleeve Kits",
      "nav_why_kf": "Why Kit Finder?",
      "nav_advanced_search": "Advanced Search",
      "menu_match_worn": "Match Worn/Issued",
      "menu_world_cup": "Long Sleeve Kits",
      "menu_why_kf": "Why Kit Finder?",
      "menu_advanced_search": "Advanced Search",
      "menu_blog": "La Grada",
      "why_kf_title": "Why Kit Finder?",
      "about_title": "About Us",
      "privacy_title": "Privacy Policy",
      "terms_title": "Terms of Use",
      "affiliate_title": "Affiliate Disclosure",
      "footer_about": "About",
      "footer_privacy": "Privacy policy",
      "footer_terms": "Terms of use",
      "footer_affiliate": "Affiliate disclosure",
      "hg_title": "Holy Grails",
      "wc_hero_title": "Long Sleeve Football Shirts",
      "wc_hero_sub": "Browse long sleeve kits from every era — from iconic vintage long sleeve jerseys to the latest releases",
      "wc_hero_cta": "Explore long sleeve kits",
      "loading_text": "Searching across 240+ stores",
      "clear_all_filters": "Clear all filters",
      "load_more_shirts": "Load more shirts",
      "search_shirts": "Search shirts",
      "filter_national_teams": "National teams",
      "why_h2_photo": "Search by Photo",
      "why_h2_original": "100% Original — Zero Fakes",
      "why_h2_prices": "Best Prices, Guaranteed",
      "why_h2_global": "Global Coverage",
      "about_h2_authentic": "100% Authentic — Zero Fakes",
      "about_h2_photo": "Search by Photo",
      "about_h2_best": "The Best Place to Find Vintage Shirts at the Best Price",
      "priv_h2_1": "1. Information We Collect",
      "priv_h2_2": "2. How We Use Your Information",
      "priv_h2_3": "3. Cookies",
      "priv_h2_4": "4. Third-Party Links",
      "priv_h2_5": "5. Affiliate Disclosure",
      "priv_h2_6": "6. Data Security",
      "priv_h2_7": "7. Children's Privacy",
      "priv_h2_8": "8. Changes to This Policy",
      "priv_h2_9": "9. Contact Us",
      "terms_h2_1": "1. Acceptance of Terms",
      "terms_h2_2": "2. Description of Service",
      "terms_h2_3": "3. Use of the Website",
      "terms_h2_4": "4. Intellectual Property",
      "terms_h2_5": "5. Third-Party Links",
      "terms_h2_6": "6. Accuracy of Information",
      "terms_h2_7": "7. Affiliate Relationships",
      "terms_h2_8": "8. Disclaimer of Warranties",
      "terms_h2_9": "9. Limitation of Liability",
      "terms_h2_10": "10. Changes to Terms",
      "terms_h2_11": "11. Governing Law",
      "terms_h2_12": "12. Contact",
      "aff_h2_1": "1. How It Works",
      "aff_h2_2": "2. Does It Affect the Price?",
      "aff_h2_3": "3. Our Commitment to You",
      "aff_h2_4": "4. Which Programmes Do We Use?",
      "aff_h2_5": "5. Transparency",
      "aff_h2_6": "6. Questions"
    }
  };
  var KF_INFO_PAGES = {};

  // ── Carga perezosa: cada idioma vive en lang/<codigo>.js ─────────────────────
  var KF_LANG_VER = '1';
  var _kfLangLoading = {};
  function kfLoadLanguage(code, cb) {
    if (code === 'en' || KF_TRANSLATIONS[code]) { if (cb) cb(); return; }
    if (_kfLangLoading[code]) { _kfLangLoading[code].push(cb); return; }
    _kfLangLoading[code] = [cb];
    var s = document.createElement('script');
    s.src = 'lang/' + code + '.js?v=' + KF_LANG_VER;
    var done = function() {
      var q = _kfLangLoading[code] || [];
      delete _kfLangLoading[code];
      q.forEach(function(f) { if (f) f(); });
    };
    s.onload = done; s.onerror = done;
    document.head.appendChild(s);
  }

  // Texto traducido para cosas que genera app.js. {n} se sustituye con vars.n
  function kfT(key, fallback, vars) {
    var code = localStorage.getItem('kf_lang') || 'en';
    var d = KF_TRANSLATIONS[code];
    var out = (d && d[key]) || KF_TRANSLATIONS.en[key] || fallback || key;
    if (vars) Object.keys(vars).forEach(function(k) { out = out.split('{' + k + '}').join(vars[k]); });
    return out;
  }

  function _kfApplyLanguage(code) {
    code = code || 'en';
    kfLoadLanguage(code, function() { _kfApplyNow(code); });
  }

  function _kfApplyNow(code) {
    var en = KF_TRANSLATIONS.en;
    var dict = KF_TRANSLATIONS[code] || en;

    // Guardamos el idioma elegido (inglés = sin preferencia guardada)
    if (code !== 'en') localStorage.setItem('kf_lang', code); else localStorage.removeItem('kf_lang');
    localStorage.setItem('kf_lang_applied', code);

    // 1) Bloques largos (Why / About / Privacy / Terms / Affiliate): primero restaurar y luego traducir
    _kfTranslateInfoPages(code);

    // 2) Textos sueltos con data-i18n. Si falta la clave en este idioma se usa el inglés
    //    original de la página (guardado en data-kf-orig), así nunca se queda nada a medias.
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var isField = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      var cur = isField ? el.placeholder : el.textContent;
      if (el.getAttribute('data-kf-orig') === null) el.setAttribute('data-kf-orig', cur);
      var val = dict[key] || en[key] || el.getAttribute('data-kf-orig');
      if (isField) { el.placeholder = val; return; }
      // Si tiene hijos con su propio data-i18n, no tocarlo (se traducen ellos)
      if (el.querySelector && el.querySelector('[data-i18n]')) return;
      el.textContent = val;
    });

    // 3) Atributos: data-i18n-attr="placeholder:clave;title:clave;aria-label:clave"
    document.querySelectorAll('[data-i18n-attr]').forEach(function(el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function(pair) {
        var kv = pair.split(':'); if (kv.length < 2) return;
        var attr = kv[0].trim(), key = kv[1].trim();
        var ok = 'data-kf-orig-' + attr;
        if (el.getAttribute(ok) === null) el.setAttribute(ok, el.getAttribute(attr) || '');
        el.setAttribute(attr, dict[key] || en[key] || el.getAttribute(ok));
      });
    });

    // 4) Casos especiales que ya existían
    var searchBtns = document.querySelectorAll('.search-btn');
    searchBtns.forEach(function(btn) {
      var v = dict['search_btn'] || en['search_btn'];
      if (v) btn.childNodes.forEach(function(n) { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ' ' + v; });
    });
    var camBtn = document.querySelector('.search-camera-btn');
    if (camBtn) camBtn.title = dict['search_by_photo'] || en['search_by_photo'] || camBtn.title;

    _kfAfterLanguage(code);
  }

  // ─── Bloques de texto completos (páginas info) ───────────────────────────────
  var _kfInfoOrig = {};
  var KF_INFO_IDS = ['info-why', 'info-about', 'info-privacy', 'info-terms', 'info-affiliate'];
  function _kfTranslateInfoPages(code) {
    var pages = KF_INFO_PAGES[code] || {};
    KF_INFO_IDS.forEach(function(id) {
      var section = document.getElementById(id);
      if (!section) return;
      // Guardar el HTML original (inglés) la primera vez y restaurarlo siempre antes de traducir
      if (_kfInfoOrig[id] === undefined) _kfInfoOrig[id] = section.innerHTML;
      section.innerHTML = _kfInfoOrig[id];
      var t = pages[id];
      if (!t) return; // sin traducción de este bloque: se queda en inglés
      var h1 = section.querySelector('h1');
      var h1Html = h1 ? h1.outerHTML : '';
      var lastUpdated = section.querySelector('.last-updated');
      var luHtml = lastUpdated ? lastUpdated.outerHTML : '';
      section.innerHTML = h1Html + luHtml + t.body;
    });
  }

  function _kfAfterLanguage(code) {
    document.documentElement.setAttribute('lang', code);
    var lang = KF_LANGUAGES.find(function(l) { return l.code === code; }) || KF_LANGUAGES[0];
    var lbl = document.getElementById('kfLangLabel'); if (lbl) lbl.textContent = lang.label;
    _kfGlobeRefresh();
    // Para que app.js vuelva a pintar lo que genera él (contador de resultados, tarjetas, etc.)
    if (typeof window.kfOnLanguageChange === 'function') { try { window.kfOnLanguageChange(code); } catch (e) {} }
  }

  window.kfSetLanguage = function(code) { _kfApplyLanguage(code); };

  // ── Divisa ───────────────────────────────────────────────────────────────────
  function _kfCurrencyList() {
    if (typeof COUNTRIES === 'undefined') return [];
    var seen = {}, out = [];
    COUNTRIES.forEach(function(c) { if (!seen[c.currency]) { seen[c.currency] = 1; out.push(c); } });
    return out.sort(function(a, b) { return a.currency.localeCompare(b.currency); });
  }
  function _kfCurrencyName(code) {
    var lang = localStorage.getItem('kf_lang') || 'en';
    try {
      var n = new Intl.DisplayNames([lang], { type: 'currency' }).of(code);
      if (n && n !== code) return n.charAt(0).toUpperCase() + n.slice(1);
    } catch (e) {}
    var N = (typeof _CURRENCY_NAMES !== 'undefined') ? _CURRENCY_NAMES : {};
    return N[code] || code;
  }
  window.kfSelectCurrency = function(c) {
    if (typeof currentCountry === 'undefined' || !c) return;
    currentCountry = c;
    localStorage.setItem('kf_country', JSON.stringify(c));
    ['countryFlag', 'countryFlag2'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = c.currency; });
    var lbl = document.getElementById('kfCurrencyLabel'); if (lbl) lbl.textContent = c.currency + ' - ' + _kfCurrencyName(c.currency);
    if (typeof updatePriceSymbols === 'function') updatePriceSymbols();
    if (typeof applyFilters === 'function') applyFilters();
    if (typeof updateHGPrices === 'function') updateHGPrices();
    _kfGlobeRefresh();
  };

  // ── Globo de la cabecera: Idioma y Divisa (acordeón, solo uno abierto) ──────
  var _kfGlobeSection = null; // null | 'lang' | 'cur'
  function _g(id) { return document.getElementById(id); }

  function _kfGlobeRefresh() {
    var code = localStorage.getItem('kf_lang') || 'en';
    var lang = KF_LANGUAGES.find(function(l) { return l.code === code; }) || KF_LANGUAGES[0];
    var lv = _g('kfGlobeLangVal'); if (lv) lv.textContent = lang.label;
    var cur = (typeof currentCountry !== 'undefined' && currentCountry) ? currentCountry : { currency: 'EUR', symbol: '€' };
    var cv = _g('kfGlobeCurVal'); if (cv) cv.textContent = cur.currency + ' (' + cur.symbol + ')';
    if (_kfGlobeSection === 'lang') _kfGlobeBuildLang();
    if (_kfGlobeSection === 'cur') _kfGlobeBuildCur((_g('kfGlobeCurSearch') || {}).value || '');
  }

  var _CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function _kfGlobeBuildLang() {
    var list = _g('kfGlobeLangList'); if (!list) return;
    var cur = localStorage.getItem('kf_lang') || 'en';
    list.innerHTML = '';
    KF_LANGUAGES.forEach(function(l) {
      var o = document.createElement('button');
      o.type = 'button';
      o.className = 'kf-globe-opt' + (l.code === cur ? ' active' : '');
      o.setAttribute('lang', l.code);
      var name = document.createElement('span'); name.textContent = l.label; o.appendChild(name);
      if (l.code === cur) { var ck = document.createElement('span'); ck.innerHTML = _CHECK; o.appendChild(ck); }
      o.onclick = function() { window.kfSetLanguage(l.code); _kfGlobeClose(); };
      list.appendChild(o);
    });
  }

  function _kfGlobeBuildCur(filter) {
    var list = _g('kfGlobeCurList'); if (!list) return;
    var cur = (typeof currentCountry !== 'undefined' && currentCountry) ? currentCountry.currency : 'EUR';
    var f = (filter || '').toLowerCase();
    list.innerHTML = '';
    var items = _kfCurrencyList().filter(function(c) {
      return !f || (c.currency + ' ' + _kfCurrencyName(c.currency)).toLowerCase().indexOf(f) !== -1;
    });
    if (!items.length) {
      var empty = document.createElement('div'); empty.className = 'kf-globe-empty'; empty.textContent = '—'; list.appendChild(empty);
    }
    items.forEach(function(c) {
      var o = document.createElement('button');
      o.type = 'button';
      o.className = 'kf-globe-opt' + (c.currency === cur ? ' active' : '');
      var name = document.createElement('span');
      name.textContent = c.currency + ' — ' + _kfCurrencyName(c.currency);
      var sym = document.createElement('span'); sym.className = 'kf-globe-sym';
      if (c.currency === cur) sym.innerHTML = _CHECK; else sym.textContent = c.symbol;
      o.appendChild(name); o.appendChild(sym);
      o.onclick = function() { window.kfSelectCurrency(c); _kfGlobeClose(); };
      list.appendChild(o);
    });
  }

  function _kfGlobeSet(sec) {
    _kfGlobeSection = sec;
    [['lang', 'kfGlobeLangRow', 'kfGlobeLangBody'], ['cur', 'kfGlobeCurRow', 'kfGlobeCurBody']].forEach(function(r) {
      var row = _g(r[1]), body = _g(r[2]); if (!row || !body) return;
      var open = sec === r[0];
      row.classList.toggle('open', open);
      row.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.style.display = open ? 'block' : 'none';
    });
    if (sec === 'lang') _kfGlobeBuildLang();
    if (sec === 'cur') {
      var s = _g('kfGlobeCurSearch'); if (s) s.value = '';
      _kfGlobeBuildCur('');
      if (s && window.matchMedia && window.matchMedia('(hover: hover)').matches) setTimeout(function() { s.focus(); }, 30);
    }
  }
  window.kfGlobeSection = function(sec) { _kfGlobeSet(_kfGlobeSection === sec ? null : sec); };
  window.kfGlobeFilterCur = function(v) { _kfGlobeBuildCur(v); };

  function _kfGlobeClose() {
    var p = _g('kfGlobePanel'), b = _g('kfGlobeBtn');
    if (p) p.classList.remove('open');
    if (b) b.setAttribute('aria-expanded', 'false');
    _kfGlobeSet(null);
  }
  window.kfToggleGlobe = function(ev) {
    if (ev) ev.stopPropagation();
    var p = _g('kfGlobePanel'), b = _g('kfGlobeBtn'); if (!p) return;
    var open = !p.classList.contains('open');
    if (!open) { _kfGlobeClose(); return; }
    var pm = _g('kfProfileMenu'); if (pm) pm.classList.remove('open');
    p.classList.add('open');
    if (b) b.setAttribute('aria-expanded', 'true');
    _kfGlobeRefresh();
  };
  document.addEventListener('click', function(e) {
    if (!e.target.closest || e.target.closest('#kfGlobe')) return;
    _kfGlobeClose();
  });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') _kfGlobeClose(); });

  // ── Aplicar el idioma guardado al cargar ─────────────────────────────────────
  (function() {
    var stored = localStorage.getItem('kf_lang');
    function go() { if (stored && stored !== 'en') _kfApplyLanguage(stored); else _kfGlobeRefresh(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    // Una segunda pasada cuando termina de cargar todo (app.js pinta cosas tarde)
    if (stored && stored !== 'en') window.addEventListener('load', function() { setTimeout(function() { _kfApplyLanguage(stored); }, 200); });
  })();
