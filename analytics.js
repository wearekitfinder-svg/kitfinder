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
    var ov = document.createElement('div');
    ov.id = 'kfCookieBanner';
    ov.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Outfit',sans-serif;";
    ov.innerHTML = '<div style="width:min(440px,94vw);background:#0d1117;border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.7);">'
      + '<div style="position:relative;height:175px;overflow:hidden;">'
        + '<img src="images/cookie-hero.jpg" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center 38%;filter:brightness(.72);">'
        + '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(13,17,23,.05),rgba(13,17,23,.95));"></div>'
        + '<div style="position:absolute;bottom:14px;left:0;right:0;text-align:center;color:#fff;font-size:21px;font-weight:900;letter-spacing:-.5px;">Cookies</div>'
      + '</div>'
      + '<div style="padding:20px 24px 24px;color:#fff;text-align:center;">'
        + '<p style="font-size:14px;line-height:1.55;color:rgba(255,255,255,.8);margin:0 0 18px;">We use cookies to measure traffic and improve Kit Finder. Is that OK?</p>'
        + '<div style="display:flex;gap:10px;justify-content:center;">'
          + '<button id="kfCookieReject" type="button" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:11px 20px;cursor:pointer;font-weight:600;font-size:14px;font-family:inherit;">Reject</button>'
          + '<button id="kfCookieAccept" type="button" style="background:#2ecc71;color:#fff;border:0;border-radius:10px;padding:11px 24px;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;">Accept</button>'
        + '</div>'
      + '</div>'
    + '</div>';
    document.body.appendChild(ov);
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
