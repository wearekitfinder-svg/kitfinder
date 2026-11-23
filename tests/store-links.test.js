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
