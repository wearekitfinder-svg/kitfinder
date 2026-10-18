// Run: node --test tests/
// shirt-checker.js is a plain browser script (it touches localStorage and the
// page on load), so instead of loading the whole file we pull out just
// scCleanTypedText() and test that function on its own.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'shirt-checker.js'), 'utf8');
const match = src.match(/function scCleanTypedText\([\s\S]*?\r?\n}\r?\n/);
assert.ok(match, 'scCleanTypedText not found in shirt-checker.js');
const scCleanTypedText = new Function(match[0] + '\nreturn scCleanTypedText;')();

test('lowercases and trims', () => {
  assert.strictEqual(scCleanTypedText('  Atletico OTTAWA  '), 'atletico ottawa');
});

test('cuts to 40 characters', () => {
  const out = scCleanTypedText('Deportivo Independiente Medellin Reserves Team B');
  assert.strictEqual(out.length <= 40, true);
  assert.strictEqual(out, 'deportivo independiente medellin reserve');
});

test('empty text is "none"', () => {
  assert.strictEqual(scCleanTypedText(''), 'none');
  assert.strictEqual(scCleanTypedText('   '), 'none');
  assert.strictEqual(scCleanTypedText(null), 'none');
});

test('emails are not sent', () => {
  assert.strictEqual(scCleanTypedText('juan.perez@gmail.com'), 'filtered');
  assert.strictEqual(scCleanTypedText('Contact me ana@mail'), 'filtered');
});

test('5+ digits in a row are not sent', () => {
  assert.strictEqual(scCleanTypedText('612345678'), 'filtered');
  assert.strictEqual(scCleanTypedText('order 12345'), 'filtered');
  // past the 40-char cut too: checked before cutting
  assert.strictEqual(scCleanTypedText('a very long team name that goes on and on 98765'), 'filtered');
});

test('short numbers (years, 4 digits) are kept', () => {
  assert.strictEqual(scCleanTypedText('Schalke 04'), 'schalke 04');
  assert.strictEqual(scCleanTypedText('Brazil 1970'), 'brazil 1970');
  assert.strictEqual(scCleanTypedText('Hannover 96'), 'hannover 96');
});
