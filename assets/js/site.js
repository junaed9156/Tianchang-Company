/* PAWSIGN website behaviour: language, content building, animation and interaction. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) root.classList.add('reduce');
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
  $('.skip-link').textContent = lang === 'zh' ? '跳至主要内容' : 'Skip to content';
  if (lang === 'zh') {
    root.lang = 'zh-CN';
    $$('[data-i18n]').forEach(el => { const v = ZH[el.dataset.i18n]; if (v !== undefined) el.innerHTML = v; });
  }
  document.title = t.title;
  const langLink = $('#lang');
  if (lang === 'zh') { langLink.textContent = 'EN'; langLink.href = '?lang=en'; langLink.lang = 'en'; langLink.hreflang = 'en'; langLink.setAttribute('aria-label', 'Switch to English'); }
  else { langLink.setAttribute('aria-label', '切换到中文'); }
  langLink.addEventListener('click', () => store.set('lang', lang === 'zh' ? 'en' : 'zh'));

  /* ======================= Number formats ======================= */
  const fmt = (v, kind) => {
    if (kind === 'm') return lang === 'zh' ? Math.round(v / 1e4) + '万' : (v / 1e6).toFixed(2) + 'M';
    if (kind === 'plus') return Math.round(v) + '+';
    if (kind === 'comma') return Math.round(v).toLocaleString('en-US');
    return String(Math.round(v));
  };
  $$('.count').forEach(el => { if (el.dataset.to) el.textContent = fmt(+el.dataset.to, el.dataset.fmt); });

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

  // Native horizontal browsing works with touch, keyboard and reduced motion.
  const collectionRail = $('#coll-pin'), collectionCards = [...$('#coll-track').children];
  const collectionPrev = $('#collection-prev'), collectionNext = $('#collection-next');
  collectionPrev.setAttribute('aria-label', lang === 'zh' ? '上一个系列' : 'Previous collection');
  collectionNext.setAttribute('aria-label', lang === 'zh' ? '下一个系列' : 'Next collection');
  collectionRail.setAttribute('aria-label', lang === 'zh' ? '产品系列' : 'Product collections');
  let collectionFrame = 0;
  function collectionState() {
    collectionFrame = 0;
    const max = Math.max(0, collectionRail.scrollWidth - collectionRail.clientWidth);
    const x = collectionRail.scrollLeft;
    const railLeft = collectionRail.getBoundingClientRect().left;
    const gutter = parseFloat(getComputedStyle(collectionRail).scrollPaddingLeft) || 20;
    let nearest = 0, distance = Infinity;
    collectionCards.forEach((card, i) => {
      const d = Math.abs(card.getBoundingClientRect().left - railLeft - gutter);
      if (d < distance) { distance = d; nearest = i; }
    });
    $('#collection-index').textContent = `${String(Math.min(nearest + 1, LINES.length)).padStart(2, '0')} / ${String(LINES.length).padStart(2, '0')}`;
    $('#collection-progress').style.transform = `scaleX(${max ? .12 + .88 * x / max : 1})`;
    collectionPrev.disabled = x < 4;
    collectionNext.disabled = x >= max - 4;
  }
  function moveCollection(direction) {
    const gap = parseFloat(getComputedStyle($('#coll-track')).gap) || 20;
    collectionRail.scrollBy({ left: direction * (collectionCards[0].offsetWidth + gap), behavior: reduce ? 'auto' : 'smooth' });
  }
  collectionPrev.addEventListener('click', () => moveCollection(-1));
  collectionNext.addEventListener('click', () => moveCollection(1));
  collectionRail.addEventListener('scroll', () => { if (!collectionFrame) collectionFrame = requestAnimationFrame(collectionState); }, { passive: true });
  collectionRail.addEventListener('keydown', e => {
    if (e.target !== collectionRail) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); moveCollection(e.key === 'ArrowRight' ? 1 : -1); }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); collectionRail.scrollTo({ left: e.key === 'Home' ? 0 : collectionRail.scrollWidth, behavior: reduce ? 'auto' : 'smooth' }); }
  });
  window.addEventListener('resize', collectionState, { passive: true });
  collectionState();

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
    if (animate) tabsEl.children[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
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
    if (animate && !reduce) gsap.from(grid.children, { y: 30, opacity: 0, scale: .94, duration: .6, ease: 'power3.out', stagger: { each: .03, from: 'start' }, clearProps: 'transform,translate,rotate,scale,opacity' });
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
  // "Sold at": every client, doubled so the strip can scroll right to left without a seam.
  // Wide logos are drawn shorter and square ones taller, so they all look about the same size.
  const heroLogo = ([f, n], copy) => `<img src="assets/logos/${f}.png" alt="${copy ? '' : n}"${copy ? ' aria-hidden="true"' : ''}>`;
  const heroTrack = $('#hero-logos-track');
  heroTrack.innerHTML = SHOPS.map(s => heroLogo(s, false)).join('') + SHOPS.map(s => heroLogo(s, true)).join('');
  heroTrack.classList.add('moving');
  $$('img', heroTrack).forEach(img => {
    const fit = () => { const aspect = img.naturalWidth / img.naturalHeight; if (aspect) img.style.height = Math.max(16, Math.min(36, 40 / Math.sqrt(aspect))) + 'px'; };
    if (img.complete) fit(); else img.addEventListener('load', fit, { once: true });
  });

  const logoSpans = list => list.map(([f, n]) => `<span><img src="assets/logos/${f}.png" alt="${n}" loading="lazy"></span>`).join('');
  const rowA = SHOPS.slice(0, 6), rowB = SHOPS.slice(6);
  $('#logos-a').innerHTML = logoSpans(rowA) + logoSpans(rowA).replace(/alt="[^"]*"/g, 'alt=""') + logoSpans(rowA).replace(/alt="[^"]*"/g, 'alt=""');
  $('#logos-b').innerHTML = logoSpans(rowB) + logoSpans(rowB).replace(/alt="[^"]*"/g, 'alt=""') + logoSpans(rowB).replace(/alt="[^"]*"/g, 'alt=""');

  /* ======================= Route map: Cambodia -> six markets ======================= */
  // Routes are drawn in pixels so each line ends exactly at its country row on the right.
  const NS = 'http://www.w3.org/2000/svg';
  const map = $('#route-map'), routePaths = $('#route-paths'), origin = $('#route-origin');
  const dutyRows = $$('#duty article');
  dutyRows.forEach((row, i) => row.style.setProperty('--c', MARKETS[i].color));
  let routesDrawn = reduce;   // becomes true once the draw-in animation has played
  function drawRoutes() {
    const r = map.getBoundingClientRect(); if (!r.width || !r.height) return;
    const w = r.width, h = r.height, ox = Math.min(64, w * .32), oy = h / 2;
    origin.setAttribute('transform', `translate(${ox} ${oy})`);
    routePaths.innerHTML = dutyRows.map((row, i) => {
      const rr = row.getBoundingClientRect(), ey = rr.top + rr.height / 2 - r.top, ex = w + 2, m = MARKETS[i];
      const d = `M${ox} ${oy} C ${ox + (w - ox) * .55} ${oy}, ${ox + (w - ox) * .45} ${ey}, ${ex} ${ey}`;
      return `<path class="path-glow" data-i="${i}" d="${d}" stroke="${m.color}"/><path class="path" id="rp-${i}" data-i="${i}" d="${d}" stroke="${m.color}"/>
        <circle class="end" cx="${ex}" cy="${ey}" r="5" fill="${m.color}"/>
        <circle class="mover" r="4.5" fill="${m.color}" style="color:${m.color}">${reduce ? '' : `<animateMotion dur="3s" begin="${(i * .4).toFixed(2)}s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".4 0 .2 1"><mpath href="#rp-${i}"/></animateMotion>`}</circle>`;
    }).join('');
    if (!routesDrawn) $$('.path, .path-glow', routePaths).forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  }
  function revealRoutes() {
    if (routesDrawn) return; routesDrawn = true;
    $$('.path, .path-glow', routePaths).forEach((p, k) => gsap.to(p, { strokeDashoffset: 0, duration: 1.4, delay: Math.floor(k / 2) * .08, ease: 'power2.inOut',
      onComplete: () => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; } }));
  }
  function focusRoute(i) {
    map.classList.toggle('focus', i !== null);
    $$('.path, .path-glow', routePaths).forEach(p => p.classList.toggle('hot', +p.dataset.i === i));
    dutyRows.forEach((row, k) => row.classList.toggle('hot', k === i));
  }
  dutyRows.forEach((row, i) => { row.addEventListener('mouseenter', () => focusRoute(i)); row.addEventListener('mouseleave', () => focusRoute(null)); });
  drawRoutes();
  let rTimer; window.addEventListener('resize', () => { clearTimeout(rTimer); rTimer = setTimeout(drawRoutes, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawRoutes);
  window.addEventListener('load', drawRoutes);

  /* ======================= Factories ======================= */
  let fac = 0, factoryTransition = null;
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
  const factoryTabs = $$('.fac-tab');
  factoryTabs.forEach((button, i) => {
    button.id = 'factory-tab-' + i; button.setAttribute('aria-controls', 'fac-panel'); button.tabIndex = i === 0 ? 0 : -1;
  });
  $('#fac-panel').setAttribute('aria-labelledby', 'factory-tab-0');
  $('.fac-tabs').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = e.key === 'Home' ? 0 : e.key === 'End' ? factoryTabs.length - 1 : (fac + (e.key === 'ArrowRight' ? 1 : -1) + factoryTabs.length) % factoryTabs.length;
    factoryTabs[i].click(); factoryTabs[i].focus();
  });
  $$('.fac-tab').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.f; if (i === fac) return; fac = i;
    $$('.fac-tab').forEach(x => { x.setAttribute('aria-selected', x === b); x.tabIndex = x === b ? 0 : -1; });
    $('#fac-panel').setAttribute('aria-labelledby', b.id);
    if (reduce) return fillFactory(i, true);
    const img = $('.fac-photo'), info = $('.fac-info');
    if (factoryTransition) factoryTransition.progress(1).kill();
    factoryTransition = gsap.timeline()
      .to(img, { clipPath: 'inset(0% 0% 0% 100%)', duration: .45, ease: 'power3.in' }, 0)
      .to(info, { opacity: 0, y: 14, duration: .3, ease: 'power2.in' }, 0)
      .add(() => fillFactory(i))
      .fromTo(img, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .7, ease: 'power3.out' })
      .to(info, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, '<.1');
  }));

  /* ======================= Smooth anchor scrolling ======================= */
  function scrollToEl(el) {
    if (!el) return;
    const headerBottom = $('.head-row').offsetHeight + (innerWidth <= 640 ? 24 : 32);
    const top = el === document.body || el.id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - headerBottom - 16;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); const el = id ? document.getElementById(id) : document.body;
    if (!el) return; e.preventDefault(); closeMenu(); scrollToEl(el);
    if (a.classList.contains('skip-link')) el.focus({ preventScroll: true });
  });

  /* ======================= Mobile menu ======================= */
  const menuBtn = $('#menu-btn'), nav = $('#site-nav'), head = $('#site-head');
  function closeMenu() { nav.classList.remove('open'); head.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  menuBtn.setAttribute('aria-label', t.menu);
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); head.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : '';
    if (open) nav.querySelector('a').focus();
  });
  window.addEventListener('resize', () => { if (innerWidth > 1100 && nav.classList.contains('open')) closeMenu(); }, { passive: true });

  /* ======================= Lightbox ======================= */
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  lb.setAttribute('aria-label', t.lightbox); $('#lb-prev').setAttribute('aria-label', t.prev); $('#lb-next').setAttribute('aria-label', t.next);
  let lastFocus = null, lbList = [], lbAt = 0, lbScroll = '';
  const backgroundInert = new Map();
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
    lbScroll = document.body.style.overflow; document.body.style.overflow = 'hidden';
    [...document.body.children].filter(el => el !== lb && el.tagName !== 'SCRIPT').forEach(el => { backgroundInert.set(el, el.inert); el.inert = true; });
  });
  const closeLb = () => {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open'); document.body.style.overflow = lbScroll;
    backgroundInert.forEach((wasInert, el) => { el.inert = wasInert; }); backgroundInert.clear();
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  };
  $('#lb-close').addEventListener('click', closeLb);
  $('#lb-prev').addEventListener('click', () => lbShow(lbAt - 1));
  $('#lb-next').addEventListener('click', () => lbShow(lbAt + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { const menuWasOpen = nav.classList.contains('open'); closeLb(); closeMenu(); if (menuWasOpen) menuBtn.focus(); }
    if (e.key === 'Tab' && (lb.classList.contains('open') || nav.classList.contains('open'))) {
      const items = lb.classList.contains('open') ? $$('.lightbox button') : [$('.logo', head), ...$$('a', nav), langLink, menuBtn];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
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
      const body = `Name: ${data.name}\nCompany: ${data.company}\nEmail: ${data.email}\nPhone: ${data.phone}\nCountry: ${data.country}\nProduct: ${data.product}\nQuantity: ${data.qty}\n\n${data.msg}`;
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

  // Keep navigation and quote access useful even when motion is disabled.
  let scrollFrame = 0, lastScroll = window.scrollY;
  function updatePagePosition() {
    scrollFrame = 0;
    const y = window.scrollY, delta = y - lastScroll;
    head.classList.toggle('scrolled', y > 20);
    if (nav.classList.contains('open') || head.contains(document.activeElement)) head.classList.remove('hide');
    else if (!reduce && Math.abs(delta) > 6) head.classList.toggle('hide', delta > 0 && y > innerHeight);
    if (Math.abs(delta) > 6) lastScroll = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    const contactBounds = $('#contact').getBoundingClientRect();
    $('#fab').classList.toggle('show', y > $('#hero').offsetHeight * .8 && !(contactBounds.top < innerHeight && contactBounds.bottom > 0));
  }
  window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updatePagePosition); }, { passive: true });
  window.addEventListener('resize', updatePagePosition, { passive: true });
  head.addEventListener('focusin', () => head.classList.remove('hide'));
  updatePagePosition();
  if ('IntersectionObserver' in window) {
    const navLinks = $$('a', nav);
    const activeSection = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach(entry => {
        navLinks.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -55% 0px' });
    navLinks.forEach(link => { const section = document.querySelector(link.hash); if (section) activeSection.observe(section); });
  }
  document.addEventListener('visibilitychange', () => root.classList.toggle('page-hidden', document.hidden));

  /* ======================= Motion ======================= */
  if (reduce) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  gsap.defaults({ ease: 'power3.out' });

  // ---- Split headings into masked words (characters for Chinese)
  const zh = lang === 'zh';
  const splits = $$('.split').map(el => window.SplitText ? SplitText.create(el, { type: zh ? 'chars' : 'words', mask: zh ? 'chars' : 'words', charsClass: 'sc', wordsClass: 'sw' }) : { words: [el], chars: [el], elements: [el] });
  const heroSplit = $$('.hero-title .line').map(el => window.SplitText ? SplitText.create(el, { type: 'words,chars', mask: 'lines', wordsClass: 'hw', charsClass: 'hc' }) : { chars: [el] });

  // ---- Hero intro
  function heroIntro(delay = 0) {
    const tl = gsap.timeline({ delay });
    tl.from('.head-row', { y: -20, opacity: 0, duration: .65, clearProps: 'transform,opacity' }, 0)
      .from('.hero-tag', { y: 20, opacity: 0, duration: .7 }, .1)
      .from(heroSplit.flatMap(s => s.chars), { yPercent: 115, rotate: 8, duration: 1, stagger: .025, ease: 'expo.out' }, .15)
      .from('.hero-lead', { y: 24, opacity: 0, duration: .8 }, .55)
      .from('.hero-btns > *', { y: 24, opacity: 0, duration: .7, stagger: .08 }, .65)
      .from('.hero-foot > *', { y: 20, opacity: 0, duration: .7, stagger: .08 }, .9);
    return tl;
  }

  // The independent 3D showroom owns hero motion and its pause controls.
  heroIntro(.05);

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
  gsap.from('.num', { y: 50, opacity: 0, duration: 1, stagger: .12, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.numbers', start: 'top 75%' } });
  gsap.to('.b1', { x: 200, y: 120, scrollTrigger: { trigger: '.numbers', scrub: true } });
  gsap.to('.b2', { x: -200, y: -100, scrollTrigger: { trigger: '.numbers', scrub: true } });

  // ---- Split headings reveal
  splits.forEach(s => {
    gsap.from(zh ? s.chars : s.words, { yPercent: 110, duration: 1, stagger: zh ? .03 : .06, ease: 'expo.out',
      clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: s.elements[0], start: 'top 85%' } });
  });
  // Paragraphs next to headings
  $$('.sec-head p, .coll-head p, .bk-lead, .clients-head p').forEach(p =>
    gsap.from(p, { y: 30, opacity: 0, duration: 1, delay: .15, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: p, start: 'top 88%' } }));

  // ---- Reveal collection cards as they enter the native horizontal viewport.
  if ('IntersectionObserver' in window) {
    const collectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        gsap.from($$('.coll-info > *, .coll-art', card), { y: 24, opacity: 0, duration: .75, stagger: .055, clearProps: 'transform,opacity' });
        collectionObserver.unobserve(card);
      });
    }, { threshold: .12 });
    $$('.coll').forEach(card => collectionObserver.observe(card));
  }

  // ---- Explorer
  gsap.from('.tab', { y: 24, opacity: 0, duration: .6, stagger: .05, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '#tabs', start: 'top 88%' } });
  gsap.from('#panel', { y: 60, opacity: 0, duration: 1, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '#panel', start: 'top 88%' } });

  // ---- Manufacturing sequence: the page keeps its normal vertical scroll.
  gsap.fromTo('#steps-fill', { '--p': 0 }, { '--p': 1, ease: 'none',
    scrollTrigger: { trigger: '#steps', start: 'top 80%', end: 'bottom 55%', scrub: .6 } });
  $$('.step').forEach((step, i) => {
    gsap.from(step, { y: 35, opacity: 0, duration: .8, delay: innerWidth > 1100 ? i * .09 : 0,
      clearProps: 'transform,opacity', scrollTrigger: { trigger: step, start: 'top 88%', once: true, onEnter: () => step.classList.add('on') } });
  });

  // ---- Factories
  gsap.from('.fac-tab', { y: 30, opacity: 0, duration: .8, stagger: .08, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.fac-tabs', start: 'top 88%' } });
  gsap.from('.fac-photo', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.3, ease: 'expo.out', clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '#fac-panel', start: 'top 80%' } });
  gsap.from('.fac-info > *', { y: 30, opacity: 0, duration: .8, stagger: .07, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '#fac-panel', start: 'top 75%' } });
  ScrollTrigger.create({ trigger: '.fac-stats', start: 'top 90%', once: true, onEnter: () => {
    const f = FACTORIES[fac]; countTo($('#fac-area'), f.area, 'comma', 1.8); countTo($('#fac-team'), f.team, 'int', 1.8); } });
  gsap.from('.bar .track i', { scaleX: 0, duration: 1.6, ease: 'expo.out', stagger: .1, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.bars', start: 'top 85%' } });
  ScrollTrigger.create({ trigger: '.bars', start: 'top 85%', once: true,
    onEnter: () => $$('.bars .count').forEach(el => countTo(el, +el.dataset.to, el.dataset.fmt, 1.8)) });

  // ---- Your brand + Cambodia
  ScrollTrigger.create({ trigger: '.bk-routes', start: 'top 75%', once: true, onEnter: revealRoutes });
  gsap.from('.bk-steps li, .bk-btns > *', { x: -30, opacity: 0, duration: .7, stagger: .08, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.bk-steps', start: 'top 85%' } });
  gsap.from('.bk-card', { y: 60, opacity: 0, duration: 1, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.bk-card', start: 'top 85%', onLeaveBack: null } });
  gsap.from('#duty article', { x: 40, opacity: 0, duration: .7, stagger: .07, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '#duty', start: 'top 80%' } });
  $$('.bk-float img').forEach((el, i) => gsap.to(el, { y: i ? -120 : 120, rotate: i ? -16 : 16, ease: 'none', scrollTrigger: { trigger: '.brandkh', start: 'top bottom', end: 'bottom top', scrub: true } }));

  // ---- Trust
  gsap.from('.cert', { y: 50, opacity: 0, duration: .9, stagger: .08, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.certs', start: 'top 85%' } });

  // ---- Contact
  gsap.from('.fl, #send', { y: 30, opacity: 0, duration: .7, stagger: .05, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '#quote', start: 'top 85%' } });
  gsap.from('.contact-card', { y: 60, opacity: 0, duration: 1, clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.contact-card', start: 'top 88%' } });
  gsap.from('.foot-big', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', clearProps: 'transform,translate,rotate,scale,opacity', scrollTrigger: { trigger: '.foot', start: 'top 85%' } });

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
