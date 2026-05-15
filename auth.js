// Kit Finder — Auth (Firebase via CDN, no ES modules)
// Carga Firebase como script normal para evitar problemas de scope con onclick

// Importar Firebase dinámicamente
(function() {
  function loadScript(src, callback) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = callback;
    document.head.appendChild(s);
  }

  var FB_VER = '10.12.0';
  var BASE = 'https://www.gstatic.com/firebasejs/' + FB_VER;

  // Cargar los 3 módulos de Firebase en secuencia
  loadScript(BASE + '/firebase-app-compat.js', function() {
    loadScript(BASE + '/firebase-auth-compat.js', function() {
      loadScript(BASE + '/firebase-firestore-compat.js', function() {
        _kfInitFirebase();
      });
    });
  });
})();

function _kfInitFirebase() {
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
  var db   = firebase.firestore();

  // ── Modal helpers ────────────────────────────────────────────────────────────
  window.kfOpenAuthModal = function(tab) {
    document.getElementById('kfAuthModal').classList.add('open');
    if (tab) window.kfSwitchTab(tab);
  };
  window.kfCloseAuthModal = function() {
    document.getElementById('kfAuthModal').classList.remove('open');
    kfSetError('');
  };
  window.kfSwitchTab = function(tab) {
    document.querySelectorAll('.kf-auth-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.kf-auth-panel').forEach(function(p) {
      p.style.display = p.dataset.panel === tab ? 'flex' : 'none';
    });
    var btn = document.getElementById('kfAuthSubmitBtn');
    if (btn) btn.textContent = tab === 'signup' ? 'Create Account' : 'Sign In';
    kfSetError('');
  };

  function kfSetError(msg) {
    var el = document.getElementById('kfAuthError');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
  }
  function kfSetLoading(on) {
    var btn = document.getElementById('kfAuthSubmitBtn');
    if (btn) btn.disabled = on;
  }

  // ── Google Sign In ───────────────────────────────────────────────────────────
  window.kfSignInGoogle = function() {
    kfSetError('');
    var provider = new firebase.auth.GoogleAuthProvider();
    // En localhost el popup a veces falla por restricciones del navegador
    // Intentamos popup primero, si falla usamos redirect como fallback
    auth.signInWithPopup(provider).then(function(result) {
      return kfSyncCloud(result.user);
    }).then(function() {
      window.kfCloseAuthModal();
    }).catch(function(e) {
      if (e.code === 'auth/unauthorized-domain') {
        // En localhost: intentar añadir el puerto exacto en Firebase Console
        var hint = window.location.hostname === 'localhost'
          ? 'In Firebase Console → Authentication → Authorized domains, add: localhost. Also check Google Cloud Console → OAuth 2.0 → Authorized redirect URIs includes http://localhost:' + window.location.port + '/__/auth/handler'
          : 'Add this domain in Firebase Console → Authentication → Authorized domains.';
        kfSetError(hint);
      } else if (e.code === 'auth/popup-blocked') {
        // Popup bloqueado — intentar con redirect
        kfSetError('Popup blocked. Trying redirect login...');
        setTimeout(function() {
          auth.signInWithRedirect(provider).catch(function(e2) {
            kfSetError(e2.message.replace('Firebase: ', '').replace(/\s*\(.*\)\.?$/, ''));
          });
        }, 1000);
      } else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        // User closed popup — no error
      } else if (e.code === 'auth/operation-not-allowed') {
        kfSetError('Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.');
      } else {
        kfSetError(e.message.replace('Firebase: ', '').replace(/\s*\(.*\)\.?$/, ''));
      }
    });
    // Capturar resultado de redirect si venimos de uno
    auth.getRedirectResult().then(function(result) {
      if (result && result.user) {
        return kfSyncCloud(result.user).then(function() {
          window.kfCloseAuthModal && window.kfCloseAuthModal();
        });
      }
    }).catch(function() {});
  };

  // ── Email/Password ───────────────────────────────────────────────────────────
  window.kfHandleSubmit = function() {
    var activeTab = (document.querySelector('.kf-auth-tab.active') || {}).dataset && document.querySelector('.kf-auth-tab.active').dataset.tab;
    var emailId = activeTab === 'signup' ? 'kfEmailInputSU' : 'kfEmailInput';
    var passId  = activeTab === 'signup' ? 'kfPasswordInputSU' : 'kfPasswordInput';
    var email = (document.getElementById(emailId) || {}).value && document.getElementById(emailId).value.trim();
    var pass  = (document.getElementById(passId) || {}).value;
    if (!email || !pass) return kfSetError('Please fill in all fields.');
    kfSetLoading(true); kfSetError('');

    var promise = activeTab === 'signup'
      ? auth.createUserWithEmailAndPassword(email, pass)
      : auth.signInWithEmailAndPassword(email, pass);

    promise.then(function(r) {
      return kfSyncCloud(r.user);
    }).then(function() {
      window.kfCloseAuthModal();
    }).catch(function(e) {
      kfSetError(e.message.replace('Firebase: ', '').replace(/\s*\(.*\)\.?$/, ''));
    }).finally(function() {
      kfSetLoading(false);
    });
  };

  window.kfResetPassword = function() {
    var email = (document.getElementById('kfEmailInput') || {}).value;
    if (!email) return kfSetError('Enter your email first.');
    auth.sendPasswordResetEmail(email.trim()).then(function() {
      kfSetError('Reset email sent! Check your inbox.');
    }).catch(function(e) {
      kfSetError(e.message.replace('Firebase: ', ''));
    });
  };

  // ── Sign out ─────────────────────────────────────────────────────────────────
  window.kfSignOut = function() {
    auth.signOut().then(function() {
      var m = document.getElementById('kfProfileMenu');
      if (m) m.classList.remove('open');
      // Cerrar settings/profile si están abiertos
      if (typeof closeInfo === 'function') closeInfo();
    });
  };

  // ── Profile menu toggle ──────────────────────────────────────────────────────
  window.kfToggleProfileMenu = function() {
    var m = document.getElementById('kfProfileMenu');
    if (m) m.classList.toggle('open');
  };
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#kfUserAvatar') && !e.target.closest('#kfProfileMenu')) {
      var m = document.getElementById('kfProfileMenu');
      if (m) m.classList.remove('open');
    }
  });

  // ── Cloud sync ───────────────────────────────────────────────────────────────
  function kfSyncCloud(user) {
    if (!user) return Promise.resolve();
    var ref = db.collection('users').doc(user.uid);
    return ref.get().then(function(snap) {
      var localFavs = JSON.parse(localStorage.getItem('kf_favs') || '[]');
      var cloudFavs = snap.exists ? (snap.data().favourites || []) : [];
      var merged = cloudFavs.slice();
      var ids = new Set(merged.map(function(f) { return f.id; }));
      localFavs.forEach(function(f) {
        if (!ids.has(f.id)) { merged.push(f); ids.add(f.id); }
      });
      return ref.set({ favourites: merged, email: user.email, updatedAt: Date.now() }, { merge: true }).then(function() {
        localStorage.setItem('kf_favs', JSON.stringify(merged));
        if (typeof favourites !== 'undefined') {
          favourites.length = 0;
          merged.forEach(function(f) { favourites.push(f); });
        }
        if (typeof updateFavBadge === 'function') updateFavBadge();
      });
    });
  }

  var _origSaveFavs = window.saveFavs;
  window.saveFavs = function() {
    if (_origSaveFavs) _origSaveFavs();
    var user = auth.currentUser;
    if (user) {
      var favs = JSON.parse(localStorage.getItem('kf_favs') || '[]');
      db.collection('users').doc(user.uid).set({ favourites: favs, updatedAt: Date.now() }, { merge: true }).catch(function() {});
    }
  };

  // ── Avatar helpers ───────────────────────────────────────────────────────────
  function _kfAvatarUrl(user, nickname) {
    var stored = localStorage.getItem('kf_avatar_' + user.uid);
    if (stored) return stored;
    if (user.photoURL) return user.photoURL;
    var name = nickname || user.displayName || user.email || 'K';
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=1FAF6D&color=fff&size=64&bold=true';
  }
  function _kfUpdateAvatar(user, nickname) {
    var url  = _kfAvatarUrl(user, nickname);
    var disp = nickname || user.displayName || 'Kit Finder User';
    ['kfAvatarImg','kfMenuAvatarImg','kfProfilePreview'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.src = url;
    });
    var nm = document.getElementById('kfMenuName');  if (nm) nm.textContent = disp;
    var em = document.getElementById('kfMenuEmail'); if (em) em.textContent = user.email || '';
  }

  // ── Auth state ───────────────────────────────────────────────────────────────
  auth.onAuthStateChanged(function(user) {
    var authBtn    = document.getElementById('kfAuthBtn');
    var userAvatar = document.getElementById('kfUserAvatar');
    if (user) {
      if (authBtn)    authBtn.style.display    = 'none';
      if (userAvatar) userAvatar.style.display = 'flex';
      db.collection('users').doc(user.uid).get().then(function(snap) {
        var nickname = snap.exists ? (snap.data().nickname || '') : '';
        _kfUpdateAvatar(user, nickname);
      });
      kfSyncCloud(user);
    } else {
      if (authBtn)    authBtn.style.display    = 'flex';
      if (userAvatar) userAvatar.style.display = 'none';
    }
  });

  // ── Profile page ─────────────────────────────────────────────────────────────
  window.kfOpenProfile = function() {
    var user = auth.currentUser;
    if (!user) return;
    db.collection('users').doc(user.uid).get().then(function(snap) {
      var d = snap.exists ? snap.data() : {};
      var ni = document.getElementById('kfNicknameInput');
      if (ni) ni.value = d.nickname || '';
      var preview = document.getElementById('kfProfilePreview');
      if (preview) preview.src = _kfAvatarUrl(user, d.nickname || '');
      var up = document.getElementById('kfAvatarUpload');
      if (up) up.value = '';
      if (typeof showInfo === 'function') showInfo('profile', { preventDefault: function() {} });
    });
  };

  window.kfPreviewAvatar = function(input) {
    var file = input.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var preview = document.getElementById('kfProfilePreview');
      if (preview) { preview.src = e.target.result; preview.style.objectFit = 'cover'; }
      var ctrl = document.getElementById('kfCropControls');
      if (ctrl) ctrl.style.display = 'block';
      _kfPhotoOffsetX = 50; _kfPhotoOffsetY = 50; _kfPhotoScale = 100;
      _kfApplyCrop();
    };
    reader.readAsDataURL(file);
  };

  window.kfSaveProfile = function() {
    var user = auth.currentUser; if (!user) return;
    var ni = document.getElementById('kfNicknameInput');
    var nickname = ni ? ni.value.trim().slice(0, 30) : '';
    var upload = document.getElementById('kfAvatarUpload');
    var preview = document.getElementById('kfProfilePreview');

    function doSave(avatarDataUrl) {
      if (avatarDataUrl) {
        localStorage.setItem('kf_avatar_' + user.uid, avatarDataUrl);
      }
      return db.collection('users').doc(user.uid).set({ nickname: nickname, updatedAt: Date.now() }, { merge: true }).then(function() {
        // Actualizar todos los avatares con la nueva imagen
        var finalUrl = avatarDataUrl || _kfAvatarUrl(user, nickname);
        ['kfAvatarImg','kfMenuAvatarImg','kfProfilePreview'].forEach(function(id) {
          var el = document.getElementById(id); if (el) el.src = finalUrl;
        });
        var nm = document.getElementById('kfMenuName'); if (nm) nm.textContent = nickname || user.displayName || 'Kit Finder User';
        if (typeof closeInfo === 'function') closeInfo();
      });
    }

    if (upload && upload.files[0]) {
      var reader = new FileReader();
      reader.onload = function(e) {
        // Crear canvas para recortar según la posición actual del crop
        var img = new Image();
        img.onload = function() {
          var size = 200;
          var canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          ctx.beginPath();
          ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
          ctx.clip();
          // Calcular offset del crop
          var scale = _kfPhotoScale / 100;
          var sw = img.width / scale, sh = img.height / scale;
          var sx = (_kfPhotoOffsetX / 100) * (img.width - sw);
          var sy = (_kfPhotoOffsetY / 100) * (img.height - sh);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          doSave(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(upload.files[0]);
    } else {
      doSave(null);
    }
  };

  // ── Crop controls — drag interactivo ─────────────────────────────────────────
  var _kfPhotoOffsetX = 50, _kfPhotoOffsetY = 50, _kfPhotoScale = 100;
  function _kfApplyCrop() {
    var img = document.getElementById('kfProfilePreview'); if (!img) return;
    img.style.objectPosition = _kfPhotoOffsetX + '% ' + _kfPhotoOffsetY + '%';
    img.style.width  = _kfPhotoScale + '%';
    img.style.height = _kfPhotoScale + '%';
  }
  window.kfZoomPhoto = function(dz) {
    _kfPhotoScale = Math.max(100, Math.min(200, _kfPhotoScale + dz));
    _kfApplyCrop();
  };

  // Drag interactivo sobre el avatar
  (function() {
    var isDragging = false, startX, startY, startOX, startOY;
    function getWrap() { return document.getElementById('kfAvatarCropWrap'); }
    function onDown(e) {
      var wrap = getWrap(); if (!wrap) return;
      var img = document.getElementById('kfProfilePreview'); if (!img || !img.src || img.src.indexOf('data:')===-1) return;
      isDragging = true;
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startOX = _kfPhotoOffsetX; startOY = _kfPhotoOffsetY;
      wrap.style.cursor = 'grabbing';
      e.preventDefault();
    }
    function onMove(e) {
      if (!isDragging) return;
      var cx = e.touches ? e.touches[0].clientX : e.clientX;
      var cy = e.touches ? e.touches[0].clientY : e.clientY;
      var dx = (cx - startX) * 0.3;
      var dy = (cy - startY) * 0.3;
      _kfPhotoOffsetX = Math.max(0, Math.min(100, startOX - dx));
      _kfPhotoOffsetY = Math.max(0, Math.min(100, startOY - dy));
      _kfApplyCrop();
      e.preventDefault();
    }
    function onUp() {
      isDragging = false;
      var wrap = getWrap(); if (wrap) wrap.style.cursor = 'grab';
    }
    document.addEventListener('mousedown', function(e) { if (e.target && e.target.id === 'kfProfilePreview') onDown(e); });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchstart', function(e) { if (e.target && e.target.id === 'kfProfilePreview') onDown(e); }, {passive:false});
    document.addEventListener('touchmove', function(e) { if (isDragging) onMove(e); }, {passive:false});
    document.addEventListener('touchend', onUp);
  })();

  // ── Settings page ─────────────────────────────────────────────────────────────
  // Solo idiomas con traducción completa de toda la interfaz.
  // Para añadir más idiomas, completa primero las traducciones en KF_TRANSLATIONS.
  var KF_LANGUAGES = [
    { code:'en', label:'English' },
    { code:'es', label:'Español' }
  ];

  var _kfLangDdOpen = false, _kfCurrencyDdOpen = false;

  window.kfOpenSettings = function() {
    var cur = (typeof currentCountry !== 'undefined' && currentCountry) ? currentCountry : { flag:'🌍', currency:'EUR', name:'Euro' };
    var lbl = document.getElementById('kfCurrencyLabel');
    var _cnames = (typeof _CURRENCY_NAMES !== 'undefined') ? _CURRENCY_NAMES : {};
    if (lbl) lbl.textContent = cur.currency + ' - ' + (_cnames[cur.currency] || cur.name);
    var lang = KF_LANGUAGES.find(function(l) { return l.code === (localStorage.getItem('kf_lang') || 'en'); }) || KF_LANGUAGES[0];
    var langLbl = document.getElementById('kfLangLabel');
    if (langLbl) langLbl.textContent = lang.label;
    ['kfCurrencyDd','kfLangDd'].forEach(function(id) { var el=document.getElementById(id); if(el) el.style.display='none'; });
    _kfCurrencyDdOpen = false; _kfLangDdOpen = false;
    // Show save confirmation if exists
    var saveMsg = document.getElementById('kfSettingsSaveMsg');
    if (saveMsg) saveMsg.style.display = 'none';
    if (typeof showInfo === 'function') showInfo('settings', { preventDefault: function() {} });
  };

  window.kfSaveSettings = function() {
    // Currency already saved on selection, just confirm
    var saveMsg = document.getElementById('kfSettingsSaveMsg');
    if (saveMsg) { saveMsg.style.display = 'block'; setTimeout(function(){ saveMsg.style.display='none'; }, 2000); }
    // Apply language to entire page
    var langCode = localStorage.getItem('kf_lang') || 'en';
    _kfApplyLanguage(langCode);
  };

  window.kfToggleCurrencyDd = function() {
    var dd = document.getElementById('kfCurrencyDd'); if (!dd) return;
    _kfCurrencyDdOpen = !_kfCurrencyDdOpen;
    dd.style.display = _kfCurrencyDdOpen ? 'block' : 'none';
    if (_kfCurrencyDdOpen) { _kfBuildCurrencyDd(''); setTimeout(function(){ var s=document.getElementById('kfCurrencySearch');if(s)s.focus();},50); }
  };
  window.kfFilterCurrencyDd = function(val) { _kfBuildCurrencyDd(val); };

  function _kfBuildCurrencyDd(filter) {
    var list = document.getElementById('kfCurrencyDdList'); if (!list || typeof COUNTRIES === 'undefined') return;
    var cur = (typeof currentCountry !== 'undefined' && currentCountry) ? currentCountry.currency : 'EUR';
    var CNAMES = (typeof _CURRENCY_NAMES !== 'undefined') ? _CURRENCY_NAMES : {};
    var seen = {}, unique = [];
    COUNTRIES.forEach(function(c) { if (!seen[c.currency]) { seen[c.currency]=1; unique.push(c); } });
    var filtered = filter ? unique.filter(function(c){ return (c.currency+' '+(CNAMES[c.currency]||c.name)).toLowerCase().includes(filter.toLowerCase()); }) : unique;
    list.innerHTML = '';
    filtered.sort(function(a,b){ return a.currency.localeCompare(b.currency); }).forEach(function(c) {
      var opt = document.createElement('div');
      opt.className = 'kf-settings-dd-opt' + (c.currency === cur ? ' active' : '');
      var cname = CNAMES[c.currency] || c.name;
      opt.textContent = c.currency + ' - ' + cname;
      opt.onclick = function() {
        if (typeof currentCountry !== 'undefined') {
          currentCountry = c; localStorage.setItem('kf_country', JSON.stringify(c));
          ['countryFlag','countryFlag2'].forEach(function(id){ var el=document.getElementById(id);if(el)el.textContent=c.currency; });
          if (typeof applyFilters==='function') applyFilters();
          if (typeof updateHGPrices==='function') updateHGPrices();
        }
        var lbl2 = document.getElementById('kfCurrencyLabel'); if(lbl2) lbl2.textContent = c.currency + ' - ' + cname;
        var lbl3 = document.getElementById('kfCurrencyLabel'); if(lbl3) lbl3.textContent = c.currency + ' - ' + cname;
        var dd2=document.getElementById('kfCurrencyDd');if(dd2)dd2.style.display='none';
        _kfCurrencyDdOpen=false;
      };
      list.appendChild(opt);
    });
  }

  window.kfToggleLangDd = function() {
    var dd = document.getElementById('kfLangDd'); if (!dd) return;
    _kfLangDdOpen = !_kfLangDdOpen;
    dd.style.display = _kfLangDdOpen ? 'block' : 'none';
    if (_kfLangDdOpen) _kfBuildLangDd();
  };

  function _kfBuildLangDd() {
    var list = document.getElementById('kfLangDdList'); if (!list) return;
    var cur = localStorage.getItem('kf_lang') || 'en';
    list.innerHTML = '';
    KF_LANGUAGES.forEach(function(l) {
      var opt = document.createElement('div');
      opt.className = 'kf-settings-dd-opt' + (l.code === cur ? ' active' : '');
      opt.textContent = l.label;
      opt.onclick = function() {
        localStorage.setItem('kf_lang', l.code);
        var lbl2=document.getElementById('kfLangLabel');if(lbl2)lbl2.textContent=l.label;
        var dd2=document.getElementById('kfLangDd');if(dd2)dd2.style.display='none';
        _kfLangDdOpen=false;
        _kfApplyLanguage(l.code);
      };
      list.appendChild(opt);
    });
  }

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#kfCurrencyDropBtn') && !e.target.closest('#kfCurrencyDd')) {
      var dd=document.getElementById('kfCurrencyDd');if(dd)dd.style.display='none';_kfCurrencyDdOpen=false;
    }
    if (!e.target.closest('#kfLangDropBtn') && !e.target.closest('#kfLangDd')) {
      var dd=document.getElementById('kfLangDd');if(dd)dd.style.display='none';_kfLangDdOpen=false;
    }
  });

  // ── Language translations system ─────────────────────────────────────────────
  // Approach: store language preference and reload page to apply translations
  // This avoids the bug where switching between languages gets stuck
  
  var KF_TRANSLATIONS = {
    en: {
      // Search
      'search_placeholder': 'Search football shirts (team, player, brand…)',
      'search_btn': 'Search',
      'search_by_photo': 'Search by photo',
      // Landing
      'landing_title_1': 'Find any',
      'landing_title_2': 'football shirt',
      'landing_title_3': 'in one search',
      'landing_subtitle': 'Search over 100,000 vintage, retro & classic football shirts across 80+ specialist stores',
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
      "nav_world_cup": "World Cup Kits",
      "nav_why_kf": "Why Kit Finder?",
      "menu_match_worn": "Match Worn/Issued",
      "menu_world_cup": "World Cup Kits",
      "menu_why_kf": "Why Kit Finder?",
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
      "wc_hero_title": "World Cup Football Shirts",
      "wc_hero_sub": "Browse every qualified nation's kit — from iconic vintage World Cup jerseys to the latest 2026 shirts",
      "wc_hero_cta": "Explore all 48 nations",
      "loading_text": "Searching across 80+ stores",
      "clear_all_filters": "Clear all filters",
      "load_more_shirts": "Load more shirts",
      "search_shirts": "Search shirts",
      "filter_national_teams": "National teams",
      "why_h2_photo": "🔍 Search by Photo",
      "why_h2_original": "✅ 100% Original — Zero Fakes",
      "why_h2_prices": "💰 Best Prices, Guaranteed",
      "why_h2_global": "🌍 Global Coverage",
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
    },
    es: {
      'search_placeholder': 'Busca camisetas de fútbol (equipo, jugador, marca…)',
      'search_btn': 'Buscar',
      'search_by_photo': 'Buscar por foto',
      'landing_title_1': 'Encuentra cualquier',
      'landing_title_2': 'camiseta de fútbol',
      'landing_title_3': 'en una sola búsqueda',
      'landing_subtitle': 'Más de 100.000 camisetas vintage, retro y clásicas en más de 80 tiendas especializadas',
      'fg_title': 'Gigantes del Fútbol',
      'fg_subtitle': 'Explora camisetas vintage y retro de los mejores clubes del mundo — Barcelona, Real Madrid, Bayern Munich, Liverpool, Man United y más',
      'results_count_shirts': 'camisetas encontradas',
      'results_count_shirt': 'camiseta encontrada',
      'no_shirts': 'No se han encontrado camisetas',
      'no_shirts_sub': 'Prueba a ajustar los filtros o el término de búsqueda',
      'view_in_store': 'Ver en tienda',
      'load_more': 'Cargar más',
      'clear_all': 'Borrar todo',
      'sort_relevance': 'Relevancia', 'sort_price_asc': 'Precio: menor a mayor',
      'sort_price_desc': 'Precio: mayor a menor', 'sort_newest': 'Más reciente', 'sort_oldest': 'Más antiguo',
      'filter_league': 'Liga', 'filter_version': 'Versión', 'filter_size': 'Talla',
      'filter_brand': 'Marca', 'filter_decade': 'Década', 'filter_price': 'Precio',
      'filter_home': 'Local', 'filter_away': 'Visitante', 'filter_third': 'Tercera',
      'filter_fourth': 'Cuarta', 'filter_gk': 'Portero', 'filter_other': 'Otro',
      'nav_new_in': 'Nuevas', 'nav_blog': 'La Grada',
      'menu_profile': 'Perfil', 'menu_settings': 'Configuración',
      'menu_favs': 'Mis favoritos', 'menu_signout': 'Cerrar sesión',
      'profile_title': 'Editar perfil', 'profile_nickname': 'Apodo',
      'profile_placeholder': '¿Cómo te llamamos?', 'profile_save': 'Guardar cambios',
      'profile_drag': 'Arrastra para reposicionar · Pellizca para hacer zoom',
      'profile_tap_photo': 'Toca la cámara para cambiar la foto',
      'settings_title': 'Configuración', 'settings_currency': '💱 Divisa',
      'settings_currency_desc': 'Los precios se mostrarán en la divisa seleccionada.',
      'settings_lang': '🌐 Idioma', 'settings_lang_desc': 'Elige el idioma de la interfaz.',
      'settings_save': 'Guardar ajustes', 'settings_saved': '✓ ¡Guardado!',
      'favs_empty': 'Aún no hay camisetas guardadas.',
      'favs_empty_sub': 'Pulsa el corazón en cualquier camiseta para guardarla aquí.',
      'back': '← Volver a Kit Finder', 'signin': 'Iniciar sesión',
      "nav_shop_league": "Por Liga",
      "nav_shop_country": "Por País",
      "nav_match_worn": "Match Worn",
      "nav_world_cup": "Camisetas del Mundial",
      "nav_why_kf": "¿Por qué Kit Finder?",
      "menu_match_worn": "Match Worn",
      "menu_world_cup": "Camisetas del Mundial",
      "menu_why_kf": "¿Por qué Kit Finder?",
      "menu_blog": "La Grada",
      "why_kf_title": "¿Por qué Kit Finder?",
      "about_title": "Sobre Nosotros",
      "privacy_title": "Política de Privacidad",
      "terms_title": "Términos de Uso",
      "affiliate_title": "Divulgación de Afiliados",
      "footer_about": "Sobre nosotros",
      "footer_privacy": "Política de privacidad",
      "footer_terms": "Términos de uso",
      "footer_affiliate": "Divulgación de afiliados",
      "hg_title": "Los Santos Griales",
      "wc_hero_title": "Camisetas del Mundial",
      "wc_hero_sub": "Explora la camiseta de cada selección clasificada — desde iconos del fútbol vintage hasta las últimas camisetas 2026",
      "wc_hero_cta": "Explorar las 48 selecciones",
      "loading_text": "Buscando en más de 80 tiendas",
      "clear_all_filters": "Borrar todos los filtros",
      "load_more_shirts": "Cargar más camisetas",
      "search_shirts": "Buscar camisetas",
      "filter_national_teams": "Selecciones nacionales",
      "why_h2_photo": "🔍 Buscar por Foto",
      "why_h2_original": "✅ 100% Original — Cero Falsificaciones",
      "why_h2_prices": "💰 Mejores Precios, Garantizados",
      "why_h2_global": "🌍 Cobertura Global",
      "about_h2_authentic": "100% Auténtico — Cero Falsificaciones",
      "about_h2_photo": "Buscar por Foto",
      "about_h2_best": "El Mejor Lugar para Encontrar Camisetas Vintage al Mejor Precio",
      "priv_h2_1": "1. Información que Recopilamos",
      "priv_h2_2": "2. Cómo Usamos tu Información",
      "priv_h2_3": "3. Cookies",
      "priv_h2_4": "4. Enlace a Terceros",
      "priv_h2_5": "5. Divulgación de Afiliados",
      "priv_h2_6": "6. Seguridad de Datos",
      "priv_h2_7": "7. Privacidad de Menores",
      "priv_h2_8": "8. Cambios en esta Política",
      "priv_h2_9": "9. Contáctanos",
      "terms_h2_1": "1. Aceptación de Términos",
      "terms_h2_2": "2. Descripción del Servicio",
      "terms_h2_3": "3. Uso del Sitio Web",
      "terms_h2_4": "4. Propiedad Intelectual",
      "terms_h2_5": "5. Enlace a Terceros",
      "terms_h2_6": "6. Exactitud de la Información",
      "terms_h2_7": "7. Relaciones con Afiliados",
      "terms_h2_8": "8. Renuncia de Garantías",
      "terms_h2_9": "9. Limitación de Responsabilidad",
      "terms_h2_10": "10. Cambios en los Términos",
      "terms_h2_11": "11. Ley Aplicable",
      "terms_h2_12": "12. Contacto",
      "aff_h2_1": "1. Cómo Funciona",
      "aff_h2_2": "2. ¿Afecta al Precio?",
      "aff_h2_3": "3. Nuestro Compromiso Contigo",
      "aff_h2_4": "4. ¿Qué Programas Usamos?",
      "aff_h2_5": "5. Transparencia",
      "aff_h2_6": "6. Preguntas"
    },
    de: {
      'search_placeholder': 'Fußballtrikots suchen (Team, Spieler, Marke…)',
      'search_btn': 'Suchen', 'search_by_photo': 'Per Foto suchen',
      'landing_title_1': 'Jedes', 'landing_title_2': 'Fußballtrikot', 'landing_title_3': 'in einer Suche',
      'landing_subtitle': 'Über 100.000 Vintage-, Retro- und klassische Trikots in 80+ Fachgeschäften',
      'fg_title': 'Fußball-Giganten',
      'fg_subtitle': 'Vintage & Retro Trikots der weltbesten Vereine — Barcelona, Real Madrid, Bayern München, Liverpool, Man United und mehr',
      'no_shirts': 'Keine Trikots gefunden', 'no_shirts_sub': 'Filter oder Suchbegriff anpassen',
      'view_in_store': 'Im Shop ansehen', 'load_more': 'Mehr laden', 'clear_all': 'Alle löschen',
      'sort_relevance': 'Relevanz', 'sort_price_asc': 'Preis: aufsteigend', 'sort_price_desc': 'Preis: absteigend',
      'sort_newest': 'Neueste', 'sort_oldest': 'Älteste',
      'menu_profile': 'Profil', 'menu_settings': 'Einstellungen', 'menu_favs': 'Meine Favoriten', 'menu_signout': 'Abmelden',
      'profile_title': 'Profil bearbeiten', 'profile_nickname': 'Spitzname',
      'profile_placeholder': 'Wie sollen wir dich nennen?', 'profile_save': 'Änderungen speichern',
      'settings_title': 'Einstellungen', 'settings_currency': '💱 Währung',
      'settings_lang': '🌐 Sprache', 'settings_save': 'Einstellungen speichern', 'settings_saved': '✓ Gespeichert!',
      'back': '← Zurück zu Kit Finder', 'signin': 'Anmelden',
      "nav_shop_league": "Nach Liga",
      "nav_shop_country": "Nach Land",
      "nav_match_worn": "Match Worn",
      "nav_world_cup": "WM-Trikots",
      "nav_why_kf": "Warum Kit Finder?",
      "menu_match_worn": "Match Worn",
      "menu_world_cup": "WM-Trikots",
      "menu_why_kf": "Warum Kit Finder?",
      "menu_blog": "La Grada",
      "why_kf_title": "Warum Kit Finder?",
      "about_title": "Über uns",
      "privacy_title": "Datenschutzerklärung",
      "terms_title": "Nutzungsbedingungen",
      "affiliate_title": "Partnerprogramm-Hinweis",
      "footer_about": "Über uns",
      "footer_privacy": "Datenschutz",
      "footer_terms": "Nutzungsbedingungen",
      "footer_affiliate": "Partnerprogramm",
      "hg_title": "Holy Grails",
      "wc_hero_title": "WM-Trikots",
      "wc_hero_sub": "Entdecke das Trikot jeder qualifizierten Nation — von ikonischen Vintage-WM-Trikots bis zu den neuesten 2026-Shirts",
      "wc_hero_cta": "Alle 48 Nationen erkunden",
      "loading_text": "Suche in 80+ Shops",
      "clear_all_filters": "Alle Filter löschen",
      "load_more_shirts": "Mehr Trikots laden",
      "search_shirts": "Trikots suchen",
      "filter_national_teams": "Nationalmannschaften",
      "why_h2_photo": "🔍 Per Foto suchen",
      "why_h2_original": "✅ 100% Original — Keine Fakes",
      "why_h2_prices": "💰 Beste Preise, garantiert",
      "why_h2_global": "🌍 Weltweite Abdeckung",
      "about_h2_authentic": "100% Authentisch — Keine Fakes",
      "about_h2_photo": "Per Foto suchen",
      "about_h2_best": "Der beste Ort für Vintage-Trikots zum besten Preis",
      "priv_h2_1": "1. Daten, die wir erheben",
      "priv_h2_2": "2. Wie wir deine Daten nutzen",
      "priv_h2_3": "3. Cookies",
      "priv_h2_4": "4. Links zu Dritten",
      "priv_h2_5": "5. Affiliate-Offenlegung",
      "priv_h2_6": "6. Datensicherheit",
      "priv_h2_7": "7. Datenschutz für Minderjährige",
      "priv_h2_8": "8. Änderungen dieser Richtlinie",
      "priv_h2_9": "9. Kontakt",
      "terms_h2_1": "1. Annahme der Bedingungen",
      "terms_h2_2": "2. Beschreibung des Dienstes",
      "terms_h2_3": "3. Nutzung der Website",
      "terms_h2_4": "4. Geistiges Eigentum",
      "terms_h2_5": "5. Links zu Dritten",
      "terms_h2_6": "6. Richtigkeit der Informationen",
      "terms_h2_7": "7. Affiliate-Beziehungen",
      "terms_h2_8": "8. Haftungsausschluss",
      "terms_h2_9": "9. Haftungsbeschränkung",
      "terms_h2_10": "10. Änderungen der Bedingungen",
      "terms_h2_11": "11. Anwendbares Recht",
      "terms_h2_12": "12. Kontakt",
      "aff_h2_1": "1. Wie es funktioniert",
      "aff_h2_2": "2. Beeinflusst es den Preis?",
      "aff_h2_3": "3. Unser Versprechen an dich",
      "aff_h2_4": "4. Welche Programme nutzen wir?",
      "aff_h2_5": "5. Transparenz",
      "aff_h2_6": "6. Fragen"
    },
    fr: {
      'search_placeholder': 'Rechercher des maillots (équipe, joueur, marque…)',
      'search_btn': 'Rechercher', 'search_by_photo': 'Rechercher par photo',
      'landing_title_1': 'Trouvez n\'importe quel', 'landing_title_2': 'maillot de foot', 'landing_title_3': 'en une seule recherche',
      'landing_subtitle': 'Plus de 100 000 maillots vintage, rétro et classiques dans 80+ boutiques spécialisées',
      'fg_title': 'Géants du Football',
      'fg_subtitle': 'Parcourez les maillots vintage et rétro des plus grands clubs — Barcelone, Real Madrid, Bayern, Liverpool, Man United et plus',
      'no_shirts': 'Aucun maillot trouvé', 'no_shirts_sub': 'Essayez d\'ajuster vos filtres ou votre terme de recherche',
      'view_in_store': 'Voir en boutique', 'load_more': 'Charger plus', 'clear_all': 'Tout effacer',
      'sort_relevance': 'Pertinence', 'sort_price_asc': 'Prix croissant', 'sort_price_desc': 'Prix décroissant',
      'sort_newest': 'Plus récent', 'sort_oldest': 'Plus ancien',
      'menu_profile': 'Profil', 'menu_settings': 'Paramètres', 'menu_favs': 'Mes favoris', 'menu_signout': 'Déconnexion',
      'profile_title': 'Modifier le profil', 'profile_nickname': 'Surnom',
      'profile_placeholder': 'Comment vous appelle-t-on ?', 'profile_save': 'Enregistrer',
      'settings_title': 'Paramètres', 'settings_currency': '💱 Devise',
      'settings_lang': '🌐 Langue', 'settings_save': 'Sauvegarder', 'settings_saved': '✓ Sauvegardé!',
      'back': '← Retour à Kit Finder', 'signin': 'Se connecter',
      "nav_shop_league": "Par Ligue",
      "nav_shop_country": "Par Pays",
      "nav_match_worn": "Match Worn",
      "nav_world_cup": "Maillots Coupe du Monde",
      "nav_why_kf": "Pourquoi Kit Finder ?",
      "menu_match_worn": "Match Worn",
      "menu_world_cup": "Maillots Coupe du Monde",
      "menu_why_kf": "Pourquoi Kit Finder ?",
      "menu_blog": "La Grada",
      "why_kf_title": "Pourquoi Kit Finder ?",
      "about_title": "À propos",
      "privacy_title": "Politique de confidentialité",
      "terms_title": "Conditions d'utilisation",
      "affiliate_title": "Divulgation d'affiliation",
      "footer_about": "À propos",
      "footer_privacy": "Confidentialité",
      "footer_terms": "Conditions d'utilisation",
      "footer_affiliate": "Affiliation",
      "hg_title": "Holy Grails",
      "wc_hero_title": "Maillots de Coupe du Monde",
      "wc_hero_sub": "Parcourez le maillot de chaque nation qualifiée — des icônes vintage aux dernières tenues 2026",
      "wc_hero_cta": "Explorer les 48 nations",
      "loading_text": "Recherche dans 80+ boutiques",
      "clear_all_filters": "Effacer tous les filtres",
      "load_more_shirts": "Charger plus de maillots",
      "search_shirts": "Rechercher des maillots",
      "filter_national_teams": "Équipes nationales",
      "why_h2_photo": "🔍 Rechercher par photo",
      "why_h2_original": "✅ 100% Originaux — Zéro contrefaçon",
      "why_h2_prices": "💰 Meilleurs prix, garantis",
      "why_h2_global": "🌍 Couverture mondiale",
      "about_h2_authentic": "100% Authentiques — Zéro contrefaçon",
      "about_h2_photo": "Rechercher par photo",
      "about_h2_best": "Le meilleur endroit pour trouver des maillots vintage au meilleur prix",
      "priv_h2_1": "1. Informations collectées",
      "priv_h2_2": "2. Utilisation de vos données",
      "priv_h2_3": "3. Cookies",
      "priv_h2_4": "4. Liens vers des tiers",
      "priv_h2_5": "5. Divulgation d'affiliation",
      "priv_h2_6": "6. Sécurité des données",
      "priv_h2_7": "7. Confidentialité des mineurs",
      "priv_h2_8": "8. Modifications de la politique",
      "priv_h2_9": "9. Nous contacter",
      "terms_h2_1": "1. Acceptation des conditions",
      "terms_h2_2": "2. Description du service",
      "terms_h2_3": "3. Utilisation du site",
      "terms_h2_4": "4. Propriété intellectuelle",
      "terms_h2_5": "5. Liens vers des tiers",
      "terms_h2_6": "6. Exactitude des informations",
      "terms_h2_7": "7. Relations d'affiliation",
      "terms_h2_8": "8. Exclusion de garanties",
      "terms_h2_9": "9. Limitation de responsabilité",
      "terms_h2_10": "10. Modifications des conditions",
      "terms_h2_11": "11. Droit applicable",
      "terms_h2_12": "12. Contact",
      "aff_h2_1": "1. Comment ça fonctionne",
      "aff_h2_2": "2. Cela affecte-t-il le prix ?",
      "aff_h2_3": "3. Notre engagement envers vous",
      "aff_h2_4": "4. Quels programmes utilisons-nous ?",
      "aff_h2_5": "5. Transparence",
      "aff_h2_6": "6. Questions"
    },
    it: {
      'search_placeholder': 'Cerca maglie (squadra, giocatore, marca…)',
      'search_btn': 'Cerca', 'search_by_photo': 'Cerca per foto',
      'landing_title_1': 'Trova qualsiasi', 'landing_title_2': 'maglia da calcio', 'landing_title_3': 'in un\'unica ricerca',
      'landing_subtitle': 'Oltre 100.000 maglie vintage, retro e classiche in 80+ negozi specializzati',
      'fg_title': 'Giganti del Calcio',
      'fg_subtitle': 'Esplora maglie vintage e retrò dei migliori club — Barcelona, Real Madrid, Bayern, Liverpool, Man United e altri',
      'no_shirts': 'Nessuna maglia trovata', 'no_shirts_sub': 'Prova ad aggiustare i filtri',
      'view_in_store': 'Vedi nel negozio', 'load_more': 'Carica altro', 'clear_all': 'Cancella tutto',
      'sort_relevance': 'Rilevanza', 'sort_price_asc': 'Prezzo crescente', 'sort_price_desc': 'Prezzo decrescente',
      'sort_newest': 'Più recente', 'sort_oldest': 'Più vecchio',
      'menu_profile': 'Profilo', 'menu_settings': 'Impostazioni', 'menu_favs': 'I miei preferiti', 'menu_signout': 'Esci',
      'profile_title': 'Modifica profilo', 'profile_save': 'Salva modifiche',
      'settings_title': 'Impostazioni', 'settings_save': 'Salva impostazioni', 'settings_saved': '✓ Salvato!',
      'back': '← Torna a Kit Finder', 'signin': 'Accedi',
      "nav_shop_league": "Per Lega",
      "nav_shop_country": "Per Paese",
      "nav_match_worn": "Match Worn",
      "nav_world_cup": "Maglie Mondiali",
      "nav_why_kf": "Perché Kit Finder?",
      "menu_match_worn": "Match Worn",
      "menu_world_cup": "Maglie Mondiali",
      "menu_why_kf": "Perché Kit Finder?",
      "menu_blog": "La Grada",
      "why_kf_title": "Perché Kit Finder?",
      "about_title": "Chi siamo",
      "privacy_title": "Informativa sulla privacy",
      "terms_title": "Termini di utilizzo",
      "affiliate_title": "Informativa sull'affiliazione",
      "footer_about": "Chi siamo",
      "footer_privacy": "Privacy",
      "footer_terms": "Termini di utilizzo",
      "footer_affiliate": "Affiliazione",
      "hg_title": "Holy Grails",
      "wc_hero_title": "Maglie dei Mondiali",
      "wc_hero_sub": "Esplora la maglia di ogni nazione qualificata — dalle icone vintage alle ultime maglie 2026",
      "wc_hero_cta": "Esplora tutte le 48 nazioni",
      "loading_text": "Ricerca in 80+ negozi",
      "clear_all_filters": "Cancella tutti i filtri",
      "load_more_shirts": "Carica altre maglie",
      "search_shirts": "Cerca maglie",
      "filter_national_teams": "Nazionali",
      "why_h2_photo": "🔍 Cerca per foto",
      "why_h2_original": "✅ 100% Originali — Zero falsi",
      "why_h2_prices": "💰 Prezzi migliori, garantiti",
      "why_h2_global": "🌍 Copertura globale",
      "about_h2_authentic": "100% Autentiche — Zero falsi",
      "about_h2_photo": "Cerca per foto",
      "about_h2_best": "Il posto migliore per maglie vintage al miglior prezzo",
      "priv_h2_1": "1. Dati raccolti",
      "priv_h2_2": "2. Uso delle informazioni",
      "priv_h2_3": "3. Cookie",
      "priv_h2_4": "4. Link a terzi",
      "priv_h2_5": "5. Divulgazione affiliati",
      "priv_h2_6": "6. Sicurezza dei dati",
      "priv_h2_7": "7. Privacy dei minori",
      "priv_h2_8": "8. Modifiche alla politica",
      "priv_h2_9": "9. Contattaci",
      "terms_h2_1": "1. Accettazione dei termini",
      "terms_h2_2": "2. Descrizione del servizio",
      "terms_h2_3": "3. Uso del sito",
      "terms_h2_4": "4. Proprietà intellettuale",
      "terms_h2_5": "5. Link a terzi",
      "terms_h2_6": "6. Accuratezza delle informazioni",
      "terms_h2_7": "7. Relazioni di affiliazione",
      "terms_h2_8": "8. Esclusione di garanzie",
      "terms_h2_9": "9. Limitazione di responsabilità",
      "terms_h2_10": "10. Modifiche ai termini",
      "terms_h2_11": "11. Legge applicabile",
      "terms_h2_12": "12. Contatto",
      "aff_h2_1": "1. Come funziona",
      "aff_h2_2": "2. Influisce sul prezzo?",
      "aff_h2_3": "3. Il nostro impegno verso di te",
      "aff_h2_4": "4. Quali programmi usiamo?",
      "aff_h2_5": "5. Trasparenza",
      "aff_h2_6": "6. Domande"
    },
    pt: {
      'search_placeholder': 'Pesquisar camisolas (equipa, jogador, marca…)',
      'search_btn': 'Pesquisar', 'search_by_photo': 'Pesquisar por foto',
      'fg_title': 'Gigantes do Futebol',
      'no_shirts': 'Nenhuma camisola encontrada', 'view_in_store': 'Ver na loja',
      'menu_profile': 'Perfil', 'menu_settings': 'Definições', 'menu_signout': 'Sair',
      'profile_save': 'Guardar alterações', 'settings_save': 'Guardar', 'settings_saved': '✓ Guardado!',
      'back': '← Voltar ao Kit Finder', 'signin': 'Entrar',
      "nav_shop_league": "Por Liga",
      "nav_shop_country": "Por País",
      "nav_match_worn": "Match Worn",
      "nav_world_cup": "Camisolas Mundial",
      "nav_why_kf": "Porquê Kit Finder?",
      "menu_match_worn": "Match Worn",
      "menu_world_cup": "Camisolas Mundial",
      "menu_why_kf": "Porquê Kit Finder?",
      "menu_blog": "La Grada",
      "why_kf_title": "Porquê Kit Finder?",
      "about_title": "Sobre nós",
      "privacy_title": "Política de Privacidade",
      "terms_title": "Termos de Utilização",
      "affiliate_title": "Divulgação de Afiliados",
      "footer_about": "Sobre nós",
      "footer_privacy": "Privacidade",
      "footer_terms": "Termos de utilização",
      "footer_affiliate": "Afiliados",
      "hg_title": "Holy Grails",
      "wc_hero_title": "Camisolas do Mundial",
      "wc_hero_sub": "Explora a camisola de cada nação qualificada — de ícones vintage às últimas camisolas 2026",
      "wc_hero_cta": "Explorar as 48 nações",
      "loading_text": "A pesquisar em 80+ lojas",
      "clear_all_filters": "Limpar todos os filtros",
      "load_more_shirts": "Carregar mais camisolas",
      "search_shirts": "Pesquisar camisolas",
      "filter_national_teams": "Seleções nacionais",
      "why_h2_photo": "🔍 Pesquisar por foto",
      "why_h2_original": "✅ 100% Originais — Zero falsificações",
      "why_h2_prices": "💰 Melhores preços, garantidos",
      "why_h2_global": "🌍 Cobertura global",
      "about_h2_authentic": "100% Autênticas — Zero falsificações",
      "about_h2_photo": "Pesquisar por foto",
      "about_h2_best": "O melhor lugar para camisolas vintage ao melhor preço",
      "priv_h2_1": "1. Informação que recolhemos",
      "priv_h2_2": "2. Como usamos a sua informação",
      "priv_h2_3": "3. Cookies",
      "priv_h2_4": "4. Links para terceiros",
      "priv_h2_5": "5. Divulgação de afiliados",
      "priv_h2_6": "6. Segurança dos dados",
      "priv_h2_7": "7. Privacidade de menores",
      "priv_h2_8": "8. Alterações à política",
      "priv_h2_9": "9. Contacte-nos",
      "terms_h2_1": "1. Aceitação dos termos",
      "terms_h2_2": "2. Descrição do serviço",
      "terms_h2_3": "3. Utilização do site",
      "terms_h2_4": "4. Propriedade intelectual",
      "terms_h2_5": "5. Links para terceiros",
      "terms_h2_6": "6. Exactidão das informações",
      "terms_h2_7": "7. Relações de afiliação",
      "terms_h2_8": "8. Exclusão de garantias",
      "terms_h2_9": "9. Limitação de responsabilidade",
      "terms_h2_10": "10. Alterações aos termos",
      "terms_h2_11": "11. Lei aplicável",
      "terms_h2_12": "12. Contacto",
      "aff_h2_1": "1. Como funciona",
      "aff_h2_2": "2. Afecta o preço?",
      "aff_h2_3": "3. O nosso compromisso consigo",
      "aff_h2_4": "4. Que programas usamos?",
      "aff_h2_5": "5. Transparência",
      "aff_h2_6": "6. Perguntas"
    },
    nl: {
      'search_placeholder': 'Zoek voetbalshirts (team, speler, merk…)',
      'search_btn': 'Zoeken', 'fg_title': 'Voetbalgiganten',
      'no_shirts': 'Geen shirts gevonden', 'view_in_store': 'Bekijken in winkel',
      'menu_profile': 'Profiel', 'menu_settings': 'Instellingen', 'menu_signout': 'Uitloggen',
      'settings_save': 'Opslaan', 'settings_saved': '✓ Opgeslagen!',
      'back': '← Terug naar Kit Finder', 'signin': 'Inloggen',
      "nav_shop_league": "Per Competitie",
      "nav_shop_country": "Per Land",
      "nav_match_worn": "Match Worn",
      "nav_world_cup": "WK-shirts",
      "nav_why_kf": "Waarom Kit Finder?",
      "menu_match_worn": "Match Worn",
      "menu_world_cup": "WK-shirts",
      "menu_why_kf": "Waarom Kit Finder?",
      "menu_blog": "La Grada",
      "why_kf_title": "Waarom Kit Finder?",
      "about_title": "Over ons",
      "privacy_title": "Privacybeleid",
      "terms_title": "Gebruiksvoorwaarden",
      "affiliate_title": "Affiliate disclosure",
      "footer_about": "Over ons",
      "footer_privacy": "Privacy",
      "footer_terms": "Voorwaarden",
      "footer_affiliate": "Affiliate",
      "hg_title": "Holy Grails",
      "wc_hero_title": "WK-shirts",
      "wc_hero_sub": "Bekijk het shirt van elke gekwalificeerde natie — van iconische vintage WK-shirts tot de nieuwste 2026-shirts",
      "wc_hero_cta": "Verken alle 48 naties",
      "loading_text": "Zoeken in 80+ winkels",
      "clear_all_filters": "Alle filters wissen",
      "load_more_shirts": "Meer shirts laden",
      "search_shirts": "Shirts zoeken",
      "filter_national_teams": "Nationale teams",
      "why_h2_photo": "🔍 Zoeken op foto",
      "why_h2_original": "✅ 100% Origineel — Nul fakes",
      "why_h2_prices": "💰 Beste prijzen, gegarandeerd",
      "why_h2_global": "🌍 Wereldwijde dekking",
      "about_h2_authentic": "100% Authentiek — Nul fakes",
      "about_h2_photo": "Zoeken op foto",
      "about_h2_best": "De beste plek voor vintage shirts tegen de beste prijs",
      "priv_h2_1": "1. Verzamelde informatie",
      "priv_h2_2": "2. Gebruik van uw gegevens",
      "priv_h2_3": "3. Cookies",
      "priv_h2_4": "4. Links naar derden",
      "priv_h2_5": "5. Affiliate-openbaarmaking",
      "priv_h2_6": "6. Gegevensbeveiliging",
      "priv_h2_7": "7. Privacy van minderjarigen",
      "priv_h2_8": "8. Wijzigingen in het beleid",
      "priv_h2_9": "9. Neem contact op",
      "terms_h2_1": "1. Aanvaarding van voorwaarden",
      "terms_h2_2": "2. Beschrijving van de dienst",
      "terms_h2_3": "3. Gebruik van de website",
      "terms_h2_4": "4. Intellectuele eigendom",
      "terms_h2_5": "5. Links naar derden",
      "terms_h2_6": "6. Nauwkeurigheid van informatie",
      "terms_h2_7": "7. Affiliate-relaties",
      "terms_h2_8": "8. Uitsluiting van garanties",
      "terms_h2_9": "9. Beperking van aansprakelijkheid",
      "terms_h2_10": "10. Wijzigingen in de voorwaarden",
      "terms_h2_11": "11. Toepasselijk recht",
      "terms_h2_12": "12. Contact",
      "aff_h2_1": "1. Hoe het werkt",
      "aff_h2_2": "2. Beïnvloedt het de prijs?",
      "aff_h2_3": "3. Onze toezegging aan u",
      "aff_h2_4": "4. Welke programma's gebruiken we?",
      "aff_h2_5": "5. Transparantie",
      "aff_h2_6": "6. Vragen"
    },
    pl: {
      'search_placeholder': 'Szukaj koszulek (drużyna, zawodnik, marka…)',
      'search_btn': 'Szukaj', 'fg_title': 'Giganci Piłki Nożnej',
      'no_shirts': 'Nie znaleziono koszulek', 'view_in_store': 'Zobacz w sklepie',
      'menu_profile': 'Profil', 'menu_settings': 'Ustawienia', 'menu_signout': 'Wyloguj',
      'settings_save': 'Zapisz', 'settings_saved': '✓ Zapisano!',
      'back': '← Powrót do Kit Finder', 'signin': 'Zaloguj się',
      "nav_shop_league": "Wg ligi",
      "nav_shop_country": "Wg kraju",
      "nav_match_worn": "Match Worn",
      "nav_world_cup": "Koszulki MS",
      "nav_why_kf": "Dlaczego Kit Finder?",
      "menu_match_worn": "Match Worn",
      "menu_world_cup": "Koszulki MS",
      "menu_why_kf": "Dlaczego Kit Finder?",
      "menu_blog": "La Grada",
      "why_kf_title": "Dlaczego Kit Finder?",
      "about_title": "O nas",
      "privacy_title": "Polityka prywatnosci",
      "terms_title": "Regulamin",
      "affiliate_title": "Informacja o programie partnerskim",
      "footer_about": "O nas",
      "footer_privacy": "Prywatnosc",
      "footer_terms": "Regulamin",
      "footer_affiliate": "Program partnerski",
      "hg_title": "Holy Grails",
      "wc_hero_title": "Koszulki Mistrzostw Swiata",
      "wc_hero_sub": "Przegladaj koszulki kazdej zakwalifikowanej reprezentacji — od ikonicznych vintage po najnowsze koszulki 2026",
      "wc_hero_cta": "Przegladaj wszystkie 48 reprezentacji",
      "loading_text": "Szukanie w 80+ sklepach",
      "clear_all_filters": "Wyczysc wszystkie filtry",
      "load_more_shirts": "Zaladuj wiecej koszulek",
      "search_shirts": "Szukaj koszulek",
      "filter_national_teams": "Reprezentacje narodowe",
      "why_h2_photo": "🔍 Szukaj po zdjeciu",
      "why_h2_original": "✅ 100% Oryginalne — Zero podrobek",
      "why_h2_prices": "💰 Najlepsze ceny, gwarantowane",
      "why_h2_global": "🌍 Globalne pokrycie",
      "about_h2_authentic": "100% Autentyczne — Zero podrobek",
      "about_h2_photo": "Szukaj po zdjeciu",
      "about_h2_best": "Najlepsze miejsce na koszulki vintage w najlepszej cenie",
      "priv_h2_1": "1. Zbierane informacje",
      "priv_h2_2": "2. Jak uzywamy Twoich danych",
      "priv_h2_3": "3. Pliki cookie",
      "priv_h2_4": "4. Linki do stron trzecich",
      "priv_h2_5": "5. Ujawnienie afiliacji",
      "priv_h2_6": "6. Bezpieczenstwo danych",
      "priv_h2_7": "7. Prywatnosc nieletnich",
      "priv_h2_8": "8. Zmiany w polityce",
      "priv_h2_9": "9. Skontaktuj sie z nami",
      "terms_h2_1": "1. Akceptacja warunkow",
      "terms_h2_2": "2. Opis uslugi",
      "terms_h2_3": "3. Korzystanie ze strony",
      "terms_h2_4": "4. Wlasnosc intelektualna",
      "terms_h2_5": "5. Linki do stron trzecich",
      "terms_h2_6": "6. Dokladnosc informacji",
      "terms_h2_7": "7. Relacje afiliacyjne",
      "terms_h2_8": "8. Wylaczenie gwarancji",
      "terms_h2_9": "9. Ograniczenie odpowiedzialnosci",
      "terms_h2_10": "10. Zmiany warunkow",
      "terms_h2_11": "11. Obowiazujace prawo",
      "terms_h2_12": "12. Kontakt",
      "aff_h2_1": "1. Jak to dziala",
      "aff_h2_2": "2. Czy wplywa na cene?",
      "aff_h2_3": "3. Nasze zobowiazanie wobec Ciebie",
      "aff_h2_4": "4. Jakich programow uzywamy?",
      "aff_h2_5": "5. Przejrzystosc",
      "aff_h2_6": "6. Pytania"
    }
  };

  function _kfApplyLanguage(code) {
    var dict = KF_TRANSLATIONS[code] || KF_TRANSLATIONS['en'];
    // Apply to all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (!dict[key]) return;
      if (el.tagName === 'INPUT') {
        el.placeholder = dict[key];
        return;
      }
      // Si el elemento tiene hijos con su propio data-i18n, saltarlo:
      // los hijos se traducen individualmente (evita borrar clases CSS de hijos)
      if (el.querySelector && el.querySelector('[data-i18n]')) return;
      el.textContent = dict[key];
    });
    // Apply placeholders
    var searchInput = document.getElementById('landingSearch');
    if (searchInput && dict['search_placeholder']) searchInput.placeholder = dict['search_placeholder'];
    var searchInput2 = document.getElementById('resultsSearch');
    if (searchInput2 && dict['search_placeholder']) searchInput2.placeholder = dict['search_placeholder'];
    // Apply to elements with specific IDs / classes
    var fgTitle = document.querySelector('.fg-title');
    if (fgTitle && dict['fg_title']) fgTitle.textContent = dict['fg_title'];
    var fgSub = document.querySelector('.fg-subtitle');
    if (fgSub && dict['fg_subtitle']) fgSub.textContent = dict['fg_subtitle'];
    // Save button texts
    var searchBtns = document.querySelectorAll('.search-btn');
    searchBtns.forEach(function(btn) {
      if (dict['search_btn']) {
        // Keep the SVG icon, only change text node
        btn.childNodes.forEach(function(n) { if (n.nodeType===3 && n.textContent.trim()) n.textContent = ' ' + dict['search_btn']; });
      }
    });
    // Camera button title
    var camBtn = document.querySelector('.search-camera-btn');
    if (camBtn && dict['search_by_photo']) camBtn.title = dict['search_by_photo'];
    // Store language as applied
    if(code && code !== 'en') {
      localStorage.setItem('kf_lang', code);
    } else {
      localStorage.removeItem('kf_lang');
    }
    localStorage.setItem('kf_lang_applied', code);
    _kfTranslateInfoPages(code);
  }
  // ─── Traducción de bloques de texto completos (páginas info) ───────────────
  function _kfTranslateInfoPages(code) {
    // Solo traducimos 'es' por ahora, los demás dejan el inglés original
    var translations = {
      es: {
        'info-why': {
          body: '<p>Kit Finder es el primer <span class="highlight">motor de búsqueda exclusivo para camisetas de fútbol</span> del mundo. Una sola búsqueda. Más de 80 tiendas especializadas. Más de 100.000 camisetas vintage, retro y clásicas — en tiempo real.</p><h2 data-i18n="why_h2_photo">🔍 Buscar por Foto</h2><p>¿No sabes cómo se llama? Sube una foto. Nuestra <span class="highlight">IA identifica el equipo, la temporada y la versión</span> y encuentra todos los resultados en cuestión de segundos.</p><h2 data-i18n="why_h2_original">✅ 100% Original — Cero Falsificaciones</h2><p>Cada camiseta en Kit Finder es <span class="highlight">auténtica y genuina</span>. Solo trabajamos con tiendas especializadas. Sin réplicas, sin falsificaciones, nunca.</p><h2 data-i18n="why_h2_prices">💰 Mejores Precios, Garantizados</h2><p>La misma camiseta a distintos precios en más de 80 tiendas — <span class="highlight">las mostramos todas</span> para que siempre encuentres la mejor oferta. Filtra por club, liga, década, talla, marca y rango de precios.</p><h2 data-i18n="why_h2_global">🌍 Cobertura Global</h2><p>Tiendas en <span class="highlight">Europa, América, Asia y Oceanía</span>. Todas las divisas convertidas automáticamente. Además, miles de artículos de segunda mano de revendedores especializados en todo el mundo.</p><p style="text-align:center;margin-top:1.5rem;"><span class="highlight">Tu próxima camiseta de ensueño está a un solo clic.</span><br>— El equipo de Kit Finder</p>'
        },
        'info-about': {
          body: '<p>Bienvenido a <span class="highlight">Kit Finder</span>, el destino definitivo para los <span class="highlight">coleccionistas de camisetas de fútbol</span> y aficionados de todo el mundo.</p><p>Nuestra <span class="highlight">misión</span> es sencilla: que encontrar tu camiseta de fútbol ideal sea lo más fácil posible. Tanto si buscas una <span class="highlight">camiseta vintage clásica</span> de los 90, una <span class="highlight">edición limitada</span> o la última equipación de tu club favorito, te tenemos cubierto.</p><p>Kit Finder es un <span class="highlight">motor de búsqueda</span> que agrega resultados de múltiples <span class="highlight">tiendas especializadas en camisetas</span> y marketplaces. No vendemos camisetas directamente — te ayudamos a <span class="highlight">descubrir</span>, <span class="highlight">comparar</span> y encontrar las <span class="highlight">mejores ofertas</span> en la web.</p><p>Somos <span class="highlight">coleccionistas apasionados</span> y construimos Kit Finder porque queríamos una forma mejor de buscar camisetas. Esperamos que te ayude a encontrar ese jersey especial que llevas tiempo persiguiendo.</p><h2>100% Auténtico — Cero Falsificaciones</h2><p>Cada camiseta en Kit Finder es <span class="highlight">100% original y genuina</span>. Nunca encontrarás una falsificación o réplica a través de Kit Finder.</p><h2>Buscar por Foto</h2><p>Kit Finder es el único buscador de camisetas con <span class="highlight">búsqueda por foto con IA</span>. Toca el icono de la cámara, sube una foto y nuestro sistema la identificará al instante.</p><h2>El Mejor Lugar para Encontrar Camisetas Vintage</h2><p>Con <span class="highlight">más de 100 tiendas especializadas</span> buscadas simultáneamente, Kit Finder es simplemente el mejor lugar para encontrar <span class="highlight">camisetas vintage y retro originales al mejor precio</span>.</p><p style="text-align:center;margin-top:1.5rem;"><span class="highlight">¡Buena caza!</span><br>— El equipo de Kit Finder</p>'
        },
        'info-privacy': {
          body: '<p>En <span class="highlight">Kit Finder</span> nos comprometemos a proteger tu <span class="highlight">privacidad</span> y garantizar la seguridad de tu información personal. Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos tus datos cuando usas nuestro sitio web.</p><h2>1. Información que Recopilamos</h2><p>Podemos recopilar <span class="highlight">información no personal</span> automáticamente cuando visitas nuestro sitio, incluyendo el tipo de navegador, información del dispositivo, dirección IP y comportamiento de navegación. Usamos cookies y tecnologías similares para mejorar tu experiencia y analizar el tráfico del sitio.</p><p><span class="highlight">No</span> recopilamos información personal como tu nombre, dirección de correo o datos de pago, a menos que los proporciones voluntariamente.</p><h2>2. Cómo Usamos tu Información</h2><p>La información que recopilamos se usa para mejorar nuestros servicios, personalizar tu experiencia, analizar el rendimiento del sitio y garantizar la seguridad de la plataforma.</p><h2>3. Cookies</h2><p>Nuestro sitio usa <span class="highlight">cookies</span> para recordar tus preferencias y analizar el tráfico del sitio. Puedes desactivarlas en la configuración de tu navegador, aunque algunas funciones podrían verse afectadas.</p><h2>4. Servicios de Terceros</h2><p>Kit Finder enlaza a tiendas y marketplaces de terceros. No somos responsables de sus prácticas de privacidad. Te recomendamos que leas sus políticas antes de realizar cualquier compra.</p><h2>5. Seguridad de los Datos</h2><p>Tomamos medidas razonables para proteger cualquier información recopilada. Sin embargo, ningún método de transmisión por Internet es 100% seguro.</p><h2>6. Cambios en Esta Política</h2><p>Podemos actualizar esta Política de Privacidad de vez en cuando. Los cambios se publicarán en esta página.</p><h2>7. Contacto</h2><p>Si tienes preguntas sobre esta Política de Privacidad, puedes contactarnos a través de nuestro sitio web.</p>'
        },
        'info-terms': {
          body: '<p>Bienvenido a <span class="highlight">Kit Finder</span>. Al acceder y usar nuestro sitio web, aceptas quedar vinculado por estos Términos de Uso.</p><h2>1. Aceptación de los Términos</h2><p>Al usar Kit Finder, reconoces que has leído, comprendido y aceptas estos <span class="highlight">Términos de Uso</span>. Si no estás de acuerdo, por favor no uses nuestro sitio web.</p><h2>2. Descripción del Servicio</h2><p>Kit Finder es un <span class="highlight">motor de búsqueda de camisetas de fútbol</span> que agrega listados de varios minoristas y marketplaces de terceros. No vendemos productos directamente. Todas las compras se realizan a través de sitios web externos.</p><h2>3. Uso del Sitio Web</h2><p>Aceptas usar Kit Finder solo para <span class="highlight">fines legales</span> y de un modo que no infrinja los derechos de terceros. No debes hacer un uso indebido de nuestros sistemas ni intentar acceder a ellos sin autorización.</p><h2>4. Propiedad Intelectual</h2><p>Todo el contenido de Kit Finder, incluidos logos, texto, gráficos y diseño, es <span class="highlight">propiedad de Kit Finder</span>. No puedes reproducirlo sin nuestro permiso expreso por escrito.</p><h2>5. Descargo de Responsabilidad</h2><p>Kit Finder se proporciona <span class="highlight">tal cual</span>, sin garantías de ningún tipo. No garantizamos la exactitud, integridad o actualidad de los listados de productos, precios o disponibilidad.</p><h2>6. Limitación de Responsabilidad</h2><p>Kit Finder no será responsable de ningún daño indirecto o derivado que resulte del uso de nuestro sitio web.</p><h2>7. Modificaciones</h2><p>Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado del sitio implica la aceptación de los términos revisados.</p>'
        },
        'info-affiliate': {
          body: '<p><span class="highlight">Kit Finder</span> participa en varios <span class="highlight">programas de marketing de afiliados</span>. Esto significa que cuando haces clic en enlaces a productos y realizas una compra, podemos ganar una <span class="highlight">comisión</span> del minorista sin coste adicional para ti.</p><h2>1. Cómo Funciona</h2><p>Cuando buscas una camiseta en Kit Finder y haces clic en un producto, serás redirigido al <span class="highlight">sitio web de la tienda asociada</span> para completar tu compra. Si compras el producto, Kit Finder puede recibir una pequeña <span class="highlight">tarifa de referido</span>. Esta comisión nos ayuda a mantener el sitio en funcionamiento.</p><h2>2. ¿Afecta al Precio?</h2><p><span class="highlight">No.</span> El precio que pagas es exactamente el mismo tanto si usas Kit Finder como si vas directamente a la tienda. Nuestras asociaciones de afiliados <span class="highlight">no</span> incrementan el coste de ningún artículo para ti.</p><h2>3. Nuestro Compromiso</h2><p>Estamos comprometidos a ofrecer resultados de búsqueda <span class="highlight">honestos e imparciales</span>. Nuestras relaciones de afiliados no influyen en qué listados mostramos ni en cómo los ordenamos.</p><h2>4. Tiendas Afiliadas</h2><p>Kit Finder trabaja actualmente con más de 100 tiendas especializadas en camisetas de fútbol vintage y retro de todo el mundo.</p><h2>5. Transparencia</h2><p>Creemos en la transparencia total. Cuando usas Kit Finder, debes saber que podemos recibir una compensación si haces una compra a través de nuestros enlaces. Esto nos permite mantener el servicio gratuito para todos los usuarios.</p>'
        }
      }
    };

    var t = translations[code];
    if (!t) return; // No hay traducción para este idioma, dejar en inglés

    Object.keys(t).forEach(function(sectionId) {
      var section = document.getElementById(sectionId);
      if (!section) return;
      var h1 = section.querySelector('h1');
      var h1Html = h1 ? h1.outerHTML : '';
      var lastUpdated = section.querySelector('.last-updated');
      var luHtml = lastUpdated ? lastUpdated.outerHTML : '';
      section.innerHTML = h1Html + luHtml + t[sectionId].body;
      // Re-aplicar las traducciones de h2 dentro de la sección
      section.querySelectorAll('[data-i18n]').forEach(function(el) {
        var dict = KF_TRANSLATIONS[code] || KF_TRANSLATIONS['en'];
        var key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
      });
    });
  }


  // Apply stored language on page load
  var _storedLang = localStorage.getItem('kf_lang');
  if (_storedLang && _storedLang !== 'en') {
    // Apply after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { _kfApplyLanguage(_storedLang); }, 300); });
    } else {
      setTimeout(function() { _kfApplyLanguage(_storedLang); }, 300);
    }
  }
}

// ── Diagnóstico ──────────────────────────────────────────────────────────────
// Log al cargar el script. Si ves esto en la consola del navegador, auth.js cargó OK.
console.log("[KF Auth] auth.js loaded. Firebase loading...");
