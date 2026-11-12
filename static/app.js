'use strict';

/* =========================================================================
   Ikony
   ========================================================================= */
const ICONS = {
  open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  save: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  select: '<path d="M5 3l14 7-6 2-2 6z"/>',
  edit: '<path d="M3 6V4h11v2M8.5 4v14M6 18h5"/><path d="M14 20l1-4 6-6 3 3-6 6z"/>',
  text: '<path d="M4 7V4h16v3M12 4v16M9 20h6"/>',
  highlight: '<path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16"/>',
  strike: '<path d="M16 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7M4 12h16"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  rect: '<rect x="3" y="5" width="18" height="14" rx="1.5"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>',
  arrow: '<path d="M5 19L19 5M9 5h10v10"/>',
  note: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  eraser: '<path d="M20 20H8l-5-5 10-10 8 8-6 7"/><path d="M6 12l7 7"/>',
  palette: '<path d="M5 18L10.5 4h3L19 18M7.5 12h9"/><path d="M3 21h18" stroke-width="3"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  rotl: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  rotr: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  plus: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  merge: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  plus2: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  cut: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 19M8.5 15.5L20 5"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}
document.querySelectorAll('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));

/* =========================================================================
   Stav a pomocné funkcie
   ========================================================================= */
const $ = (s, el = document) => el.querySelector(s);
const SVGNS = 'http://www.w3.org/2000/svg';

const EMPTY_INFO = { open: false, pages: [], version: 0 };

const st = {
  info: EMPTY_INFO,   // detail aktívneho dokumentu (z /api/docs/<id>)
  docId: null,        // ID aktívneho dokumentu (záložky)
  docs: [],           // záložky: [{id, name, pageCount, dirty}]
  views: {},          // id -> {zoom, fitMode, current, scrollTop} – stav zobrazenia pri prepínaní
  fonts: [],
  zoom: 1,            // px na 1 pt
  fitMode: true,
  tool: 'edit',
  pageData: {},       // i -> {lines, words, annots, version}
  dataPending: {},
  current: 0,
  editor: null,       // otvorený textový editor
  selAnnot: null,     // {page, xref}
  selImage: null,     // {page, xref, rect} – vybraný obrázok v režime výberu
  placing: null,      // vkladaný obrázok pred potvrdením (pozri startPlacement)
  hover: null,        // {page, x, y} – posledná poloha myši nad stranou (kam vložiť Ctrl+V)
  imgClip: null,      // naposledy skopírovaný obrázok z PDF {pw, ph, w, h, blob}
  drag: null,
  busy: false,
};

const pagesEl = $('#pages');
const viewer = $('#viewer');
const thumbsEl = $('#thumbs');

const HINTS = {
  select: 'Klikni na anotáciu alebo obrázok · Delete = zmazať · Ctrl+C / Ctrl+X = kopírovať / vystrihnúť obrázok · Ctrl+V = vložiť obrázok.',
  edit: 'Klikni na riadok textu a uprav ho. Enter = uložiť · Shift+Enter = nový riadok · Esc = zrušiť.',
  text: 'Klikni kamkoľvek na stránku a napíš nový text.',
  highlight: 'Potiahni myšou cez text, ktorý chceš zvýrazniť.',
  underline: 'Potiahni myšou cez text, ktorý chceš podčiarknuť.',
  strike: 'Potiahni myšou cez text, ktorý chceš prečiarknuť.',
  pen: 'Kresli voľnou rukou.',
  rect: 'Potiahni myšou a nakresli obdĺžnik.',
  ellipse: 'Potiahni myšou a nakresli elipsu.',
  arrow: 'Potiahni myšou od začiatku po hrot šípky.',
  note: 'Klikni na miesto, kam chceš pridať poznámku.',
  whiteout: 'Potiahni obdĺžnik – všetko v ňom (text, obrázky) sa natrvalo vymaže a vyplní farbou nástroja.',
};

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), type === 'error' ? 5000 : 2500);
}

function setBusy(b) {
  st.busy = b;
  document.body.classList.toggle('busy', b);
}

/** Základ URL pre operácie nad aktívnym dokumentom. */
function docBase(id = st.docId) {
  return `/api/docs/${id}`;
}

/** Jednoznačná pečiatka stavu: dokument + verzia (na zahodenie neaktuálnych odpovedí). */
function stamp() {
  return `${st.docId}:${st.info.version}`;
}

async function api(path, { json, form, method } = {}) {
  const opt = { method: method || (json || form ? 'POST' : 'GET') };
  if (json) {
    opt.headers = { 'Content-Type': 'application/json' };
    opt.body = JSON.stringify(json);
  }
  if (form) opt.body = form;
  const r = await fetch(path, opt);
  let data = {};
  try { data = await r.json(); } catch { /* bez tela */ }
  if (!r.ok) throw new Error(data.error || `Chyba servera (${r.status})`);
  return data;
}

/** Zmena aktívneho dokumentu; `op` je relatívna cesta, napr. 'annot' -> /api/docs/<id>/annot. */
async function mutate(op, payload, isForm = false) {
  if (st.busy || !st.docId) return null;
  const id = st.docId;
  setBusy(true);
  try {
    const info = await api(`${docBase(id)}/${op}`, isForm ? { form: payload } : { json: payload });
    if (st.docId !== id) return null;   // medzitým sa prepla záložka
    applyInfo(info);
    return info;
  } catch (e) {
    toast(e.message, 'error');
    return null;
  } finally {
    setBusy(false);
  }
}

function svgEl(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
}

/* =========================================================================
   Dokument a stránky
   ========================================================================= */
function applyInfo(info) {
  closeEditor(false);
  if (info.autosaveError && info.autosaveError !== st.info.autosaveError) toast(info.autosaveError, 'error');
  st.info = info;
  st.pageData = {};
  st.dataPending = {};
  st.selAnnot = null;
  st.selImage = null;
  if (st.placing && (!info.open || st.placing.page >= info.pages.length)) cancelPlacement();
  document.body.classList.toggle('has-doc', !!info.open);
  document.title = info.open ? `${info.name} – PDF Editor` : 'PDF Editor';
  if (info.open && st.current >= info.pages.length) st.current = info.pages.length - 1;
  if (info.open) {
    const tab = st.docs.find(d => d.id === info.id);
    if (tab) Object.assign(tab, { name: info.name, pageCount: info.pageCount, dirty: info.dirty });
  }
  if (st.fitMode) computeFit();
  updateControls();
  syncPages();
  syncThumbs();
  renderTabs();
  refreshVisible();
}

function updateControls() {
  const open = st.info.open;
  $('#btnUndo').disabled = !open || !st.info.canUndo;
  $('#btnRedo').disabled = !open || !st.info.canRedo;
  $('#btnSave').disabled = !open;
  $('#btnRecolor').disabled = !open;
  $('#zoomLabel').textContent = Math.round(st.zoom * 100) + ' %';
  $('#pageInfo').textContent = open ? `Strana ${st.current + 1} / ${st.info.pages.length}` : '';
  const si = $('#saveInfo');
  si.classList.toggle('error', !!st.info.autosaveError);
  if (st.info.autosaveError) {
    si.textContent = '⚠ ' + st.info.autosaveError;
  } else if (open && st.info.autosaved) {
    const t = new Date(st.info.autosaved * 1000).toLocaleTimeString('sk-SK');
    si.textContent = `✓ Automaticky uložené ${t}`;
    si.title = 'Každá zmena sa hneď zálohuje na disk – po reštarte servera či počítača sa záložky obnovia. '
      + 'Hotové PDF si stiahneš tlačidlom Uložiť.';
  } else {
    si.textContent = '';
  }
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === st.current));
}

function renderScale() {
  const s = st.zoom * (window.devicePixelRatio || 1);
  return Math.min(5, Math.max(0.5, Math.ceil(s * 4) / 4));
}

const visible = new Set();
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    const i = +e.target.dataset.i;
    if (e.isIntersecting) visible.add(i); else visible.delete(i);
  }
  refreshVisible();
}, { root: viewer, rootMargin: '800px 0px' });

function createPage(i) {
  const el = document.createElement('div');
  el.className = 'page';
  el.dataset.i = i;
  el.innerHTML = '<img class="render" alt="">';
  const svg = svgEl('svg', { class: 'overlay' }, el);
  svgEl('g', { class: 'base' }, svg);
  svgEl('g', { class: 'preview' }, svg);
  svg.addEventListener('pointerdown', ev => onPointerDown(ev, +el.dataset.i));
  svg.addEventListener('pointermove', ev => onPointerMove(ev, +el.dataset.i));
  svg.addEventListener('pointerup', ev => onPointerUp(ev, +el.dataset.i));
  pagesEl.appendChild(el);
  io.observe(el);
  return el;
}

function pageEl(i) { return pagesEl.children[i]; }

function syncPages() {
  const pages = st.info.open ? st.info.pages : [];
  while (pagesEl.children.length > pages.length) {
    const last = pagesEl.lastElementChild;
    io.unobserve(last);
    visible.delete(+last.dataset.i);
    last.remove();
  }
  pages.forEach((p, i) => {
    const el = pageEl(i) || createPage(i);
    el.style.width = p.w * st.zoom + 'px';
    el.style.height = p.h * st.zoom + 'px';
    const svg = $('svg', el);
    svg.setAttribute('viewBox', `0 0 ${p.w} ${p.h}`);
    $('.base', svg).innerHTML = '';
    $('.preview', svg).innerHTML = '';
    el.querySelectorAll('.annot-bar').forEach(b => b.remove());
  });
  layoutPlacement();
}

function refreshVisible() {
  if (!st.info.open) return;
  for (const i of visible) {
    if (i >= st.info.pages.length) continue;
    ensureImage(i);
    ensureData(i);
  }
}

function ensureImage(i) {
  const el = pageEl(i);
  const scale = renderScale();
  const key = `${stamp()}@${scale}`;
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  const url = `${docBase()}/page/${i}.png?scale=${scale}&v=${st.info.version}`;
  const img = new Image();
  img.onload = () => { if (el.dataset.key === key) $('img.render', el).src = url; };
  img.src = url;
}

async function ensureData(i) {
  const ver = stamp();
  if (st.pageData[i] || st.dataPending[i] === ver) return;
  st.dataPending[i] = ver;
  try {
    const d = await api(`${docBase()}/page/${i}/data?v=${st.info.version}`);
    if (stamp() !== ver) return;
    st.pageData[i] = d;
    renderOverlay(i);
  } catch (e) {
    if (stamp() === ver) toast(e.message, 'error');
  } finally {
    if (st.dataPending[i] === ver) delete st.dataPending[i];
  }
}

function renderOverlay(i) {
  const el = pageEl(i);
  const d = st.pageData[i];
  if (!el || !d) return;
  const base = $('svg .base', el);
  base.innerHTML = '';
  el.querySelectorAll('.annot-bar').forEach(b => b.remove());
  if (st.tool === 'edit') {
    for (const line of d.lines) {
      if (!line.horizontal) continue;
      const [x0, y0, x1, y1] = line.bbox;
      const r = svgEl('rect', { class: 'line-box', x: x0 - 1, y: y0, width: x1 - x0 + 2, height: y1 - y0 }, base);
      r.dataset.id = line.id;
      if (st.editor && st.editor.page === i && st.editor.line && st.editor.line.id === line.id) r.classList.add('editing');
    }
  } else if (st.tool === 'select') {
    // obrázky pod anotáciami, aby sa dali vybrať aj anotácie nakreslené cez obrázok
    for (const im of d.images || []) {
      const [x0, y0, x1, y1] = im.rect;
      const r = svgEl('rect', { class: 'image-box', x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, base);
      r.dataset.xref = im.xref;
      r.dataset.rect = im.rect.join(',');
      svgEl('title', {}, r).textContent = 'Obrázok';
      if (st.selImage && st.selImage.page === i && st.selImage.xref === im.xref &&
          st.selImage.rect.join(',') === im.rect.join(',')) {
        r.classList.add('selected');
        showImageBar(i, im);
      }
    }
    for (const a of d.annots) {
      const [x0, y0, x1, y1] = a.rect;
      const r = svgEl('rect', { class: 'annot-box', x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, base);
      r.dataset.xref = a.xref;
      const t = svgEl('title', {}, r);
      t.textContent = a.type + (a.content ? ': ' + a.content : '');
      if (st.selAnnot && st.selAnnot.page === i && st.selAnnot.xref === a.xref) {
        r.classList.add('selected');
        showAnnotBar(i, a);
      }
    }
  }
}

function renderAllOverlays() {
  for (const k of Object.keys(st.pageData)) renderOverlay(+k);
}

/* ---------- miniatúry ---------- */
function syncThumbs() {
  const pages = st.info.open ? st.info.pages : [];
  while (thumbsEl.children.length > pages.length) thumbsEl.lastElementChild.remove();
  pages.forEach((p, i) => {
    let t = thumbsEl.children[i];
    if (!t) {
      t = document.createElement('div');
      t.className = 'thumb';
      t.innerHTML = '<div class="tframe"><img loading="lazy" alt=""></div><span></span>';
      t.addEventListener('click', () => scrollToPage(+t.dataset.i));
      thumbsEl.appendChild(t);
    }
    t.dataset.i = i;
    const scale = Math.max(0.1, Math.min(1, 300 / Math.max(p.w, p.h)));
    const src = `${docBase()}/page/${i}.png?scale=${scale.toFixed(3)}&v=${st.info.version}`;
    const img = $('img', t);
    img.style.aspectRatio = `${p.w} / ${p.h}`;
    if (img.getAttribute('src') !== src) img.src = src;
    $('span', t).textContent = i + 1;
    t.classList.toggle('active', i === st.current);
  });
}

function scrollToPage(i) {
  const el = pageEl(i);
  if (!el) return;
  viewer.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
  st.current = i;
  updateControls();
}

viewer.addEventListener('scroll', () => {
  if (!st.info.open) return;
  const mid = viewer.scrollTop + viewer.clientHeight * 0.35;
  let cur = 0;
  for (let i = 0; i < pagesEl.children.length; i++) {
    if (pagesEl.children[i].offsetTop <= mid) cur = i; else break;
  }
  if (cur !== st.current) {
    st.current = cur;
    updateControls();
    const t = thumbsEl.children[cur];
    if (t) {
      const tr = t.getBoundingClientRect(), sr = thumbsEl.getBoundingClientRect();
      if (tr.top < sr.top || tr.bottom > sr.bottom) t.scrollIntoView({ block: 'nearest' });
    }
  }
});

/* ---------- zoom ---------- */
function computeFit() {
  if (!st.info.open || !st.info.pages.length) return;
  const maxW = Math.max(...st.info.pages.map(p => p.w));
  st.zoom = Math.max(0.2, Math.min(4, (viewer.clientWidth - 64) / maxW));
}

function setZoom(z, fit = false) {
  closeEditor(false);
  const ratio = viewer.scrollTop / Math.max(1, viewer.scrollHeight);
  st.fitMode = fit;
  if (fit) computeFit(); else st.zoom = Math.max(0.2, Math.min(4, z));
  syncPages();
  for (const k of Object.keys(st.pageData)) renderOverlay(+k);
  viewer.scrollTop = ratio * viewer.scrollHeight;
  updateControls();
  refreshVisible();
}

$('#btnZoomIn').onclick = () => setZoom(st.zoom * 1.2);
$('#btnZoomOut').onclick = () => setZoom(st.zoom / 1.2);
$('#btnFit').onclick = () => setZoom(0, true);
viewer.addEventListener('wheel', e => {
  if (!e.ctrlKey || !st.info.open) return;
  e.preventDefault();
  setZoom(st.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { passive: false });
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (st.fitMode && st.info.open) setZoom(0, true); }, 150);
});

/* =========================================================================
   Nástroje
   ========================================================================= */
function setTool(tool) {
  closeEditor(true);
  st.tool = tool;
  st.selAnnot = null;
  document.body.dataset.tool = tool;
  document.querySelectorAll('#tools [data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  $('#hint').textContent = HINTS[tool] || '';
  renderAllOverlays();
}
document.querySelectorAll('#tools [data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

const toolColor = $('#toolColor');
const toolWidth = $('#toolWidth');

function pointFromEvent(ev, i) {
  const svg = $('svg', pageEl(i));
  const r = svg.getBoundingClientRect();
  const p = st.info.pages[i];
  return { x: (ev.clientX - r.left) / r.width * p.w, y: (ev.clientY - r.top) / r.height * p.h };
}

function onPointerDown(ev, i) {
  if (ev.button !== 0 || st.busy) return;
  const p = pointFromEvent(ev, i);
  st.current = i;
  updateControls();

  // vkladaný obrázok: klik mimo neho ho vloží
  if (st.placing) {
    commitPlacement();
    return;
  }
  // otvorený editor: klik mimo neho ho uloží
  if (st.editor) {
    commitEditor();
    return;
  }

  const tool = st.tool;
  const preview = $('svg .preview', pageEl(i));
  const color = toolColor.value;
  const width = +toolWidth.value;

  if (tool === 'edit') {
    const target = ev.target.closest('.line-box');
    if (!target) return;
    const line = st.pageData[i]?.lines.find(l => l.id === target.dataset.id);
    if (line) openEditor({ mode: 'edit', page: i, line });
    return;
  }
  if (tool === 'text') {
    ev.preventDefault();
    openEditor({ mode: 'new', page: i, point: p });
    return;
  }
  if (tool === 'select') {
    const target = ev.target.closest('.annot-box');
    const img = target ? null : ev.target.closest('.image-box');
    st.selAnnot = target ? { page: i, xref: +target.dataset.xref } : null;
    st.selImage = img ? { page: i, xref: +img.dataset.xref, rect: img.dataset.rect.split(',').map(Number) } : null;
    renderAllOverlays();
    return;
  }
  if (tool === 'note') {
    const text = prompt('Text poznámky:');
    if (text !== null && text.trim()) mutate('annot', { page: i, type: 'note', point: [p.x, p.y], text, color });
    return;
  }

  ev.preventDefault();
  $('svg', pageEl(i)).setPointerCapture(ev.pointerId);
  preview.innerHTML = '';

  if (['highlight', 'underline', 'strike'].includes(tool)) {
    const words = st.pageData[i]?.words || [];
    const k = nearestWord(words, p);
    if (k < 0) { toast('Tu nie je žiadny text na označenie.'); return; }
    st.drag = { tool, page: i, start: k, end: k };
    drawSelection();
    return;
  }

  st.drag = { tool, page: i, p0: p, p1: p, points: [p], color, width };
  drawShapePreview();
}

function onPointerMove(ev, i) {
  st.hover = { page: i, ...pointFromEvent(ev, i) };
  const d = st.drag;
  if (!d || d.page !== i) return;
  const p = pointFromEvent(ev, i);
  if (['highlight', 'underline', 'strike'].includes(d.tool)) {
    const k = nearestWord(st.pageData[i]?.words || [], p, true);
    if (k >= 0 && k !== d.end) { d.end = k; drawSelection(); }
    return;
  }
  d.p1 = p;
  if (d.tool === 'pen') d.points.push(p);
  drawShapePreview();
}

function onPointerUp(ev, i) {
  const d = st.drag;
  if (!d || d.page !== i) return;
  st.drag = null;
  const preview = $('svg .preview', pageEl(i));
  const color = toolColor.value;
  const width = +toolWidth.value;

  if (['highlight', 'underline', 'strike'].includes(d.tool)) {
    const rects = selectionRects(st.pageData[i].words, d.start, d.end);
    mutate('annot', { page: i, type: d.tool, rects, color })
      .finally(() => { preview.innerHTML = ''; });
    return;
  }

  const { p0, p1 } = d;
  const rect = [Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.max(p0.x, p1.x), Math.max(p0.y, p1.y)];
  const tiny = rect[2] - rect[0] < 3 && rect[3] - rect[1] < 3;
  let req = null;
  if (d.tool === 'pen') {
    if (d.points.length > 1) req = mutate('annot', { page: i, type: 'ink', strokes: [d.points.map(q => [q.x, q.y])], color, width });
  } else if (tiny) {
    // príliš malé – ignoruj
  } else if (d.tool === 'rect' || d.tool === 'ellipse') {
    req = mutate('annot', { page: i, type: d.tool, rect, color, width });
  } else if (d.tool === 'arrow') {
    req = mutate('annot', { page: i, type: 'arrow', p1: [p0.x, p0.y], p2: [p1.x, p1.y], color, width });
  } else if (d.tool === 'whiteout') {
    req = mutate('whiteout', { page: i, rect, color });
  }
  if (req) req.finally(() => { preview.innerHTML = ''; });
  else preview.innerHTML = '';
}

/* ---------- výber textu podľa slov ---------- */
function nearestWord(words, p, loose = false) {
  let best = -1, bd = Infinity;
  words.forEach((w, k) => {
    const dx = Math.max(w[0] - p.x, 0, p.x - w[2]);
    const dy = Math.max(w[1] - p.y, 0, p.y - w[3]);
    const dist = dx * dx + dy * dy * 4;
    if (dist < bd) { bd = dist; best = k; }
  });
  return loose || bd < 25 * 25 ? best : -1;
}

function selectionRects(words, a, b) {
  const [s, e] = a <= b ? [a, b] : [b, a];
  const groups = [];
  let cur = null, key = null;
  for (let k = s; k <= e; k++) {
    const w = words[k];
    const kk = w[4] + '-' + w[5];
    if (kk !== key) {
      cur = [w[0], w[1], w[2], w[3]];
      groups.push(cur);
      key = kk;
    } else {
      cur[0] = Math.min(cur[0], w[0]); cur[1] = Math.min(cur[1], w[1]);
      cur[2] = Math.max(cur[2], w[2]); cur[3] = Math.max(cur[3], w[3]);
    }
  }
  return groups;
}

function drawSelection() {
  const d = st.drag;
  const preview = $('svg .preview', pageEl(d.page));
  preview.innerHTML = '';
  for (const [x0, y0, x1, y1] of selectionRects(st.pageData[d.page].words, d.start, d.end)) {
    if (d.tool === 'highlight') {
      svgEl('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: toolColor.value, 'fill-opacity': 0.45 }, preview);
    } else {
      const y = d.tool === 'underline' ? y1 - (y1 - y0) * 0.08 : (y0 + y1) / 2;
      svgEl('rect', { class: 'sel-preview', x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, preview);
      svgEl('line', { x1: x0, x2: x1, y1: y, y2: y, stroke: toolColor.value, 'stroke-width': Math.max(1, (y1 - y0) * 0.07) }, preview);
    }
  }
}

function drawShapePreview() {
  const d = st.drag;
  const preview = $('svg .preview', pageEl(d.page));
  preview.innerHTML = '';
  const common = { fill: 'none', stroke: d.color, 'stroke-width': d.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const { p0, p1 } = d;
  const x = Math.min(p0.x, p1.x), y = Math.min(p0.y, p1.y);
  const w = Math.abs(p1.x - p0.x), h = Math.abs(p1.y - p0.y);
  if (d.tool === 'pen') {
    svgEl('polyline', { ...common, points: d.points.map(q => `${q.x},${q.y}`).join(' ') }, preview);
  } else if (d.tool === 'rect') {
    svgEl('rect', { ...common, x, y, width: w, height: h }, preview);
  } else if (d.tool === 'ellipse') {
    svgEl('ellipse', { ...common, cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 }, preview);
  } else if (d.tool === 'arrow') {
    svgEl('line', { ...common, x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y }, preview);
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const L = Math.max(8, d.width * 4);
    const a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85;
    svgEl('polyline', {
      ...common,
      points: `${p1.x + L * Math.cos(a1)},${p1.y + L * Math.sin(a1)} ${p1.x},${p1.y} ${p1.x + L * Math.cos(a2)},${p1.y + L * Math.sin(a2)}`,
    }, preview);
  } else if (d.tool === 'whiteout') {
    svgEl('rect', { class: 'whiteout-preview', x, y, width: w, height: h, style: `fill:${d.color};fill-opacity:.85` }, preview);
  }
}

/* ---------- anotácie: lišta pre vybranú ---------- */
function showAnnotBar(i, a) {
  const el = pageEl(i);
  const bar = document.createElement('div');
  bar.className = 'annot-bar';
  bar.style.left = a.rect[0] * st.zoom + 'px';
  bar.style.top = Math.max(0, a.rect[1] * st.zoom - 46) + 'px';
  if (a.type === 'Text' || a.type === 'FreeText') {
    const ed = document.createElement('button');
    ed.innerHTML = icon('note') + 'Upraviť text';
    ed.onclick = () => {
      const t = prompt('Text poznámky:', a.content || '');
      if (t !== null) mutate('annot/update', { page: i, xref: a.xref, content: t });
    };
    bar.appendChild(ed);
  }
  const del = document.createElement('button');
  del.className = 'danger';
  del.innerHTML = icon('trash') + 'Zmazať';
  del.onclick = deleteSelectedAnnot;
  bar.appendChild(del);
  bar.addEventListener('pointerdown', e => e.stopPropagation());
  el.appendChild(bar);
}

function deleteSelectedAnnot() {
  const s = st.selAnnot;
  if (!s) return;
  mutate('annot/delete', { page: s.page, xref: s.xref });
}

/* =========================================================================
   Obrázky: kopírovať / vystrihnúť / vložiť (schránka, súbor, drag & drop)
   ========================================================================= */
function showImageBar(i, im) {
  const el = pageEl(i);
  const bar = document.createElement('div');
  bar.className = 'annot-bar';
  bar.style.left = im.rect[0] * st.zoom + 'px';
  bar.style.top = Math.max(0, im.rect[1] * st.zoom - 46) + 'px';
  bar.innerHTML = `<button class="copy" title="Kopírovať (Ctrl+C)">${icon('copy')}Kopírovať</button>
    <button class="cut" title="Vystrihnúť (Ctrl+X)">${icon('cut')}Vystrihnúť</button>
    <button class="del danger" title="Zmazať (Delete)">${icon('trash')}Zmazať</button>`;
  $('.copy', bar).onclick = () => copyImage(false);
  $('.cut', bar).onclick = () => copyImage(true);
  $('.del', bar).onclick = deleteSelectedImage;
  bar.addEventListener('pointerdown', e => e.stopPropagation());
  el.appendChild(bar);
}

function deleteSelectedImage() {
  const s = st.selImage;
  if (!s) return Promise.resolve(null);
  return mutate('image/delete', { page: s.page, xref: s.xref, rect: s.rect });
}

/** Rozmery obrázka v pixeloch (a overenie, že ho prehliadač vie dekódovať). */
function imageSize(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight, img }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Obrázok sa nepodarilo načítať.')); };
    img.src = url;
  });
}

/** Skopíruje vybraný obrázok do schránky (so cut=true ho potom zo strany zmaže). */
async function copyImage(cut = false) {
  const s = st.selImage;
  if (!s) return;
  const url = `${docBase()}/image/${s.xref}.png?v=${st.info.version}`;
  const blobP = fetch(url).then(async r => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Obrázok sa nepodarilo načítať.');
    return r.blob();
  });
  let sys = true;
  try {
    // promise priamo v ClipboardItem – zápis tak ostane v rámci gesta používateľa
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobP })]);
  } catch {
    sys = false;   // bez prístupu k schránke – obrázok si aspoň zapamätáme v editore
  }
  let blob, size;
  try {
    blob = await blobP;
    size = await imageSize(blob);
  } catch (e) {
    toast(e.message, 'error');
    return;
  }
  st.imgClip = { pw: size.w, ph: size.h, w: s.rect[2] - s.rect[0], h: s.rect[3] - s.rect[1], blob };
  if (cut) {
    if (!await deleteSelectedImage()) return;
    toast(sys ? 'Obrázok vystrihnutý – vlož ho Ctrl+V.' : 'Obrázok vystrihnutý (vložiť sa dá len v tomto editore).');
  } else {
    toast(sys ? 'Obrázok skopírovaný – vlož ho Ctrl+V.' : 'Obrázok skopírovaný (vložiť sa dá len v tomto editore).');
  }
}

/** PDF (PyMuPDF) berie spoľahlivo len PNG a JPEG – ostatné formáty prevedieme cez canvas. */
async function normalizeImage(blob) {
  const { w, h, img } = await imageSize(blob);
  if (/^image\/(png|jpeg)$/.test(blob.type)) return { blob, w, h };
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0);
  const png = await new Promise(res => c.toBlob(res, 'image/png'));
  if (!png) throw new Error('Obrázok sa nepodarilo previesť na PNG.');
  return { blob: png, w, h };
}

/** Strana a bod (pt), kam vložiť obrázok: pod myšou, inak stred viditeľnej časti aktuálnej strany. */
function placementTarget() {
  if (st.hover && st.hover.page < st.info.pages.length) return st.hover;
  const i = Math.min(st.current, st.info.pages.length - 1);
  const p = st.info.pages[i];
  const r = pageEl(i).getBoundingClientRect(), v = viewer.getBoundingClientRect();
  const top = Math.max(r.top, v.top), bottom = Math.min(r.bottom, v.bottom);
  const y = bottom > top ? ((top + bottom) / 2 - r.top) / r.height * p.h : p.h / 2;
  return { page: i, x: p.w / 2, y };
}

/**
 * Začne vkladanie obrázka: zobrazí ho na strane, dá sa posúvať a meniť veľkosť,
 * do PDF sa zapíše až po potvrdení (Enter / Vložiť / klik mimo).
 * `size` = {w, h} v pt (napr. pôvodná veľkosť obrázka skopírovaného z PDF).
 */
async function startPlacement(blob, target = null, size = null) {
  if (!st.info.open || st.busy) return;
  await closeEditor(true);
  cancelPlacement();
  let n;
  try {
    n = await normalizeImage(blob);
  } catch (e) {
    toast(e.message, 'error');
    return;
  }
  if (!st.info.open) return;
  const t = target || placementTarget();
  const p = st.info.pages[t.page];
  let { w, h } = size || { w: n.w * 0.75, h: n.h * 0.75 };   // 96 dpi → pt
  const k = Math.min(1, p.w * 0.8 / w, p.h * 0.8 / h);       // nech sa zmestí na stranu
  w *= k; h *= k;
  const x = Math.min(Math.max(0, t.x - w / 2), p.w - w);
  const y = Math.min(Math.max(0, t.y - h / 2), p.h - h);

  const wrap = document.createElement('div');
  wrap.className = 'img-place';
  const url = URL.createObjectURL(n.blob);
  wrap.innerHTML = `<img alt="" src="${url}"><span class="handle" title="Zmeniť veľkosť (Shift = bez zachovania pomeru)"></span>
    <div class="editor-bar"><button class="ok" title="Vložiť do PDF (Enter)">${icon('check')}Vložiť</button>
    <button class="cancel" title="Zrušiť (Esc)">${icon('x')}</button></div>`;
  pageEl(t.page).appendChild(wrap);
  st.placing = { page: t.page, x, y, w, h, ratio: w / h, blob: n.blob, url, el: wrap, drag: null };
  layoutPlacement();

  $('.ok', wrap).onclick = commitPlacement;
  $('.cancel', wrap).onclick = cancelPlacement;
  $('.editor-bar', wrap).addEventListener('pointerdown', e => e.stopPropagation());
  wrap.addEventListener('pointerdown', ev => {
    const pl = st.placing;
    if (ev.button !== 0 || !pl) return;
    ev.preventDefault();
    ev.stopPropagation();
    wrap.setPointerCapture(ev.pointerId);
    pl.drag = { resize: ev.target.classList.contains('handle'), cx: ev.clientX, cy: ev.clientY,
      x: pl.x, y: pl.y, w: pl.w, h: pl.h };
  });
  wrap.addEventListener('pointermove', ev => {
    const pl = st.placing;
    if (!pl || !pl.drag) return;
    const d = pl.drag;
    const dx = (ev.clientX - d.cx) / st.zoom, dy = (ev.clientY - d.cy) / st.zoom;
    if (d.resize) {
      pl.w = Math.max(8, d.w + dx);
      pl.h = ev.shiftKey ? Math.max(8, d.h + dy) : pl.w / pl.ratio;
    } else {
      pl.x = d.x + dx;
      pl.y = d.y + dy;
    }
    layoutPlacement();
  });
  const end = () => { if (st.placing) st.placing.drag = null; };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  $('#hint').textContent = 'Posuň obrázok myšou, rohom zmeň veľkosť (Shift = voľne) · Enter = vložiť · Esc = zrušiť.';
}

function layoutPlacement() {
  const pl = st.placing;
  if (!pl) return;
  Object.assign(pl.el.style, {
    left: pl.x * st.zoom + 'px', top: pl.y * st.zoom + 'px',
    width: pl.w * st.zoom + 'px', height: pl.h * st.zoom + 'px',
  });
}

function cancelPlacement() {
  const pl = st.placing;
  if (!pl) return;
  st.placing = null;
  pl.el.remove();
  URL.revokeObjectURL(pl.url);
  $('#hint').textContent = HINTS[st.tool] || '';
}

async function commitPlacement() {
  const pl = st.placing;
  if (!pl || st.busy) return;
  const fd = new FormData();
  fd.append('file', pl.blob, pl.blob.type === 'image/jpeg' ? 'obrazok.jpg' : 'obrazok.png');
  fd.append('page', pl.page);
  fd.append('rect', JSON.stringify([pl.x, pl.y, pl.x + pl.w, pl.y + pl.h]));
  cancelPlacement();
  await mutate('insert_image', fd, true);
}

/** Ctrl+V: obrázok zo systémovej schránky, inak naposledy skopírovaný obrázok z PDF. */
document.addEventListener('paste', async e => {
  if (e.target.matches?.('input, textarea, select') || !st.info.open) return;
  const file = [...(e.clipboardData?.items || [])]
    .find(it => it.kind === 'file' && it.type.startsWith('image/'))?.getAsFile();
  const clip = st.imgClip;
  if (!file && !clip) {
    toast('Schránka neobsahuje obrázok. Skopíruj obrázok (napr. výstrižok obrazovky alebo obrázok z webu) a skús znova.');
    return;
  }
  e.preventDefault();
  let size = null;
  if (clip) {
    // ten istý obrázok, ktorý sme skopírovali z PDF → vložíme ho v pôvodnej veľkosti
    let same = !file;
    if (file) {
      try {
        const s = await imageSize(file);
        same = s.w === clip.pw && s.h === clip.ph;
      } catch { /* chybu ohlási startPlacement */ }
    }
    if (same) size = { w: clip.w, h: clip.h };
  }
  startPlacement(file || clip.blob, null, size);
});

$('#btnImage').onclick = () => { if (st.info.open) $('#fileImage').click(); };
$('#fileImage').onchange = e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) startPlacement(f);
};

/* =========================================================================
   Textový editor (úprava existujúceho aj nový text)
   ========================================================================= */
const measureCtx = document.createElement('canvas').getContext('2d');

function openEditor(opts) {
  closeEditor(false);
  const { mode, page } = opts;
  const el = pageEl(page);
  const fonts = st.fonts.length ? st.fonts : ['Arial'];
  let state;
  if (mode === 'edit') {
    const l = opts.line;
    state = {
      text: l.text.replace(/ /g, ' '),
      size: l.size, color: l.color,
      family: fonts.includes(l.family) ? l.family : fonts[0],
      bold: l.bold, italic: l.italic, align: 'left',
      x: l.bbox[0], y: l.bbox[1],
      minW: l.bbox[2] - l.bbox[0],
    };
  } else {
    state = {
      text: '', size: +(localStorage.getItem('pe.size') || 18),
      color: localStorage.getItem('pe.color') || '#000000',
      family: localStorage.getItem('pe.family') || (fonts.includes('Arial') ? 'Arial' : fonts[0]),
      bold: false, italic: false, align: 'left',
      x: opts.point.x, y: opts.point.y, minW: 120,
    };
    if (!fonts.includes(state.family)) state.family = fonts[0];
  }
  const original = JSON.stringify(state);

  const wrap = document.createElement('div');
  wrap.className = 'text-editor';
  wrap.style.left = state.x * st.zoom + 'px';
  wrap.style.top = state.y * st.zoom + 'px';

  const bar = document.createElement('div');
  bar.className = 'editor-bar';
  bar.innerHTML = `
    <select class="fam" title="Písmo">${fonts.map(f => `<option${f === state.family ? ' selected' : ''}>${f}</option>`).join('')}</select>
    <input class="size" type="number" min="4" max="300" step="0.5" value="${state.size}" title="Veľkosť (pt)">
    <label class="color-pick" title="Farba"><input class="col" type="color" value="${state.color}"></label>
    <button class="toggle bold${state.bold ? ' active' : ''}" title="Tučné">B</button>
    <button class="toggle italic${state.italic ? ' active' : ''}" title="Kurzíva">I</button>
    ${mode === 'edit' ? `<select class="align" title="Zarovnanie voči pôvodnému riadku">
        <option value="left">Vľavo</option><option value="center">Na stred</option><option value="right">Vpravo</option></select>` : ''}
    <button class="ok" title="Uložiť (Enter)">${icon('check')}Použiť</button>
    <button class="cancel" title="Zrušiť (Esc)">${icon('x')}</button>
    ${mode === 'edit' ? `<button class="del danger" title="Zmazať riadok">${icon('trash')}</button>` : ''}`;
  wrap.appendChild(bar);

  const ta = document.createElement('textarea');
  ta.value = state.text;
  ta.spellcheck = false;
  wrap.appendChild(ta);
  el.appendChild(wrap);

  const ed = { mode, page, line: opts.line, state, original, wrap, ta };
  st.editor = ed;

  const restyle = () => {
    const s = state;
    const px = s.size * st.zoom;
    ta.style.fontFamily = `"${s.family}", sans-serif`;
    ta.style.fontSize = px + 'px';
    ta.style.fontWeight = s.bold ? '700' : '400';
    ta.style.fontStyle = s.italic ? 'italic' : 'normal';
    ta.style.color = s.color;
    ta.style.background = isLight(s.color) ? 'rgba(40,44,52,.94)' : 'rgba(255,255,255,.96)';
    measureCtx.font = `${ta.style.fontStyle} ${ta.style.fontWeight} ${px}px "${s.family}", sans-serif`;
    const lines = ta.value.split('\n');
    const w = Math.max(...lines.map(l => measureCtx.measureText(l || ' ').width));
    ta.style.width = Math.max(w + px * 0.6 + 10, s.minW * st.zoom + 12, 60) + 'px';
    ta.style.height = (lines.length * px * 1.2 + 4) + 'px';
  };
  restyle();

  bar.addEventListener('pointerdown', e => e.stopPropagation());
  ta.addEventListener('pointerdown', e => e.stopPropagation());
  $('.fam', bar).onchange = e => { state.family = e.target.value; restyle(); ta.focus(); };
  $('.size', bar).oninput = e => { const v = +e.target.value; if (v >= 4) { state.size = v; restyle(); } };
  $('.col', bar).oninput = e => { state.color = e.target.value; restyle(); };
  $('.bold', bar).onclick = e => { state.bold = !state.bold; e.currentTarget.classList.toggle('active', state.bold); restyle(); ta.focus(); };
  $('.italic', bar).onclick = e => { state.italic = !state.italic; e.currentTarget.classList.toggle('active', state.italic); restyle(); ta.focus(); };
  if (mode === 'edit') $('.align', bar).onchange = e => { state.align = e.target.value; ta.focus(); };
  $('.ok', bar).onclick = () => commitEditor();
  $('.cancel', bar).onclick = () => closeEditor(false);
  if (mode === 'edit') $('.del', bar).onclick = () => { ta.value = ''; commitEditor(); };
  ta.addEventListener('input', restyle);
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEditor(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeEditor(false); }
    e.stopPropagation();
  });

  renderOverlay(page);
  setTimeout(() => { ta.focus(); if (mode === 'edit') ta.select(); }, 0);
}

/** Zavrie editor; so save=true ho najprv uloží. Vracia Promise (dá sa počkať na uloženie). */
function closeEditor(save) {
  const ed = st.editor;
  if (!ed) return Promise.resolve();
  if (save) return Promise.resolve(commitEditor());
  st.editor = null;
  ed.wrap.remove();
  renderOverlay(ed.page);
}

function commitEditor() {
  const ed = st.editor;
  if (!ed) return;
  const s = ed.state;
  s.text = ed.ta.value;
  const changed = JSON.stringify(s) !== ed.original;
  st.editor = null;
  ed.wrap.remove();
  if (!changed) { renderOverlay(ed.page); return; }

  const font = { size: s.size, color: s.color, family: s.family, bold: s.bold, italic: s.italic };
  if (ed.mode === 'edit') {
    return mutate('edit_text', { page: ed.page, ubbox: ed.line.ubbox, origin: ed.line.origin, text: s.text, align: s.align, ...font });
  } else {
    if (!s.text.trim()) { renderOverlay(ed.page); return; }
    try {
      localStorage.setItem('pe.size', s.size);
      localStorage.setItem('pe.color', s.color);
      localStorage.setItem('pe.family', s.family);
    } catch { /* bez úložiska */ }
    return mutate('insert_text', { page: ed.page, point: [s.x, s.y], text: s.text, ...font });
  }
}

/* =========================================================================
   Súbor, späť/znova, stránky, prefarbenie
   ========================================================================= */
const isPdf = f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf';

/** Otvorí jeden alebo viac PDF – každé do vlastnej záložky. */
async function openFiles(fileList) {
  const files = [...fileList].filter(isPdf);
  if (!files.length) { toast('Vyber PDF súbor.', 'error'); return; }
  if (st.busy) return;
  await closeEditor(true);
  const fd = new FormData();
  files.forEach(f => fd.append('file', f));
  setBusy(true);
  let res;
  try {
    res = await api('/api/docs', { form: fd });
  } catch (e) {
    toast(e.message, 'error');
    return;
  } finally {
    setBusy(false);
  }
  for (const info of res.opened) {
    st.docs.push({ id: info.id, name: info.name, pageCount: info.pageCount, dirty: info.dirty });
  }
  (res.errors || []).forEach(m => toast(m, 'error'));
  const last = res.opened[res.opened.length - 1];
  await switchDoc(last.id, last);
  toast(res.opened.length === 1 ? `Otvorené: ${last.name}` : `Otvorené súbory: ${res.opened.length}`);
}

/** Zapamätá si zoom/scroll aktívnej záložky, aby sa po návrate obnovili. */
function saveView() {
  if (!st.docId) return;
  st.views[st.docId] = { zoom: st.zoom, fitMode: st.fitMode, current: st.current, scrollTop: viewer.scrollTop };
}

function clearViewer() {
  cancelPlacement();
  st.hover = null;
  [...pagesEl.children].forEach(el => io.unobserve(el));
  pagesEl.innerHTML = '';
  thumbsEl.innerHTML = '';
  visible.clear();
}

/** Prepne na záložku `id`. `info` = už načítaný detail (nepovinné). */
async function switchDoc(id, info = null) {
  if (st.busy || (id === st.docId && !info)) return;
  await closeEditor(true);
  if (!info) {
    try {
      info = await api(docBase(id));
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
  }
  saveView();
  st.docId = id;
  try { sessionStorage.setItem('pe.doc', id); } catch { /* bez úložiska */ }
  const v = st.views[id] || { zoom: st.zoom, fitMode: true, current: 0, scrollTop: 0 };
  st.zoom = v.zoom;
  st.fitMode = v.fitMode;
  st.current = v.current;
  clearViewer();
  applyInfo(info);
  viewer.scrollTop = v.scrollTop;
}

/** Zatvorí záložku (pri neuložených zmenách sa opýta). */
async function closeDoc(id) {
  const tab = st.docs.find(d => d.id === id);
  if (!tab || st.busy) return;
  if (tab.dirty && !confirm(`„${tab.name}“ má zmeny, ktoré si ešte nestiahol cez Uložiť. Zavretím sa zmaže aj automatická záloha. Zavrieť?`)) return;
  if (id === st.docId) await closeEditor(false);
  try { await api(docBase(id), { method: 'DELETE' }); } catch { /* na serveri už nie je */ }
  const idx = st.docs.indexOf(tab);
  st.docs.splice(idx, 1);
  delete st.views[id];
  if (id !== st.docId) { renderTabs(); return; }
  st.docId = null;
  const next = st.docs[idx] || st.docs[idx - 1];
  if (next) {
    await switchDoc(next.id);
  } else {
    clearViewer();
    applyInfo(EMPTY_INFO);
  }
}

function renderTabs() {
  const bar = $('#tabs');
  bar.innerHTML = '';
  document.body.classList.toggle('has-tabs', st.docs.length > 0);
  st.docs.forEach((d, k) => {
    const t = document.createElement('div');
    t.className = 'tab' + (d.id === st.docId ? ' active' : '') + (d.dirty ? ' dirty' : '');
    t.title = `${d.name} · ${d.pageCount} str.${d.dirty ? ' · zmeny ešte nie sú stiahnuté do PDF (záloha je uložená)' : ''}${k < 9 ? ` (Alt+${k + 1})` : ''}`;
    t.innerHTML = `<span class="tab-name"></span><span class="tab-dot" title="Neuložené zmeny"></span>
      <button class="tab-close" title="Zavrieť">${icon('x')}</button>`;
    $('.tab-name', t).textContent = d.name;
    t.addEventListener('click', () => switchDoc(d.id));
    t.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); closeDoc(d.id); } });
    $('.tab-close', t).addEventListener('click', e => { e.stopPropagation(); closeDoc(d.id); });
    bar.appendChild(t);
  });
  const add = document.createElement('button');
  add.className = 'tab-add';
  add.title = 'Otvoriť ďalšie PDF';
  add.innerHTML = icon('plus2');
  add.onclick = () => $('#fileOpen').click();
  bar.appendChild(add);
  const active = $('.tab.active', bar);
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

$('#btnOpen').onclick = $('#btnOpen2').onclick = () => $('#fileOpen').click();
$('#fileOpen').onchange = e => { const f = [...e.target.files]; e.target.value = ''; openFiles(f); };
$('#btnMerge').onclick = () => $('#fileMerge').click();
$('#fileMerge').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const fd = new FormData();
  fd.append('file', f);
  if (await mutate('merge', fd, true)) toast(`Pripojené: ${f.name}`);
};

async function save() {
  if (!st.info.open) return;
  await closeEditor(true);
  const a = document.createElement('a');
  a.href = `${docBase()}/download?v=${st.info.version}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // server si pri stiahnutí označí dokument ako uložený
  st.info.dirty = false;
  const tab = st.docs.find(d => d.id === st.docId);
  if (tab) tab.dirty = false;
  renderTabs();
  toast('Ukladám PDF…');
}
$('#btnSave').onclick = save;

const undo = () => { closeEditor(false); if (st.info.canUndo) mutate('undo', {}); };
const redo = () => { closeEditor(false); if (st.info.canRedo) mutate('redo', {}); };
$('#btnUndo').onclick = undo;
$('#btnRedo').onclick = redo;

document.querySelectorAll('[data-page-op]').forEach(b => b.addEventListener('click', async () => {
  if (!st.info.open) return;
  const i = st.current;
  const n = st.info.pages.length;
  const op = b.dataset.pageOp;
  let body;
  if (op === 'rotl') body = { op: 'rotate', page: i, angle: -90 };
  else if (op === 'rotr') body = { op: 'rotate', page: i, angle: 90 };
  else if (op === 'up') { if (i === 0) return; body = { op: 'move', page: i, to: i - 1 }; }
  else if (op === 'down') { if (i >= n - 1) return; body = { op: 'move', page: i, to: i + 1 }; }
  else if (op === 'delete') {
    if (!confirm(`Zmazať stranu ${i + 1}?`)) return;
    body = { op: 'delete', page: i };
  } else body = { op, page: i };
  const info = await mutate('pages', body);
  if (!info) return;
  if (op === 'up') st.current = i - 1;
  if (op === 'down') st.current = i + 1;
  if (op === 'duplicate' || op === 'blank') st.current = i + 1;
  st.current = Math.min(st.current, info.pages.length - 1);
  updateControls();
  if (op !== 'rotl' && op !== 'rotr') scrollToPage(st.current);
}));

$('#btnRecolor').onclick = async () => {
  if (!st.info.open) return;
  const all = $('#recolorAll').checked;
  if (all && !confirm('Zmeniť farbu textu na všetkých stranách?')) return;
  const info = await mutate('recolor', { page: st.current, all, color: $('#recolorColor').value });
  if (info) toast(all ? 'Farba textu zmenená na všetkých stranách.' : `Farba textu zmenená na strane ${st.current + 1}.`);
};

/* ---------- klávesnica ---------- */
const TOOL_KEYS = { v: 'select', t: 'edit', n: 'text', h: 'highlight', u: 'underline', s: 'strike',
  p: 'pen', r: 'rect', e: 'ellipse', a: 'arrow', k: 'note', w: 'whiteout' };

document.addEventListener('keydown', e => {
  const typing = e.target.matches('input, textarea, select');
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
  if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#fileOpen').click(); return; }
  if (e.altKey && /^[1-9]$/.test(e.key)) {          // Alt+1..9 = prepnúť záložku
    const d = st.docs[+e.key - 1];
    if (d) { e.preventDefault(); switchDoc(d.id); }
    return;
  }
  if (typing) return;
  if (st.placing) {
    if (e.key === 'Enter') { e.preventDefault(); commitPlacement(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelPlacement(); }
    return;
  }
  if (mod && st.selImage && ['c', 'x'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    copyImage(e.key.toLowerCase() === 'x');
    return;
  }
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (mod) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && st.selAnnot) { e.preventDefault(); deleteSelectedAnnot(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && st.selImage) { e.preventDefault(); deleteSelectedImage(); return; }
  if (e.key === 'Escape') { st.selAnnot = null; st.selImage = null; renderAllOverlays(); return; }
  if (e.key === 'PageDown') { e.preventDefault(); scrollToPage(Math.min(st.current + 1, st.info.pages.length - 1)); return; }
  if (e.key === 'PageUp') { e.preventDefault(); scrollToPage(Math.max(st.current - 1, 0)); return; }
  const t = TOOL_KEYS[e.key.toLowerCase()];
  if (t && st.info.open) setTool(t);
});

/* ---------- drag & drop ---------- */
let dragDepth = 0;
window.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; document.body.classList.add('dragging'); } });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  const files = [...e.dataTransfer.files];
  const img = files.find(f => f.type.startsWith('image/'));
  if (img && !files.some(isPdf)) {
    // obrázok pustený na stranu → vloží sa tam, kde bol pustený
    if (!st.info.open) { toast('Najprv otvor PDF, potom doň vlož obrázok.', 'error'); return; }
    const pg = e.target.closest?.('.page');
    startPlacement(img, pg ? { page: +pg.dataset.i, ...pointFromEvent(e, +pg.dataset.i) } : null);
    return;
  }
  openFiles(files);
});

// Dokumenty žijú na serveri, obnovenie stránky ich nestratí – varujeme len pre istotu.
window.addEventListener('beforeunload', e => {
  if (st.docs.some(d => d.dirty)) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- štart ---------- */
(async () => {
  setTool('edit');
  try {
    // obnoví záložky, ktoré sú na serveri ešte otvorené (napr. po F5)
    const res = await api('/api/docs');
    st.fonts = res.fonts || [];
    // ak medzitým používateľ už otvoril súbor, jeho záložky nesmú zmiznúť ani sa zdvojiť
    st.docs = [...res.docs, ...st.docs.filter(d => !res.docs.some(r => r.id === d.id))];
    renderTabs();
    if (st.docId) return;
    let last = null;
    try { last = sessionStorage.getItem('pe.doc'); } catch { /* bez úložiska */ }
    const first = st.docs.find(d => d.id === last) || st.docs[0];
    if (first) await switchDoc(first.id);
    else applyInfo(EMPTY_INFO);
  } catch (e) {
    toast('Server nebeží: ' + e.message, 'error');
  }
})();
