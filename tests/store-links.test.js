// Run: node --test tests/store-links.test.js
// scStoreUrl (shirt-checker.js): the "View in store" link of the Advanced
// Search. Football Finery links must carry ref=kitfinder (no duplicates);
// every other store stays exactly as it is. shirt-checker.js is a browser
// script, so (like shirt-checker-as-text.test.js) we pull out just the function.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const sc = fs.readFileSync(path.join(__dirname, '..', 'shirt-checker.js'), 'utf8');
const m = sc.match(/function scStoreUrl\([\s\S]*?\r?\n}\r?\n/);
assert.ok(m, 'scStoreUrl not found in shirt-checker.js');
const scStoreUrl = new Function(m[0] + '\nreturn scStoreUrl;')(); // trusted: our own file

// affiliateUrl() from app.js, to check both pages treat Football Finery the same.
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const i = app.indexOf('function affiliateUrl(a)');
const j = app.indexOf('function buildCard', i);
assert.ok(i >= 0 && j > i, 'affiliateUrl not found in app.js');
const affiliateUrl = new Function(app.slice(i, j) + '; return affiliateUrl;')(); // trusted: our own file

const refs = (u) => new URL(u).searchParams.getAll('ref');

test('Football Finery link gets ref=kitfinder (.co.uk, www, .com)', () => {
  assert.strictEqual(scStoreUrl('https://www.footballfinery.co.uk/products/x'), 'https://www.footballfinery.co.uk/products/x?ref=kitfinder');
  assert.strictEqual(scStoreUrl('https://footballfinery.co.uk/products/x'), 'https://footballfinery.co.uk/products/x?ref=kitfinder');
  assert.strictEqual(scStoreUrl('https://www.footballfinery.com/products/x'), 'https://www.footballfinery.com/products/x?ref=kitfinder');
});

test('URL with parameters: &ref=kitfinder is added and the other parameters stay', () => {
  const out = scStoreUrl('https://www.footballfinery.co.uk/products/x?variant=123');
  assert.strictEqual(out, 'https://www.footballfinery.co.uk/products/x?variant=123&ref=kitfinder');
});

test('ref is never duplicated', () => {
  const once = scStoreUrl('https://www.footballfinery.co.uk/products/x');
  assert.deepStrictEqual(refs(scStoreUrl(once)), ['kitfinder']);           // applied twice
  assert.deepStrictEqual(refs(scStoreUrl('https://www.footballfinery.co.uk/products/x?ref=kitfinder')), ['kitfinder']);
  assert.deepStrictEqual(refs(scStoreUrl('https://www.footballfinery.co.uk/products/x?ref=kitfinder&ref=kitfinder')), ['kitfinder']);
});

test('other stores do not change (including look-alike domains and CFS)', () => {
  for (const u of [
    'https://www.classicfootballshirts.co.uk/item/1',
    'https://www.tspncalcio.com/p/1?x=1',
    'https://www.ebay.co.uk/itm/123',
    'https://www.otherstore.com/p/1?ref=abc',
    'https://notfootballfinery.co.uk/x',
    'https://footballfinery.co.uk.evil.com/x',
  ]) assert.strictEqual(scStoreUrl(u), u, u);
});

test('empty or invalid URLs pass through', () => {
  assert.strictEqual(scStoreUrl(''), '');
  assert.strictEqual(scStoreUrl(undefined), undefined);
  assert.strictEqual(scStoreUrl('not a url'), 'not a url');
});

test('same Football Finery result as affiliateUrl() in app.js', () => {
  for (const u of [
    'https://www.footballfinery.co.uk/products/x',
    'https://footballfinery.com/products/y?variant=9',
    'https://www.footballfinery.co.uk/products/z?ref=kitfinder',
  ]) assert.strictEqual(scStoreUrl(u), affiliateUrl(u), u);
});

test('the "View in store" button uses scStoreUrl()', () => {
  assert.ok(/href="' \+ escHtml\(scStoreUrl\(p\.url\)\)/.test(sc), 'View in store href does not go through scStoreUrl');
});

// Holy Grails cards on the home page (inline script in index.html) must use the
// same affiliate rule: Football Finery gets ref=kitfinder, never duplicated.
const idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const hm = idx.match(/function _hgUrl\(u\)\{[\s\S]*?\n  \}\n/);
assert.ok(hm, '_hgUrl not found in index.html');
const hgUrlWith = new Function('affiliateUrl', hm[0] + '\nreturn _hgUrl;');   // trusted: our own file
const hgUrlNoApp = new Function(hm[0] + '\nreturn _hgUrl;')();                // app.js not loaded yet

test('Holy Grails: Football Finery link gets ref=kitfinder, with or without app.js', () => {
  const ff = 'https://www.footballfinery.co.uk/products/1990-91-juventus-away-football-shirt-l-kappa-ff204364';
  for (const f of [hgUrlWith(affiliateUrl), hgUrlNoApp]) {
    assert.strictEqual(f(ff), ff + '?ref=kitfinder');
    assert.deepStrictEqual(refs(f(ff + '?ref=kitfinder')), ['kitfinder']);
    assert.strictEqual(f('https://www.vintagefootballshirts.com/products/x'), 'https://www.vintagefootballshirts.com/products/x');
  }
});

test('Holy Grails cards build their href through _hgUrl()', () => {
  assert.ok(idx.includes('a.href=_hgUrl(item.url);'));
  assert.ok(idx.includes('card.href=_hgUrl(item.url);'));
  assert.ok(!/\.href=item\.url;/.test(idx), 'a Holy Grails card still uses the raw URL');
});

// store_click must also count Holy Grails cards and Favourites (both send
// visitors to stores but are not a.card-btn links).
test('store_click is sent for Holy Grails cards and Favourites', () => {
  const an = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');
  assert.ok(an.includes("closest('a.card-btn, a.hg-card')"));
  assert.ok(an.includes("a.getAttribute('data-hg-store')"));
  assert.ok(app.includes('window.kfTrack("store_click",{store:e.store||"",link_url:affiliateUrl(e.url)}),window.open(affiliateUrl(e.url),"_blank")'));
});
