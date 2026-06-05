/* Kit Finder - Analytics & cookie consent
   Carga Google Analytics 4 solo si el usuario acepta las cookies. */
(function () {
  var GA_ID = 'G-H0SP8EXB1G';
  var CONSENT_KEY = 'kf_cookie_consent';
  var gaLoaded = false;

  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  // Función global para registrar eventos (solo si hay consentimiento)
  window.kfTrack = function (name, params) {
    if (gaLoaded && window.gtag) {
      try { window.gtag('event', name, params || {}); } catch (e) {}
    }
  };

  function setConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
    var b = document.getElementById('kfCookieBanner');
    if (b) b.style.display = 'none';
    if (v === 'granted') loadGA();
  }

  function showBanner() {
    if (document.getElementById('kfCookieBanner')) return;
    var b = document.createElement('div');
    b.id = 'kfCookieBanner';
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100000;background:#0d1117;color:#fff;padding:14px 18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;box-shadow:0 -4px 18px rgba(0,0,0,.35);font-size:14px;line-height:1.4;';
    b.innerHTML = '<span style="max-width:560px;">We use cookies to measure traffic and improve Kit Finder. Is that OK?</span>'
      + '<span style="display:flex;gap:8px;flex-shrink:0;">'
      + '<button id="kfCookieReject" type="button" style="background:transparent;color:#fff;border:1px solid #555;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;font-size:14px;">Reject</button>'
      + '<button id="kfCookieAccept" type="button" style="background:var(--green,#2ecc71);color:#fff;border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-weight:700;font-size:14px;">Accept</button>'
      + '</span>';
    document.body.appendChild(b);
    document.getElementById('kfCookieAccept').addEventListener('click', function () { setConsent('granted'); });
    document.getElementById('kfCookieReject').addEventListener('click', function () { setConsent('denied'); });
  }

  function init() {
    var c = null;
    try { c = localStorage.getItem(CONSENT_KEY); } catch (e) {}
    if (c === 'granted') loadGA();
    else if (c !== 'denied') showBanner();

    // Medir clics en "View in store"
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a.card-btn') : null;
      if (a) {
        window.kfTrack('store_click', {
          store: a.getAttribute('data-store') || '',
          link_url: a.href || ''
        });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
