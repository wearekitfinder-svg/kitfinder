/* Panel KitFinder — login de Google (Firebase) + datos de /analytics.
   ADMIN_EMAILS se comprueba en el navegador, y el Worker kitfinder-search
   vuelve a comprobar el token de Firebase (Authorization: Bearer) contra su
   propio ADMIN_EMAILS. La apiKey de Firebase no es secreta: es el
   identificador público que ya usa /auth.js. */

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

var gate = document.getElementById('gate');
var gateMsg = document.getElementById('gateMsg');
var gateErr = document.getElementById('gateErr');
var gateSignIn = document.getElementById('gateSignIn');
var gateSignOut = document.getElementById('gateSignOut');

gateSignIn.addEventListener('click', function () {
  gateErr.textContent = '';
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(function (e) {
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      gateErr.textContent = e.message.replace('Firebase: ', '');
    }
  });
});

gateSignOut.addEventListener('click', function () {
  auth.signOut();
});

function showGate(msg, denied) {
  window.kfLockHide();
  gate.hidden = false;
  gateMsg.textContent = msg;
  gateSignIn.hidden = !!denied;
  gateSignOut.hidden = !denied;
}

var currentUid = null;
auth.onAuthStateChanged(function (user) {
  if (!user) {
    currentUid = null;
    showGate('Inicia sesión con la cuenta autorizada para ver el panel.', false);
    return;
  }
  if (ADMIN_EMAILS.indexOf(user.email) === -1) {
    currentUid = null;
    showGate('La cuenta ' + user.email + ' no tiene acceso a este panel.', true);
    gateErr.textContent = '';
    return;
  }
  if (currentUid === user.uid) return; // misma sesión: no volver a bloquear
  currentUid = user.uid;
  gate.hidden = true;
  window.kfLockShow();
  loadData();
});

// ── Datos ────────────────────────────────────────────────────────────────
// El Worker exige el token de Firebase en /analytics y /admin/*;
// getIdToken() lo renueva solo si ha caducado (dura una hora). Si algo
// falla, el panel se queda en "—".
function fetchAdmin(pathAndQuery) {
  var user = auth.currentUser;
  if (!user) return Promise.reject(new Error('sin sesión'));
  return user.getIdToken()
    .then(function (token) {
      return fetch(API_BASE + pathAndQuery, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
    })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
}

function fetchAnalytics(type, limit) {
  return fetchAdmin('/analytics?type=' + type + '&limit=' + limit)
    .then(function (d) { return (d && d.snapshots) || []; })
    .catch(function (e) {
      console.warn('[panel] /analytics ' + type + ':', e.message);
      return [];
    });
}

// Tiendas, productos y % del catálogo (kitfinder-search/src/catalog_stats.ts).
// El Worker lo guarda 6 horas, así que puede ir algo por detrás del catálogo.
function fetchCatalogStats() {
  return fetchAdmin('/admin/catalog-stats')
    .catch(function (e) {
      console.warn('[panel] /admin/catalog-stats:', e.message);
      return null;
    });
}

function loadData() {
  Promise.all([
    fetchAnalytics('rolling30d', 1),
    fetchAnalytics('month', 24)
  ]).then(function (res) {
    window.kfRender(res[0], res[1]);
  });
  fetchCatalogStats().then(function (stats) {
    if (stats) window.kfRenderCatalog(stats);
  });
}
