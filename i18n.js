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

// Legal/info page bodies (Why, About, Privacy, Terms, Affiliate), their section headings and the
// cookie banner stay in English until a human/lawyer reviews the translations in lang/*.js.
// Set to true to turn those translations back on. Page titles, menus and links are always translated.
var KF_TRANSLATE_LEGAL = false;
function _kfLegalKey(key) { return !KF_TRANSLATE_LEGAL && /^(cookie_|(why|about|priv|terms|aff)_h2_)/.test(key); }

  // ── Language translations system ─────────────────────────────────────────────
  // Approach: store language preference and reload page to apply translations
  // This avoids the bug where switching between languages gets stuck
  
  var KF_TRANSLATIONS = {
    en: {
      // Search
      'search_placeholder': 'Search football shirts (team, player, brand…)',
      'globe_title': 'Language & currency',
      'res_back_to_top': 'Back to top',
      'globe_lang': 'Language',
      'globe_currency': 'Currency',
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
      "kfd_h_a": "{team} shirts on Kit Finder: the numbers",
      "kfd_h_b": "{team} shirts in stock right now",
      "kfd_h_c": "What's available for {team} today",
      "kfd_h_d": "{team} shirts by the numbers",
      "kfd_ov_a": "Kit Finder currently lists {n} {team} shirts from {s} stores. Prices run from {min} to {max}, and the average is {avg}.",
      "kfd_ov_b": "Right now there are {n} {team} shirts on Kit Finder, spread across {s} stores. The cheapest costs {min} and the most expensive {max}; half of them cost less than {median}.",
      "kfd_ov_c": "{s} stores currently stock {team} shirts, {n} listings in total. A typical one costs about {median} (the middle price), while the average across all of them is {avg}.",
      "kfd_ov_d": "Our search index holds {n} {team} shirts today, gathered from {s} stores. Asking prices start at {min} and go up to {max}.",
      "kfd_ov_1s": "Kit Finder currently lists {n} {team} shirts, all from one store: {store}. Prices run from {min} to {max}.",
      "kfd_ov_one": "Kit Finder currently has a single {team} shirt listed, priced at {min}.",
      "kfd_px_a": "{p50} are under €50 and {p200} are over €200.",
      "kfd_px_b": "{c50} of them cost less than €50; {c200} are priced above €200.",
      "kfd_px_c": "About {p50} sit below €50.",
      "kfd_era_a": "Listed seasons range from {oldest} to {newest}, {k} different seasons in all.",
      "kfd_era_b": "The oldest season we can find for {team} is {oldest}; the most recent is {newest}.",
      "kfd_era_c": "Across {k} seasons, the earliest {team} shirt in stock is from {oldest} and the latest from {newest}.",
      "kfd_dec_a": "The {dec}s are the best-stocked decade, with {c} dated listings.",
      "kfd_dec_b": "Most dated listings come from the {dec}s ({p}).",
      "kfd_dec_c": "By decade, the {dec}s lead with {c} shirts, ahead of the {dec2}s with {c2}.",
      "kfd_top_a": "The single most-listed season is {season} ({c} shirts).",
      "kfd_top_b": "{season} is the season with the most shirts for sale: {c}.",
      "kfd_nod_a": "{p} of listings don't state a season.",
      "kfd_nod_b": "Stores give no season for {c} of the listings.",
      "kfd_kit_a": "Of the {c} listings that say which kit they are, {home} are home, {away} away and {third} third.",
      "kfd_kit_b": "Where the kit type is stated ({c} listings), the split is {home} home, {away} away and {third} third.",
      "kfd_kit_c": "Kit types, among listings that specify one: {home} home, {away} away, {third} third.",
      "kfd_gk": "Goalkeeper shirts make up {gk} of them.",
      "kfd_ls_a": "{c} are marked as long-sleeve.",
      "kfd_ls_b": "Long-sleeve versions: {c} listings.",
      "kfd_ls_c": "Stores flag {c} of them as long-sleeve shirts.",
      "kfd_br_a": "Most common manufacturers among branded listings: {list}.",
      "kfd_br_b": "{brand} is the most listed maker ({p} of branded listings).",
      "kfd_br_c": "Brands seen most often: {list}.",
      "kfd_st_a": "The stores with the most stock: {list}.",
      "kfd_st_b": "{store} has the largest selection, with {c} shirts.",
      "kfd_st_c": "Biggest sellers on Kit Finder: {list}.",
      "kfd_ex_a": "Cheapest right now: {lo}. Most expensive: {hi}.",
      "kfd_ex_b": "At the bottom of the price range is {lo}; at the top, {hi}.",
      "kfd_ex_c": "The lowest-priced listing today is {lo}, and the highest {hi}.",
      "kfd_lg_a": "{k} clubs we group under the {team} have shirts listed. The most stocked: {list}.",
      "kfd_lg_b": "Shirts from {k} clubs on our {team} list are in stock. Most listings: {list}.",
      "kfd_lg_c": "Clubs on our {team} list with the biggest selections ({k} clubs have listings): {list}.",
      "kfd_t_n": "Shirts listed",
      "kfd_t_s": "Stores",
      "kfd_t_range": "Price range",
      "kfd_t_avg": "Average price",
      "kfd_t_med": "Middle (median) price",
      "kfd_t_seasons": "Seasons listed",
      "kfd_t_brand": "Top brand",
      "kfd_t_ls": "Long-sleeve",
      "kfd_l_clubs_a": "Clubs on our {team} list with the most shirts",
      "kfd_l_clubs_b": "Most-stocked clubs on our {team} list",
      "kfd_l_seas_a": "Most-listed seasons",
      "kfd_l_seas_b": "Seasons with the most shirts",
      "kfd_l_seas_c": "Top seasons by number of listings",
      "kfd_l_dec_a": "Listings by decade",
      "kfd_l_dec_b": "Shirts per decade",
      "kfd_faq_a": "Questions about these shirts",
      "kfd_faq_b": "FAQ",
      "kfd_faq_c": "Quick answers",
      "kfd_q_n_a": "How many {team} shirts are on Kit Finder?",
      "kfd_q_n_b": "How many {team} shirts can I find on Kit Finder?",
      "kfd_a_n": "As of {date}, Kit Finder lists {n} {team} shirts from {s} stores.",
      "kfd_a_n1": "As of {date}, Kit Finder lists {n} {team} shirts, all from {store}.",
      "kfd_q_p_a": "How much does a {team} shirt cost?",
      "kfd_q_p_b": "What do {team} shirts sell for?",
      "kfd_a_p": "Listed prices go from {min} to {max}. The middle price is {median} and the average is {avg} (converted to euros on {date}).",
      "kfd_q_s_a": "Which stores sell {team} shirts?",
      "kfd_q_s_b": "Where can I buy {team} shirts?",
      "kfd_a_s": "The stores with the most {team} shirts on Kit Finder: {list}.",
      "kfd_q_o_a": "What is the oldest {team} shirt listed?",
      "kfd_q_o_b": "How far back do the {team} shirts go?",
      "kfd_a_o": "The earliest season listed is {oldest}. The most recent is {newest}.",
      "kfd_note": "Data from Kit Finder's index on {date}. Prices are converted to euros at current exchange rates; each store sells in its own currency.",
      "kfd_none": "There are no {team} shirts listed on Kit Finder right now. New stock is added every day.",
      "kfd_related": "Related",
      "kfd_hub_intro": "Kit Finder lists {n} football shirts from {s} stores across these {k} clubs and national teams. The middle price is {median}. Each row shows the shirts in stock, the number of stores and the typical (median) price.",
      "kfd_row": "{s} stores · typical {p}",
      "kfd_row1": "1 store · typical {p}",
      "footer_browse_by": "Browse by",
      "footer_clubs": "Clubs",
      "footer_national": "National teams",
      "footer_leagues": "Leagues",
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
      "footer_copy": "© 2026 Kit Finder. Kit Finder may earn a commission if you buy through our links. This doesn’t change the price you pay. All trademarks belong to their respective owners.",
      "footer_aff_notice": "Kit Finder may earn a commission if you buy through our links. This doesn’t change the price you pay.",
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
      "cookie_title": "Cookies",
      "cookie_text": "We use cookies to measure traffic and improve Kit Finder. Is that OK?",
      "cookie_reject": "Reject",
      "cookie_accept": "Accept",
      "club_austrian": "Austrian clubs",
      "club_belgian": "Belgian clubs",
      "club_croatian": "Croatian clubs",
      "club_czech": "Czech clubs",
      "club_danish": "Danish clubs",
      "club_dutch": "Dutch clubs",
      "club_english": "English clubs",
      "club_finnish": "Finnish clubs",
      "club_french": "French clubs",
      "club_german": "German clubs",
      "club_greek": "Greek clubs",
      "club_hungarian": "Hungarian clubs",
      "club_irish": "Irish clubs",
      "club_italian": "Italian clubs",
      "club_n_irish": "N. Irish clubs",
      "club_norwegian": "Norwegian clubs",
      "club_polish": "Polish clubs",
      "club_portuguese": "Portuguese clubs",
      "club_russian": "Russian clubs",
      "club_scottish": "Scottish clubs",
      "club_serbian": "Serbian clubs",
      "club_spanish": "Spanish clubs",
      "club_swedish": "Swedish clubs",
      "club_swiss": "Swiss clubs",
      "club_turkish": "Turkish clubs",
      "club_ukrainian": "Ukrainian clubs",
      "club_argentine": "Argentine clubs",
      "club_brazilian": "Brazilian clubs",
      "club_chilean": "Chilean clubs",
      "club_colombian": "Colombian clubs",
      "club_ecuadorian": "Ecuadorian clubs",
      "club_mexican": "Mexican clubs",
      "club_peruvian": "Peruvian clubs",
      "club_us_and_canadian": "US & Canadian clubs",
      "club_uruguayan": "Uruguayan clubs",
      "club_venezuelan": "Venezuelan clubs",
      "club_australian": "Australian clubs",
      "club_chinese": "Chinese clubs",
      "club_japanese": "Japanese clubs",
      "club_korean": "Korean clubs",
      "club_saudi": "Saudi clubs",
      "club_algerian": "Algerian clubs",
      "club_egyptian": "Egyptian clubs",
      "club_moroccan": "Moroccan clubs",
      "club_south_african": "South African clubs",
      "club_tunisian": "Tunisian clubs",
      "country_algeria": "Algeria",
      "country_argentina": "Argentina",
      "country_australia": "Australia",
      "country_austria": "Austria",
      "country_belgium": "Belgium",
      "country_brazil": "Brazil",
      "country_cameroon": "Cameroon",
      "country_canada": "Canada",
      "country_chile": "Chile",
      "country_china": "China",
      "country_colombia": "Colombia",
      "country_costa_rica": "Costa Rica",
      "country_croatia": "Croatia",
      "country_czech_republic": "Czech Republic",
      "country_denmark": "Denmark",
      "country_ecuador": "Ecuador",
      "country_egypt": "Egypt",
      "country_england": "England",
      "country_finland": "Finland",
      "country_france": "France",
      "country_germany": "Germany",
      "country_ghana": "Ghana",
      "country_greece": "Greece",
      "country_guinea": "Guinea",
      "country_hungary": "Hungary",
      "country_india": "India",
      "country_indonesia": "Indonesia",
      "country_iran": "Iran",
      "country_iraq": "Iraq",
      "country_ireland": "Ireland",
      "country_italy": "Italy",
      "country_ivory_coast": "Ivory Coast",
      "country_japan": "Japan",
      "country_mali": "Mali",
      "country_mexico": "Mexico",
      "country_morocco": "Morocco",
      "country_netherlands": "Netherlands",
      "country_new_zealand": "New Zealand",
      "country_nigeria": "Nigeria",
      "country_norway": "Norway",
      "country_paraguay": "Paraguay",
      "country_peru": "Peru",
      "country_poland": "Poland",
      "country_portugal": "Portugal",
      "country_qatar": "Qatar",
      "country_russia": "Russia",
      "country_saudi_arabia": "Saudi Arabia",
      "country_scotland": "Scotland",
      "country_senegal": "Senegal",
      "country_serbia": "Serbia",
      "country_somalia": "Somalia",
      "country_south_africa": "South Africa",
      "country_south_korea": "South Korea",
      "country_spain": "Spain",
      "country_sweden": "Sweden",
      "country_switzerland": "Switzerland",
      "country_thailand": "Thailand",
      "country_tunisia": "Tunisia",
      "country_turkey": "Turkey",
      "country_ukraine": "Ukraine",
      "country_uruguay": "Uruguay",
      "country_usa": "USA",
      "country_venezuela": "Venezuela",
      "country_vietnam": "Vietnam",
      "country_wales": "Wales",
      "filter_price_range": "Price range",
      "auth_err_invalid_email": "That email address is not valid.",
      "auth_err_user_disabled": "This account has been disabled.",
      "auth_err_wrong_credentials": "Wrong email or password.",
      "auth_err_email_in_use": "An account with this email already exists. Try signing in.",
      "auth_err_weak_password": "Password must be at least 6 characters.",
      "auth_err_too_many": "Too many attempts. Please wait a few minutes and try again.",
      "auth_err_network": "Network error. Check your connection and try again.",
      "auth_err_generic": "Something went wrong. Please try again.",
      "sc_sub": "Pick a team or player to see how many shirts are listed and the average price.",
      "sc_team_label": "Team or player",
      "sc_team_ph": "Search team or player…",
      "sc_clear_team": "Clear team or player",
      "sc_season": "Season",
      "sc_sleeve": "Sleeve",
      "sc_any_size": "Any size",
      "sc_any_season": "Any season",
      "sc_any_version": "Any version",
      "sc_any_sleeve": "Any sleeve",
      "sc_clear_size": "Clear size",
      "sc_clear_season": "Clear season",
      "sc_clear_version": "Clear version",
      "sc_clear_sleeve": "Clear sleeve",
      "sc_short_sleeve": "Short sleeve",
      "sc_long_sleeve": "Long sleeve",
      "sc_shirts_available": "shirts available",
      "sc_shirt_available": "shirt available",
      "sc_across_stores": "across {n} stores",
      "sc_across_store": "across {n} store",
      "sc_avg_price": "Average price",
      "sc_start_typing": "Start typing a team or player…",
      "sc_loading_teams": "Loading teams…",
      "sc_teams_failed": "Could not load teams. Try again.",
      "sc_no_teams": "No teams or players found",
      "sc_player": "Player",
      "sc_searching": "Searching…",
      "sc_checking_history": "Checking history…",
      "sc_no_listed": "No shirts currently listed for these filters.",
      "sc_last_seen": "Last seen:",
      "teams_back": "← Back to all teams",
      "teams_h1": "{team} Vintage Shirts",
      "teams_sub": "{n} available right now, compared across 240+ specialist stores.",
      "teams_cta": "Search all {team} shirts →",
      "teams_famous_players": "Famous players available:",
      "teams_also_browse": "Also browse",
      "teams_all_az": "All teams A-Z",
      "teams_link": "{team} shirts",
      "teams_hub_title": "Football Shirts by Team",
      "teams_see_collection": "See collection",
      "auth_err_localhost_hint": "In Firebase Console → Authentication → Authorized domains, add: localhost. Also check Google Cloud Console → OAuth 2.0 → Authorized redirect URIs includes http://localhost:{port}/__/auth/handler",
      "auth_err_add_domain": "Add this domain in Firebase Console → Authentication → Authorized domains.",
      "auth_err_popup_blocked": "Popup blocked. Trying redirect login...",
      "auth_err_google_disabled": "Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
      "auth_err_fill_all": "Please fill in all fields.",
      "auth_err_enter_email": "Enter your email first.",
      "auth_reset_sent": "Reset email sent! Check your inbox.",
      "auth_default_user": "Kit Finder User",
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
      'menu_profile': 'Profile',
      'menu_favs': 'My favourites', 'menu_signout': 'Sign out',
      'profile_title': 'Edit Profile', 'profile_nickname': 'Nickname',
      'profile_placeholder': 'How should we call you?',
      'profile_save': 'Save changes',
      'profile_drag': 'Drag to reposition · Pinch to zoom',
      'profile_tap_photo': 'Tap the camera to change photo',
      // Settings
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
  var KF_LANG_VER = '10';
  var _kfLangLoading = {};
  function kfLoadLanguage(code, cb) {
    if (code === 'en' || KF_TRANSLATIONS[code]) { if (cb) cb(); return; }
    if (_kfLangLoading[code]) { _kfLangLoading[code].push(cb); return; }
    _kfLangLoading[code] = [cb];
    var s = document.createElement('script');
    s.src = '/lang/' + code + '.js?v=' + KF_LANG_VER;
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
    var d = _kfLegalKey(key) ? null : KF_TRANSLATIONS[code];
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
    var dictLang = dict;

    // Guardamos el idioma elegido (inglés = sin preferencia guardada)
    if (code !== 'en') localStorage.setItem('kf_lang', code); else localStorage.removeItem('kf_lang');
    localStorage.setItem('kf_lang_applied', code);

    // 1) Bloques largos (Why / About / Privacy / Terms / Affiliate): primero restaurar y luego traducir
    _kfTranslateInfoPages(code);

    // 2) Textos sueltos con data-i18n. Si falta la clave en este idioma se usa el inglés
    //    original de la página (guardado en data-kf-orig), así nunca se queda nada a medias.
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var dict = _kfLegalKey(key) ? en : dictLang;
      var isField = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      var cur = isField ? el.placeholder : el.textContent;
      if (el.getAttribute('data-kf-orig') === null) el.setAttribute('data-kf-orig', cur);
      var val = dict[key] || en[key] || el.getAttribute('data-kf-orig');
      // Huecos {team}, {n}…: data-i18n-vars="team=Aberdeen;n=194" (valores con encodeURIComponent)
      var vars = el.getAttribute('data-i18n-vars');
      if (vars && (dict[key] || en[key])) vars.split(';').forEach(function(pair) {
        var i = pair.indexOf('='); if (i < 1) return;
        var x = decodeURIComponent(pair.slice(i + 1));
        if (/^\d[\d,]*$/.test(x)) x = Number(x.replace(/,/g, '')).toLocaleString(code); // 1,147 → 1.147 (de)
        val = val.split('{' + pair.slice(0, i) + '}').join(x);
      });
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
    var pages = KF_TRANSLATE_LEGAL ? (KF_INFO_PAGES[code] || {}) : {};
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
    if (typeof updatePriceSymbols === 'function') updatePriceSymbols();
    if (typeof applyFilters === 'function') applyFilters();
    if (typeof updateHGPrices === 'function') updateHGPrices();
    _kfGlobeRefresh();
  };

  // ── Globo de la cabecera: Idioma y Divisa (acordeón, solo uno abierto) ──────
  // Ahora solo está en la página 1, pero el código admite 0 o varios. Sin ids: todo va por clases
  // dentro de cada contenedor .kf-globe, y el HTML se genera aquí una sola vez.
  var _kfGlobeSection = null; // null | 'lang' | 'cur'
  var _kfGlobeOpen = null;    // el .kf-globe que tiene el panel abierto
  function _g(id) { return document.getElementById(id); }
  function _q(root, sel) { return root ? root.querySelector(sel) : null; }

  var _CHEV = '<svg class="kf-globe-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
  function _kfGlobeHtml() {
    return '<button class="kf-globe-btn" type="button" aria-haspopup="true" aria-expanded="false" title="Language &amp; currency" aria-label="Language &amp; currency" data-i18n-attr="title:globe_title;aria-label:globe_title">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
      '</button>' +
      '<div class="kf-globe-panel" role="menu">' +
        '<button class="kf-globe-row" data-sec="lang" type="button" aria-expanded="false">' +
          '<span class="kf-globe-row-label" data-i18n="globe_lang">Language</span>' +
          '<span class="kf-globe-val" data-sec="lang">English</span>' + _CHEV +
        '</button>' +
        '<div class="kf-globe-body" data-sec="lang"><div class="kf-globe-list" data-sec="lang"></div></div>' +
        '<button class="kf-globe-row" data-sec="cur" type="button" aria-expanded="false">' +
          '<span class="kf-globe-row-label" data-i18n="globe_currency">Currency</span>' +
          '<span class="kf-globe-val" data-sec="cur">EUR (€)</span>' + _CHEV +
        '</button>' +
        '<div class="kf-globe-body" data-sec="cur">' +
          '<input class="kf-globe-search" type="text" placeholder="Search currency…" data-i18n-attr="placeholder:search_currency" autocomplete="off"/>' +
          '<div class="kf-globe-list" data-sec="cur"></div>' +
        '</div>' +
      '</div>';
  }
  function _kfGlobeMount() {
    document.querySelectorAll('.kf-globe').forEach(function(root) {
      if (!root.querySelector('.kf-globe-btn')) root.innerHTML = _kfGlobeHtml();
    });
  }

  function _kfGlobeRefresh() {
    _kfGlobeMount();
    var code = localStorage.getItem('kf_lang') || 'en';
    var lang = KF_LANGUAGES.find(function(l) { return l.code === code; }) || KF_LANGUAGES[0];
    var cur = (typeof currentCountry !== 'undefined' && currentCountry) ? currentCountry : { currency: 'EUR', symbol: '€' };
    document.querySelectorAll('.kf-globe-val[data-sec="lang"]').forEach(function(el) { el.textContent = lang.label; });
    document.querySelectorAll('.kf-globe-val[data-sec="cur"]').forEach(function(el) { el.textContent = cur.currency + ' (' + cur.symbol + ')'; });
    if (_kfGlobeOpen && _kfGlobeSection === 'lang') _kfGlobeBuildLang(_kfGlobeOpen);
    if (_kfGlobeOpen && _kfGlobeSection === 'cur') _kfGlobeBuildCur(_kfGlobeOpen, (_q(_kfGlobeOpen, '.kf-globe-search') || {}).value || '');
  }

  var _CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function _kfGlobeBuildLang(root) {
    var list = _q(root, '.kf-globe-list[data-sec="lang"]'); if (!list) return;
    var cur = localStorage.getItem('kf_lang') || 'en';
    list.innerHTML = '';
    KF_LANGUAGES.forEach(function(l) {
      var o = document.createElement('button');
      o.type = 'button';
      o.className = 'kf-globe-opt' + (l.code === cur ? ' active' : '');
      o.setAttribute('lang', l.code);
      var name = document.createElement('span'); name.textContent = l.label; o.appendChild(name);
      if (l.code === cur) { var ck = document.createElement('span'); ck.innerHTML = _CHECK; o.appendChild(ck); }
      o.onclick = function() { _kfGlobeClose(); window.kfSetLanguage(l.code); };
      list.appendChild(o);
    });
  }

  function _kfGlobeBuildCur(root, filter) {
    var list = _q(root, '.kf-globe-list[data-sec="cur"]'); if (!list) return;
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
      o.onclick = function() { _kfGlobeClose(); window.kfSelectCurrency(c); };
      list.appendChild(o);
    });
  }

  function _kfGlobeSet(root, sec) {
    _kfGlobeSection = sec;
    if (!root) return;
    ['lang', 'cur'].forEach(function(s) {
      var row = _q(root, '.kf-globe-row[data-sec="' + s + '"]'), body = _q(root, '.kf-globe-body[data-sec="' + s + '"]');
      if (!row || !body) return;
      var open = sec === s;
      row.classList.toggle('open', open);
      row.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.style.display = open ? 'block' : 'none';
    });
    if (sec === 'lang') _kfGlobeBuildLang(root);
    if (sec === 'cur') {
      var s = _q(root, '.kf-globe-search'); if (s) s.value = '';
      _kfGlobeBuildCur(root, '');
      if (s && window.matchMedia && window.matchMedia('(hover: hover)').matches) setTimeout(function() { s.focus(); }, 30);
    }
  }

  function _kfGlobeClose() {
    var root = _kfGlobeOpen; _kfGlobeOpen = null;
    if (!root) { _kfGlobeSection = null; return; }
    var p = _q(root, '.kf-globe-panel'), b = _q(root, '.kf-globe-btn');
    if (p) p.classList.remove('open');
    if (b) b.setAttribute('aria-expanded', 'false');
    _kfGlobeSet(root, null);
  }
  function _kfGlobeToggle(root) {
    var p = _q(root, '.kf-globe-panel'); if (!p) return;
    var wasOpen = _kfGlobeOpen === root;
    _kfGlobeClose();
    if (wasOpen) return;
    var pm = _g('kfProfileMenu'); if (pm) pm.classList.remove('open');
    _kfGlobeOpen = root;
    p.classList.add('open');
    var b = _q(root, '.kf-globe-btn'); if (b) b.setAttribute('aria-expanded', 'true');
    _kfGlobeRefresh();
  }

  // Un solo listener para todos los globos (delegación de eventos)
  document.addEventListener('click', function(e) {
    var t = e.target;
    var root = t.closest ? t.closest('.kf-globe') : null;
    if (!root) { _kfGlobeClose(); return; }
    if (t.closest('.kf-globe-btn')) { e.stopPropagation(); _kfGlobeToggle(root); return; }
    var row = t.closest('.kf-globe-row');
    if (row) { var sec = row.getAttribute('data-sec'); _kfGlobeSet(root, _kfGlobeSection === sec ? null : sec); }
  });
  document.addEventListener('input', function(e) {
    if (e.target.classList && e.target.classList.contains('kf-globe-search')) {
      _kfGlobeBuildCur(e.target.closest('.kf-globe'), e.target.value);
    }
  });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') _kfGlobeClose(); });
  _kfGlobeMount();

  // ── Aplicar el idioma guardado al cargar ─────────────────────────────────────
  (function() {
    var stored = localStorage.getItem('kf_lang');
    function go() { if (stored && stored !== 'en') _kfApplyLanguage(stored); else _kfGlobeRefresh(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    // Una segunda pasada cuando termina de cargar todo (app.js pinta cosas tarde)
    if (stored && stored !== 'en') window.addEventListener('load', function() { setTimeout(function() { _kfApplyLanguage(stored); }, 200); });
  })();
