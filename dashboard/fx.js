/* Panel KitFinder — paso de importes a euros.
   Los tipos vienen de /admin/fx/daily (tabla fx_daily del Worker: tipo oficial
   del BCE de cada día, en euros por 1 unidad de la moneda). Cada importe se
   convierte con el tipo de SU día; el BCE no publica fines de semana ni
   festivos, así que se usa el último tipo anterior. Si no hay ninguno (la ruta
   falla o aún no tiene datos), se usa FX_FALLBACK y el panel lo avisa.
   Todo en céntimos para que las sumas no se desvíen.
   Tests: tests/panel-fx.test.js (node --test). */
(function (root) {
  // Único sitio con tipos fijos: solo de reserva, nunca el dato normal.
  var FX_FALLBACK = { GBP: 1.16, USD: 0.86 };

  // rows = [{day, currency, eur_per_unit}] -> {GBP: [[day, tipo], ...] por día}
  function index(rows) {
    var by = {};
    (rows || []).forEach(function (r) {
      var v = Number(r && r.eur_per_unit);
      if (!r || !/^[A-Z]{3}$/.test(r.currency) || !/^\d{4}-\d{2}-\d{2}$/.test(r.day) || !(v > 0)) return;
      (by[r.currency] = by[r.currency] || []).push([r.day, v]);
    });
    Object.keys(by).forEach(function (c) { by[c].sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; }); });
    return by;
  }

  // Tipo para (moneda, día): el del día o el último anterior; si no, el de
  // reserva. null si la moneda no se puede convertir.
  function rateFor(idx, cur, day) {
    if (cur === 'EUR') return { rate: 1, day: null, fallback: false };
    var list = (idx && idx[cur]) || [], best = null;
    for (var i = 0; i < list.length && list[i][0] <= day; i++) best = list[i];
    if (best) return { rate: best[1], day: best[0], fallback: false };
    if (FX_FALLBACK[cur]) return { rate: FX_FALLBACK[cur], day: null, fallback: true };
    return null;
  }

  // Importe (unidades de su moneda) -> céntimos de euro.
  // {cents, conv} donde conv = null si ya era EUR, o {cur, rate, day, fallback}.
  // {cents: null, missing: cur} si no hay forma de convertirlo.
  function toEurCents(amount, cur, day, idx) {
    var n = Number(amount), c = isFinite(n) ? Math.round(n * 100) : 0;
    if (cur === 'EUR') return { cents: c, conv: null };
    var r = rateFor(idx, cur, day);
    if (!r) return { cents: null, missing: cur };
    return { cents: Math.round(c * r.rate), conv: { cur: cur, rate: r.rate, day: r.day, fallback: r.fallback } };
  }

  var api = { FX_FALLBACK: FX_FALLBACK, index: index, rateFor: rateFor, toEurCents: toEurCents };
  root.kfFx = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
