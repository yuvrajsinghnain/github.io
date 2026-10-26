"""
Publishing step for the Yuvraj Singh Nain website.

GitHub runs this automatically every time something is saved (from the admin panel or an upload).
It copies the site into _site/ and, so that Google and social apps can read every page:
  * writes the real text, photos and links into each page (no JavaScript needed to read them),
  * creates a separate page for every artwork: artwork-<name>.html,
  * adds titles, descriptions, preview images (Open Graph) and structured data for Google,
  * creates sitemap.xml and robots.txt,
  * shrinks very large photos so pages load quickly.
The site looks and behaves exactly the same for visitors.
"""
import json, re, shutil, sys, unicodedata, html
from urllib.parse import quote
from datetime import date
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '_site'
SKIP = {'.git', '.github', '_site', 'tools', 'node_modules'}

CAT = {
    'thread': {'label': 'Thread portrait', 'plural': 'Thread portraits', 'page': 'thread.html',
               'medium': 'Thread and nails on board'},
    'pencil': {'label': 'Microsculpture', 'plural': 'Microsculptures', 'page': 'microsculpture.html',
               'medium': 'Pencil graphite, carved by hand'},
}
NAME = 'Yuvraj Singh Nain'


def absu(base, path):
    """Full web address for a file, with spaces and special characters made web-safe."""
    return base + quote(path, safe='/-_.~')


def log(*a):
    print('[prerender]', *a, flush=True)


def load_json(path, fallback):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as e:  # never break publishing because of one bad file
        log('could not read', path.name, e)
        return fallback


def src(p):
    if isinstance(p, dict):
        p = p.get('src') or p.get('path') or ''
    return (p or '').strip().lstrip('/')


def slugify(s):
    """Same rules as slugify() in assets/site.js, so links match."""
    s = unicodedata.normalize('NFKD', (s or 'artwork').lower())
    s = re.sub(r'[^A-Za-z0-9_\s-]', '', s).strip()
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s or 'artwork'


def normalize_works(lst):
    used, out = {}, []
    for w in lst if isinstance(lst, list) else []:
        if not isinstance(w, dict):
            continue
        gal = w.get('gallery') or []
        if not isinstance(gal, list):
            gal = [gal]
        photos = [src(p) for p in [w.get('image'), *gal] if src(p)]
        if not photos:
            continue
        cat = 'pencil' if w.get('category') == 'pencil' else 'thread'
        slug = slugify(w.get('title'))
        if slug in used:
            used[slug] += 1
            slug = f'{slug}-{used[slug]}'
        else:
            used[slug] = 1
        out.append({**w, 'category': cat, 'photos': photos, 'slug': slug, 'caption': w.get('details') or ''})
    return out


def featured(works):
    def pos(w):
        try:
            v = float(w.get('featured_position'))
            return v if v > 0 else None
        except (TypeError, ValueError):
            return None
    picked = [(pos(w) if pos(w) is not None else 1e6 + i, w) for i, w in enumerate(works)
              if pos(w) is not None or w.get('featured') in (True, 'true')]
    picked.sort(key=lambda x: x[0])
    return [w for _, w in picked] or works[:8]


def clip(text, n=158):
    text = re.sub(r'\s+', ' ', text or '').strip()
    return text if len(text) <= n else text[: n - 1].rsplit(' ', 1)[0] + '…'


def whatsapp(site):
    wa = re.sub(r'\D', '', site.get('whatsapp') or '').lstrip('0')
    return '91' + wa if len(wa) == 10 else wa


def instagram_url(site):
    ig = (site.get('instagram') or '').strip()
    if not ig:
        return ''
    return ig if ig.startswith('http') else 'https://instagram.com/' + ig.lstrip('@')


# ---------------------------------------------------------------- page helpers
def set_text(soup, site):
    for el in soup.select('[data-k]'):
        v = site.get(el['data-k'])
        if isinstance(v, str) and v.strip():
            el.string = v


def set_meta(soup, base, path, title, desc, image, kind='website'):
    head = soup.head
    if soup.title:
        soup.title.string = title
    for sel in ['meta[name="description"]', 'meta[property^="og:"]', 'meta[name^="twitter:"]',
                'link[rel="canonical"]', 'meta[name="robots"]']:
        for m in soup.select(sel):
            m.decompose()
    url = base + ('' if path == 'index.html' else path)

    def meta(**attrs):
        t = soup.new_tag('meta')
        for k, v in attrs.items():
            t[k.replace('_', ':') if k.startswith(('og_', 'twitter_')) else k] = v
        head.append(t)

    meta(name='description', content=desc)
    meta(name='robots', content='index, follow, max-image-preview:large')
    link = soup.new_tag('link', rel='canonical', href=url)
    head.append(link)
    for k, v in [('og:type', kind), ('og:site_name', NAME), ('og:title', title), ('og:description', desc),
                 ('og:url', url), ('og:locale', 'en_IN')]:
        t = soup.new_tag('meta'); t['property'] = k; t['content'] = v; head.append(t)
    if image:
        t = soup.new_tag('meta'); t['property'] = 'og:image'; t['content'] = absu(base, image); head.append(t)
    for k, v in [('twitter:card', 'summary_large_image' if image else 'summary'), ('twitter:title', title),
                 ('twitter:description', desc)] + ([('twitter:image', absu(base, image))] if image else []):
        t = soup.new_tag('meta'); t['name'] = k; t['content'] = v; head.append(t)
    gv = (SITE.get('google_verification') or '').strip()
    m = re.search(r'content="([^"]+)"', gv)
    gv = m.group(1) if m else gv
    if gv:
        t = soup.new_tag('meta'); t['name'] = 'google-site-verification'; t['content'] = gv; head.append(t)
    return url


def add_jsonld(soup, data):
    t = soup.new_tag('script', type='application/ld+json')
    t.string = json.dumps(data, ensure_ascii=False, indent=1)
    soup.head.append(t)


def card(soup, w, work_href, extra_class=''):
    c = CAT[w['category']]
    a = soup.new_tag('a', attrs={'class': ('work ' + extra_class).strip(), 'href': work_href(w['slug'])})
    frame = soup.new_tag('div', attrs={'class': 'frame'})
    img = soup.new_tag('img', src=w['photos'][0], alt=f"{w.get('title') or c['label']}, {c['label'].lower()} by {NAME}",
                       loading='lazy', decoding='async')
    frame.append(img)
    if len(w['photos']) > 1:
        s = soup.new_tag('span', attrs={'class': 'count'}); s.string = f"{len(w['photos'])} photos"; frame.append(s)
    if w.get('status') == 'sold':
        s = soup.new_tag('span', attrs={'class': 'sold-tag'}); s.string = 'Sold'; frame.append(s)
    cap = soup.new_tag('div', attrs={'class': 'cap'})
    t = soup.new_tag('span', attrs={'class': 't'}); t.string = w.get('title') or c['label']
    m = soup.new_tag('span', attrs={'class': 'm'}); m.string = w.get('caption') or c['label']
    cap.append(t); cap.append(m); a.append(frame); a.append(cap)
    return a


def fill_shared(soup, site):
    set_text(soup, site)
    hw = soup.select_one('#honours')
    if hw is not None:
        hw.clear()
        for h in site.get('honours') or []:
            if not isinstance(h, dict) or not (h.get('number') or h.get('text')):
                continue
            d = soup.new_tag('div', attrs={'class': 'honour'})
            n = soup.new_tag('span', attrs={'class': 'n' + ('' if re.search(r'\d', h.get('number') or '') else ' word')})
            n.string = h.get('number') or ''
            p = soup.new_tag('p'); p.string = h.get('text') or ''
            d.append(n); d.append(p); hw.append(d)
    rl = soup.select_one('#records-list')
    recs = [r for r in site.get('records') or [] if isinstance(r, str) and r.strip()]
    if rl is not None and recs:
        rl.clear()
        for r in recs:
            li = soup.new_tag('li'); li.string = r; rl.append(li)
        sec = soup.select_one('#records')
        if sec is not None and sec.has_attr('hidden'):
            del sec['hidden']
    # contact links readable without JavaScript
    email, wa, ig = (site.get('email') or '').strip(), whatsapp(site), instagram_url(site)
    for el_id, href, text_id, text in [('c-email', f'mailto:{email}', 'l-email', email) if email else (None,) * 4,
                                       ('c-wa', f'https://wa.me/{wa}', 'l-wa', '+' + wa) if wa else (None,) * 4,
                                       ('c-ig', ig, None, None) if ig else (None,) * 4]:
        if not el_id:
            continue
        a = soup.select_one('#' + el_id)
        if a is not None:
            a['href'] = href
            if a.has_attr('hidden'):
                del a['hidden']
        if text_id:
            l = soup.select_one('#' + text_id)
            if l is not None:
                l.string = text
                if l.has_attr('hidden'):
                    del l['hidden']


def person(base, site):
    same = [u for u in [instagram_url(site)] if u]
    p = {
        '@type': 'Person', '@id': base + '#artist', 'name': NAME, 'url': base,
        'jobTitle': 'Thread portrait artist and pencil tip microsculptor',
        'description': clip(site.get('intro') or '', 300),
        'address': {'@type': 'PostalAddress', 'addressLocality': 'New Delhi', 'addressCountry': 'IN'},
        'knowsAbout': ['String art', 'Thread portraits', 'Microsculpture', 'Pencil tip carving', 'Pencil lead art'],
    }
    if same:
        p['sameAs'] = same
    if src(site.get('about_photo')):
        p['image'] = absu(base, src(site.get('about_photo')))
    recs = [r for r in site.get('records') or [] if isinstance(r, str) and r.strip()]
    if recs:
        p['award'] = [f'India Book of Records: {r}' for r in recs]
    return p


def price_number(text):
    m = re.search(r'(\d[\d,]*(?:\.\d+)?)', text or '')
    if not m or not re.search(r'₹|rs|inr', (text or '').lower()):
        return None
    try:
        return float(m.group(1).replace(',', ''))
    except ValueError:
        return None


# ---------------------------------------------------------------- build
def build():
    global SITE
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for item in ROOT.iterdir():
        if item.name in SKIP:
            continue
        dest = OUT / item.name
        shutil.copytree(item, dest) if item.is_dir() else shutil.copy2(item, dest)

    site = load_json(ROOT / 'content' / 'site.json', {})
    SITE = site
    works = normalize_works(load_json(ROOT / 'content' / 'works.json', []))
    base = (site.get('site_url') or 'https://yuvrajsinghnain.github.io').strip().rstrip('/') + '/'
    log(f'{len(works)} artworks, site address {base}')

    work_href = lambda slug: f'artwork-{slug}.html'
    hero_img = src(site.get('hero_image'))
    first_photo = works[0]['photos'][0] if works else ''
    pages = []  # (path, priority)

    def read(name):
        return BeautifulSoup((ROOT / name).read_text(encoding='utf-8'), 'html.parser')

    def write(name, soup):
        soup.html['data-static'] = '1'
        (OUT / name).write_text(str(soup), encoding='utf-8')

    # ---- home
    soup = read('index.html')
    fill_shared(soup, site)
    url = set_meta(soup, base, 'index.html',
                   f'{NAME} · Thread Portrait Artist & Pencil Tip Microsculptor, New Delhi',
                   clip(f"{NAME} creates thread portraits (string art) and microsculptures carved on pencil tips. "
                        f"New Delhi based, 3 India Book of Records entries. Custom commissions delivered worldwide."),
                   hero_img or first_photo)
    grid = soup.select_one('#grid')
    if grid is not None and works:
        grid.clear()
        shown = featured(works)
        keep, per = set(), {'thread': 0, 'pencil': 0}
        for i, w in enumerate(shown):
            if per[w['category']] < 2:
                per[w['category']] += 1; keep.add(i)
        for i in range(len(shown)):
            if len(keep) < 4:
                keep.add(i)
        for i, w in enumerate(shown):
            grid.append(card(soup, w, work_href, '' if i in keep else 'm-hide'))
    add_jsonld(soup, {'@context': 'https://schema.org', '@graph': [
        {'@type': 'WebSite', '@id': base + '#website', 'url': base, 'name': NAME, 'inLanguage': 'en-IN',
         'publisher': {'@id': base + '#artist'}},
        person(base, site)]})
    write('index.html', soup); pages.append(('', '1.0'))

    # ---- category pages
    for cat, page, title, desc in [
        ('thread', 'thread.html', f'Thread Portraits & String Art by {NAME} · Custom Commissions',
         f'Handmade thread portraits (string art) by {NAME}: faces formed from thread wound across hundreds of nails. '
         'Custom portraits from your photos, delivered across India and worldwide.'),
        ('pencil', 'microsculpture.html', f'Pencil Tip Microsculptures by {NAME} · Pencil Lead Carving',
         f'Microsculptures hand-carved into pencil tips by {NAME}: names, symbols and tiny sculptures in graphite. '
         'Custom pencil carvings and personalised gifts, shipped worldwide.')]:
        soup = read(page)
        fill_shared(soup, site)
        items = [w for w in works if w['category'] == cat]
        cover = items[0]['photos'][0] if items else hero_img
        url = set_meta(soup, base, page, title, clip(desc), cover)
        grid = soup.select_one('#grid')
        if grid is not None and items:
            grid.clear()
            for w in items:
                grid.append(card(soup, w, work_href))
        cnt = soup.select_one('#count')
        if cnt is not None:
            cnt.string = f"{len(items)} work{'s' if len(items) != 1 else ''}"
        add_jsonld(soup, {'@context': 'https://schema.org', '@graph': [
            {'@type': 'CollectionPage', 'name': title, 'url': url, 'description': clip(desc),
             'about': {'@id': base + '#artist'},
             'hasPart': [{'@type': 'VisualArtwork', 'name': w.get('title') or CAT[cat]['label'],
                          'url': base + work_href(w['slug']), 'image': absu(base, w['photos'][0])} for w in items]},
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': base},
                {'@type': 'ListItem', 'position': 2, 'name': CAT[cat]['plural'], 'item': url}]},
            person(base, site)]})
        write(page, soup); pages.append((page, '0.9'))

    # ---- about
    if (ROOT / 'about.html').exists():
        soup = read('about.html')
        fill_shared(soup, site)
        bio_text = site.get('about_bio') or ''
        bio = soup.select_one('#bio')
        if bio is not None and bio_text.strip():
            bio.clear()
            for para in [p.strip() for p in re.split(r'\n\s*\n', bio_text) if p.strip()]:
                p = soup.new_tag('p'); p.string = para; bio.append(p)
        set_meta(soup, base, 'about.html', f'About {NAME} · Thread Artist & Microsculptor, New Delhi',
                 clip(bio_text or f'About {NAME}, New Delhi based thread portrait artist and pencil tip microsculptor.'),
                 src(site.get('about_photo')) or hero_img, 'profile')
        add_jsonld(soup, {'@context': 'https://schema.org', '@graph': [
            {'@type': 'ProfilePage', 'url': base + 'about.html', 'mainEntity': {'@id': base + '#artist'}},
            person(base, site)]})
        write('about.html', soup); pages.append(('about.html', '0.8'))

    # ---- one page per artwork
    template = (ROOT / 'artwork.html').read_text(encoding='utf-8')
    for idx, w in enumerate(works):
        try:
            c = CAT[w['category']]
            soup = BeautifulSoup(template, 'html.parser')
            soup.body['data-slug'] = w['slug']
            fill_shared(soup, site)
            name = w.get('title') or c['label']
            desc_src = w.get('description') or w.get('caption') or ''
            desc = clip(f"{name}: {c['label'].lower()} by {NAME}, New Delhi. {desc_src}".strip())
            path = work_href(w['slug'])
            url = set_meta(soup, base, path, f"{name} · {c['label']} by {NAME}", desc, w['photos'][0], 'article')

            root = soup.select_one('#art-root')
            root.clear()
            sec = soup.new_tag('section', attrs={'class': 'art' + (' ivory' if w['category'] == 'pencil' else '')})
            wrap = soup.new_tag('div', attrs={'class': 'wrap'})
            crumbs = BeautifulSoup(f'<p class="eyebrow art-crumbs"><a href="./">Home</a> <b>/</b> '
                                   f'<a href="{c["page"]}">{c["plural"]}</a></p>', 'html.parser')
            wrap.append(crumbs)
            g = soup.new_tag('div', attrs={'class': 'art-grid'})
            media = soup.new_tag('div', attrs={'class': 'art-media'})
            main = soup.new_tag('div', attrs={'class': 'art-main', 'id': 'art-main'})
            main.append(soup.new_tag('img', src=w['photos'][0], alt=f"{name}, {c['label'].lower()} by {NAME}"))
            media.append(main)
            if len(w['photos']) > 1:
                th = soup.new_tag('div', attrs={'class': 'thumbs', 'id': 'thumbs'})
                for n, p in enumerate(w['photos']):
                    b = soup.new_tag('button', type='button')
                    b.append(soup.new_tag('img', src=p, alt=f'{name}, photo {n + 1}', loading='lazy'))
                    th.append(b)
                media.append(th)
            info = soup.new_tag('div', attrs={'class': 'art-info'})
            h1 = soup.new_tag('h1', id='a-title'); h1.string = name
            info.append(BeautifulSoup(f'<p class="eyebrow">{html.escape(c["label"])}</p>', 'html.parser'))
            info.append(h1)
            if w.get('caption'):
                p = soup.new_tag('p', attrs={'class': 'caption'}); p.string = w['caption']; info.append(p)
            price = str(w.get('price') or '').strip()
            if price or w.get('status') in ('available', 'sold'):
                buy = soup.new_tag('div', attrs={'class': 'buy'})
                if price:
                    s = soup.new_tag('span', attrs={'class': 'price'}); s.string = price; buy.append(s)
                if w.get('status') in ('available', 'sold'):
                    s = soup.new_tag('span', attrs={'class': 'status ' + w['status']})
                    s.string = 'Sold' if w['status'] == 'sold' else 'Available'; buy.append(s)
                info.append(buy)
            dl = soup.new_tag('dl', attrs={'class': 'spec'})
            for k, v in [('Medium', w.get('medium') or c['medium']), ('Size', w.get('size')), ('Year', w.get('year'))]:
                if v:
                    dt = soup.new_tag('dt'); dt.string = k; dd = soup.new_tag('dd'); dd.string = str(v)
                    dl.append(dt); dl.append(dd)
            info.append(dl)
            if w.get('description'):
                p = soup.new_tag('p', attrs={'class': 'desc'}); p.string = w['description']; info.append(p)
            g.append(media); g.append(info); wrap.append(g); sec.append(wrap); root.append(sec)

            art = {'@type': 'VisualArtwork', 'name': name, 'url': url,
                   'image': [absu(base, p) for p in w['photos']], 'description': clip(desc_src or desc, 400),
                   'artMedium': w.get('medium') or c['medium'], 'artform': c['label'],
                   'creator': {'@id': base + '#artist'}}
            if w.get('year'):
                art['dateCreated'] = str(w['year'])
            if w.get('size'):
                art['size'] = str(w['size'])
            amount = price_number(price)
            if amount and w.get('status') != 'sold':
                art['offers'] = {'@type': 'Offer', 'price': amount, 'priceCurrency': 'INR', 'url': url,
                                 'availability': 'https://schema.org/InStock'}
            add_jsonld(soup, {'@context': 'https://schema.org', '@graph': [
                art,
                {'@type': 'BreadcrumbList', 'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': base},
                    {'@type': 'ListItem', 'position': 2, 'name': c['plural'], 'item': base + c['page']},
                    {'@type': 'ListItem', 'position': 3, 'name': name, 'item': url}]},
                person(base, site)]})
            write(path, soup); pages.append((path, '0.7'))
        except Exception as e:
            log('skipped artwork', idx, w.get('title'), e)

    # the old address artwork.html#name keeps working; keep it out of search results
    soup = read('artwork.html')
    set_meta(soup, base, 'artwork.html', f'Artwork · {NAME}', f'An artwork by {NAME}.', hero_img)
    rb = soup.select_one('meta[name="robots"]')
    if rb is not None:
        rb['content'] = 'noindex, follow'
    write('artwork.html', soup)

    # ---- sitemap + robots
    today = date.today().isoformat()
    urls = ''.join(f'  <url><loc>{html.escape(base + p)}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>\n'
                   for p, pr in pages)
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     f'{urls}</urlset>\n', encoding='utf-8')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n', encoding='utf-8')
    (OUT / '.nojekyll').write_text('', encoding='utf-8')
    log(f'wrote {len(pages)} pages + sitemap.xml + robots.txt')

    # ---- shrink very large photos (published copy only; your originals in the repository are untouched)
    try:
        from PIL import Image, ImageOps
        shrunk = 0
        for f in (OUT / 'images').rglob('*'):
            if f.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp') or f.stat().st_size < 400_000:
                continue
            try:
                im = Image.open(f)
                im = ImageOps.exif_transpose(im)
                if max(im.size) > 1800:
                    im.thumbnail((1800, 1800), Image.LANCZOS)
                if f.suffix.lower() in ('.jpg', '.jpeg'):
                    im.convert('RGB').save(f, 'JPEG', quality=82, optimize=True, progressive=True)
                elif f.suffix.lower() == '.webp':
                    im.save(f, 'WEBP', quality=82)
                else:
                    im.save(f, 'PNG', optimize=True)
                shrunk += 1
            except Exception as e:
                log('could not shrink', f.name, e)
        log(f'optimised {shrunk} large photos')
    except ImportError:
        log('Pillow not installed, photos left as they are')


SITE = {}
if __name__ == '__main__':
    build()
