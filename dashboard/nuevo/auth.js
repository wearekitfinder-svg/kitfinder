/* Panel KitFinder — login de Google (Firebase) + datos de /analytics.
   Mismo gate que el dashboard viejo (/dashboard.js): ADMIN_EMAILS en el
   navegador, y el Worker kitfinder-search vuelve a comprobar el token de
   Firebase (Authorization: Bearer) contra su propio ADMIN_EMAILS. La apiKey de
   Firebase no es secreta: es el identificador público que ya usa /auth.js. */

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
// El Worker exige el token de Firebase; getIdToken() lo renueva solo si ha
// caducado (dura una hora). Si algo falla, el panel se queda en "—".
function fetchAnalytics(type, limit) {
  var user = auth.currentUser;
  if (!user) return Promise.resolve([]);
  return user.getIdToken()
    .then(function (token) {
      return fetch(API_BASE + '/analytics?type=' + type + '&limit=' + limit, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
    })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) { return (d && d.snapshots) || []; })
    .catch(function (e) {
      console.warn('[panel] /analytics ' + type + ':', e.message);
      return [];
    });
}

function loadData() {
  Promise.all([
    fetchAnalytics('rolling30d', 1),
    fetchAnalytics('month', 24)
  ]).then(function (res) {
    window.kfRender(res[0], res[1]);
  });
}
