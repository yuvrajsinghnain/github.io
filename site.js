/* Shared script for every page of the site.
   Content comes from content/site.json and content/works.json, which the admin panel edits. */
(() => {
  const PAGE = document.body.dataset.page || 'home';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const DEFAULT_SITE = {
    tagline:"New Delhi, India · Thread artist & microsculptor",
    heading_line1:"Drawn in thread.", heading_line2:"Carved in graphite.",
    intro:"Yuvraj Singh Nain builds portraits from thread wound across nails and sculpts miniature forms into the tips of pencils. Each piece is made by hand, one at a time, for collectors around the world.",
    honours:[{number:"3",text:"Records registered with the India Book of Records"},{number:"50+",text:"International commissions delivered to collectors abroad"},{number:"Shared",text:"by celebrities on their Instagram profiles"}],
    records:[],
    micro_heading:"A sculpture smaller than a grain of rice.",
    micro_text:"Working under magnification, Yuvraj carves letters, figures and symbols directly into the graphite tip of an ordinary pencil. The material is brittle and forgives nothing: one slip and the work is lost.",
    micro_image:"",
    thread_heading:"Faces that appear from thousands of lines.",
    thread_text:"Hundreds of nails are set into a board, then thread is wound from nail to nail, line over line, until a likeness emerges. Up close it is pure geometry; step back and a person looks out at you.",
    thread_image:"",
    contact_heading_1:"Have something", contact_heading_2:"made for you.",
    contact_text:"Tell me what you have in mind: a portrait of someone you love, a name carved in graphite, a gift no one else will have.",
    email:"", whatsapp:"", instagram:""
  };
  const CAT = {
    thread:{label:'Thread portrait', plural:'Thread portraits', page:'thread.html', medium:'Thread and nails on board'},
    pencil:{label:'Microsculpture', plural:'Microsculptures', page:'microsculpture.html', medium:'Pencil graphite, carved by hand'}
  };

  const getJSON = async (path, fallback) => {
    try { const r = await fetch(path, {cache:'no-cache'}); if (!r.ok) throw 0; return await r.json(); }
    catch(e){ return fallback; }
  };
  /* Paths saved by the admin panel may start with "/"; make them relative so the site works at any address. */
  const src = p => (typeof p === 'string' ? p : (p && (p.src || p.path)) || '').trim().replace(/^\/+/, '');
  const slugify = s => (s || 'artwork').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/[\s_]+/g,'-').replace(/-+/g,'-') || 'artwork';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BRASS = getComputedStyle(document.documentElement).getPropertyValue('--brass').trim() || '#B99B67';

  /* ---------- canvas drawing ---------- */
  function fit(cv, ratio){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    const w = Math.max(60, r.width || 400);
    const h = ratio ? w * ratio : Math.max(60, r.height || w);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx, w, h};
  }
  function pencil(ctx, w, h, v){
    ctx.fillStyle = '#0F0F0E'; ctx.fillRect(0,0,w,h);
    const sp = ctx.createRadialGradient(w/2,h*0.3,10,w/2,h*0.35,h*0.75);
    sp.addColorStop(0,'rgba(236,231,221,0.10)'); sp.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = sp; ctx.fillRect(0,0,w,h);
    const cx = w/2, bw = w*0.30, cw = bw*0.2, yBody = h*0.66, yCone = h*0.45, yCore = h*0.36;
    const paintC = ['#1d1f24','#2a1f1a','#1b2320','#24202a'][v%4];
    const bg = ctx.createLinearGradient(cx-bw/2,0,cx+bw/2,0);
    bg.addColorStop(0,'#0b0b0d'); bg.addColorStop(.35,paintC); bg.addColorStop(.5,'#3a3c42'); bg.addColorStop(.62,paintC); bg.addColorStop(1,'#0b0b0d');
    ctx.fillStyle = bg; ctx.fillRect(cx-bw/2,yBody,bw,h-yBody);
    ctx.strokeStyle = 'rgba(185,155,103,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx-bw/2,yBody+h*0.06); ctx.lineTo(cx+bw/2,yBody+h*0.06); ctx.stroke();
    const wg = ctx.createLinearGradient(cx-bw/2,0,cx+bw/2,0);
    wg.addColorStop(0,'#5b4128'); wg.addColorStop(.45,'#c99b6a'); wg.addColorStop(.55,'#d8b083'); wg.addColorStop(1,'#4a331f');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(cx-bw/2,yBody); ctx.lineTo(cx-cw/2,yCone); ctx.lineTo(cx+cw/2,yCone); ctx.lineTo(cx+bw/2,yBody);
    for (let k=5;k>=0;k--){ const x = cx-bw/2 + bw*k/5; ctx.quadraticCurveTo(x+bw/10, yBody+h*0.012, x, yBody); }
    ctx.closePath(); ctx.fill();
    const gg = ctx.createLinearGradient(cx-cw,0,cx+cw,0);
    gg.addColorStop(0,'#26272b'); gg.addColorStop(.45,'#8d9099'); gg.addColorStop(.55,'#b9bcc4'); gg.addColorStop(1,'#2a2b30');
    ctx.fillStyle = gg; ctx.strokeStyle = gg;
    ctx.fillRect(cx-cw/2,yCore,cw,yCone-yCore+1);
    const s = cw*1.6, ty = yCore - s*0.55;
    ctx.save(); ctx.translate(cx,ty);
    if (v%4===0){ ctx.beginPath(); ctx.moveTo(0,s*0.5); ctx.bezierCurveTo(-s*0.9,-s*0.05,-s*0.45,-s*0.75,0,-s*0.3); ctx.bezierCurveTo(s*0.45,-s*0.75,s*0.9,-s*0.05,0,s*0.5); ctx.fill(); }
    else if (v%4===1){ ctx.lineWidth = cw*0.28; ctx.beginPath(); ctx.ellipse(0,-s*0.25,cw*0.42,s*0.38,0,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0,s*0.32,cw*0.42,s*0.3,0,0,Math.PI*2); ctx.stroke(); }
    else if (v%4===2){ ctx.beginPath(); ctx.moveTo(-s*0.5,s*0.5); ctx.lineTo(-s*0.55,-s*0.35); ctx.lineTo(-s*0.25,0); ctx.lineTo(0,-s*0.55); ctx.lineTo(s*0.25,0); ctx.lineTo(s*0.55,-s*0.35); ctx.lineTo(s*0.5,s*0.5); ctx.closePath(); ctx.fill(); }
    else { ctx.lineWidth = cw*0.22; ctx.beginPath(); for (let t=0;t<=1;t+=0.01){ const y = s*0.55 - t*s*1.3; const x = Math.sin(t*Math.PI*5)*cw*0.5; t===0?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.stroke(); ctx.beginPath(); ctx.arc(0,-s*0.8,cw*0.22,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
  function thread(ctx, w, h, v){
    ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0,0,w,h);
    const pad = w*0.1;
    ctx.strokeStyle = 'rgba(17,18,20,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(pad*0.5,pad*0.5,w-pad,h-pad);
    const cx = w/2, cy = h/2, R = Math.min(w,h)/2 - pad, N = 180, k = [2,3,5,7.04,11,1.5][v%6];
    const pts = Array.from({length:N}, (_,i) => { const a = i/N*Math.PI*2 - Math.PI/2; return [cx+R*Math.cos(a), cy+R*Math.sin(a)]; });
    ctx.lineWidth = Math.max(.3, w/800); ctx.strokeStyle = 'rgba(17,18,20,0.55)';
    for (let i=0;i<N;i++){ const j = Math.floor(i*k)%N; ctx.beginPath(); ctx.moveTo(pts[i][0],pts[i][1]); ctx.lineTo(pts[j][0],pts[j][1]); ctx.stroke(); }
    ctx.fillStyle = '#5c4a2c';
    pts.forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,Math.max(.6,w/700),0,Math.PI*2); ctx.fill(); });
  }
  function paint(cv){
    const {ctx,w,h} = fit(cv, cv.dataset.ratio ? +cv.dataset.ratio : 0);
    (cv.dataset.kind==='pencil'?pencil:thread)(ctx,w,h,+cv.dataset.v||0);
  }
  function drawing(kind, v, ratio){
    const cv = document.createElement('canvas');
    cv.dataset.kind = kind; cv.dataset.v = v; if (ratio) cv.dataset.ratio = ratio;
    cv.setAttribute('aria-hidden','true');
    requestAnimationFrame(() => paint(cv));
    return cv;
  }
  function photoEl(photo, kind, alt, ratio, lazy){
    if (typeof photo === 'number') return drawing(kind, photo, ratio);
    const img = new Image(); img.src = src(photo); img.alt = alt || ''; img.decoding = 'async';
    if (lazy) img.loading = 'lazy';
    return img;
  }

  /* hero loom */
  let loomTimer;
  function drawLoom(){
    const loom = $('#loom'); if (!loom) return;
    cancelAnimationFrame(loomTimer);
    const {ctx, w, h} = fit(loom);
    const N = 240, cx = w/2, cy = h/2, R = Math.min(w,h)*0.44;
    const pts = Array.from({length:N}, (_,i) => { const a = i/N*Math.PI*2 - Math.PI/2; return [cx + R*Math.cos(a), cy + R*Math.sin(a)]; });
    const seq = []; let cur = 0;
    for (let i=0;i<N*2;i++){ seq.push(cur); cur = (cur + 97 + (i%3===0?13:0)) % N; }
    ctx.clearRect(0,0,w,h);
    const g = ctx.createRadialGradient(cx,cy,R*0.1,cx,cy,R*1.15);
    g.addColorStop(0,'rgba(238,235,229,0.06)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = BRASS;
    pts.forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,1.3,0,Math.PI*2); ctx.fill(); });
    ctx.lineWidth = .45; ctx.strokeStyle = 'rgba(238,235,229,0.32)';
    const seg = i => { const a = pts[seq[i]], b = pts[seq[i+1]]; ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); };
    if (reduce){ for (let i=0;i<seq.length-1;i++) seg(i); return; }
    let i = 0; const start = Math.floor(seq.length/3);
    for (; i<start; i++) seg(i);
    const step = () => { for (let k=0;k<6 && i<seq.length-1;k++,i++) seg(i); if (i<seq.length-1) loomTimer = requestAnimationFrame(step); };
    loomTimer = requestAnimationFrame(step);
  }

  /* ---------- data ---------- */
  const PLACEHOLDERS = [
    ['thread',0],['thread',1],['pencil',0],['thread',2],['pencil',1],['thread',4],['pencil',2],['pencil',3]
  ].map(([c,v],i) => ({
    category:c, placeholder:true,
    title: CAT[c].label + ' (example)',
    caption:'Placeholder',
    photos:[v, v+1, v+2],
    description:'This is an example entry. Add your own artwork in the admin panel and it will replace these examples.',
    slug:'example-' + (i+1)
  }));

  function normalizeWorks(list){
    const used = {};
    return (Array.isArray(list) ? list : []).map(w => {
      if (!w) return null;
      const photos = [w.image, ...(Array.isArray(w.gallery) ? w.gallery : (w.gallery ? [w.gallery] : []))]
        .flat().map(src).filter(Boolean);
      if (!photos.length) return null;
      const category = w.category === 'pencil' ? 'pencil' : 'thread';
      let slug = slugify(w.title); if (used[slug]) slug += '-' + (++used[slug]); else used[slug] = 1;
      return {...w, category, photos, slug, caption: w.details || ''};
    }).filter(Boolean);
  }

  /* ---------- shared pieces ---------- */
  function applySite(s){
    $$('[data-k]').forEach(el => { const v = s[el.dataset.k]; if (typeof v === 'string' && v.trim()) el.textContent = v; });

    const hw = $('#honours');
    if (hw){
      const hon = (s.honours || []).filter(h => h && (h.number || h.text));
      hw.innerHTML = ''; hw.style.setProperty('--cols', Math.max(1, Math.min(hon.length, 4)));
      hon.forEach(h => {
        const d = document.createElement('div'); d.className = 'honour';
        const n = document.createElement('span'); n.className = 'n' + (/\d/.test(h.number||'') ? '' : ' word'); n.textContent = h.number || '';
        const p = document.createElement('p'); p.textContent = h.text || '';
        d.append(n, p); hw.appendChild(d);
      });
      hw.parentElement.hidden = !hon.length;
    }
    const rl = $('#records-list');
    if (rl){
      const recs = (s.records || []).filter(r => typeof r === 'string' && r.trim());
      rl.innerHTML = '';
      recs.forEach(r => { const li = document.createElement('li'); li.textContent = r; rl.appendChild(li); });
      $('#records').hidden = !recs.length;
    }
    // looping videos take priority; the photo (if any) is used as the still frame while the video loads
    [['#loom-wrap', s.hero_video, ''], ['#micro-plate', s.micro_video, s.micro_image], ['#thread-plate', s.thread_video, s.thread_image]].forEach(([sel, vid, poster]) => {
      const fig = $(sel); if (!fig || !src(vid) || fig.classList.contains('has-video')) return;
      fig.querySelectorAll('canvas,img').forEach(n => n.remove());
      if (sel === '#loom-wrap') cancelAnimationFrame(loomTimer);
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('aria-hidden','true');
      if (src(poster)) v.poster = src(poster);
      v.src = src(vid);
      fig.prepend(v); fig.classList.add('has-video','has-photo');
      if (!reduce){
        v.autoplay = true; v.setAttribute('autoplay','');
        const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
        if ('IntersectionObserver' in window){
          new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? tryPlay() : v.pause()), {threshold:.15}).observe(fig);
        } else tryPlay();
      }
    });
    [['#micro-plate', s.micro_image, 'Microsculpture by Yuvraj Singh Nain'], ['#thread-plate', s.thread_image, 'Thread portrait by Yuvraj Singh Nain']].forEach(([sel, im, alt]) => {
      const fig = $(sel); if (!fig || !im || fig.classList.contains('has-photo')) return;
      const img = new Image(); img.src = src(im); img.alt = alt; img.decoding = 'async';
      const old = fig.querySelector('canvas'); if (old) old.replaceWith(img);
      fig.classList.add('has-photo');
    });
    contactLinks(s);
  }

  let CONTACT = {};
  function contactLinks(s, about){
    const email = (s.email||'').trim(), wa = (s.whatsapp||'').replace(/[^\d]/g,''), ig = (s.instagram||'').trim();
    CONTACT = {email, wa, ig};
    const subject = about ? 'Enquiry: ' + about : 'Custom artwork enquiry';
    const msg = about ? 'Hello Yuvraj, I am interested in "' + about + '" and would like to commission something similar.' : 'Hello Yuvraj, I would like to commission an artwork.';
    const set = (id, href, text, lineId) => {
      const a = document.getElementById(id); if (!a) return;
      a.href = href; a.hidden = false;
      if (lineId){ const l = document.getElementById(lineId); if (l){ l.textContent = text; l.hidden = false; } }
    };
    if (email) set('c-email', 'mailto:' + email + '?subject=' + encodeURIComponent(subject), email, 'l-email');
    if (wa) set('c-wa', 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg), '+' + wa, 'l-wa');
    if (ig) set('c-ig', /^https?:\/\//.test(ig) ? ig : 'https://instagram.com/' + ig.replace(/^@/,''));
    const note = $('#contact-note'); if (note) note.hidden = !!(email || wa || ig);
  }

  function card(w){
    const a = document.createElement('a'); a.className = 'work'; a.href = 'artwork.html#' + w.slug;
    const frame = document.createElement('div'); frame.className = 'frame';
    frame.appendChild(photoEl(w.photos[0], w.category, w.title, 1.25, true));
    if (w.photos.length > 1){ const c = document.createElement('span'); c.className = 'count'; c.textContent = w.photos.length + ' photos'; frame.appendChild(c); }
    const cap = document.createElement('div'); cap.className = 'cap';
    const t = document.createElement('span'); t.className = 't'; t.textContent = w.title || CAT[w.category].label;
    const m = document.createElement('span'); m.className = 'm'; m.textContent = w.caption || CAT[w.category].label;
    cap.append(t, m); a.append(frame, cap);
    return a;
  }
  function fillGrid(grid, list){ grid.innerHTML = ''; list.forEach(w => grid.appendChild(card(w))); }

  /* ---------- pages ---------- */
  function home(works, isExample){
    const grid = $('#grid'); if (!grid) return;
    fillGrid(grid, works.slice(0, 8));
    $('#empty-note').hidden = !isExample;
  }

  function category(works, isExample){
    const cat = document.body.dataset.cat;
    const list = works.filter(w => w.category === cat);
    const grid = $('#grid');
    fillGrid(grid, list);
    $('#count').textContent = list.length + (list.length === 1 ? ' work' : ' works');
    $('#empty-note').hidden = !isExample;
    const none = $('#none'); if (none) none.hidden = !!list.length;
  }

  function artwork(works, site){
    const root = $('#art-root');
    function render(){
      const slug = decodeURIComponent(location.hash.slice(1));
      const i = works.findIndex(w => w.slug === slug);
      const w = works[i];
      if (!w){
        root.innerHTML = '';
        const sec = document.createElement('section'); sec.className = 'wrap missing';
        sec.innerHTML = '<p class="eyebrow">Not found</p><h2>This artwork could not be found.</h2><p class="lede"></p><a class="btn" href="./#collection">Back to the collection</a>';
        root.appendChild(sec); document.title = 'Artwork · Yuvraj Singh Nain'; return;
      }
      const c = CAT[w.category];
      const sameCat = works.filter(x => x.category === w.category);
      const j = sameCat.indexOf(w);
      const prev = sameCat[(j - 1 + sameCat.length) % sameCat.length], next = sameCat[(j + 1) % sameCat.length];
      document.title = (w.title || c.label) + ' · Yuvraj Singh Nain';

      root.innerHTML = '';
      const sec = document.createElement('section');
      sec.className = 'art' + (w.category === 'thread' ? ' ivory' : '');
      sec.innerHTML = `
        <div class="wrap">
          <p class="eyebrow art-crumbs"><a href="./">Home</a> <b>/</b> <a href="${c.page}">${c.plural}</a></p>
          <div class="art-grid">
            <div class="art-media">
              <div class="art-main" id="art-main" role="button" tabindex="0" aria-label="View photo full screen"></div>
              <div class="thumbs" id="thumbs" role="group" aria-label="Photos of this artwork"></div>
            </div>
            <div class="art-info">
              <p class="eyebrow"><b>${w.category === 'thread' ? 'I' : 'II'}</b> &nbsp;${c.label}</p>
              <h1 id="a-title"></h1>
              <p class="caption" id="a-caption"></p>
              <dl class="spec" id="a-spec"></dl>
              <p class="desc" id="a-desc"></p>
              <div class="ctas" id="a-ctas"></div>
              <nav class="art-pager" aria-label="More ${c.plural.toLowerCase()}"></nav>
            </div>
          </div>
        </div>`;
      root.appendChild(sec);

      sec.querySelector('#a-title').textContent = w.title || c.label;
      const capEl = sec.querySelector('#a-caption'); capEl.textContent = w.caption || ''; capEl.hidden = !w.caption;
      const spec = sec.querySelector('#a-spec');
      [['Medium', w.medium || c.medium], ['Size', w.size], ['Year', w.year]].forEach(([k, v]) => {
        if (!v) return; const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; spec.append(dt, dd);
      });
      const desc = sec.querySelector('#a-desc'); desc.textContent = w.description || ''; desc.hidden = !w.description;

      // commission buttons for this piece
      const ctas = sec.querySelector('#a-ctas');
      const about = w.title || c.label;
      const msg = 'Hello Yuvraj, I am interested in "' + about + '" and would like to commission something similar.';
      if (CONTACT.wa){ const a = document.createElement('a'); a.className = 'btn'; a.target = '_blank'; a.rel = 'noopener'; a.href = 'https://wa.me/' + CONTACT.wa + '?text=' + encodeURIComponent(msg); a.textContent = 'Enquire on WhatsApp'; ctas.appendChild(a); }
      if (CONTACT.email){ const a = document.createElement('a'); a.className = CONTACT.wa ? 'btn ghost' : 'btn'; a.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Enquiry: ' + about) + '&body=' + encodeURIComponent(msg); a.textContent = 'Enquire by email'; ctas.appendChild(a); }
      if (!CONTACT.wa && !CONTACT.email){ const a = document.createElement('a'); a.className = 'btn'; a.href = '#contact'; a.textContent = 'Commission a similar piece'; ctas.appendChild(a); }

      const pager = sec.querySelector('.art-pager');
      if (sameCat.length > 1){
        [[prev,'Previous'],[next,'Next']].forEach(([x,label]) => {
          const a = document.createElement('a'); a.href = 'artwork.html#' + x.slug;
          const e = document.createElement('span'); e.className = 'eyebrow'; e.textContent = label;
          const t = document.createElement('span'); t.className = 't'; t.textContent = x.title || c.label;
          a.append(e, t); pager.appendChild(a);
        });
      } else pager.hidden = true;

      // photos
      const main = sec.querySelector('#art-main'), thumbs = sec.querySelector('#thumbs');
      let cur = 0;
      const show = k => {
        cur = (k + w.photos.length) % w.photos.length;
        main.querySelectorAll('img,canvas').forEach(n => n.remove());
        main.prepend(photoEl(w.photos[cur], w.category, (w.title || c.label) + ', photo ' + (cur+1), 1.25));
        [...thumbs.children].forEach((b, n) => b.setAttribute('aria-current', String(n === cur)));
      };
      if (w.photos.length > 1){
        w.photos.forEach((p, n) => {
          const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Show photo ' + (n+1));
          b.appendChild(photoEl(p, w.category, '', 1.25, true));
          b.addEventListener('click', () => show(n)); thumbs.appendChild(b);
        });
        ['prev','next'].forEach(d => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'arrow ' + d;
          b.setAttribute('aria-label', d === 'prev' ? 'Previous photo' : 'Next photo'); b.textContent = d === 'prev' ? '←' : '→';
          b.addEventListener('click', e => { e.stopPropagation(); show(cur + (d === 'prev' ? -1 : 1)); });
          main.appendChild(b);
        });
      } else thumbs.hidden = true;
      show(0);

      const openZoom = () => zoom(w.photos[cur], w.category);
      main.addEventListener('click', openZoom);
      main.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openZoom(); } });
      document.onkeydown = e => {
        if ($('.zoom')) return;
        if (e.target.closest && e.target.closest('input,textarea')) return;
        if (e.key === 'ArrowLeft' && w.photos.length > 1) show(cur - 1);
        if (e.key === 'ArrowRight' && w.photos.length > 1) show(cur + 1);
      };
      window.scrollTo(0, 0);
    }
    render();
    addEventListener('hashchange', render);
  }

  function zoom(photo, kind){
    const z = document.createElement('div'); z.className = 'zoom'; z.setAttribute('role','dialog'); z.setAttribute('aria-modal','true'); z.setAttribute('aria-label','Photo');
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close';
    const el = photoEl(photo, kind, '', 1.25);
    z.append(el, close); document.body.appendChild(z); document.body.style.overflow = 'hidden'; close.focus();
    const done = () => { z.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') done(); };
    z.addEventListener('click', done); document.addEventListener('keydown', esc);
  }

  /* ---------- boot ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  applySite(DEFAULT_SITE);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { drawLoom(); $$('canvas[data-kind]').forEach(paint); });

  Promise.all([getJSON('content/site.json', DEFAULT_SITE), getJSON('content/works.json', [])]).then(([site, list]) => {
    const s = {...DEFAULT_SITE, ...(site || {})};
    applySite(s);
    const real = normalizeWorks(list);
    const isExample = !real.length;
    const works = isExample ? PLACEHOLDERS : real;
    if (PAGE === 'home') home(works, isExample);
    if (PAGE === 'category') category(works, isExample);
    if (PAGE === 'artwork') artwork(works, s);
  });

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { drawLoom(); $$('canvas[data-kind]').forEach(paint); }, 200); });
})();
