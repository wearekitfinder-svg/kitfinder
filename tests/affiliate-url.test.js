// Run: node --test tests/affiliate-url.test.js
// affiliateUrl (app.js): añade la referencia de afiliado a los enlaces de salida de cada tienda con acuerdo.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const i = src.indexOf('function affiliateUrl(a)');
assert.ok(i >= 0, 'affiliateUrl not found');
const j = src.indexOf('function buildCard', i);
const affiliateUrl = new Function(src.slice(i, j) + '; return affiliateUrl;')(); // trusted: our own file

test('Football Finery: links get ref=kitfinder (.co.uk, www and .com)', () => {
  for (const u of ['https://www.footballfinery.co.uk/products/x', 'https://footballfinery.co.uk/products/x', 'https://www.footballfinery.com/products/x'])
    assert.strictEqual(new URL(affiliateUrl(u)).searchParams.get('ref'), 'kitfinder', u);
});

test('Football Finery: existing parameters are kept', () => {
  const o = new URL(affiliateUrl('https://www.footballfinery.co.uk/products/x?variant=123'));
  assert.strictEqual(o.searchParams.get('variant'), '123');
  assert.strictEqual(o.searchParams.get('ref'), 'kitfinder');
});

test('other stores are not touched; Classic Football Shirts keeps its own ref', () => {
  assert.strictEqual(affiliateUrl('https://www.otherstore.com/p/1'), 'https://www.otherstore.com/p/1');
  assert.strictEqual(new URL(affiliateUrl('https://www.classicfootballshirts.co.uk/x')).searchParams.get('ref'), 'mjk5njr');
  assert.strictEqual(affiliateUrl('https://notfootballfinery.co.uk/x'), 'https://notfootballfinery.co.uk/x');
});

test('empty or invalid URLs pass through', () => {
  assert.strictEqual(affiliateUrl(''), '');
  assert.strictEqual(affiliateUrl('not a url'), 'not a url');
});

test('default order: partner stores (Football Finery) go first, then the rest mixed by store, Classic last', () => {
  const k = src.indexOf('const PARTNER_STORES=');
  assert.ok(k >= 0, 'PARTNER_STORES not found');
  const e = src.indexOf('function applyFilters', k);
  const interleave = new Function(src.slice(k, e) + '; return interleaveByStore;')();
  const mk = (store, n) => ({ store, n });
  const out = interleave([mk('Classic Football Shirts', 1), mk('Store A', 1), mk('Football Finery', 1), mk('Store B', 1), mk('Football Finery', 2), mk('Store A', 2)]);
  assert.deepStrictEqual(out.map(x => x.store + x.n), ['Football Finery1', 'Football Finery2', 'Store A1', 'Store B1', 'Store A2', 'Classic Football Shirts1']);
});
