// Run: node --test tests/panel-fx.test.js
// dashboard/fx.js: amounts to euro cents with the ECB rate of their own day.
const test = require('node:test');
const assert = require('node:assert');
const fx = require('../dashboard/fx.js');

// ECB rows as /admin/fx/daily returns them (euros per 1 unit). Friday's rate,
// no rows on the weekend (the ECB doesn't publish then).
const idx = fx.index([
  { day: '2026-10-16', currency: 'GBP', eur_per_unit: 1.1612 },
  { day: '2026-10-15', currency: 'GBP', eur_per_unit: 1.1580 },
]);

// Sample from the owner's screenshot (October).
const rows = [
  { store: 'eBay', day: '2026-10-16', currency: 'EUR', sales_amount: 191.44, commission: 5.74 },
  { store: 'Classic Football Shirts', day: '2026-10-16', currency: 'GBP', sales_amount: 84.97, commission: 8.50 },
];

function sum(field) {
  let cents = 0, converted = [];
  for (const r of rows) {
    const e = fx.toEurCents(r[field], r.currency, r.day, idx);
    cents += e.cents;
    if (e.conv) converted.push(e.conv);
  }
  return { cents, converted };
}

test('EUR stays as it is', () => {
  assert.deepStrictEqual(fx.toEurCents(191.44, 'EUR', '2026-10-16', idx), { cents: 19144, conv: null });
});

test('CFS in pounds becomes euros with that day\'s rate', () => {
  const s = fx.toEurCents(84.97, 'GBP', '2026-10-16', idx);
  assert.strictEqual(s.cents, 9867); // 84.97 × 1.1612 = 98.67
  assert.deepStrictEqual(s.conv, { cur: 'GBP', rate: 1.1612, day: '2026-10-16', fallback: false });
  assert.strictEqual(fx.toEurCents(8.50, 'GBP', '2026-10-16', idx).cents, 987); // 9.87
});

test('one single euro total per column (no "€ X + £ Y")', () => {
  const sales = sum('sales_amount'), comm = sum('commission');
  assert.strictEqual(sales.cents, 29011); // € 290.11 = 191.44 + 98.67
  assert.strictEqual(comm.cents, 1561);   // € 15.61 = 5.74 + 9.87
  assert.strictEqual(sales.converted.length, 1); // only CFS gets the asterisk
});

test('weekend uses the last rate before it', () => {
  const r = fx.rateFor(idx, 'GBP', '2026-10-18');
  assert.deepStrictEqual(r, { rate: 1.1612, day: '2026-10-16', fallback: false });
  assert.strictEqual(fx.rateFor(idx, 'GBP', '2026-10-15').rate, 1.1580);
});

test('no ECB rate at all: fixed fallback rate, marked as such', () => {
  const e = fx.toEurCents(10, 'GBP', '2026-06-01', fx.index([]));
  assert.strictEqual(e.cents, Math.round(1000 * fx.FX_FALLBACK.GBP));
  assert.strictEqual(e.conv.fallback, true);
});

test('unknown currency without any rate is not summed', () => {
  assert.deepStrictEqual(fx.toEurCents(10, 'JPY', '2026-10-16', idx), { cents: null, missing: 'JPY' });
});

test('bad rows from the server are ignored', () => {
  const i = fx.index([{ day: 'x', currency: 'GBP', eur_per_unit: 1.2 }, { day: '2026-10-16', currency: 'GBP', eur_per_unit: 0 }]);
  assert.deepStrictEqual(i, {});
});
