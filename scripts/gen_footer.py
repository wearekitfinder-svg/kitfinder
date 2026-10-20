#!/usr/bin/env python3
"""Pie de pagina comun en todas las paginas publicas de la web.

Pone el mismo pie (4 columnas: Follow us + newsletter, Explore, Help, Legal, y
una barra con el copyright y el aviso de afiliados) en:
  index.html (sus 2 pies: portada y resultados), blog/, teams/, clubs/,
  national/, leagues/ y shirt-checker/.
Estilos en /footer.css y newsletter en /footer.js (misma lista que La Grada);
«Cookie settings» llama a window.kfCookieSettings de /analytics.js.

Idempotente: el pie va entre <!-- kf-footer:start --> y <!-- kf-footer:end -->
y se reescribe entero en cada ejecucion. Tambien pone /footer.css y /footer.js
en el <head> y fija la version de /analytics.js y /i18n.js.

Si se regeneran las paginas de /teams con gen_teams.py (kitfinder-automation),
hay que volver a pasar este script. Lo llama refresh_seo_content.py.

Uso, desde la raiz del repo:  python scripts/gen_footer.py
"""
import glob
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOTER_CSS_V = "2"
FOOTER_JS_V = "1"
ANALYTICS_V = "3"
I18N_V = "16"
DIRS = ["blog", "teams", "clubs", "national", "leagues", "shirt-checker"]

ICONS = {
    "instagram": ('https://www.instagram.com/wearekitfinder/', 'Kit Finder on Instagram',
                  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
                  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/>'
                  '<circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'),
    "x": ('https://x.com/wearekitfinder', 'Kit Finder on X',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 '
          '8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 '
          '4.126H5.117z"/></svg>'),
    "youtube": ('https://www.youtube.com/@KitFinder', 'Kit Finder on YouTube',
                '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
                'stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/>'
                '<path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>'),
    "tiktok": ('https://www.tiktok.com/@wearekitfinder', 'Kit Finder on TikTok',
               '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
               'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/>'
               '<path d="M14 3c.4 2.6 2.3 4.4 5 4.6"/></svg>'),
}


def link(href, key, text, info=None):
    """En la portada About/Privacy/Terms/Affiliate/Contact se abren como hoy
    (showInfo, dentro de la misma pagina); en el resto, su URL."""
    onclick = f' onclick="showInfo(\'{info}\',event)"' if info else ""
    return f'<li><a href="{href}"{onclick} data-i18n="{key}">{text}</a></li>'


def footer_html(home):
    info = (lambda name: name) if home else (lambda name: None)
    social = "".join(
        f'<a href="{u}" target="_blank" rel="noopener noreferrer" aria-label="{lbl}">{svg}</a>'
        for u, lbl, svg in ICONS.values())
    privacy_onclick = ' onclick="showInfo(\'privacy\',event)"' if home else ""
    return "\n".join([
        '<!-- kf-footer:start -->',
        '<footer class="kf-foot">',
        '  <div class="kf-foot-in">',
        '    <div>',
        '      <h3 data-i18n="footer_follow">Follow us</h3>',
        f'      <div class="kf-foot-social">{social}</div>',
        '      <div class="kf-foot-nl">',
        '        <p class="kf-foot-nl-t">Newsletter · <a href="/blog">La Grada</a></p>',
        '        <form novalidate><input type="email" name="email" autocomplete="email" placeholder="Your email" aria-label="Your email" '
        'data-i18n-attr="placeholder:footer_nl_ph;aria-label:footer_nl_ph"><button type="submit" data-i18n="nl_subscribe">Subscribe</button></form>',
        '        <p class="kf-foot-msg" role="status" hidden></p>',
        f'        <p><span data-i18n="footer_nl_accept">By subscribing you accept our</span> <a href="/privacy"{privacy_onclick} '
        'data-i18n="footer_nl_privacy">Privacy policy</a>.</p>',
        '      </div>',
        '    </div>',
        '    <div>',
        '      <h3 data-i18n="footer_explore">Explore</h3>',
        '      <ul>' + link("/clubs", "footer_clubs", "Clubs") + link("/national", "footer_national", "National teams")
        + link("/leagues", "footer_leagues", "Leagues") + link("/teams", "footer_teams", "Teams") + '</ul>',
        '    </div>',
        '    <div>',
        '      <h3 data-i18n="footer_help">Help</h3>',
        '      <ul>' + link("/about", "footer_about", "About", info("about")) + link("/why", "menu_why_kf", "Why Kit Finder?")
        + link("/contact", "footer_contact", "Contact", info("contact")) + '</ul>',
        '    </div>',
        '    <div>',
        '      <h3 data-i18n="footer_legal">Legal</h3>',
        '      <ul>' + link("/privacy", "footer_privacy", "Privacy policy", info("privacy"))
        + link("/terms", "footer_terms", "Terms of use", info("terms"))
        + link("/affiliate", "footer_affiliate", "Affiliate disclosure", info("affiliate"))
        + '<li><button type="button" class="kf-foot-linkbtn" onclick="window.kfCookieSettings&&kfCookieSettings(event)" '
        'data-i18n="footer_cookie_settings">Cookie settings</button></li></ul>',
        '    </div>',
        '  </div>',
        '  <div class="kf-foot-bar"><p data-i18n="footer_copy">© 2026 Kit Finder. Kit Finder may earn a commission if you buy '
        'through our links. This doesn’t change the price you pay. All trademarks belong to their respective owners.</p></div>',
        '</footer>',
        '<!-- kf-footer:end -->',
    ])


HEAD = (f'<link rel="stylesheet" href="/footer.css?v={FOOTER_CSS_V}" id="kf-footer-css">\n'
        f'<script src="/footer.js?v={FOOTER_JS_V}" defer id="kf-footer-js"></script>')
MARK = re.compile(r"<!-- kf-footer:start -->.*?<!-- kf-footer:end -->", re.S)


def process(path, home):
    t = open(path, encoding="utf-8", newline="").read()
    nl = "\r\n" if "\r\n" in t else "\n"
    t = orig = t.replace("\r\n", "\n")
    block = footer_html(home)
    if MARK.search(t):
        t = MARK.sub(lambda m: block, t)
    elif home:
        # los 2 pies de la portada (dentro de #landingFooter y al final de resultados)
        t, n = re.subn(r"<footer>\s*<div class=\"footer-inner\">.*?</footer>", lambda m: block, t, flags=re.S)
        if n != 2:
            raise SystemExit(f"index.html: esperaba 2 pies, hay {n}")
    elif '<footer class="site-footer">' in t:   # blog
        t = re.sub(r'<footer class="site-footer">.*?</footer>', lambda m: block, t, count=1, flags=re.S)
    elif "</body>" in t:
        t = t.replace("</body>", block + "\n</body>", 1)
    else:
        print(f"  SKIP {path}: sin </body>")
        return False
    # head: footer.css + footer.js una sola vez
    t = re.sub(r'<link rel="stylesheet" href="/footer\.css[^"]*" id="kf-footer-css">\n?', "", t)
    t = re.sub(r'<script src="/footer\.js[^"]*" defer id="kf-footer-js"></script>\n?', "", t)
    t = t.replace("</head>", HEAD + "\n</head>", 1)
    # versiones de los scripts compartidos (cambian con este pie)
    t = re.sub(r'/analytics\.js(\?v=\d+)?"', f'/analytics.js?v={ANALYTICS_V}"', t)
    t = re.sub(r'/i18n\.js(\?v=\d+)?"', f'/i18n.js?v={I18N_V}"', t)
    if t != orig:
        open(path, "w", encoding="utf-8", newline="").write(t.replace("\n", nl))
        return True
    return False


def main():
    pages = [os.path.join(REPO, "index.html")]
    for d in DIRS:
        pages += sorted(glob.glob(os.path.join(REPO, d, "**", "index.html"), recursive=True))
    changed = 0
    for p in pages:
        if process(p, home=os.path.dirname(p) == REPO):
            changed += 1
    print(f"{len(pages)} paginas revisadas, {changed} actualizadas.")


if __name__ == "__main__":
    main()
