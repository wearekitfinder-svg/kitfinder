#!/usr/bin/env python3
"""Download CFS CSV feeds and build data/cfs.json"""

import urllib.request, csv, json, io, os

AFFILIATE_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate'
BASE_URL = 'https://www.classicfootballshirts.co.uk/'
IMG_BASE = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/'
FEED_CLASSICS = 'https://storage.googleapis.com/cfs_data_feeds/awin/live/awin_classics.csv'
FEED_NEW = 'https://storage.googleapis.com/cfs_data_feeds/awin/live/awin_new.csv'

SIZE_MAP = {
    'XS':'XS','S':'S','M':'M','L':'L','XL':'XL','XXL':'XXL','XXXL':'XXXL',
    '2XL':'XXL','3XL':'XXXL','ONE SIZE':'One size','OS':'One size',
    'S.BOYS':'Kids','M.BOYS':'Kids','L.BOYS':'Kids','XL.BOYS':'Kids'
}

def fetch_csv(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'KitFinder/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode('utf-8', errors='replace')

def shorten_url(url):
    return url.replace(BASE_URL, '').split('?')[0] if url else ''

def shorten_img(img):
    return img.replace(IMG_BASE, '') if img else ''

def parse_row(row, feed_type):
    url = (row.get('child_url') or row.get('parent_url', '')).strip()
    name = row.get('name', '').strip()
    if not url or not name:
        return None
    price_str = (row.get('current_price_GBP') or row.get('price', '0')).replace(',', '.')
    try:
        price = float(price_str)
    except:
        price = 0
    if price <= 0:
        return None
    image = (row.get('product_image') or row.get('parent_image', '')).strip()
    brand = row.get('brand', '').strip()
    condition = row.get('condition', '').strip()
    size_raw = row.get('size', '').strip().upper()
    size = SIZE_MAP.get(size_raw, size_raw if size_raw else '')
    sizes = [size] if size else ['One size']
    season = row.get('seasons', '').strip()
    slug = shorten_url(url)
    uid = 'cfs_' + feed_type[0] + '_' + slug[-20:].replace('/', '_').replace('.', '_').replace('-', '_')
    # Array format: [id, name, brand, season, condition, price, sizes, img, slug, type]
    return [uid, name, brand, season, condition, round(price, 2), sizes, shorten_img(image), slug, feed_type[0]]

print('Downloading classics feed...')
text = fetch_csv(FEED_CLASSICS)
reader = csv.DictReader(io.StringIO(text))
products = []
seen = set()
for row in reader:
    p = parse_row(row, 'classic')
    if p and p[8] not in seen:
        seen.add(p[8])
        products.append(p)
print(f'Classics: {len(products)}')

print('Downloading new feed...')
text2 = fetch_csv(FEED_NEW)
reader2 = csv.DictReader(io.StringIO(text2))
count_new = 0
for row in reader2:
    p = parse_row(row, 'new')
    if p and p[8] not in seen:
        seen.add(p[8])
        products.append(p)
        count_new += 1
print(f'New: {count_new}')
print(f'Total: {len(products)}')

os.makedirs('data', exist_ok=True)
with open('data/cfs.json', 'w') as f:
    json.dump({'p': products, 'c': len(products)}, f, separators=(',', ':'))

size_mb = os.path.getsize('data/cfs.json') / 1024 / 1024
print(f'Saved data/cfs.json: {size_mb:.1f} MB')
