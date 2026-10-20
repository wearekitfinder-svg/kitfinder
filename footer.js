/* Kit Finder — pie de pagina comun (scripts/gen_footer.py lo pone en cada pagina).
   Newsletter del pie: la MISMA lista que La Grada (Firestore, coleccion
   blogSubscribers, mismos campos: email, subscribedAt, source), con
   source 'footer' para saber de donde viene el alta. Firebase solo se carga
   cuando alguien pulsa Subscribe (en la portada y el blog ya esta cargado y
   se reutiliza). No depende del banner de cookies: no usa cookies.
   Cookie settings vive en analytics.js (window.kfCookieSettings). */
(function () {
  var FB_BASE = 'https://www.gstatic.com/firebasejs/';
  var FB_VER = '10.12.0'; // misma version que /auth.js
  var CONFIG = { // config publica de Firebase, la misma que /auth.js
    apiKey: 'AIzaSyBGrY_Az2x7O9sszMOsz550FGSNS5r3VPY',
    authDomain: 'kit-finder-82298.firebaseapp.com',
    projectId: 'kit-finder-82298',
    storageBucket: 'kit-finder-82298.firebasestorage.app',
    messagingSenderId: '729482193363',
    appId: '1:729482193363:web:8650b9a981e349e5baa726'
  };

  function t(key, fallback) { return (typeof kfT === 'function') ? kfT(key, fallback) : fallback; }

  function loadScript(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { ko(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }

  // Firestore listo: reutiliza el Firebase de la pagina si existe (misma
  // version para no mezclar), si no lo carga.
  function firestore() {
    var fb = window.firebase;
    var ver = (fb && fb.SDK_VERSION) || FB_VER;
    var chain = Promise.resolve();
    if (!fb) chain = chain.then(function () { return loadScript(FB_BASE + ver + '/firebase-app-compat.js'); });
    chain = chain.then(function () {
      if (!window.firebase.firestore) return loadScript(FB_BASE + ver + '/firebase-firestore-compat.js');
    });
    return chain.then(function () {
      if (!window.firebase.apps.length) window.firebase.initializeApp(CONFIG);
      return window.firebase.firestore();
    });
  }

  function subscribe(form) {
    var input = form.querySelector('input[type=email]');
    var btn = form.querySelector('button');
    var msg = form.parentNode.querySelector('.kf-foot-msg');
    var say = function (txt, err) { msg.textContent = txt; msg.classList.toggle('err', !!err); msg.hidden = !txt; };
    var email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say(t('js_valid_email', 'Please enter a valid email.'), true);
    btn.disabled = true;
    say(t('js_subscribing', 'Subscribing…'));
    firestore()
      .then(function (db) {
        return db.collection('blogSubscribers').doc(email.replace(/[^a-zA-Z0-9]/g, '_'))
          .set({ email: email, subscribedAt: Date.now(), source: 'footer' }, { merge: true });
      })
      .then(function () {
        try { localStorage.setItem('kf_blog_subscribed', '1'); } catch (e) {}
        form.hidden = true;
        say(t('js_subscribed', '✅ Subscribed! We\'ll email you when new articles go live.'));
      }, function () {
        btn.disabled = false;
        say(t('js_something_wrong', 'Something went wrong. Try again.'), true);
      });
  }

  function init() {
    document.querySelectorAll('.kf-foot-nl form').forEach(function (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); subscribe(form); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
