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
function fetchAdmin(pathAndQuery, method, body) {
  var user = auth.currentUser;
  if (!user) return Promise.reject(new Error('sin sesión'));
  return user.getIdToken()
    .then(function (token) {
      var headers = { 'Authorization': 'Bearer ' + token };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      return fetch(API_BASE + pathAndQuery, {
        method: method || 'GET',
        headers: headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    })
    .then(function (r) {
      if (!r.ok) {
        var err = new Error('HTTP ' + r.status);
        err.status = r.status;
        // Del cuerpo del error solo se guarda upstream_status (número), que el
        // Worker manda en los 502 de /admin/affiliates/ebay, y, en los 400, el
        // texto de validación de nuestro propio Worker (se pinta como texto).
        return r.json().catch(function () { return null; }).then(function (body) {
          if (body && typeof body.upstream_status === 'number' && isFinite(body.upstream_status)) {
            err.upstreamStatus = body.upstream_status;
          }
          if (r.status === 400 && body && typeof body.error === 'string') {
            err.serverMessage = body.error.slice(0, 200);
          }
          throw err;
        });
      }
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

// Tareas de Todoist (kitfinder-search/src/todoist.ts). Sin caché en el
// Worker; aquí tampoco se guarda nada en el navegador. panel.js pinta la
// lista y llama a estas funciones; los errores llevan .status (409, 502...).
window.kfTodoist = {
  list: function () { return fetchAdmin('/admin/todoist/tasks'); },
  close: function (id) { return fetchAdmin('/admin/todoist/tasks/' + encodeURIComponent(id) + '/close', 'POST'); },
  reopen: function (id) { return fetchAdmin('/admin/todoist/tasks/' + encodeURIComponent(id) + '/reopen', 'POST'); }
};

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
  window.kfTasksLoad();
  window.kfAfStart();
  window.kfGaStart();
  // Tarjeta Usuarios: todos los días con datos (ga4_daily empieza el
  // 2026-08-05; la ruta admite como mucho 400 días por petición) para las
  // cajas, el desplegable de meses y las barras por día. Independiente del
  // selector de periodo de más abajo.
  var now = new Date(), from = new Date(now.getTime() - 399 * 864e5);
  var fromStr = ymd(from) < '2026-08-01' ? '2026-08-01' : ymd(from);
  window.kfGa4.daily(fromStr, ymd(now))
    .then(function (d) { window.kfRenderUsersDaily(d, null); })
    .catch(function (e) {
      console.warn('[panel] /admin/ga4/daily (tarjeta Usuarios):', e.message);
      window.kfRenderUsersDaily(null, e.status || 'error');
    });
}

// Afiliados día a día (tabla affiliate_daily del Worker), clics de Kit Finder
// por tienda y día (store_clicks_daily) y tipos de cambio del BCE por día
// (fx_daily). panel.js (kfAfLoad) los pide solo con el rango del periodo
// elegido. Si una ruta falla, esa parte dice «sin datos» y el resto sigue.
// Las entradas a mano (source='manual') se crean, editan y borran por fechas;
// key = {day, store, program} de la fila (day = su último día).
function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function manualKey(k) {
  return '?day=' + encodeURIComponent(k.day) + '&store=' + encodeURIComponent(k.store) + '&program=' + encodeURIComponent(k.program);
}
window.kfAffiliates = {
  manual: function (row) { return fetchAdmin('/admin/affiliates/manual', 'POST', row); },
  updateManual: function (key, row) { return fetchAdmin('/admin/affiliates/manual' + manualKey(key), 'PUT', row); },
  deleteManual: function (key) { return fetchAdmin('/admin/affiliates/manual' + manualKey(key), 'DELETE'); },
  daily: function (from, to) { return fetchAdmin('/admin/affiliates/daily?from=' + from + '&to=' + to); },
  storeClicks: function (from, to) { return fetchAdmin('/admin/store-clicks/daily?from=' + from + '&to=' + to); },
  fx: function (from, to) { return fetchAdmin('/admin/fx/daily?from=' + from + '&to=' + to); }
};
// Tráfico web de GA4 (kitfinder-search/src/ga4_daily.ts), con el mismo
// periodo que afiliados; panel.js (kfGaLoad) pide solo el rango elegido.
window.kfGa4 = {
  daily: function (from, to) { return fetchAdmin('/admin/ga4/daily?from=' + from + '&to=' + to); }
};

// Al volver a la pestaña se vuelven a pedir las tareas (sin polling).
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && currentUid) window.kfTasksLoad();
});
