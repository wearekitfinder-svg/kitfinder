// Run: node --test tests/footer-partner.test.js
// Pie de pagina comun (scripts/gen_footer.py): enlace de partner a Those Days (acuerdo del 24/11/2026).
// Cada pagina del sitemap debe llevarlo UNA vez por pie, con la URL de afiliado, en pestana nueva y con
// rel="sponsored" (enlace de partner con comision). /why y /long-sleeve-kits los sirve una funcion de
// Cloudflare a partir de index.html; /clubs, /leagues y /national los sirve la funcion desde sus index.html.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HREF = 'https://thosedays.com/?ref=kitfinder';
const SPA_ROUTES = new Set(['/why', '/long-sleeve-kits']); // functions/*.js -> index.html

function fileFor(urlPath) {
  if (urlPath === '/' || SPA_ROUTES.has(urlPath)) return path.join(ROOT, 'index.html');
  return path.join(ROOT, ...urlPath.split('/').filter(Boolean), 'index.html');
}

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const paths = [...sitemap.matchAll(/<loc>https:\/\/wearekitfinder\.com([^<]*)<\/loc>/g)].map(m => m[1] || '/');

test('the sitemap has pages to check', () => {
  assert.ok(paths.length > 150, `only ${paths.length} URLs in sitemap.xml`);
});

test('every sitemap page has the Those Days partner link once per footer, with the right URL and rel', () => {
  const problems = [];
  for (const p of paths) {
    const f = fileFor(p);
    if (!fs.existsSync(f)) { problems.push(`${p}: no file ${path.relative(ROOT, f)}`); continue; }
    const html = fs.readFileSync(f, 'utf8');
    const footers = [...html.matchAll(/<!-- kf-footer:start -->([\s\S]*?)<!-- kf-footer:end -->/g)].map(m => m[1]);
    if (!footers.length) { problems.push(`${p}: no kf-footer block`); continue; }
    footers.forEach((ft, i) => {
      const links = [...ft.matchAll(/<a [^>]*href="https:\/\/(?:www\.)?thosedays\.com[^"]*"[^>]*>[^<]*<\/a>/g)].map(m => m[0]);
      if (links.length !== 1) { problems.push(`${p} footer ${i + 1}: ${links.length} Those Days links`); return; }
      const a = links[0];
      if (!a.includes(`href="${HREF}"`)) problems.push(`${p}: wrong href ${a}`);
      if (!a.includes('target="_blank"')) problems.push(`${p}: does not open in a new tab`);
      if (!a.includes('rel="sponsored noopener noreferrer"')) problems.push(`${p}: wrong rel`);
      if (!a.includes('data-i18n="footer_partner_td"')) problems.push(`${p}: no i18n key`);
    });
    // Fuera del pie no debe haber otro enlace igual (p. ej. duplicado al regenerar).
    const outside = html.replace(/<!-- kf-footer:start -->[\s\S]*?<!-- kf-footer:end -->/g, '');
    if (outside.includes(HREF)) problems.push(`${p}: partner link outside the footer`);
  }
  assert.deepStrictEqual(problems, []);
});

test('the partner link sits in the Help column, after Contact', () => {
  const html = fs.readFileSync(path.join(ROOT, 'clubs', 'arsenal', 'index.html'), 'utf8');
  assert.match(html, /data-i18n="footer_help">Help<\/h3>\s*<ul>.*data-i18n="footer_contact">Contact<\/a><\/li><li><a href="https:\/\/thosedays\.com\/\?ref=kitfinder"/);
});

test('the footer text is translated in every language file', () => {
  const i18n = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
  assert.ok(i18n.includes('"footer_partner_td": "Partner: Those Days"'), 'missing in i18n.js (en)');
  for (const f of fs.readdirSync(path.join(ROOT, 'lang')).filter(f => /^[a-z]{2}\.js$/.test(f))) {
    const m = fs.readFileSync(path.join(ROOT, 'lang', f), 'utf8').match(/"footer_partner_td": "([^"]+)"/);
    assert.ok(m, `missing in lang/${f}`);
    assert.ok(m[1].includes('Those Days'), `lang/${f}: store name must stay "Those Days"`);
  }
});

test('gen_footer.py is the source of the link (not hand-edited pages)', () => {
  const gen = fs.readFileSync(path.join(ROOT, 'scripts', 'gen_footer.py'), 'utf8');
  assert.ok(gen.includes('PARTNER_URL = "https://thosedays.com/?ref=kitfinder"'));
  assert.ok(gen.includes('rel="sponsored noopener noreferrer"'));
});
