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
    if (btn) btn.textContent = tab === 'signup' ? kfT('auth_create_account','Create Account') : kfT('auth_sign_in','Sign In');
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

  // Mensajes de error de Firebase traducidos (cada código → una clave de kfT)
  var KF_AUTH_ERRORS = {
    'auth/invalid-email': ['auth_err_invalid_email', 'That email address is not valid.'],
    'auth/missing-email': ['auth_err_invalid_email', 'That email address is not valid.'],
    'auth/user-disabled': ['auth_err_user_disabled', 'This account has been disabled.'],
    'auth/user-not-found': ['auth_err_wrong_credentials', 'Wrong email or password.'],
    'auth/wrong-password': ['auth_err_wrong_credentials', 'Wrong email or password.'],
    'auth/invalid-credential': ['auth_err_wrong_credentials', 'Wrong email or password.'],
    'auth/invalid-login-credentials': ['auth_err_wrong_credentials', 'Wrong email or password.'],
    'auth/missing-password': ['auth_err_fill_all', 'Please fill in all fields.'],
    'auth/email-already-in-use': ['auth_err_email_in_use', 'An account with this email already exists. Try signing in.'],
    'auth/weak-password': ['auth_err_weak_password', 'Password must be at least 6 characters.'],
    'auth/too-many-requests': ['auth_err_too_many', 'Too many attempts. Please wait a few minutes and try again.'],
    'auth/network-request-failed': ['auth_err_network', 'Network error. Check your connection and try again.']
  };
  function kfAuthErrorMsg(e) {
    var m = e && KF_AUTH_ERRORS[e.code];
    if (m) return kfT(m[0], m[1]);
    return kfT('auth_err_generic', 'Something went wrong. Please try again.');
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
          ? kfT('auth_err_localhost_hint','In Firebase Console → Authentication → Authorized domains, add: localhost. Also check Google Cloud Console → OAuth 2.0 → Authorized redirect URIs includes http://localhost:{port}/__/auth/handler',{port:window.location.port})
          : kfT('auth_err_add_domain','Add this domain in Firebase Console → Authentication → Authorized domains.');
        kfSetError(hint);
      } else if (e.code === 'auth/popup-blocked') {
        // Popup bloqueado — intentar con redirect
        kfSetError(kfT('auth_err_popup_blocked','Popup blocked. Trying redirect login...'));
        setTimeout(function() {
          auth.signInWithRedirect(provider).catch(function(e2) {
            kfSetError(kfAuthErrorMsg(e2));
          });
        }, 1000);
      } else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        // User closed popup — no error
      } else if (e.code === 'auth/operation-not-allowed') {
        kfSetError(kfT('auth_err_google_disabled','Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.'));
      } else {
        kfSetError(kfAuthErrorMsg(e));
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
    if (!email || !pass) return kfSetError(kfT('auth_err_fill_all','Please fill in all fields.'));
    kfSetLoading(true); kfSetError('');

    var promise = activeTab === 'signup'
      ? auth.createUserWithEmailAndPassword(email, pass)
      : auth.signInWithEmailAndPassword(email, pass);

    promise.then(function(r) {
      return kfSyncCloud(r.user);
    }).then(function() {
      window.kfCloseAuthModal();
    }).catch(function(e) {
      kfSetError(kfAuthErrorMsg(e));
    }).finally(function() {
      kfSetLoading(false);
    });
  };

  window.kfResetPassword = function() {
    var email = (document.getElementById('kfEmailInput') || {}).value;
    if (!email) return kfSetError(kfT('auth_err_enter_email','Enter your email first.'));
    auth.sendPasswordResetEmail(email.trim()).then(function() {
      kfSetError(kfT('auth_reset_sent','Reset email sent! Check your inbox.'));
    }).catch(function(e) {
      kfSetError(kfAuthErrorMsg(e));
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

  // ── Alertas: sellar precio de referencia en cada favorito ────────────────────
  // La 1a vez que se guarda un favorito, anotamos su precio y stock de ese momento.
  // Asi luego podemos detectar bajadas de precio o vuelta a stock (restock).
  function kfStampAlerts(favs) {
    if (!Array.isArray(favs)) return favs;
    var now = Date.now();
    favs.forEach(function(f) {
      if (!f) return;
      // solo sellar si aun no tiene precio de referencia
      if (f.alertPrice === undefined || f.alertPrice === null) {
        var p = parseFloat(f.price);
        if (!isNaN(p) && p > 0) {
          f.alertPrice = p;                       // precio ancla (no cambia)
          f.alertCurrency = f.currency || 'EUR';
          f.alertAdded = now;                     // cuando se marco
          f.alertInStock = (f.available !== false); // stock en ese momento
        }
      }
    });
    return favs;
  }

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
      return ref.set({ favourites: kfStampAlerts(merged), email: user.email, updatedAt: Date.now() }, { merge: true }).then(function() {
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
      var favs = kfStampAlerts(JSON.parse(localStorage.getItem('kf_favs') || '[]'));
      db.collection('users').doc(user.uid).set({ favourites: favs, email: user.email, updatedAt: Date.now() }, { merge: true }).catch(function() {});
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
    var disp = nickname || user.displayName || kfT('auth_default_user','Kit Finder User');
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
        var nm = document.getElementById('kfMenuName'); if (nm) nm.textContent = nickname || user.displayName || kfT('auth_default_user','Kit Finder User');
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
  // (KF_LANGUAGES, KF_TRANSLATIONS y _kfApplyLanguage viven ahora en i18n.js, sin depender de Firebase)

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

}

// ── Diagnóstico ──────────────────────────────────────────────────────────────
// Log al cargar el script. Si ves esto en la consola del navegador, auth.js cargó OK.
console.log("[KF Auth] auth.js loaded. Firebase loading...");
