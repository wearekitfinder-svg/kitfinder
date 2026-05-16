#!/usr/bin/env python3
"""Download all store catalogs and build compressed JSON files"""

import urllib.request, json, os, gzip, io, csv, sys

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

AFF_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate'
BASE_CFS = 'https://www.classicfootballshirts.co.uk/'
IMG_BASE = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/'

# ── CFS ──────────────────────────────────────────────────────────────────────

FEED_CLASSICS = 'https://storage.googleapis.com/cfs_data_feeds/awin/live/awin_classics.csv'
FEED_NEW      = 'https://storage.googleapis.com/cfs_data_feeds/awin/live/awin_new.csv'
SIZE_MAP = {'XS':'XS','S':'S','M':'M','L':'L','XL':'XL','XXL':'XXL','XXXL':'XXXL',
            '2XL':'XXL','3XL':'XXXL','ONE SIZE':'One size','OS':'One size',
            'S.BOYS':'Kids','M.BOYS':'Kids','L.BOYS':'Kids','XL.BOYS':'Kids'}

def fetch_url(url, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': 'KitFinder/1.0 (Mozilla/5.0)'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='replace')

def parse_cfs_row(row, feed_type):
    url = (row.get('child_url') or row.get('parent_url', '')).strip()
    name = row.get('name', '').strip()
    if not url or not name: return None
    try: price = float((row.get('current_price_GBP') or row.get('price','0')).replace(',','.'))
    except: price = 0
    if price <= 0: return None
    image = (row.get('product_image') or row.get('parent_image','')).strip()
    brand = row.get('brand','').strip()
    condition = row.get('condition','').strip()
    size_raw = row.get('size','').strip().upper()
    size = SIZE_MAP.get(size_raw, size_raw or '')
    sizes = [size] if size else ['One size']
    season = row.get('seasons','').strip()
    slug = url.replace(BASE_CFS,'').split('?')[0]
    img_short = image.replace(IMG_BASE,'') if image else ''
    uid = 'cfs_' + feed_type[0] + '_' + slug[-20:].replace('/','_').replace('.','_').replace('-','_')
    return [uid, name, brand, season, condition, round(price,2), sizes, img_short, slug, feed_type[0]]

print('=== Building CFS ===')
products_cfs = []
seen_cfs = set()
for feed, ftype in [(FEED_CLASSICS,'classic'), (FEED_NEW,'new')]:
    print(f'  Downloading {ftype}...')
    text = fetch_url(feed)
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        p = parse_cfs_row(row, ftype)
        if p and p[8] not in seen_cfs:
            seen_cfs.add(p[8])
            products_cfs.append(p)
    print(f'  {ftype}: {len(products_cfs)} total so far')

cfs_path = os.path.join(DATA_DIR, 'cfs.json')
with open(cfs_path, 'w') as f:
    json.dump({'p': products_cfs, 'c': len(products_cfs)}, f, separators=(',',':'))
print(f'  cfs.json: {os.path.getsize(cfs_path)/1024/1024:.1f} MB ({len(products_cfs)} products)')

# ── SHOPIFY ───────────────────────────────────────────────────────────────────

SHOPIFY_STORES = [
    {'url':'https://awaydayskits.com','currency':'EUR'},
    {'url':'https://www.cultkits.com','currency':'EUR'},
    {'url':'https://eldiezfootball.com','currency':'EUR'},
    {'url':'https://camiclasica.com','currency':'EUR'},
    {'url':'https://tspncalcio.com','currency':'EUR'},
    {'url':'https://www.cultfootball.co.uk','currency':'GBP'},
    {'url':'https://www.footballfinery.co.uk','currency':'GBP'},
    {'url':'https://footballtrikotsberlin.com','currency':'EUR'},
    {'url':'https://futmaniacos.com','currency':'EUR'},
    {'url':'https://stunner.store','currency':'EUR'},
    {'url':'https://thesoccerarchive.com','currency':'USD'},
    {'url':'https://retroriginalfootball.com','currency':'GBP'},
    {'url':'https://thefootballroom-mty.com','currency':'EUR'},
    {'url':'https://www.vintagefootballshirts.com','currency':'GBP'},
    {'url':'https://grannysfootballstore.com','currency':'EUR'},
    {'url':'https://houseoffootballshirts.com','currency':'GBP'},
    {'url':'https://kitlaunchfc.com','currency':'GBP'},
    {'url':'https://firststreet.store','currency':'EUR'},
    {'url':'https://infinityfootballshirts.com','currency':'EUR'},
    {'url':'https://elitekits.ch','currency':'EUR'},
    {'url':'https://jsfootballshirts.com','currency':'GBP'},
    {'url':'https://www.jappyfootballclothing.com','currency':'GBP'},
    {'url':'https://footballshirtunion.com','currency':'EUR'},
    {'url':'https://saturdaysfootball.com','currency':'GBP'},
    {'url':'https://kickoffvintage.com','currency':'EUR'},
    {'url':'https://squadrafootball.com','currency':'EUR'},
    {'url':'https://iconicjersey.com','currency':'EUR'},
    {'url':'https://casualfootballshirts.co.uk','currency':'GBP'},
    {'url':'https://shearerscupboard.com.au','currency':'AUD'},
    {'url':'https://classic11.com','currency':'EUR'},
    {'url':'https://vintagesportsclothing.com','currency':'EUR'},
    {'url':'https://www.thekitdealer.com','currency':'GBP'},
    {'url':'https://niclasico.co.uk','currency':'GBP'},
    {'url':'https://www.senseofgoal.com','currency':'EUR'},
    {'url':'https://jersely.com','currency':'EUR'},
    {'url':'https://yaelitomix.com','currency':'EUR'},
    {'url':'https://1892footballshirts.co.uk','currency':'GBP'},
    {'url':'https://esdeepoca.com','currency':'EUR'},
    {'url':'https://www.vintagefootballarea.com','currency':'EUR'},
    {'url':'https://retroshirts.ch','currency':'EUR'},
    {'url':'https://sistineshirts.com','currency':'EUR'},
    {'url':'https://realvintagefootball.com','currency':'EUR'},
    {'url':'https://44trikots.com','currency':'EUR'},
    {'url':'https://nostalgicfootballshirts.com','currency':'EUR'},
    {'url':'https://1kloppshop.com','currency':'EUR'},
    {'url':'https://soyvillamelon.es','currency':'EUR'},
    {'url':'https://footballshirtcollective.com','currency':'GBP'},
    {'url':'https://cultfavefootballshirts.com','currency':'GBP'},
    {'url':'https://first11shirts.com','currency':'GBP'},
    {'url':'https://www.retrofootballshirts.com','currency':'GBP'},
    {'url':'https://mysteryjerseyking.com','currency':'GBP'},
    {'url':'https://retroscreamers.com','currency':'EUR'},
    {'url':'https://www.thefootballidiots.com','currency':'GBP'},
    {'url':'https://tiffozifutbol.com','currency':'EUR'},
    {'url':'https://brechodofutebol.com','currency':'BRL'},
    {'url':'https://www.le7sorelle.it','currency':'EUR'},
    {'url':'https://www.vintage-football-jerseys.co.uk','currency':'GBP'},
    {'url':'https://football-curated.com','currency':'GBP'},
    {'url':'https://www.foreversoccerjerseys.com','currency':'USD'},
    {'url':'https://footballshirtkingdom.com','currency':'EUR'},
    {'url':'https://calciovintage.com','currency':'EUR'},
    {'url':'https://fshoppen.dk','currency':'DKK'},
    {'url':'https://www.footballshirts.ie','currency':'EUR'},
    {'url':'https://onemoretimeshop.it','currency':'EUR'},
    {'url':'https://www.devoetbaltempel.nl','currency':'EUR'},
    {'url':'https://stajerseys.com','currency':'USD'},
    {'url':'https://kainkuno.id','currency':'IDR'},
    {'url':'https://trikotparadies.shop','currency':'EUR'},
    {'url':'https://fulltimefits.com','currency':'EUR'},
    {'url':'https://ohcalcio.com','currency':'EUR'},
    {'url':'https://greensportvintage.com','currency':'EUR'},
    {'url':'https://crooklynvintage.com','currency':'USD'},
    {'url':'https://kitplug.co','currency':'GBP'},
    {'url':'https://www.secondfootballshirts.dk','currency':'DKK'},
    {'url':'https://buysellfootballshirts.co.uk','currency':'GBP'},
    {'url':'https://retroiscooler.com','currency':'EUR'},
    {'url':'https://www.legacyfootballshirts.com','currency':'GBP'},
    {'url':'https://www.golacokits.com','currency':'EUR'},
    {'url':'https://www.offsideboys.com','currency':'EUR'},
    {'url':'https://pfcvintage.com','currency':'EUR'},
    {'url':'https://footballfutbolclub.com','currency':'EUR'},
    {'url':'https://eternalpitch.com','currency':'EUR'},
    {'url':'https://www.footballandshirts.com','currency':'GBP'},
    {'url':'https://retrofootballshirt.com','currency':'EUR'},
]

def fetch_shopify_store(url):
    products = []
    base = url.rstrip('/')
    for page in range(1, 20):
        try:
            req = urllib.request.Request(
                f'{base}/products.json?limit=250&page={page}',
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                d = json.load(r)
                items = d.get('products', [])
                if not items: break
                products.extend(items)
                if len(items) < 250: break
        except: break
    return products

print('\n=== Building Shopify ===')
products_shopify = []
seen_shopify = set()
for store in SHOPIFY_STORES:
    url = store['url']
    currency = store['currency']
    store_name = url.replace('https://','').replace('www.','').split('.')[0].title()
    items = fetch_shopify_store(url)
    count = 0
    for p in items:
        title = p.get('title','').strip()
        if not title: continue
        variants = p.get('variants', [])
        price = 0
        for v in variants:
            if v.get('available', True):
                try: price = float(v.get('price','0')); break
                except: pass
        if price <= 0: continue
        slug = p.get('handle','')
        product_url = f'{url.rstrip("/")}/products/{slug}'
        if product_url in seen_shopify: continue
        seen_shopify.add(product_url)
        imgs = [i.get('src','') for i in p.get('images',[]) if i.get('src')]
        uid = f's_{p["id"]}'
        products_shopify.append([uid, title, round(price,2), currency, imgs[0] if imgs else None, product_url, store_name])
        count += 1
    print(f'  {count:4d}  {url}')
    sys.stdout.flush()

shopify_path = os.path.join(DATA_DIR, 'shopify.json.gz')
raw = json.dumps({'p': products_shopify, 'c': len(products_shopify)}, separators=(',',':')).encode('utf-8')
with gzip.open(shopify_path, 'wb', compresslevel=9) as f:
    f.write(raw)
print(f'  shopify.json.gz: {os.path.getsize(shopify_path)/1024/1024:.1f} MB ({len(products_shopify)} products)')

# ── WOOCOMMERCE ───────────────────────────────────────────────────────────────

WOO_STORES = [
    {'name':'Retro Calcio Shirts','url':'https://retrocalcioshirts.com','currency':'EUR'},
    {'name':'RB Jerseys','url':'https://www.rb-jerseys.com','currency':'USD'},
    {'name':'Football Legends Kits','url':'https://footballlegendskits.com','currency':'EUR'},
    {'name':'Football Thrift Shop','url':'https://footballthrift.shop','currency':'PLN'},
    {'name':'Kickback','url':'https://kickback.pl','currency':'PLN'},
    {'name':'The Third Kit','url':'https://thethirdkit.co.uk','currency':'GBP'},
    {'name':'Historic Football Shirts','url':'https://historicfootballshirts.co.uk','currency':'GBP'},
    {'name':'Football Second Hand','url':'https://footballsecondhand.com','currency':'PLN'},
    {'name':'Valde Vintage','url':'https://valdevintage.com','currency':'EUR'},
    {'name':'Nr10 Store','url':'https://nr10.store','currency':'EUR'},
    {'name':'Kitroom Football','url':'https://www.kitroomfootball.com','currency':'GBP'},
    {'name':'Football Time Capsule','url':'https://thefootballtimecapsule.com','currency':'USD'},
    {'name':'Goalmarkt','url':'https://goalmarkt.com','currency':'IDR'},
    {'name':'Back to the Football','url':'https://backtothefootball.com','currency':'EUR'},
    {'name':'Maglie Calcio Vintage','url':'https://www.magliecalciovintage.it','currency':'EUR'},
    {'name':'Football World GS','url':'https://footballworldgs.it','currency':'EUR'},
    {'name':'Arsij Store','url':'https://www.arsijstore.com','currency':'EUR'},
    {'name':'Vintage Maillots','url':'https://vintagemaillots.com','currency':'EUR'},
]

def fetch_woo_store(url):
    products = []
    base = url.rstrip('/')
    for page in range(1, 20):
        try:
            req = urllib.request.Request(
                f'{base}/wp-json/wc/store/v1/products?per_page=100&page={page}',
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                items = json.load(r)
                if not items: break
                products.extend(items)
                if len(items) < 100: break
        except: break
    return products

print('\n=== Building WooCommerce ===')
products_woo = []
seen_woo = set()
for store in WOO_STORES:
    items = fetch_woo_store(store['url'])
    count = 0
    for p in items:
        name = p.get('name','').strip()
        if not name: continue
        prices = p.get('prices',{})
        minor = prices.get('currency_minor_unit', 2)
        try: price = int(prices.get('price','0') or 0) / (10**minor)
        except: price = 0
        if price <= 0: continue
        purl = p.get('permalink', store['url'])
        if purl in seen_woo: continue
        seen_woo.add(purl)
        imgs = p.get('images',[])
        image = imgs[0].get('src','') if imgs else None
        uid = f'w_{p["id"]}'
        products_woo.append([uid, name, round(price,2), store['currency'], image, purl, store['name']])
        count += 1
    print(f'  {count:4d}  {store["url"]}')
    sys.stdout.flush()

woo_path = os.path.join(DATA_DIR, 'woo.json.gz')
raw = json.dumps({'p': products_woo, 'c': len(products_woo)}, separators=(',',':')).encode('utf-8')
with gzip.open(woo_path, 'wb', compresslevel=9) as f:
    f.write(raw)
print(f'  woo.json.gz: {os.path.getsize(woo_path)/1024/1024:.1f} MB ({len(products_woo)} products)')

total_mb = sum(os.path.getsize(os.path.join(DATA_DIR, f)) for f in ['cfs.json','shopify.json.gz','woo.json.gz']) / 1024 / 1024
total_products = len(products_cfs) + len(products_shopify) + len(products_woo)
print(f'\n✓ Done: {total_products} products, {total_mb:.1f} MB total')
