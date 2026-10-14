/* PAWSIGN website behaviour: language, content building, animation and interaction. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) { root.classList.add('reduce'); root.classList.remove('intro'); }
  const reduce = root.classList.contains('reduce');
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const { LINES, SHOPS, FACTORIES, MARKETS, WORDS, ZH, T } = window;
  const P = 'assets/products/', G = 'assets/gallery/', C = 'assets/cutouts/';

  /* ======================= Language ======================= */
  const EN = {};
  $$('[data-i18n]').forEach(el => { if (!(el.dataset.i18n in EN)) EN[el.dataset.i18n] = el.innerHTML; });
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const q = new URLSearchParams(location.search).get('lang');
  const lang = (q === 'zh' || q === 'en') ? q
    : (store.get('lang') || ((navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'));
  if (q) store.set('lang', q);
  const tr = k => (lang === 'zh' ? (ZH[k] ?? EN[k]) : EN[k]) ?? '';
  const t = T[lang];
  if (lang === 'zh') {
    root.lang = 'zh-CN';
    $$('[data-i18n]').forEach(el => { const v = ZH[el.dataset.i18n]; if (v !== undefined) el.innerHTML = v; });
  }
  document.title = t.title;
  const langLink = $('#lang');
  if (lang === 'zh') { langLink.textContent = 'EN'; langLink.href = '?lang=en'; langLink.lang = 'en'; langLink.hreflang = 'en'; langLink.setAttribute('aria-label', 'Switch to English'); }
  else { langLink.setAttribute('aria-label', '切换到中文'); }
  langLink.addEventListener('click', () => { store.set('lang', lang === 'zh' ? 'en' : 'zh'); try { sessionStorage.setItem('pw-intro', '1'); } catch (e) {} });

  /* ======================= Number formats ======================= */
  const fmt = (v, kind) => {
    if (kind === 'm') return lang === 'zh' ? Math.round(v / 1e4) + '万' : (v / 1e6).toFixed(2) + 'M';
    if (kind === 'plus') return Math.round(v) + '+';
    if (kind === 'comma') return Math.round(v).toLocaleString('en-US');
    return String(Math.round(v));
  };
  $$('.count').forEach(el => { if (el.dataset.to) el.textContent = fmt(+el.dataset.to, el.dataset.fmt); });
  $('.s1 b').textContent = fmt(1450000, 'm');

  /* ======================= Build: word band ======================= */
  const colors = ['#ffd84d', '#9fd4ff', '#ffb8cc', '#9fe6c8', '#cdbcff', '#ffc7a1', '#ffa98f', '#ecd9bd'];
  const wordsHTML = WORDS[lang].map((w, i) => `<span>${w}</span><i style="color:${colors[i % colors.length]}"><svg><use href="#paw"/></svg></i>`).join('');
  $('#words-track').innerHTML = wordsHTML + wordsHTML;

  /* ======================= Build: collections ======================= */
  const total = l => l.img.length + l.more;
  $('#coll-track').innerHTML = LINES.map((l, i) => {
    const c = l[lang], n = Math.min(4, l.cut);
    const art = Array.from({ length: n }, (_, k) => `<img class="a${k + 1}" src="${C}${l.id}-${k + 1}.webp" alt="" loading="lazy" data-depth="${[0.6, 1.4, 1.1, 0.9][k]}">`).join('');
    return `<article class="coll" style="--c:${l.color};--k:${l.ink}">
      <div class="coll-info">
        <span class="coll-idx">${String(i + 1).padStart(2, '0')} / ${String(LINES.length).padStart(2, '0')}</span>
        <h3>${c.t}</h3><p>${c.d}</p>
        <dl><dt>${t.madeAt}</dt><dd>${c.made}</dd><dt>${t.capacity}</dt><dd>${c.cap}</dd></dl>
        <div class="coll-count"><b>${total(l)}</b><span>${t.products}</span></div>
        <button class="btn btn-dark magnetic" type="button" data-line="${i}"><span>${t.explore(total(l))}</span><svg><use href="#arrow"/></svg></button>
      </div>
      <div class="coll-art" data-cursor="view">${art}</div>
    </article>`;
  }).join('') + `<article class="coll-end"><h3>${lang === 'zh' ? '想做新款？' : 'Have a new idea?'}</h3>
      <p>${lang === 'zh' ? '发来草图或参考图，我们会在下单前为您打样。' : 'Send us a sketch or a reference photo. We will make a sample before you order.'}</p>
      <a class="btn btn-orange magnetic" href="#contact"><span>${tr('cta.quote')}</span><svg><use href="#arrow"/></svg></a></article>`;

  /* ======================= Build: explorer ======================= */
  let current = 0, expanded = false;
  const tabsEl = $('#tabs');
  tabsEl.setAttribute('aria-label', t.tablist);
  tabsEl.innerHTML = LINES.map((l, i) => `<button class="tab" role="tab" type="button" id="tab-${l.id}" aria-controls="panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" style="--c:${l.color}">
    <i><img src="${C}${l.id}-1.webp" alt=""></i>${l[lang].tab}<small>${total(l)}</small></button>`).join('');
  const photosOf = l => [...l.img.map(n => P + n + '.jpg'), ...Array.from({ length: l.more }, (_, k) => `${G}${l.id}-${String(k + 1).padStart(2, '0')}.jpg`)];
  function showLine(i, animate = true) {
    if (i !== current) expanded = false;
    current = i;
    const l = LINES[i], c = l[lang];
    $$('.tab', tabsEl).forEach((tb, k) => { tb.setAttribute('aria-selected', k === i); tb.tabIndex = k === i ? 0 : -1; });
    const panel = $('#panel');
    panel.setAttribute('aria-labelledby', 'tab-' + l.id);
    panel.style.background = `color-mix(in srgb, ${l.color} 32%, #fff)`;
    $('#p-title').textContent = c.t; $('#p-desc').textContent = c.d; $('#p-made').textContent = c.made; $('#p-cap').textContent = c.cap;
    const all = photosOf(l), shown = expanded ? all : all.slice(0, 8);
    const grid = $('#p-grid');
    grid.innerHTML = shown.map((src, k) => `<button type="button" data-k="${k}" data-cursor="view" aria-label="${t.enlarge} ${k + 1}: ${c.t}"><img loading="lazy" src="${src}" alt="${c.t}"></button>`).join('');
    panel.classList.toggle('all', expanded);
    $('#p-count').textContent = expanded ? t.all(all.length) : t.showing(shown.length, all.length);
    $('#p-more-label').textContent = expanded ? t.fewer : t.viewAll(all.length);
    $('#p-more').setAttribute('aria-expanded', expanded);
    if (animate && !reduce) gsap.from(grid.children, { y: 30, opacity: 0, scale: .94, duration: .6, ease: 'power3.out', stagger: { each: .03, from: 'start' } });
    if (hasGsap) ScrollTrigger.refresh();
  }
  tabsEl.addEventListener('click', e => { const tb = e.target.closest('.tab'); if (tb) showLine([...tabsEl.children].indexOf(tb)); });
  tabsEl.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let i = current;
    if (e.key === 'ArrowRight') i = (i + 1) % LINES.length;
    if (e.key === 'ArrowLeft') i = (i - 1 + LINES.length) % LINES.length;
    if (e.key === 'Home') i = 0;
    if (e.key === 'End') i = LINES.length - 1;
    showLine(i); tabsEl.children[i].focus();
  });
  $('#p-more').addEventListener('click', () => {
    expanded = !expanded; showLine(current);
    if (!expanded) scrollToEl($('#products'));
  });
  $('#p-quote').addEventListener('click', () => { $('#product').value = LINES[current].en.t; });
  $('#coll-track').addEventListener('click', e => {
    const b = e.target.closest('[data-line]'); if (!b) return;
    showLine(+b.dataset.line); scrollToEl($('#products'));
  });

  // Quote form product list
  $('#product').innerHTML = LINES.map(l => `<option value="${l.en.t}">${l[lang].t}</option>`).join('') + `<option value="Several products">${t.several}</option>`;

  /* ======================= Build: retailer logos ======================= */
  const logoSpans = list => list.map(([f, n]) => `<span><img src="assets/logos/${f}.png" alt="${n}" loading="lazy"></span>`).join('');
  const rowA = SHOPS.slice(0, 6), rowB = SHOPS.slice(6);
  $('#logos-a').innerHTML = logoSpans(rowA) + logoSpans(rowA).replace(/alt="[^"]*"/g, 'alt=""') + logoSpans(rowA).replace(/alt="[^"]*"/g, 'alt=""');
  $('#logos-b').innerHTML = logoSpans(rowB) + logoSpans(rowB).replace(/alt="[^"]*"/g, 'alt=""') + logoSpans(rowB).replace(/alt="[^"]*"/g, 'alt=""');

  /* ======================= Build: route map ======================= */
  const NS = 'http://www.w3.org/2000/svg';
  const paths = $('#route-paths'), nodes = $('#route-nodes');
  MARKETS.forEach((m, i) => {
    const y = 40 + i * 72, d = `M188 220 C 430 220, 560 ${y}, 780 ${y}`;
    paths.insertAdjacentHTML('beforeend',
      `<path class="path-glow" d="${d}" stroke="${m.color}"/><path class="path" id="rp-${i}" d="${d}" stroke="${m.color}"/>
       <circle class="mover" r="5" fill="${m.color}" style="color:${m.color}">${reduce ? '' : `<animateMotion dur="3.4s" begin="${(i * 0.45).toFixed(2)}s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".4 0 .2 1"><mpath href="#rp-${i}"/></animateMotion>`}</circle>`);
    nodes.insertAdjacentHTML('beforeend',
      `<g class="node" transform="translate(790 ${y})"><rect class="node-pill" x="0" y="-25" width="200" height="50" rx="25"/>
       <image href="assets/flags/${m.flag}.png" x="16" y="-11" width="32" height="22" preserveAspectRatio="xMidYMid slice"/>
       <text class="node-label" x="60" y="6">${tr(m.key)}</text></g>`);
  });

  /* ======================= Factories ======================= */
  let fac = 0;
  function fillFactory(i, instant) {
    const f = FACTORIES[i], c = f[lang];
    $('#fac-name').textContent = f.name; $('#fac-desc').textContent = c.desc; $('#fac-products').textContent = c.products;
    $('#fac-work').textContent = c.work; $('#fac-addr').textContent = f.addr;
    $('#fac-img').src = f.img; $('#fac-img').alt = f.name; $('#fac-badge').src = f.badge;
    const a = $('#fac-area'), tm = $('#fac-team');
    if (instant || reduce) { a.textContent = fmt(f.area, 'comma'); tm.textContent = fmt(f.team, 'int'); }
    else { countTo(a, f.area, 'comma', 1, +a.dataset.v || 0); countTo(tm, f.team, 'int', 1, +tm.dataset.v || 0); }
    a.dataset.v = f.area; tm.dataset.v = f.team;
  }
  fillFactory(0, true);
  $$('.fac-tab').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.f; if (i === fac) return; fac = i;
    $$('.fac-tab').forEach(x => x.setAttribute('aria-selected', x === b));
    if (reduce) return fillFactory(i, true);
    const img = $('.fac-photo'), info = $('.fac-info');
    gsap.timeline()
      .to(img, { clipPath: 'inset(0% 0% 0% 100%)', duration: .45, ease: 'power3.in' }, 0)
      .to(info, { opacity: 0, y: 14, duration: .3, ease: 'power2.in' }, 0)
      .add(() => fillFactory(i))
      .fromTo(img, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .7, ease: 'power3.out' })
      .to(info, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, '<.1');
  }));

  /* ======================= Smooth anchor scrolling ======================= */
  function scrollToEl(el) {
    if (!el) return;
    const top = el === document.body || el.id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); const el = id ? document.getElementById(id) : document.body;
    if (!el) return; e.preventDefault(); closeMenu(); scrollToEl(el);
  });

  /* ======================= Mobile menu ======================= */
  const menuBtn = $('#menu-btn'), nav = $('#site-nav'), head = $('#site-head');
  function closeMenu() { nav.classList.remove('open'); head.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  menuBtn.setAttribute('aria-label', t.menu);
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); head.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : '';
  });

  /* ======================= Lightbox ======================= */
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  lb.setAttribute('aria-label', t.lightbox); $('#lb-prev').setAttribute('aria-label', t.prev); $('#lb-next').setAttribute('aria-label', t.next);
  let lastFocus = null, lbList = [], lbAt = 0;
  function lbShow(k) {
    lbAt = (k + lbList.length) % lbList.length;
    lbImg.src = lbList[lbAt]; lbImg.alt = LINES[current][lang].t;
    lbCap.textContent = `${LINES[current][lang].t} · ${lbAt + 1} / ${lbList.length}`;
    if (!reduce) gsap.fromTo(lbImg, { scale: .96, opacity: 0 }, { scale: 1, opacity: 1, duration: .35, ease: 'power2.out' });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('.grid8 button'); if (!b) return;
    lbList = photosOf(LINES[current]); lastFocus = b;
    lbShow(+b.dataset.k); lb.classList.add('open'); $('#lb-close').focus();
  });
  const closeLb = () => { if (!lb.classList.contains('open')) return; lb.classList.remove('open'); if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus(); };
  $('#lb-close').addEventListener('click', closeLb);
  $('#lb-prev').addEventListener('click', () => lbShow(lbAt - 1));
  $('#lb-next').addEventListener('click', () => lbShow(lbAt + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLb(); closeMenu(); }
    if (!lb.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') lbShow(lbAt - 1);
    if (e.key === 'ArrowRight') lbShow(lbAt + 1);
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) lbShow(lbAt + (dx < 0 ? 1 : -1)); touchX = null; });

  /* ======================= Quote form ======================= */
  // Quote requests are emailed to this address through FormSubmit (formsubmit.co).
  // To send them somewhere else, change it here and in the form's action attribute.
  const QUOTE_EMAIL = 'ryan@gladpaws.com.cn';
  const quote = $('#quote');
  quote.addEventListener('submit', async e => {
    e.preventDefault();
    const sendBtn = $('#send'), statusEl = $('#form-status');
    const f = new FormData(quote);
    if (f.get('_honey')) return;
    const data = Object.fromEntries(f.entries());
    delete data._honey;
    data._subject = `Quote request: ${data.product} from ${data.company}`;
    data._replyto = data.email;
    data.site_language = lang === 'zh' ? 'Chinese' : 'English';
    const label = sendBtn.querySelector('span'), orig = label.textContent;
    sendBtn.disabled = true; label.textContent = t.sending;
    statusEl.className = 'form-note'; statusEl.textContent = t.sendingNote;
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${QUOTE_EMAIL}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      quote.innerHTML = `<div class="sent" role="status"><div class="tick">✓</div><h3>${t.sentH}</h3><p>${t.sent(esc(data.name), esc(data.email))}</p></div>`;
      confetti(quote);
    } catch (err) {
      const body = `Name: ${data.name}\nCompany: ${data.company}\nEmail: ${data.email}\nCountry: ${data.country}\nProduct: ${data.product}\nQuantity: ${data.qty}\n\n${data.msg}`;
      const mailto = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent(data._subject)}&body=${encodeURIComponent(body)}`;
      statusEl.className = 'form-note error'; statusEl.innerHTML = t.fail(mailto, QUOTE_EMAIL);
      sendBtn.disabled = false; label.textContent = orig;
    }
  });
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function confetti(box) {
    if (reduce) return;
    const r = box.getBoundingClientRect();
    for (let i = 0; i < 28; i++) {
      const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'confetti');
      s.innerHTML = '<use href="#paw"/>'; s.style.color = colors[i % colors.length]; s.style.fill = colors[i % colors.length];
      s.style.left = (r.width * .15) + 'px'; s.style.top = '40px'; box.appendChild(s);
      gsap.fromTo(s, { scale: 0, rotation: 0 }, { x: gsap.utils.random(-60, r.width * .9), y: gsap.utils.random(-120, 260), rotation: gsap.utils.random(-200, 200),
        scale: gsap.utils.random(.6, 1.4), duration: gsap.utils.random(1, 1.8), ease: 'power3.out', onComplete: () => gsap.to(s, { opacity: 0, duration: .4, onComplete: () => s.remove() }) });
    }
  }

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ======================= Counters ======================= */
  function countTo(el, to, kind, dur = 2, from = 0) {
    if (reduce) { el.textContent = fmt(to, kind); return; }
    const o = { v: from };
    gsap.to(o, { v: to, duration: dur, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, kind); } });
  }

  showLine(0, false);

  /* ======================= Motion ======================= */
  if (reduce) { root.classList.remove('intro'); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'power3.out' });

  // ---- Split headings into masked words (characters for Chinese)
  const zh = lang === 'zh';
  const splits = $$('.split').map(el => SplitText.create(el, { type: zh ? 'chars' : 'words', mask: zh ? 'chars' : 'words', charsClass: 'sc', wordsClass: 'sw' }));
  const heroSplit = $$('.hero-title .line').map(el => SplitText.create(el, { type: 'words,chars', mask: 'lines', wordsClass: 'hw', charsClass: 'hc' }));

  // ---- Hero intro
  function heroIntro(delay = 0) {
    const tl = gsap.timeline({ delay });
    tl.from('.head-row', { y: -40, opacity: 0, duration: .8 }, 0)
      .from('.hero-tag', { y: 20, opacity: 0, duration: .7 }, .1)
      .from(heroSplit.flatMap(s => s.chars), { yPercent: 115, rotate: 8, duration: 1, stagger: .025, ease: 'expo.out' }, .15)
      .from('.hero-lead', { y: 24, opacity: 0, duration: .8 }, .55)
      .from('.hero-btns > *', { y: 24, opacity: 0, duration: .7, stagger: .08 }, .65)
      .from('.tile', { scale: .5, opacity: 0, rotate: '+=18', duration: 1.2, stagger: { each: .09, from: 'random' }, ease: 'back.out(1.5)' }, .2)
      .from('.floater', { scale: 0, opacity: 0, duration: .8, stagger: .12, ease: 'back.out(2)' }, .8)
      .add(startHeroCycle, 1.6)
      .from('.sticker', { scale: 0, opacity: 0, duration: .7, stagger: .15, ease: 'back.out(2)' }, .9)
      .from('.hero-foot > *', { y: 20, opacity: 0, duration: .7, stagger: .08 }, .9);
    return tl;
  }

  // ---- Hero pictures change one after another
  const HERO = window.HERO || [];
  HERO.flat().forEach(n => { const im = new Image(); im.src = C + n + '.webp'; });   // preload
  const heroPos = HERO.map(() => 0);
  const order = [0, 3, 1, 4, 2, 5];
  let heroStep = 0, heroCall = null, heroOn = true;
  function swapNext() {
    const tIdx = order[heroStep % order.length]; heroStep++;
    const tile = $$('.tile')[tIdx]; const ti = tile && tile.querySelector('.ti'); const img = ti && ti.querySelector('img');
    if (img && HERO[tIdx]) {
      heroPos[tIdx] = (heroPos[tIdx] + 1) % HERO[tIdx].length;
      const src = C + HERO[tIdx][heroPos[tIdx]] + '.webp';
      gsap.timeline()
        .to(ti, { scale: .55, rotate: -14, opacity: 0, y: -18, duration: .45, ease: 'back.in(1.6)' })
        .add(() => { img.src = src; })
        .fromTo(ti, { scale: .55, rotate: 16, opacity: 0, y: 26 }, { scale: 1, rotate: 0, opacity: 1, y: 0, duration: .8, ease: 'back.out(1.7)' })
        .fromTo(tile, { scale: 1 }, { scale: 1.04, duration: .25, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '<');
    }
    heroCall = gsap.delayedCall(1.5, () => { if (heroOn) swapNext(); });
  }
  function startHeroCycle() { if (!heroCall && HERO.length) heroCall = gsap.delayedCall(1, swapNext); }
  ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top',
    onToggle: self => { heroOn = self.isActive; if (heroOn && heroCall && !heroCall.isActive()) swapNext(); } });
  document.addEventListener('visibilitychange', () => { heroOn = !document.hidden; if (heroOn && heroCall && !heroCall.isActive()) swapNext(); });

  // ---- Preloader
  if (root.classList.contains('intro')) {
    root.style.overflow = 'hidden';
    const imgs = $$('img').filter(i => i.loading !== 'lazy');
    let loaded = 0; const prog = { v: 0 };
    const numEl = $('#loader-num'), barEl = $('#loader-bar');
    const show = () => { numEl.textContent = Math.round(prog.v); barEl.style.transform = `scaleX(${prog.v / 100})`; };
    const tick = () => gsap.to(prog, { v: Math.max(prog.v, (loaded / imgs.length) * 100), duration: .5, ease: 'power1.out', onUpdate: show });
    imgs.forEach(i => { if (i.complete) loaded++; else { i.addEventListener('load', () => { loaded++; tick(); }, { once: true }); i.addEventListener('error', () => { loaded++; tick(); }, { once: true }); } });
    tick();
    gsap.from('.loader-inner img', { scale: .6, opacity: 0, duration: .9, ease: 'back.out(1.7)' });
    gsap.from('.loader-word', { letterSpacing: '1.2em', opacity: 0, duration: 1.2, ease: 'expo.out', delay: .1 });
    const start = performance.now();
    const finish = () => {
      gsap.to(prog, { v: 100, duration: .4, onUpdate: show, onComplete: () => {
        try { sessionStorage.setItem('pw-intro', '1'); } catch (e) {}
        gsap.timeline()
          .to('.loader-inner, .loader-count', { y: -40, opacity: 0, duration: .5, ease: 'power3.in' })
          .to('.curtain', { y: '0%', duration: .7, ease: 'expo.inOut' }, .2)
          .set('.loader', { display: 'none' })
          .to('.curtain', { y: '-100%', duration: .8, ease: 'expo.inOut' })
          .add(() => { root.style.overflow = ''; root.classList.remove('intro'); ScrollTrigger.refresh(); })
          .add(heroIntro(), '-=.5');
      } });
    };
    const ready = () => setTimeout(finish, Math.max(0, 1300 - (performance.now() - start)));
    let done = false; const once = () => { if (!done) { done = true; ready(); } };
    window.addEventListener('load', once); setTimeout(once, 3500);
  } else {
    heroIntro(.05);
  }

  // ---- Header + progress bar
  const headST = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => {
    const y = self.scroll();
    head.classList.toggle('scrolled', y > 20);
    if (!nav.classList.contains('open')) head.classList.toggle('hide', self.direction === 1 && y > 500);
    $('#progress').style.transform = `scaleX(${self.progress})`;
  } });

  // ---- Floating quote button: after the hero, hidden over the contact form
  ScrollTrigger.create({ trigger: '.numbers', start: 'top 60%', endTrigger: '#contact', end: 'top 80%',
    onToggle: self => $('#fab').classList.toggle('show', self.isActive) });

  // ---- Hero parallax (scroll + mouse)
  $$('.hero-stage [data-speed]').forEach(el => {
    gsap.to(el, { y: () => (1 - parseFloat(el.dataset.speed)) * 260, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });
  if (fine) {
    const hero = $('#hero'), tiles = $$('.tile'), depth = [18, -26, 12, -32, 22, -16];
    hero.addEventListener('mousemove', e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      tiles.forEach((tl, i) => { tl.style.translate = `${x * depth[i]}px ${y * depth[i]}px`; });
    });
    tiles.forEach(tl => { tl.style.transition = 'translate .8s cubic-bezier(.22,1,.36,1)'; });
  }

  // ---- Word band: endless loop that speeds up and reverses with the scroll
  const wordsLoop = gsap.to('#words-track', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
  let dir = 1;
  ScrollTrigger.create({ trigger: '.words', start: 'top bottom', end: 'bottom top', onUpdate: self => {
    dir = self.direction;
    const v = Math.min(Math.abs(self.getVelocity()) / 200, 6);
    gsap.to(wordsLoop, { timeScale: dir * (1 + v), duration: .2, overwrite: true });
    gsap.to(wordsLoop, { timeScale: dir, duration: 1.2, delay: .2, overwrite: false });
  } });


  // ---- Numbers count up
  $$('.numbers .count').forEach((el, i) => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true,
    onEnter: () => countTo(el, +el.dataset.to, el.dataset.fmt, 2.2) }));
  gsap.from('.num', { y: 50, opacity: 0, duration: 1, stagger: .12, scrollTrigger: { trigger: '.numbers', start: 'top 75%' } });
  gsap.to('.b1', { x: 200, y: 120, scrollTrigger: { trigger: '.numbers', scrub: true } });
  gsap.to('.b2', { x: -200, y: -100, scrollTrigger: { trigger: '.numbers', scrub: true } });

  // ---- Split headings reveal
  splits.forEach(s => {
    gsap.from(zh ? s.chars : s.words, { yPercent: 110, duration: 1, stagger: zh ? .03 : .06, ease: 'expo.out',
      scrollTrigger: { trigger: s.elements[0], start: 'top 85%' } });
  });
  // Paragraphs next to headings
  $$('.sec-head p, .coll-head p, .cta-inner p, .clients-head p').forEach(p =>
    gsap.from(p, { y: 30, opacity: 0, duration: 1, delay: .15, scrollTrigger: { trigger: p, start: 'top 88%' } }));

  // ---- Collections: pinned horizontal scroll on large screens
  const mm = gsap.matchMedia();
  mm.add('(min-width: 981px)', () => {
    const track = $('#coll-track');
    const dist = () => track.scrollWidth - innerWidth;
    const horiz = gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#coll-pin', start: 'center 54%', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
    $$('.coll').forEach(card => {
      $$('.coll-art img', card).forEach(img => {
        const d = parseFloat(img.dataset.depth);
        gsap.fromTo(img, { xPercent: 30 * d }, { xPercent: -30 * d, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: horiz, start: 'left right', end: 'right left', scrub: true } });
      });
      gsap.from($$('.coll-info > *', card), { y: 40, opacity: 0, duration: .8, stagger: .06,
        scrollTrigger: { trigger: card, containerAnimation: horiz, start: 'left 75%' } });
    });
  });
  mm.add('(max-width: 980px)', () => {
    gsap.from('.coll', { y: 40, opacity: 0, duration: .9, stagger: .1, scrollTrigger: { trigger: '#coll-pin', start: 'top 85%' } });
  });

  // ---- Explorer
  gsap.from('.tab', { y: 24, opacity: 0, duration: .6, stagger: .05, scrollTrigger: { trigger: '#tabs', start: 'top 88%' } });
  gsap.from('#panel', { y: 60, opacity: 0, duration: 1, scrollTrigger: { trigger: '#panel', start: 'top 88%' } });

  // ---- Process: pinned on large screens, the line fills and steps light up
  mm.add('(min-width: 1181px)', () => {
    const steps = $$('.step'), fill = $('#steps-fill');
    gsap.set(fill, { '--p': 0 });
    ScrollTrigger.create({ trigger: '#process-pin', start: 'top top', end: '+=1400', pin: true, scrub: true,
      onUpdate: self => {
        const p = self.progress; fill.style.setProperty('--p', p);
        steps.forEach((s, i) => s.classList.toggle('on', p >= i / steps.length + .02));
      } });
    gsap.from(steps, { y: 60, opacity: 0, duration: .9, stagger: .1, scrollTrigger: { trigger: '#steps', start: 'top 85%' } });
  });
  mm.add('(max-width: 1180px)', () => {
    $$('.step').forEach(s => { s.classList.add('on');
      gsap.from(s, { y: 40, opacity: 0, duration: .8, scrollTrigger: { trigger: s, start: 'top 90%' } }); });
  });

  // ---- Factories
  gsap.from('.fac-tab', { y: 30, opacity: 0, duration: .8, stagger: .08, scrollTrigger: { trigger: '.fac-tabs', start: 'top 88%' } });
  gsap.from('.fac-photo', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '#fac-panel', start: 'top 80%' } });
  gsap.from('.fac-info > *', { y: 30, opacity: 0, duration: .8, stagger: .07, scrollTrigger: { trigger: '#fac-panel', start: 'top 75%' } });
  ScrollTrigger.create({ trigger: '.fac-stats', start: 'top 90%', once: true, onEnter: () => {
    const f = FACTORIES[fac]; countTo($('#fac-area'), f.area, 'comma', 1.8); countTo($('#fac-team'), f.team, 'int', 1.8); } });
  gsap.from('.bar .track i', { scaleX: 0, duration: 1.6, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.bars', start: 'top 85%' } });
  ScrollTrigger.create({ trigger: '.bars', start: 'top 85%', once: true,
    onEnter: () => $$('.bars .count').forEach(el => countTo(el, +el.dataset.to, el.dataset.fmt, 1.8)) });

  // ---- Cambodia routes draw in with the scroll
  $$('#route-paths .path, #route-paths .path-glow').forEach(p => {
    const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
  });
  gsap.to('#route-paths .path, #route-paths .path-glow', { strokeDashoffset: 0, ease: 'none', stagger: .05,
    scrollTrigger: { trigger: '.routes', start: 'top 80%', end: 'center 45%', scrub: 1 } });
  gsap.from('#route-nodes .node', { x: 40, opacity: 0, duration: .8, stagger: .08, scrollTrigger: { trigger: '.routes', start: 'top 60%' } });
  gsap.from('#route-paths .mover', { opacity: 0, duration: .5, scrollTrigger: { trigger: '.routes', start: 'center 60%' } });
  gsap.from('.duty article', { y: 40, opacity: 0, duration: .8, stagger: .08, scrollTrigger: { trigger: '.duty', start: 'top 85%' } });

  // ---- Trust
  gsap.from('.cert', { y: 60, opacity: 0, rotate: 3, duration: .9, stagger: .08, scrollTrigger: { trigger: '.certs', start: 'top 85%' } });

  // ---- CTA floating products
  $$('.cta [data-speed]').forEach(el => gsap.to(el, { y: () => (1 - parseFloat(el.dataset.speed)) * 400, rotate: '+=20', ease: 'none',
    scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.cta-btn', { scale: 0, rotate: -90, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.cta-btn', start: 'top 90%' } });

  // ---- Contact
  gsap.from('.fl, #send', { y: 30, opacity: 0, duration: .7, stagger: .05, scrollTrigger: { trigger: '#quote', start: 'top 85%' } });
  gsap.from('.contact-card', { y: 60, opacity: 0, duration: 1, scrollTrigger: { trigger: '.contact-card', start: 'top 88%' } });
  gsap.from('.foot-big', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%' } });

  // ---- Magnetic buttons
  if (fine) {
    document.addEventListener('mousemove', e => {
      const m = e.target.closest('.magnetic');
      $$('.magnetic.pull').forEach(x => { if (x !== m) { x.classList.remove('pull'); gsap.to(x, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.4)' }); } });
      if (!m) return;
      const r = m.getBoundingClientRect();
      m.classList.add('pull');
      gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4, ease: 'power3.out' });
    });
  }

  // ---- Custom cursor
  if (fine) {
    // "View" bubble that follows the normal mouse pointer over product photos
    const cur = $('.cursor'), ring = $('.cursor-ring');
    $('#cursor-label').textContent = t.view;
    const rx = gsap.quickTo(ring, 'x', { duration: .2 }), ry = gsap.quickTo(ring, 'y', { duration: .2 });
    window.addEventListener('mousemove', e => { rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('mouseover', e => cur.classList.toggle('view', !!e.target.closest('[data-cursor="view"]')));
    document.addEventListener('mouseleave', () => cur.classList.remove('view'));
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
