/* PAWSIGN admin panel.
   Opens when the "© 2026 PAWSIGN group" line in the footer is clicked three times.

   How the password works:
   - The site is static, so the real lock is GitHub. Publishing needs a GitHub access key
     that can only write to this one repository.
   - That key is stored in assets/admin/key.json, encrypted with the admin password
     (PBKDF2-SHA256, 600,000 rounds, AES-256-GCM). Without the password the file is useless.
   - The decrypted key only lives in this tab's memory and is forgotten on logout, reload or after 30 idle minutes. */

const OWNER = 'junaed9156';
const REPO = 'Tianchang-Company';
const BRANCH = 'claude/tianchang-sign-crafts-webpage-ouzgrb';
const CONTENT_PATH = 'assets/js/content.js';
const KEY_PATH = 'assets/admin/key.json';
const API = 'https://api.github.com';
const ITER = 600000;
const MIN_PW = 10;
const IDLE_MS = 30 * 60 * 1000;
const START = '// @admin-data-start', END = '// @admin-data-end';

const enc = new TextEncoder(), dec = new TextDecoder();
let token = null, idleTimer = null, root = null, data = null, saved = '';

/* ---------- small helpers ---------- */
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
};
const bytesToB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64ToBytes = b64 => Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0));
const utf8ToB64 = s => bytesToB64(enc.encode(s));
const b64ToUtf8 = b64 => dec.decode(b64ToBytes(b64));
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- crypto ---------- */
async function deriveKey(pw, salt, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(secret, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt, ITER);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(secret)));
  return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, cipher: 'AES-256-GCM', salt: bytesToB64(salt), iv: bytesToB64(iv), ct: bytesToB64(ct) };
}
async function unseal(box, pw) {
  const key = await deriveKey(pw, b64ToBytes(box.salt), box.iter);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.ct));
  return dec.decode(pt);
}

/* ---------- GitHub ---------- */
async function gh(path, opts = {}, tk = token) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${tk}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    cache: 'no-store',
  });
  if (!res.ok) { const e = new Error(`GitHub ${res.status}`); e.status = res.status; throw e; }
  return res.status === 204 ? null : res.json();
}
async function checkToken(tk) {
  const repo = await gh(`/repos/${OWNER}/${REPO}`, {}, tk);
  if (!repo.permissions || !repo.permissions.push) throw Object.assign(new Error('read-only'), { status: 403 });
}
const getFile = (path, tk = token) => gh(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${encodeURIComponent(BRANCH)}`, {}, tk)
  .catch(e => { if (e.status === 404) return null; throw e; });
const putFile = (path, text, sha, message, tk = token) => gh(`/repos/${OWNER}/${REPO}/contents/${path}`,
  { method: 'PUT', body: JSON.stringify({ message, content: utf8ToB64(text), branch: BRANCH, ...(sha ? { sha } : {}) }) }, tk);

async function loadKeyBox() {
  try {
    const res = await fetch(new URL(KEY_PATH, document.baseURI).href + '?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) { /* fall through */ }
  return null;
}

/* ---------- brute-force slow-down (per browser) ---------- */
const lock = {
  read() { try { return JSON.parse(localStorage.getItem('pawsign-admin-lock')) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } },
  write(v) { try { localStorage.setItem('pawsign-admin-lock', JSON.stringify(v)); } catch (e) {} },
  fail() { const s = this.read(); s.n++; if (s.n >= 5) s.until = Date.now() + Math.min(60000 * 2 ** (s.n - 5), 3600000); this.write(s); },
  clear() { this.write({ n: 0, until: 0 }); },
  wait() { return Math.max(0, this.read().until - Date.now()); },
};

/* ---------- content.js data region ---------- */
function regionOf(text) {
  const a = text.indexOf(START), b = text.indexOf(END);
  if (a < 0 || b < a) throw new Error('markers');
  return { a, b: b + END.length };
}
function parseRegion(text) {
  // Region written by this panel is plain JSON per variable; the hand-written original is not, so fall back to the live page data.
  const { a, b } = regionOf(text), body = text.slice(a, b), out = {};
  for (const name of ['LINES', 'SHOPS', 'FACTORIES']) {
    const m = body.match(new RegExp(`window\\.${name} = ([\\s\\S]*?);\\n(?=window\\.|// @admin-data-end)`));
    if (!m) return null;
    try { out[name] = JSON.parse(m[1]); } catch (e) { return null; }
  }
  return out;
}
function writeRegion(text, d) {
  const arr = list => '[\n' + list.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]';
  const block = `${START}\nwindow.LINES = ${arr(d.LINES)};\nwindow.SHOPS = ${arr(d.SHOPS)};\nwindow.FACTORIES = ${arr(d.FACTORIES)};\n${END}`;
  const { a, b } = regionOf(text);
  return text.slice(0, a) + block + text.slice(b);
}

/* ---------- UI shell ---------- */
function shell() {
  if (!document.querySelector('link[data-admin-css]')) {
    document.head.append(h('link', { rel: 'stylesheet', href: new URL('assets/css/admin.css?v=1', document.baseURI).href, 'data-admin-css': true }));
  }
  root?.remove();
  root = h('div', { class: 'adm', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Admin' });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.body.append(root);
  document.documentElement.classList.add('adm-open');
  return root;
}
function close() {
  if (data && JSON.stringify(data) !== saved && !confirmLeave()) return;
  forget();
  root?.remove(); root = null;
  document.documentElement.classList.remove('adm-open');
}
function confirmLeave() {
  // Inline confirm instead of window.confirm, which would block the page.
  const bar = root.querySelector('.adm-unsaved');
  if (bar && bar.dataset.armed) return true;
  if (bar) { bar.dataset.armed = '1'; bar.textContent = 'Unsaved changes. Press Close again to discard them.'; }
  return false;
}
function forget() { token = null; data = null; saved = ''; clearTimeout(idleTimer); }
function touch() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { forget(); if (root) loginView('Locked after 30 minutes without activity. Enter the password again.'); }, IDLE_MS);
}
const card = (...kids) => {
  shell();
  const box = h('div', { class: 'adm-card' }, h('button', { type: 'button', class: 'adm-x', 'aria-label': 'Close', onclick: close, text: '×' }), ...kids);
  root.append(box);
  return box;
};
const field = (label, input, hint) => h('label', { class: 'adm-f' }, h('span', { text: label }), input, hint ? h('small', { text: hint }) : null);
const dot = color => { const i = h('i', { class: 'adm-dot' }); i.style.background = color; return i; };
const busy = (btn, on, text) => { btn.disabled = on; if (text) btn.textContent = text; };

/* ---------- views ---------- */
export async function openAdmin() {
  if (!window.isSecureContext || !crypto.subtle) {
    card(h('h2', { text: 'Admin' }), h('p', { text: 'The admin panel only works over a secure connection. Open https://pawsign.group and try again.' }));
    return;
  }
  if (token) return editorView();
  const box = await loadKeyBox();
  if (box) loginView(); else setupView();
}

function loginView(note) {
  const pw = h('input', { type: 'password', autocomplete: 'current-password', required: true, 'aria-label': 'Admin password' });
  const msg = h('p', { class: 'adm-msg', role: 'status', text: note || '' });
  const go = h('button', { type: 'submit', class: 'adm-btn', text: 'Log in' });
  const form = h('form', { class: 'adm-form', onsubmit: async e => {
    e.preventDefault();
    const wait = lock.wait();
    if (wait) { msg.textContent = `Too many wrong tries. Wait ${Math.ceil(wait / 1000)} seconds.`; return; }
    busy(go, true, 'Checking…'); msg.textContent = '';
    try {
      const box = await loadKeyBox();
      if (!box) { setupView(); return; }
      let tk;
      try { tk = await unseal(box, pw.value); } catch (err) { lock.fail(); throw Object.assign(new Error('Wrong password.'), { shown: true }); }
      try { await checkToken(tk); } catch (err) {
        if (err.status === 401 || err.status === 403) throw Object.assign(new Error('The password is right, but the GitHub key inside has expired or lost access. Use "Set up a new key" below.'), { shown: true });
        throw err;
      }
      lock.clear(); token = tk; pw.value = '';
      await editorView();
    } catch (err) {
      msg.textContent = err.shown ? err.message : 'Could not reach GitHub. Check the connection and try again.';
      busy(go, false, 'Log in'); pw.select();
    }
  } }, field('Password', pw), go, msg);
  card(h('h2', { text: 'Admin login' }), form,
    h('button', { type: 'button', class: 'adm-link', text: 'Set up a new key or reset the password', onclick: () => setupView(true) }));
  pw.focus();
}

function setupView(reset) {
  const tk = h('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', required: true, 'aria-label': 'GitHub access key' });
  const pw = h('input', { type: 'password', autocomplete: 'new-password', minlength: MIN_PW, required: true, 'aria-label': 'New admin password' });
  const pw2 = h('input', { type: 'password', autocomplete: 'new-password', minlength: MIN_PW, required: true, 'aria-label': 'Repeat password' });
  const msg = h('p', { class: 'adm-msg', role: 'status' });
  const go = h('button', { type: 'submit', class: 'adm-btn', text: 'Save password' });
  const form = h('form', { class: 'adm-form', onsubmit: async e => {
    e.preventDefault(); msg.textContent = '';
    if (pw.value.length < MIN_PW) { msg.textContent = `Use at least ${MIN_PW} characters.`; return; }
    if (pw.value !== pw2.value) { msg.textContent = 'The two passwords do not match.'; return; }
    busy(go, true, 'Checking the key…');
    try {
      const key = tk.value.trim();
      try { await checkToken(key); } catch (err) {
        throw Object.assign(new Error(err.status === 401 ? 'GitHub did not accept this key.' : `This key cannot write to ${REPO}. Give it Contents: Read and write on that repository.`), { shown: true });
      }
      busy(go, true, 'Encrypting…');
      const sealed = await seal(key, pw.value);
      const cur = await getFile(KEY_PATH, key);
      await putFile(KEY_PATH, JSON.stringify(sealed, null, 2) + '\n', cur && cur.sha, 'Update admin key', key);
      token = key; tk.value = pw.value = pw2.value = ''; lock.clear();
      await editorView('Password saved. From now on, log in with just the password (the login screen appears here within about a minute).');
    } catch (err) {
      msg.textContent = err.shown ? err.message : 'Could not reach GitHub. Check the connection and try again.';
      busy(go, false, 'Save password');
    }
  } },
    h('ol', { class: 'adm-steps' },
      h('li', {}, 'Open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener noreferrer', text: 'GitHub → new fine-grained token' }), ' (signed in as ', h('b', { text: OWNER }), ').'),
      h('li', {}, 'Repository access: ', h('b', { text: 'Only select repositories' }), ' → ', h('b', { text: REPO }), '.'),
      h('li', {}, 'Permissions → Repository → ', h('b', { text: 'Contents: Read and write' }), '. Nothing else.'),
      h('li', {}, 'Expiration: up to 1 year. Generate, copy the key and paste it below.')),
    field('GitHub key', tk, 'Used once here, then stored only in encrypted form.'),
    field('New admin password', pw, `At least ${MIN_PW} characters. A short sentence is easy to remember and hard to guess.`),
    field('Repeat password', pw2), go, msg);
  card(h('h2', { text: reset ? 'New key or password' : 'Set up the admin password' }), form,
    reset ? h('button', { type: 'button', class: 'adm-link', text: 'Back to login', onclick: () => loginView() }) : null);
  tk.focus();
}

async function editorView(note) {
  touch();
  const box = card(h('h2', { text: 'Loading…' }));
  let file;
  try { file = await getFile(CONTENT_PATH); } catch (e) { box.replaceChildren(h('h2', { text: 'Admin' }), h('p', { text: 'Could not load the content from GitHub. Try again in a moment.' })); return; }
  const text = b64ToUtf8(file.content);
  const remote = parseRegion(text);
  data = clone(remote || { LINES: window.LINES, SHOPS: window.SHOPS, FACTORIES: window.FACTORIES });
  saved = JSON.stringify(data);
  let sha = file.sha;

  const status = h('p', { class: note ? 'adm-msg ok' : 'adm-msg', role: 'status', text: note || '' });
  const unsaved = h('p', { class: 'adm-unsaved' });
  const publish = h('button', { type: 'button', class: 'adm-btn', text: 'Publish changes', disabled: true });
  const mark = () => { touch(); const dirty = JSON.stringify(data) !== saved; publish.disabled = !dirty; unsaved.textContent = dirty ? 'You have unpublished changes.' : ''; delete unsaved.dataset.armed; };

  const text_ = (obj, key, label, area) => {
    const inp = h(area ? 'textarea' : 'input', area ? { rows: 3 } : { type: 'text' });
    inp.value = obj[key] ?? '';
    inp.addEventListener('input', () => { obj[key] = inp.value; mark(); });
    return field(label, inp);
  };
  const num = (obj, key, label) => {
    const inp = h('input', { type: 'number', min: 0, step: 1 });
    inp.value = obj[key] ?? 0;
    inp.addEventListener('input', () => { obj[key] = Number(inp.value) || 0; mark(); });
    return field(label, inp);
  };
  const langs = (obj, fields) => h('div', { class: 'adm-2' },
    h('div', {}, h('h4', { text: 'English' }), fields.map(([k, l, a]) => text_(obj.en, k, l, a))),
    h('div', { lang: 'zh-CN' }, h('h4', { text: '中文' }), fields.map(([k, l, a]) => text_(obj.zh, k, l, a))));

  const products = h('div', { class: 'adm-list' }, data.LINES.map(line => h('details', { class: 'adm-item' },
    h('summary', {}, dot(line.color), h('b', { text: line.en.tab }), h('span', { text: line.en.t })),
    langs(line, [['tab', 'Tab name'], ['t', 'Title'], ['d', 'Description', true], ['made', 'Made at'], ['cap', 'Capacity']]))));

  const factories = h('div', { class: 'adm-list' }, data.FACTORIES.map(f => h('details', { class: 'adm-item' },
    h('summary', {}, h('b', { text: f.name })),
    h('div', { class: 'adm-3' }, text_(f, 'name', 'Company name'), num(f, 'area', 'Floor area (m²)'), num(f, 'team', 'Employees')),
    text_(f, 'addr', 'Address', true),
    langs(f, [['desc', 'Description', true], ['products', 'Products'], ['work', 'Workshops', true]]))));

  const newPw = h('input', { type: 'password', autocomplete: 'new-password', minlength: MIN_PW });
  const newPw2 = h('input', { type: 'password', autocomplete: 'new-password', minlength: MIN_PW });
  const pwMsg = h('p', { class: 'adm-msg', role: 'status' });
  const pwBtn = h('button', { type: 'submit', class: 'adm-btn adm-ghost', text: 'Change password' });
  const security = h('div', { class: 'adm-list' },
    h('form', { class: 'adm-form', onsubmit: async e => {
      e.preventDefault(); touch(); pwMsg.textContent = ''; pwMsg.className = 'adm-msg';
      if (newPw.value.length < MIN_PW) { pwMsg.textContent = `Use at least ${MIN_PW} characters.`; return; }
      if (newPw.value !== newPw2.value) { pwMsg.textContent = 'The two passwords do not match.'; return; }
      busy(pwBtn, true, 'Saving…');
      try {
        const cur = await getFile(KEY_PATH);
        await putFile(KEY_PATH, JSON.stringify(await seal(token, newPw.value), null, 2) + '\n', cur && cur.sha, 'Update admin key');
        newPw.value = newPw2.value = ''; pwMsg.className = 'adm-msg ok'; pwMsg.textContent = 'Password changed. The old password stops working within about a minute.';
      } catch (err) { pwMsg.textContent = 'Could not save. Try again.'; }
      busy(pwBtn, false, 'Change password');
    } }, field('New password', newPw), field('Repeat new password', newPw2), pwBtn, pwMsg),
    h('p', { class: 'adm-note', text: 'You are logged out automatically after 30 minutes without activity, and whenever this tab is closed or reloaded.' }));

  const panes = { Products: products, Factories: factories, Security: security };
  const body = h('div', { class: 'adm-body' }, products);
  const tabs = h('div', { class: 'adm-tabs', role: 'tablist' }, Object.keys(panes).map((name, i) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', text: name, onclick: e => {
      touch();
      tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b === e.currentTarget ? 'true' : 'false'));
      body.replaceChildren(panes[name]);
    } })));

  publish.addEventListener('click', async () => {
    touch(); busy(publish, true, 'Publishing…'); status.textContent = ''; status.className = 'adm-msg';
    try {
      const latest = await getFile(CONTENT_PATH);
      sha = latest.sha;
      await putFile(CONTENT_PATH, writeRegion(b64ToUtf8(latest.content), data), sha, 'Update website content from the admin panel');
      saved = JSON.stringify(data);
      status.className = 'adm-msg ok'; status.textContent = 'Published. The live site updates in 1–2 minutes (refresh the page to see it).';
    } catch (err) {
      status.textContent = err.status === 409 ? 'Someone else just published. Close the panel, reopen it and try again.' : 'Publishing failed. Try again.';
    }
    busy(publish, false, 'Publish changes'); mark();
  });

  box.replaceChildren(
    h('button', { type: 'button', class: 'adm-x', 'aria-label': 'Close', onclick: close, text: '×' }),
    h('div', { class: 'adm-head' }, h('h2', { text: 'PAWSIGN admin' }),
      h('button', { type: 'button', class: 'adm-link', text: 'Log out', onclick: () => { forget(); loginView('Logged out.'); } })),
    tabs, body,
    h('div', { class: 'adm-foot' }, unsaved, status, publish));
  box.classList.add('adm-wide');
  root.addEventListener('input', touch);
}
