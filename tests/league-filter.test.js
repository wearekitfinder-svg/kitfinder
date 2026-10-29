// Run: node --test tests/league-filter.test.js
// Filtro de liga (app.js): LEAGUE_TEAMS = equipos que se BUSCAN, LEAGUE_DB = nombres que se RECONOCEN.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function readObject(name) {
  const i = src.indexOf('const ' + name + '=');
  assert.ok(i >= 0, name + ' not found');
  let j = src.indexOf('{', i), d = 0, k = j;
  for (; ; k++) { const c = src[k]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
  return eval('(' + src.slice(j, k + 1) + ')'); // trusted: our own file
}
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const TEAMS = readObject('LEAGUE_TEAMS');
const DB = readObject('LEAGUE_DB');

test('the league search no longer cuts the team list to 20', () => {
  assert.ok(!/LEAGUE_TEAMS\[s\]\|\|\[\]\)\.slice\(0,\s*20\)/.test(src));
});

test('La Liga: Sporting and Racing are searched and recognised, in both spellings', () => {
  const laLigaTeams = TEAMS['La Liga'].map(norm);
  for (const t of ['sporting gijon', 'racing santander']) assert.ok(laLigaTeams.includes(t), t + ' not searched');
  const db = DB['La Liga'].map(norm);
  for (const t of ['sporting gijon', 'sporting de gijon', 'real sporting', 'racing santander', 'racing de santander', 'real racing club'])
    assert.ok(db.includes(t), t + ' not recognised');
});

test('La Liga: every searched team is also recognised (no team is searched and then discarded)', () => {
  const db = DB['La Liga'].map(norm);
  const missing = TEAMS['La Liga'].map(norm).filter(t => !db.some(d => d === t || d.includes(t) || t.includes(d)));
  assert.deepStrictEqual(missing, []);
});
