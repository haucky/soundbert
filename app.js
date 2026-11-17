/* Soundbert – Geräusche aufnehmen, sammeln und zu Geschichten zusammensetzen.
   Reines JavaScript ohne Build-Schritt. Daten bleiben im Browser (IndexedDB).

   Datenmodell (IndexedDB "soundbert"):
   - sounds: { id, v, kind: 'geraeusch'|'erzaehler', pic, source, created, updated, edited,
               audio: ArrayBuffer (Originalaufnahme), type, duration,
               trimStart, trimEnd, gain, autoTrim: [start, end], note }
     Die Originalaufnahme bleibt unverändert. Schnitt (trimStart/trimEnd) und
     Lautstärke-Angleichung (gain) werden beim Abspielen und Exportieren angewendet.
   - meta: 'story' -> { title, items: [sound-id, …] }, 'zauber' -> { audio, type, trimStart, trimEnd, gain }
   `note` ist für ein späteres Stimmen-Tagebuch reserviert. */
'use strict';
(() => {
  // ---------------------------------------------------------------- Bilder & Symbole
  const COLORS = [
    ['#FFE1D6', '#EBBFAF'], // Pfirsich
    ['#E3E6F5', '#C3C8E2'], // Wolke
    ['#FFF0C2', '#E8D38F'], // Gelb
    ['#E3F1E4', '#BCD8BF'], // Minze
    ['#EDE3FF', '#CDBDF0'], // Flieder
    ['#DCE8FF', '#B9CCF0'], // Himmel
    ['#F0E2D0', '#DDC8AE'], // Sand
  ];

  const svg = (inner, { cls = 'pic', size, sw = 1.8, stroke = 'currentColor' } = {}) =>
    `<svg class="${cls}" ${size ? `width="${size}" height="${size}"` : ''} viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const EYES = (y) => `<path d="M9 ${y}h.01M15 ${y}h.01" stroke-width="2.8"/>`;

  const PICS = [
    { id: 'ohr', label: 'Geräusch', c: 6, d: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 9a2 2 0 0 1 4 0c0 1.5-1.5 2-1.5 3.5"/>' },
    { id: 'hund', label: 'Wuff', c: 0, d: '<circle cx="7" cy="8" r="1.8"/><circle cx="12" cy="6" r="1.8"/><circle cx="17" cy="8" r="1.8"/><path d="M12 11c-3 0-5.5 3.5-5.5 6 0 1.8 1.6 2.6 3 2 1.2-.5 1.8-.6 2.5-.6s1.3.1 2.5.6c1.4.6 3-.2 3-2 0-2.5-2.5-6-5.5-6z"/>' },
    { id: 'katze', label: 'Miau', c: 4, d: '<path d="M5 19c-1.5-2-1.5-6 0-8V4l4 3h6l4-3v7c1.5 2 1.5 6 0 8-1.6 1.6-4 2-7 2s-5.4-.4-7-2z"/>' + EYES(13) + '<path d="M11 16.5l1 .8 1-.8"/>' },
    { id: 'vogel', label: 'Piep', c: 5, d: '<path d="M4 15c3 4 10 4 13 0l3-6-4 1a4 4 0 0 0-7 2c-2 0-4 1-5 3z"/><path d="M14 9h.01" stroke-width="2.6"/>' },
    { id: 'fisch', label: 'Blubb', c: 5, d: '<path d="M3 12c3-5 10-6 14 0-4 6-11 5-14 0z"/><path d="M17 12l4-4v8z"/><path d="M8 11h.01" stroke-width="2.6"/>' },
    { id: 'donner', label: 'Donner', c: 1, d: '<path d="M7 17a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18 10a3.5 3.5 0 0 1 0 7"/><path d="M13 13l-2 4h3l-2 4"/>' },
    { id: 'regen', label: 'Regen', c: 1, d: '<path d="M7 15a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18 8a3.5 3.5 0 0 1 0 7"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>' },
    { id: 'sonne', label: 'Sonne', c: 2, d: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
    { id: 'mond', label: 'Mond', c: 2, d: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>' },
    { id: 'stern', label: 'Stern', c: 2, d: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>' },
    { id: 'wasser', label: 'Platsch', c: 5, d: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>' },
    { id: 'haus', label: 'Haus', c: 5, d: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>' },
    { id: 'tuer', label: 'Tür', c: 2, d: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><circle cx="15" cy="12.5" r="1"/>' },
    { id: 'zug', label: 'Zug', c: 4, d: '<rect x="5" y="4" width="14" height="12" rx="3"/><path d="M5 11h14"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/><path d="M8 7.5h8"/>' },
    { id: 'auto', label: 'Auto', c: 0, d: '<path d="M3 16v-4l2-5h14l2 5v4z"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M3 12h18"/>' },
    { id: 'glocke', label: 'Bimmel', c: 2, d: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>' },
    { id: 'trommel', label: 'Trommel', c: 0, d: '<ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9"/><path d="M8 3l3 5M16 3l-3 5"/>' },
    { id: 'musik', label: 'Musik', c: 4, d: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>' },
    { id: 'lachen', label: 'Lachen', c: 3, d: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0z"/>' + EYES(9.5) },
    { id: 'kuss', label: 'Kuss', c: 0, d: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>' },
    { id: 'schlafen', label: 'Schnarch', c: 1, d: '<path d="M4 8h6l-6 7h6"/><path d="M13 4h5l-5 6h5"/><path d="M14 15h4l-4 5h4"/>' },
    { id: 'fuesse', label: 'Tapp', c: 3, d: '<ellipse cx="8" cy="9" rx="2.5" ry="4"/><ellipse cx="16" cy="15" rx="2.5" ry="4"/>' },
    { id: 'gespenst', label: 'Buh', c: 4, d: '<path d="M5 20V10a7 7 0 0 1 14 0v10l-2.3-1.5L14.3 20 12 18.5 9.7 20l-2.4-1.5z"/>' + EYES(10.5) },
    { id: 'uhr', label: 'Tick-Tack', c: 3, d: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
    { id: 'baum', label: 'Wind', c: 3, d: '<path d="M12 21v-6"/><path d="M12 15c-4 0-7-2.5-7-6a7 7 0 0 1 14 0c0 3.5-3 6-7 6z"/>' },
  ];
  const PIC = Object.fromEntries(PICS.map((p) => [p.id, p]));
  const NARRATOR = { id: 'erzaehler', label: 'Erzähler', c: 6, d: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>' };
  const picOf = (s) => (s && s.kind === 'erzaehler' ? NARRATOR : PIC[s && s.pic] || PIC.ohr);
  const PICKABLE = PICS.filter((p) => p.id !== 'ohr');

  const FX = [
    { id: 'riese', label: 'Riese', sub: 'ganz tief', c: 0, d: '<path d="M5 6l7 6 7-6"/><path d="M5 12l7 6 7-6"/>' },
    { id: 'maus', label: 'Maus', sub: 'ganz hoch', c: 2, d: '<path d="M5 18l7-6 7 6"/><path d="M5 12l7-6 7 6"/>' },
    { id: 'hoehle', label: 'Höhle', sub: 'Echo', c: 1, d: '<circle cx="5" cy="12" r="1.5"/><path d="M9 8.5a5 5 0 0 1 0 7"/><path d="M12.5 6a8.5 8.5 0 0 1 0 12"/><path d="M16 3.5a12 12 0 0 1 0 17"/>' },
    { id: 'roboter', label: 'Roboter', sub: 'blechern', c: 3, d: '<rect x="5" y="8" width="14" height="11" rx="2.5"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/>' + EYES(12.5) + '<path d="M9.5 16h5"/>' },
  ];

  const I = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/>',
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    remove: '<path d="M5 12h14"/>',
    box: '<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>',
    strip: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M15 5v14"/>',
    wand: '<path d="M4 20L15 9"/><path d="M15 4v2M15 12v2M20 9h-2M12 9h-2M18.5 5.5l-1.4 1.4M18.5 12.5l-1.4-1.4M11.5 5.5l1.4 1.4"/>',
    ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 9a2 2 0 0 1 4 0c0 1.5-1.5 2-1.5 3.5"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20M8.1 15.9L20 4"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    upload: '<path d="M12 15V4M7 9l5-5 5 5"/><path d="M5 20h14"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>',
    speak: NARRATOR.d,
    auto: '<path d="M4 12h3l2-5 3 10 2-5h6"/>',
    full: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>',
  };
  const ico = (name, size, stroke = 'currentColor', sw = 2.2) => svg(I[name], { cls: 'ui', size, stroke, sw });
  const playIco = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#FFFFFF"/></svg>`;
  const stopIco = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="#FFFFFF"/></svg>`;

  // ---------------------------------------------------------------- Hilfsfunktionen
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tint = (c) => `background:${COLORS[c][0]};box-shadow:0 5px 0 ${COLORS[c][1]}`;
  const fmtSec = (s) => `${(Math.round(s * 10) / 10).toFixed(1).replace('.', ',')} s`;
  const fmtDur = (s) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min`);
  const fmtMB = (b) => `${(b / 1048576).toFixed(1).replace('.', ',')} MB`;
  const fileSafe = (s) => (s || 'geschichte').normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'geschichte';
  const extFor = (type) => (/mp4|aac|m4a/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : /mpeg|mp3/.test(type) ? 'mp3' : /wav/.test(type) ? 'wav' : 'webm');
  const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* egal */ } };

  let toastTimer = null;
  function toast(msg, ms = 2400) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // ---------------------------------------------------------------- Speicher (IndexedDB)
  const DB = {
    db: null,
    async open() {
      try {
        this.db = await new Promise((res, rej) => {
          const r = indexedDB.open('soundbert', 1);
          r.onupgradeneeded = () => {
            const d = r.result;
            d.createObjectStore('sounds', { keyPath: 'id' });
            d.createObjectStore('meta');
          };
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      } catch (e) {
        this.db = null;
      }
      return !!this.db;
    },
    run(store, mode, fn) {
      return new Promise((res) => {
        if (!this.db) return res(null);
        try {
          const tx = this.db.transaction(store, mode);
          const r = fn(tx.objectStore(store));
          tx.oncomplete = () => res(r ? r.result : null);
          tx.onerror = tx.onabort = () => res(null);
        } catch (e) {
          res(null);
        }
      });
    },
    all: (s) => DB.run(s, 'readonly', (st) => st.getAll()),
    get: (s, k) => DB.run(s, 'readonly', (st) => st.get(k)),
    put: (s, v, k) => DB.run(s, 'readwrite', (st) => (k === undefined ? st.put(v) : st.put(v, k))),
    del: (s, k) => DB.run(s, 'readwrite', (st) => st.delete(k)),
  };

  // ---------------------------------------------------------------- Zustand
  const state = {
    tab: 'kiste',
    parent: false,
    sounds: [],
    story: { title: 'Meine Geschichte', items: [] },
    zauber: null,
    page: 0,
  };
  const byId = (id) => state.sounds.find((s) => s.id === id);
  const kisteSounds = () => state.sounds.filter((s) => s.kind !== 'erzaehler');
  const saveStory = () => DB.put('meta', { title: state.story.title, items: state.story.items.slice() }, 'story');
  const saveSound = (s) => DB.put('sounds', s);

  // ---------------------------------------------------------------- Audio-Grundlagen
  let actx = null;
  function getCtx() {
    if (!actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { actx = new C(); } catch (e) { return null; }
    }
    return actx;
  }
  document.addEventListener('pointerdown', () => {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }, { capture: true });

  const decoded = new Map(); // id -> { updated, buf }
  async function decode(audio) {
    const ctx = getCtx();
    if (!ctx) throw new Error('kein AudioContext');
    return ctx.decodeAudioData(audio.slice(0));
  }
  async function bufferOf(sound) {
    const c = decoded.get(sound.id);
    if (c && c.updated === sound.updated) return c.buf;
    const buf = await decode(sound.audio);
    decoded.set(sound.id, { updated: sound.updated, buf });
    return buf;
  }

  // Stille am Anfang/Ende finden: 20-ms-Fenster, Schwelle relativ zu Grundrauschen und lautester Stelle.
  function analyze(buf) {
    const d = buf.getChannelData(0);
    const sr = buf.sampleRate;
    const win = Math.max(1, Math.floor(sr * 0.02));
    const n = Math.floor(d.length / win);
    if (n < 3) return { start: 0, end: buf.duration };
    const rms = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = i * win; j < (i + 1) * win; j++) s += d[j] * d[j];
      rms[i] = Math.sqrt(s / win);
    }
    const sorted = Array.from(rms).sort((a, b) => a - b);
    const noise = sorted[Math.floor(n * 0.1)];
    const peak = sorted[n - 1];
    const thr = Math.max(noise * 3, peak * 0.1, 0.004);
    let first = -1, last = -1;
    for (let i = 0; i < n; i++) if (rms[i] > thr) { first = i; break; }
    for (let i = n - 1; i >= 0; i--) if (rms[i] > thr) { last = i; break; }
    if (first < 0) return { start: 0, end: buf.duration };
    const start = Math.max(0, (first * win) / sr - 0.12);
    const end = Math.min(buf.duration, ((last + 1) * win) / sr + 0.2);
    if (end - start < 0.25) return { start: 0, end: buf.duration };
    return { start, end };
  }

  // Lautstärke angleichen: Ziel ca. -18 dBFS RMS, Spitzen höchstens -0,5 dBFS, maximal 8-fach verstärken.
  function gainFor(buf, start, end) {
    const d = buf.getChannelData(0);
    const sr = buf.sampleRate;
    const i0 = Math.max(0, Math.floor(start * sr));
    const i1 = Math.min(d.length, Math.ceil(end * sr));
    let peak = 0, sum = 0;
    for (let i = i0; i < i1; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; }
    const rms = Math.sqrt(sum / Math.max(1, i1 - i0));
    if (!peak || !rms) return 1;
    const g = Math.min(0.13 / rms, 0.95 / peak, 8);
    return Math.round(g * 1000) / 1000;
  }

  async function finalize(audio, type) {
    try {
      const buf = await decode(audio);
      const a = analyze(buf);
      return {
        audio, type, buf,
        meta: { duration: buf.duration, trimStart: a.start, trimEnd: a.end, gain: gainFor(buf, a.start, a.end), autoTrim: [a.start, a.end] },
      };
    } catch (e) {
      return { audio, type, buf: null, meta: { duration: 0, trimStart: null, trimEnd: null, gain: 1, autoTrim: null } };
    }
  }

  function makeSound(res, { kind = 'geraeusch', pic = 'ohr', source = 'kiste' }) {
    const now = Date.now();
    const s = { id: uid(), v: 2, kind, pic, source, created: now, updated: now, edited: null, audio: res.audio, type: res.type, note: '', ...res.meta };
    if (res.buf) decoded.set(s.id, { updated: s.updated, buf: res.buf });
    return s;
  }

  function applyRecording(s, res) {
    Object.assign(s, { audio: res.audio, type: res.type, updated: Date.now(), edited: null, ...res.meta });
    if (res.buf) decoded.set(s.id, { updated: s.updated, buf: res.buf });
  }

  // ---------------------------------------------------------------- Wiedergabe
  let current = null; // laufende Wiedergabe: { stop() }
  function stopPlayback() {
    if (current) { const c = current; current = null; c.stop(); }
  }

  let irCache = null;
  function makeIR(ctx, sec) {
    if (irCache && irCache.sampleRate === ctx.sampleRate) return irCache;
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    irCache = b;
    return b;
  }

  // Effektkette für den Stimmen-Zauber. Gibt Wiedergabe-Rate, Nachhall und Oszillatoren zurück.
  function connectFx(ctx, src, master, fx) {
    const r = { rate: 1, tail: 0.05, oscs: [] };
    if (fx === 'riese') {
      r.rate = 0.6;
      src.playbackRate.value = r.rate;
      src.connect(master);
    } else if (fx === 'maus') {
      r.rate = 1.8;
      src.playbackRate.value = r.rate;
      src.connect(master);
    } else if (fx === 'hoehle') {
      const conv = ctx.createConvolver();
      conv.buffer = makeIR(ctx, 2.8);
      const wet = ctx.createGain(); wet.gain.value = 0.9;
      const dry = ctx.createGain(); dry.gain.value = 0.7;
      const dl = ctx.createDelay(1); dl.delayTime.value = 0.3;
      const fb = ctx.createGain(); fb.gain.value = 0.42;
      src.connect(dry).connect(master);
      src.connect(conv).connect(wet).connect(master);
      src.connect(dl);
      dl.connect(fb).connect(dl);
      dl.connect(master);
      r.tail = 3.2;
    } else if (fx === 'roboter') {
      const ring = ctx.createGain(); ring.gain.value = 0;
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 50;
      osc.connect(ring.gain);
      src.connect(ring);
      const comb = ctx.createDelay(0.1); comb.delayTime.value = 0.011;
      const fb = ctx.createGain(); fb.gain.value = 0.5;
      ring.connect(master);
      ring.connect(comb);
      comb.connect(fb).connect(comb);
      comb.connect(master);
      osc.start();
      r.oscs.push(osc);
      r.tail = 0.4;
      r.boost = 1.3;
    } else {
      src.connect(master);
    }
    return r;
  }

  // Spielt einen Ausschnitt [start, end] mit Verstärkung gain. Löst auf, wenn fertig oder gestoppt.
  function playClip(getBuf, { start = null, end = null, gain = 1, fx = null, onStart = null } = {}) {
    return new Promise(async (resolve) => {
      stopPlayback();
      let done = false, src = null, master = null, oscs = [], t = 0;
      const handle = { stop: () => finish() };
      current = handle;
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(t);
        try { if (src) src.stop(); } catch (e) { /* egal */ }
        oscs.forEach((o) => { try { o.stop(); } catch (e) { /* egal */ } });
        try { if (master) master.disconnect(); } catch (e) { /* egal */ }
        if (current === handle) current = null;
        resolve();
      }
      let buf = null;
      try { buf = await getBuf(); } catch (e) { buf = null; }
      if (done) return;
      const ctx = getCtx();
      if (!buf || !ctx) { finish(); return; }
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) { /* egal */ } }
      if (done) return;
      const s = Math.max(0, Math.min(start == null ? 0 : start, buf.duration));
      const e = Math.max(s + 0.01, Math.min(end == null ? buf.duration : end, buf.duration));
      src = ctx.createBufferSource();
      src.buffer = buf;
      master = ctx.createGain();
      master.connect(ctx.destination);
      const r = connectFx(ctx, src, master, fx);
      oscs = r.oscs;
      master.gain.value = (gain || 1) * (r.boost || 1);
      src.start(0, s, e - s);
      if (onStart) onStart(e - s, r.rate);
      t = setTimeout(finish, ((e - s) / r.rate + r.tail) * 1000 + 80);
    });
  }

  const playSound = (sound) => playClip(() => bufferOf(sound), { start: sound.trimStart, end: sound.trimEnd, gain: sound.gain });

  function beep(freq = 660, dur = 0.12, vol = 0.08) {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  let storyRun = 0;
  let storyPlaying = false;
  function clearMarks() { $$('.playing').forEach((el) => el.classList.remove('playing')); }
  function stopAll() {
    if (storyPlaying) { storyRun++; storyPlaying = false; updatePlayAll(); }
    stopPlayback();
    clearMarks();
  }

  async function playMarked(sound, el) {
    stopAll();
    if (el) el.classList.add('playing');
    await playSound(sound);
    if (el) el.classList.remove('playing');
  }

  // ---------------------------------------------------------------- Mikrofon & Aufnahme
  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
  }

  async function getMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      toast('Aufnehmen geht in diesem Browser leider nicht.');
      throw new Error('nicht unterstützt');
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    } catch (e) {
      toast(e && e.name === 'NotAllowedError' ? 'Bitte das Mikrofon erlauben.' : 'Kein Mikrofon gefunden.');
      throw e;
    }
  }

  function makeRecorder(stream) {
    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const t0 = performance.now();
    rec.start();
    return {
      t0,
      stop(discard = false) {
        return new Promise((res) => {
          if (rec.state === 'inactive') { res(null); return; }
          rec.onstop = async () => {
            if (discard || !chunks.length) { res(null); return; }
            const type = rec.mimeType || mime || 'audio/webm';
            res({ audio: await new Blob(chunks, { type }).arrayBuffer(), type, ms: performance.now() - t0 });
          };
          rec.stop();
        });
      },
    };
  }

  function levelMeter(stream) {
    const ctx = getCtx();
    if (!ctx) return null;
    try {
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      const sink = ctx.createGain();
      sink.gain.value = 0;
      src.connect(an);
      an.connect(sink);
      sink.connect(ctx.destination);
      const data = new Uint8Array(an.fftSize);
      return {
        read() {
          an.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
          return Math.min(1, Math.sqrt(sum / data.length) * 5);
        },
        close() { try { src.disconnect(); sink.disconnect(); } catch (e) { /* egal */ } },
      };
    } catch (e) {
      return null;
    }
  }

  const DOTS = 8;
  let recCtl = null;

  function recorderHtml({ icon, bg, chip }) {
    return `<div class="recorder waiting" role="dialog" aria-modal="true" aria-label="Aufnahme">
      <div class="rec-top">
        <button class="mini rec-cancel" style="background:var(--chip)" data-action="rec-cancel" aria-label="Abbrechen">${ico('x', 22)}</button>
        <div class="rec-chip"><span class="ico" style="background:${bg}">${icon}</span><span>${esc(chip)}</span></div>
      </div>
      <div class="rec-center">
        <div class="rings"><div class="ring r1"></div><div class="ring r2"></div>
          <div class="core">${ico('mic', 80, '#FFFFFF', 1.9)}</div></div>
        <p class="rec-text">Mikrofon startet …</p>
        <div class="countdown" aria-hidden="true">${'<span class="on"></span>'.repeat(DOTS)}</div>
      </div>
      <button class="stop" data-action="rec-stop" aria-label="Aufnahme stoppen" disabled><span></span></button>
      <span class="rec-foot">Stille am Anfang und Ende schneide ich selbst weg</span>
    </div>`;
  }

  // Aufnahme-Bildschirm. Ergebnis: { audio, type, buf, meta } oder null.
  function record(opts) {
    const maxMs = opts.maxMs || 15000;
    return new Promise((resolve) => {
      stopAll();
      const ov = $('#overlay');
      ov.innerHTML = recorderHtml(opts);
      const root = $('.recorder', ov);
      let stream = null, rec = null, meter = null, raf = 0, timer = 0, finished = false, level = 0;

      const cleanup = () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
        if (meter) meter.close();
        if (stream) stream.getTracks().forEach((t) => t.stop());
        ov.innerHTML = '';
        recCtl = null;
      };
      const cancel = () => {
        if (finished) return;
        finished = true;
        if (rec) rec.stop(true);
        cleanup();
        resolve(null);
      };
      const stop = async () => {
        if (finished || !rec) return;
        finished = true;
        cancelAnimationFrame(raf);
        clearTimeout(timer);
        $('.rec-text', root).textContent = 'Moment …';
        $('.stop', root).disabled = true;
        const out = await rec.stop();
        if (!out || out.ms < 400) {
          cleanup();
          toast('Das war zu kurz – nochmal!');
          resolve(null);
          return;
        }
        const res = await finalize(out.audio, out.type);
        cleanup();
        resolve(res);
      };
      recCtl = { cancel, stop };

      (async () => {
        try { stream = await getMic(); } catch (e) { cancel(); return; }
        if (finished) { stream.getTracks().forEach((t) => t.stop()); return; }
        try { rec = makeRecorder(stream); } catch (e) { toast('Aufnehmen geht in diesem Browser leider nicht.'); cancel(); return; }
        meter = levelMeter(stream);
        timer = setTimeout(stop, maxMs);
        root.classList.remove('waiting');
        $('.rec-text', root).textContent = 'Ich höre zu …';
        $('.stop', root).disabled = false;
        const dots = $$('.countdown span', root);
        const r1 = $('.ring.r1', root), r2 = $('.ring.r2', root);
        const tick = () => {
          const el = performance.now() - rec.t0;
          const on = Math.max(0, Math.ceil(DOTS * (1 - el / maxMs)));
          dots.forEach((d, i) => d.classList.toggle('on', i < on));
          if (meter) {
            level = level * 0.6 + meter.read() * 0.4;
            r1.style.transform = `scale(${0.8 + level * 0.2})`;
            r2.style.transform = `scale(${0.84 + level * 0.16})`;
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      })();
    });
  }

  // ---------------------------------------------------------------- Blätter (Auswahl, Dialoge)
  let sheetResolve = null;
  function openSheet(title, bodyHtml, bodyClass = 'sheet-grid') {
    return new Promise((res) => {
      stopAll();
      sheetResolve = res;
      $('#overlay').innerHTML = `<div class="sheet-backdrop" data-action="sheet-close">
        <div class="sheet" data-action="noop" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="sheet-head"><h2>${esc(title)}</h2>
            <button class="mini" style="background:var(--chip)" data-action="sheet-close" aria-label="Schließen">${ico('x', 22)}</button></div>
          <div class="${bodyClass}">${bodyHtml}</div>
        </div></div>`;
    });
  }
  function closeSheet(value) {
    $('#overlay').innerHTML = '';
    const r = sheetResolve;
    sheetResolve = null;
    if (r) r(value);
  }

  const newTile = (action) => `<button class="tile new" data-action="${action}">
      <span class="mic-badge">${ico('mic', 36, '#FFFFFF')}</span><span class="label">Neues Geräusch</span></button>`;

  async function pickPicture() {
    const grid = PICKABLE.map((p) => `<button class="tile" data-action="pick-pic" data-pic="${p.id}" style="${tint(p.c)}">
        ${svg(p.d)}<span class="label">${esc(p.label)}</span></button>`).join('');
    const id = await openSheet('Welches Bild?', grid);
    return id ? PIC[id] : null;
  }

  async function pickFromKiste() {
    const grid = newTile('pick-new') + kisteSounds().slice().reverse().map((s) => {
      const p = picOf(s);
      return `<button class="tile" data-action="pick-sound" data-id="${s.id}" style="${tint(p.c)}">
        ${svg(p.d)}<span class="label">${esc(p.label)}</span></button>`;
    }).join('');
    const res = await openSheet('Aus der Kiste', grid);
    if (!res) return;
    if (res.new) return newSoundFlow(true);
    if (byId(res.sound)) {
      state.story.items.push(res.sound);
      await saveStory();
      render();
      playLatest(res.sound, state.story.items.length - 1);
    }
  }

  // ---------------------------------------------------------------- Abläufe
  async function newSoundFlow(toStory) {
    const p = await pickPicture();
    if (!p) return;
    const chip = toStory ? `Bild ${pictureCount() + 1}` : p.label;
    const res = await record({ icon: svg(p.d), bg: COLORS[p.c][0], chip });
    if (!res) return;
    const s = makeSound(res, { pic: p.id, source: toStory ? 'geschichte' : 'kiste' });
    state.sounds.push(s);
    await saveSound(s);
    if (toStory) {
      state.story.items.push(s.id);
      await saveStory();
    } else {
      state.page = Math.floor((kisteSounds().length - 1) / 6);
    }
    render();
    playLatest(s.id, toStory ? state.story.items.length - 1 : null);
  }

  async function narrationFlow() {
    const res = await record({ icon: svg(NARRATOR.d), bg: COLORS[6][0], chip: 'Erzählstimme', maxMs: 60000 });
    if (!res) return;
    const s = makeSound(res, { kind: 'erzaehler', pic: 'erzaehler', source: 'geschichte' });
    state.sounds.push(s);
    await saveSound(s);
    state.story.items.push(s.id);
    await saveStory();
    render();
    playLatest(s.id, state.story.items.length - 1);
  }

  async function reRecord(id, chip, sceneIndex = null) {
    const s = byId(id);
    if (!s) return;
    const p = picOf(s);
    const res = await record({ icon: svg(p.d), bg: COLORS[p.c][0], chip: chip || p.label, maxMs: s.kind === 'erzaehler' ? 60000 : 15000 });
    if (!res) return;
    applyRecording(s, res);
    await saveSound(s);
    render();
    playLatest(s.id, sceneIndex);
  }

  function playLatest(id, sceneIndex = null) {
    const s = byId(id);
    if (!s) return;
    let el = null;
    if (state.tab === 'geschichte') {
      const idx = sceneIndex != null ? sceneIndex : state.story.items.lastIndexOf(id);
      el = $(`.scene[data-index="${idx}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      el = $(`.tile-wrap[data-sound-id="${id}"]`);
    }
    playMarked(s, el);
  }

  async function deleteSound(id) {
    stopAll();
    state.sounds = state.sounds.filter((s) => s.id !== id);
    const before = state.story.items.length;
    state.story.items = state.story.items.filter((x) => x !== id);
    decoded.delete(id);
    await DB.del('sounds', id);
    if (before !== state.story.items.length) await saveStory();
    render();
  }

  const pictureCount = () => state.story.items.filter((id) => { const s = byId(id); return s && s.kind !== 'erzaehler'; }).length;

  async function playStory() {
    stopAll();
    const list = state.story.items.map(byId);
    if (!list.some(Boolean)) return;
    const run = ++storyRun;
    storyPlaying = true;
    updatePlayAll();
    for (let i = 0; i < list.length; i++) {
      if (run !== storyRun) return;
      if (!list[i]) continue;
      const el = $(`.scene[data-index="${i}"]`);
      if (el) { el.classList.add('playing'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      await playSound(list[i]);
      if (el) el.classList.remove('playing');
      if (run !== storyRun) return;
      await sleep(450);
    }
    if (run === storyRun) { storyPlaying = false; updatePlayAll(); }
  }

  function updatePlayAll() {
    const b = $('[data-action="play-all"]');
    if (!b) return;
    b.innerHTML = storyPlaying ? `${stopIco(28)} Stopp` : `${playIco(28)} Ganze Geschichte`;
  }

  async function moveScene(i, dir) {
    const j = i + dir;
    const it = state.story.items;
    if (j < 0 || j >= it.length) return;
    stopAll();
    [it[i], it[j]] = [it[j], it[i]];
    await saveStory();
    render();
  }

  async function removeScene(i) {
    stopAll();
    const [id] = state.story.items.splice(i, 1);
    await saveStory();
    const s = byId(id);
    // Erzählstimmen gehören nur zur Geschichte: ohne Verwendung werden sie gelöscht.
    if (s && s.kind === 'erzaehler' && !state.story.items.includes(id)) {
      await deleteSound(id);
      return;
    }
    render();
  }

  // ---------------------------------------------------------------- Schnitt-Editor
  let editor = null;

  async function openEditor(id, keep = null) {
    stopAll();
    const s = byId(id);
    if (!s) return;
    let buf = null;
    try { buf = await bufferOf(s); } catch (e) { buf = null; }
    if (!buf) { toast('Diese Aufnahme kann ich nicht lesen.'); return; }
    const ed = {
      s, buf,
      start: keep ? keep.start : (s.trimStart != null ? s.trimStart : 0),
      end: keep ? keep.end : (s.trimEnd != null ? s.trimEnd : buf.duration),
      drag: null, playhead: null, raf: 0, peaks: null,
    };
    editor = ed;
    const p = picOf(s);
    sheetResolve = () => { stopAll(); cancelAnimationFrame(ed.raf); if (editor === ed) editor = null; };
    $('#overlay').innerHTML = `<div class="sheet-backdrop" data-action="sheet-close">
      <div class="sheet" data-action="noop" role="dialog" aria-modal="true" aria-label="Aufnahme schneiden">
        <div class="sheet-head">
          <div class="rec-chip"><span class="ico" style="background:${COLORS[p.c][0]}">${svg(p.d)}</span><span>${esc(p.label)}</span></div>
          <button class="mini" style="background:var(--chip)" data-action="sheet-close" aria-label="Schließen">${ico('x', 22)}</button></div>
        <canvas class="ed-wave" aria-label="Wellenform: Anfang und Ende verschieben"></canvas>
        <p class="ed-time"></p>
        <div class="ed-row">
          <button class="btn" data-action="ed-play">${ico('auto', 22)}<span>Probehören</span></button>
          <button class="btn" data-action="ed-auto">${ico('cut', 22)}<span>Automatisch</span></button>
          <button class="btn" data-action="ed-all">${ico('full', 22)}<span>Alles</span></button>
          ${s.kind !== 'erzaehler' ? `<button class="btn" data-action="ed-pic">${ico('image', 22)}<span>Bild ändern</span></button>` : ''}
        </div>
        <p class="panel-text small">Aufgenommen ${new Date(s.created).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })} · Original ${fmtSec(buf.duration)}</p>
        <button class="pill" data-action="ed-save">Speichern</button>
      </div></div>`;
    const cv = $('.ed-wave');
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientHeight * dpr);
    ed.cv = cv;
    ed.dpr = dpr;
    // Spitzenwerte pro Spalte
    const d = buf.getChannelData(0);
    const cols = Math.max(1, Math.floor(cv.width / (3 * dpr)));
    const step = Math.max(1, Math.floor(d.length / cols));
    const peaks = [];
    for (let i = 0; i < cols; i++) {
      let m = 0;
      for (let j = i * step; j < Math.min(d.length, (i + 1) * step); j += 4) m = Math.max(m, Math.abs(d[j]));
      peaks.push(m);
    }
    const max = Math.max(...peaks, 0.0001);
    ed.peaks = peaks.map((v) => v / max);

    const tAt = (clientX) => {
      const r = cv.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * buf.duration;
    };
    cv.addEventListener('pointerdown', (e) => {
      const t = tAt(e.clientX);
      ed.drag = Math.abs(t - ed.start) <= Math.abs(t - ed.end) ? 'start' : 'end';
      cv.setPointerCapture(e.pointerId);
      moveHandle(t);
    });
    cv.addEventListener('pointermove', (e) => { if (ed.drag) moveHandle(tAt(e.clientX)); });
    const up = () => { ed.drag = null; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    function moveHandle(t) {
      stopEditorPlay();
      if (ed.drag === 'start') ed.start = Math.max(0, Math.min(t, ed.end - 0.1));
      else ed.end = Math.min(buf.duration, Math.max(t, ed.start + 0.1));
      drawEditor();
    }
    drawEditor();
  }

  function drawEditor() {
    const ed = editor;
    if (!ed) return;
    const { cv, dpr, peaks, buf } = ed;
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const bw = W / peaks.length;
    const xs = (ed.start / buf.duration) * W;
    const xe = (ed.end / buf.duration) * W;
    g.fillStyle = 'rgba(47,111,222,0.08)';
    g.fillRect(xs, 0, xe - xs, H);
    for (let i = 0; i < peaks.length; i++) {
      const x = i * bw;
      const h = Math.max(2 * dpr, peaks[i] * (H - 28 * dpr));
      g.fillStyle = x + bw / 2 >= xs && x + bw / 2 <= xe ? '#2F6FDE' : '#D9CBB9';
      g.fillRect(x + bw * 0.15, (H - h) / 2, bw * 0.7, h);
    }
    for (const x of [xs, xe]) {
      g.fillStyle = '#2E2420';
      g.fillRect(x - 1.5 * dpr, 0, 3 * dpr, H);
      g.beginPath(); g.arc(x, 10 * dpr, 9 * dpr, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x, H - 10 * dpr, 9 * dpr, 0, Math.PI * 2); g.fill();
    }
    if (ed.playhead != null) {
      const x = (ed.playhead / buf.duration) * W;
      g.fillStyle = '#E5533D';
      g.fillRect(x - 1 * dpr, 0, 2 * dpr, H);
    }
    $('.ed-time').textContent = `${fmtSec(ed.start)} bis ${fmtSec(ed.end)} · Länge ${fmtSec(ed.end - ed.start)}`;
  }

  function stopEditorPlay() {
    if (!editor) return;
    cancelAnimationFrame(editor.raf);
    if (editor.playhead != null) { editor.playhead = null; stopPlayback(); drawEditor(); }
  }

  function editorPlay() {
    const ed = editor;
    if (!ed) return;
    if (ed.playhead != null) { stopEditorPlay(); return; }
    const t0 = performance.now();
    ed.playhead = ed.start;
    playClip(() => ed.buf, { start: ed.start, end: ed.end, gain: gainFor(ed.buf, ed.start, ed.end) }).then(() => {
      if (editor !== ed) return;
      cancelAnimationFrame(ed.raf);
      ed.playhead = null;
      drawEditor();
    });
    const tick = () => {
      if (editor !== ed || ed.playhead == null) return;
      ed.playhead = Math.min(ed.end, ed.start + (performance.now() - t0) / 1000);
      drawEditor();
      ed.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  async function editorSave() {
    const ed = editor;
    if (!ed) return;
    const s = ed.s;
    s.trimStart = ed.start;
    s.trimEnd = ed.end;
    s.gain = gainFor(ed.buf, ed.start, ed.end);
    s.edited = Date.now();
    await saveSound(s);
    closeSheet(null);
    render();
    toast('Gespeichert');
  }

  async function editorPicture() {
    const ed = editor;
    if (!ed) return;
    const keep = { start: ed.start, end: ed.end };
    closeSheet(null);
    const p = await pickPicture();
    if (p) {
      ed.s.pic = p.id;
      ed.s.edited = Date.now();
      await saveSound(ed.s);
      render();
    }
    openEditor(ed.s.id, keep);
  }

  // ---------------------------------------------------------------- Hör-Modus
  // Schwarzer Bildschirm: halten = aufnehmen, tippen = letztes Geräusch abspielen.
  let hoer = null;
  const HOLD_MS = 280;

  async function openHoer() {
    stopAll();
    const ov = $('#overlay');
    ov.innerHTML = `<div class="hoer" role="application" aria-label="Hör-Modus: halten zum Aufnehmen, tippen zum Abspielen">
      <div class="hoer-glow"></div>
      <button class="hoer-exit" data-hoer-exit aria-label="Hör-Modus beenden (gedrückt halten)"><span class="fill"></span>${ico('x', 22, '#6B6B6B')}</button>
      <p class="hoer-hint">Halten = aufnehmen · Tippen = abspielen<br>Beenden: × gedrückt halten oder Zurück</p>
    </div>`;
    const root = $('.hoer', ov);
    const h = { root, stream: null, rec: null, pressT: 0, holdT: 0, maxT: 0, last: null, wake: null, meter: null, raf: 0, busy: false };
    hoer = h;
    try { history.pushState({ hoer: true }, ''); } catch (e) { /* egal */ }
    setTimeout(() => root.classList.add('quiet'), 3500);
    try { h.stream = await getMic(); } catch (e) { closeHoer(); return; }
    if (hoer !== h) { h.stream.getTracks().forEach((t) => t.stop()); return; }
    h.meter = levelMeter(h.stream);
    try { if (navigator.wakeLock) h.wake = await navigator.wakeLock.request('screen'); } catch (e) { /* egal */ }

    root.addEventListener('pointerdown', (e) => {
      const exit = e.target.closest('[data-hoer-exit]');
      if (exit) { e.preventDefault(); startExitHold(exit); return; }
      if (!h.stream || h.busy || h.rec) return;
      e.preventDefault();
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      stopAll();
      root.classList.remove('play');
      try { h.rec = makeRecorder(h.stream); } catch (err) { toast('Aufnehmen geht hier nicht.'); return; }
      h.pressT = performance.now();
      h.holdT = setTimeout(() => {
        root.classList.add('rec');
        vibrate(35);
        const tick = () => {
          if (!h.meter || !root.classList.contains('rec')) return;
          root.style.setProperty('--lvl', h.meter.read().toFixed(3));
          h.raf = requestAnimationFrame(tick);
        };
        tick();
      }, HOLD_MS);
      h.maxT = setTimeout(() => endPress(), 60000);
    });
    const onUp = (e) => {
      if (e.target.closest && e.target.closest('[data-hoer-exit]')) return;
      endPress();
    };
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);

    async function endPress() {
      if (!h.rec) return;
      clearTimeout(h.holdT);
      clearTimeout(h.maxT);
      cancelAnimationFrame(h.raf);
      const held = performance.now() - h.pressT;
      const r = h.rec;
      h.rec = null;
      root.classList.remove('rec');
      if (held < HOLD_MS) {
        r.stop(true);
        hoerPlayLast();
        return;
      }
      h.busy = true;
      vibrate([20, 40, 20]);
      const out = await r.stop();
      if (!out || out.ms < 500) { h.busy = false; beep(330, 0.15); return; }
      const res = await finalize(out.audio, out.type);
      const s = makeSound(res, { pic: 'ohr', source: 'hoermodus' });
      state.sounds.push(s);
      await saveSound(s);
      h.last = s.id;
      h.busy = false;
      if (hoer !== h) return;
      beep(880, 0.08, 0.05);
      await sleep(150);
      hoerPlayLast();
    }
  }

  async function hoerPlayLast() {
    const h = hoer;
    if (!h) return;
    const list = kisteSounds();
    const s = byId(h.last) || list[list.length - 1];
    if (!s) { beep(330, 0.15); return; }
    h.root.classList.add('play');
    await playSound(s);
    if (hoer === h) h.root.classList.remove('play');
  }

  let exitTimer = null;
  function startExitHold(btn) {
    btn.classList.add('holding');
    exitTimer = setTimeout(() => { exitTimer = null; closeHoer(); }, 1200);
    const cancel = () => {
      btn.removeEventListener('pointerup', cancel);
      btn.removeEventListener('pointercancel', cancel);
      if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; btn.classList.remove('holding'); }
    };
    btn.addEventListener('pointerup', cancel);
    btn.addEventListener('pointercancel', cancel);
  }

  function closeHoer(fromPop = false) {
    const h = hoer;
    if (!h) return;
    hoer = null;
    clearTimeout(h.holdT);
    clearTimeout(h.maxT);
    cancelAnimationFrame(h.raf);
    if (h.rec) h.rec.stop(true);
    if (h.meter) h.meter.close();
    if (h.stream) h.stream.getTracks().forEach((t) => t.stop());
    if (h.wake) h.wake.release().catch(() => {});
    stopAll();
    $('#overlay').innerHTML = '';
    if (!fromPop && history.state && history.state.hoer) { try { history.back(); } catch (e) { /* egal */ } }
    render();
  }
  window.addEventListener('popstate', () => { if (hoer) closeHoer(true); });

  // ---------------------------------------------------------------- Stimmen-Zauber
  let zauberBuf = null;
  let zauberPeaks = null;

  async function getZauberBuf() {
    if (zauberBuf) return zauberBuf;
    if (!state.zauber) return null;
    try { zauberBuf = await decode(state.zauber.audio); } catch (e) { zauberBuf = null; }
    return zauberBuf;
  }

  function computePeaks(buf, from, to, n = 24) {
    const d = buf.getChannelData(0);
    const a = Math.floor(from * buf.sampleRate);
    const b = Math.max(a + n, Math.floor(to * buf.sampleRate));
    const step = Math.max(1, Math.floor((b - a) / n));
    const peaks = [];
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = a + i * step; j < Math.min(d.length, a + (i + 1) * step); j++) m = Math.max(m, Math.abs(d[j]));
      peaks.push(m);
    }
    const max = Math.max(...peaks, 0.0001);
    return peaks.map((p) => p / max);
  }

  async function playZauber(fx, btn) {
    stopAll();
    const z = state.zauber;
    if (!z) { toast('Erst etwas aufnehmen!'); return; }
    if (btn) btn.classList.add('playing');
    await playClip(getZauberBuf, { start: z.trimStart, end: z.trimEnd, gain: z.gain, fx });
    if (btn) btn.classList.remove('playing');
  }

  async function recordZauber() {
    const res = await record({ icon: ico('wand', 22, 'currentColor', 2), bg: COLORS[4][0], chip: 'Zauber' });
    if (!res) return;
    state.zauber = { audio: res.audio, type: res.type, created: Date.now(), ...res.meta };
    zauberBuf = res.buf;
    zauberPeaks = null;
    await DB.put('meta', state.zauber, 'zauber');
    render();
    playZauber(null, $('[data-action="zauber-orig"]'));
  }

  // ---------------------------------------------------------------- Geschichte als MP3
  let lameReady = null;
  const loadLame = () => (lameReady = lameReady || loadScript('vendor/lame.min.js'));

  async function renderStoryMp3() {
    const ctx = getCtx();
    const list = state.story.items.map(byId).filter(Boolean);
    const sr = ctx.sampleRate;
    const lead = Math.round(sr * 0.3), gap = Math.round(sr * 0.5), tail = Math.round(sr * 0.8);
    const parts = [];
    let total = lead + tail;
    for (const s of list) {
      const buf = await bufferOf(s);
      const a = Math.floor((s.trimStart != null ? s.trimStart : 0) * buf.sampleRate);
      const b = Math.ceil((s.trimEnd != null ? s.trimEnd : buf.duration) * buf.sampleRate);
      parts.push({ buf, a, b: Math.min(b, buf.length), g: s.gain || 1 });
      total += Math.max(0, Math.min(b, buf.length) - a) + gap;
    }
    total -= list.length ? gap : 0;
    const out = new Float32Array(Math.max(total, 1));
    let pos = lead;
    const fade = Math.round(sr * 0.01);
    for (const p of parts) {
      const chs = [];
      for (let c = 0; c < p.buf.numberOfChannels; c++) chs.push(p.buf.getChannelData(c));
      const len = p.b - p.a;
      for (let i = 0; i < len; i++) {
        let v = 0;
        for (const ch of chs) v += ch[p.a + i];
        v = (v / chs.length) * p.g;
        if (i < fade) v *= i / fade;
        if (len - i < fade) v *= (len - i) / fade;
        out[pos + i] = v > 1 ? 1 : v < -1 ? -1 : v;
      }
      pos += len + gap;
    }
    await loadLame();
    const enc = new window.lamejs.Mp3Encoder(1, sr, 128);
    const chunks = [];
    const block = 1152;
    const pcm = new Int16Array(block);
    for (let i = 0; i < out.length; i += block) {
      const n = Math.min(block, out.length - i);
      for (let j = 0; j < n; j++) pcm[j] = out[i + j] * 32767;
      const mp3 = enc.encodeBuffer(n === block ? pcm : pcm.subarray(0, n));
      if (mp3.length) chunks.push(new Uint8Array(mp3));
      if (i % (block * 200) === 0) await sleep(0);
    }
    const end = enc.flush();
    if (end.length) chunks.push(new Uint8Array(end));
    return { blob: new Blob(chunks, { type: 'audio/mpeg' }), duration: out.length / sr };
  }

  let pendingFile = null;
  async function shareStory() {
    stopAll();
    if (!state.story.items.length) { toast('Die Geschichte ist noch leer.'); return; }
    toast('Geschichte wird gebaut …', 8000);
    let r;
    try { r = await renderStoryMp3(); } catch (e) { console.error(e); toast('Das hat leider nicht geklappt.'); return; }
    $('#toast').classList.remove('show');
    const name = `${fileSafe(state.story.title)}.mp3`;
    pendingFile = new File([r.blob], name, { type: 'audio/mpeg' });
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [pendingFile] }));
    openSheet('Geschichte teilen', `
      <p class="panel-text"><b>${esc(state.story.title)}</b><br>${fmtDur(r.duration)} · ${fmtMB(r.blob.size)} · MP3</p>
      ${canShare ? `<button class="btn primary" data-action="share-file">${ico('share', 22, '#FFFFFF')}<span>Teilen (z. B. WhatsApp)</span></button>` : ''}
      <button class="btn" data-action="download-file">${ico('download', 22)}<span>Herunterladen</span></button>
      <button class="btn" data-action="preview-file">${ico('auto', 22)}<span>Anhören</span></button>`, 'panel');
  }

  // ---------------------------------------------------------------- ZIP (ohne Kompression)
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function zipStore(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = f.data;
      const d = f.date || new Date();
      const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
      const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((n, p) => n + p.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }

  function unzipStore(ab) {
    const dv = new DataView(ab);
    const dec = new TextDecoder();
    let eocd = -1;
    for (let i = ab.byteLength - 22; i >= Math.max(0, ab.byteLength - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Keine ZIP-Datei');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP beschädigt');
      const method = dv.getUint16(p + 10, true);
      const size = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const lo = dv.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(ab, p + 46, nl));
      p += 46 + nl + xl + cl;
      const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true);
      const start = lo + 30 + lnl + lxl;
      files[name] = method === 0 ? ab.slice(start, start + size) : null;
    }
    return files;
  }

  // ---------------------------------------------------------------- Sichern & Laden
  async function exportZip() {
    stopAll();
    toast('Sicherung wird erstellt …', 6000);
    const enc = new TextEncoder();
    const files = [];
    const meta = {
      app: 'soundbert',
      format: 2,
      exportedAt: new Date().toISOString(),
      story: { title: state.story.title, items: state.story.items.slice() },
      sounds: [],
      zauber: null,
    };
    for (const s of state.sounds) {
      const file = `audio/${s.kind === 'erzaehler' ? 'erzaehler' : 'geraeusch'}-${s.id}.${extFor(s.type)}`;
      meta.sounds.push({
        id: s.id, kind: s.kind, pic: s.pic, label: picOf(s).label, source: s.source || null,
        created: new Date(s.created).toISOString(), updated: new Date(s.updated).toISOString(),
        edited: s.edited ? new Date(s.edited).toISOString() : null,
        durationSec: s.duration, trimStartSec: s.trimStart, trimEndSec: s.trimEnd, gain: s.gain, autoTrimSec: s.autoTrim || null,
        note: s.note || '', mimeType: s.type, file,
      });
      files.push({ name: file, data: new Uint8Array(s.audio), date: new Date(s.created) });
    }
    if (state.zauber) {
      const z = state.zauber;
      const file = `audio/zauber.${extFor(z.type)}`;
      meta.zauber = { mimeType: z.type, trimStartSec: z.trimStart, trimEndSec: z.trimEnd, gain: z.gain, durationSec: z.duration, file };
      files.push({ name: file, data: new Uint8Array(z.audio) });
    }
    files.unshift({ name: 'metadata.json', data: enc.encode(JSON.stringify(meta, null, 2)) });
    files.splice(1, 0, { name: 'LIESMICH.txt', data: enc.encode('Soundbert-Sicherung.\nmetadata.json beschreibt alle Aufnahmen (Schnittpunkte in Sekunden, Verstärkung, Bild, Datum).\nDie Dateien in audio/ sind die unveränderten Originalaufnahmen.\nLaden: In Soundbert im Eltern-Modus › Sichern › Sicherung laden.\n') });
    const blob = zipStore(files);
    const d = new Date();
    const name = `soundbert-sicherung-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.zip`;
    downloadBlob(blob, name);
    toast(`Gespeichert: ${name} (${fmtMB(blob.size)})`, 4000);
  }

  async function importZip(file) {
    let files;
    try { files = unzipStore(await file.arrayBuffer()); } catch (e) { toast('Das ist keine Soundbert-Sicherung.'); return; }
    let meta = null;
    try { meta = JSON.parse(new TextDecoder().decode(files['metadata.json'])); } catch (e) { meta = null; }
    if (!meta || meta.app !== 'soundbert' || !Array.isArray(meta.sounds)) { toast('Das ist keine Soundbert-Sicherung.'); return; }
    const ts = (v, f) => { const t = v ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : f; };
    let added = 0;
    for (const m of meta.sounds) {
      if (!m.id || byId(m.id) || !files[m.file]) continue;
      const s = {
        id: m.id, v: 2, kind: m.kind === 'erzaehler' ? 'erzaehler' : 'geraeusch', pic: m.pic || 'ohr', source: m.source || 'import',
        created: ts(m.created, Date.now()), updated: ts(m.updated, Date.now()), edited: m.edited ? ts(m.edited, null) : null,
        audio: files[m.file], type: m.mimeType || 'audio/webm', duration: m.durationSec || 0,
        trimStart: m.trimStartSec != null ? m.trimStartSec : null, trimEnd: m.trimEndSec != null ? m.trimEndSec : null,
        gain: m.gain || 1, autoTrim: m.autoTrimSec || null, note: m.note || '',
      };
      state.sounds.push(s);
      await saveSound(s);
      added++;
    }
    state.sounds.sort((a, b) => a.created - b.created);
    if (!state.story.items.length && meta.story && Array.isArray(meta.story.items)) {
      state.story = { title: meta.story.title || 'Meine Geschichte', items: meta.story.items.filter((id) => byId(id)) };
      await saveStory();
    }
    if (!state.zauber && meta.zauber && files[meta.zauber.file]) {
      const z = meta.zauber;
      state.zauber = { audio: files[z.file], type: z.mimeType, trimStart: z.trimStartSec, trimEnd: z.trimEndSec, gain: z.gain || 1, duration: z.durationSec };
      zauberBuf = null; zauberPeaks = null;
      await DB.put('meta', state.zauber, 'zauber');
    }
    render();
    toast(added ? `${added} Aufnahmen geladen` : 'Alles war schon da – nichts Neues geladen.', 3000);
  }

  function openBackup() {
    const n = kisteSounds().length;
    const v = state.sounds.length - n;
    const bytes = state.sounds.reduce((a, s) => a + (s.audio ? s.audio.byteLength : 0), 0) + (state.zauber ? state.zauber.audio.byteLength : 0);
    openSheet('Sichern & Teilen', `
      <p class="panel-text">${n} Geräusche · ${v} Erzählstimmen · ${fmtMB(bytes)}<br>
      <span class="small">Aufnahmen liegen nur in diesem Browser. Sichere sie ab und zu als ZIP.</span></p>
      <button class="btn primary" data-action="export-zip">${ico('download', 22, '#FFFFFF')}<span>Alles exportieren (ZIP)</span></button>
      <button class="btn" data-action="import-zip">${ico('upload', 22)}<span>Sicherung laden</span></button>
      <button class="btn" data-action="share-story">${ico('share', 22)}<span>Geschichte als MP3 teilen</span></button>`, 'panel');
  }

  // ---------------------------------------------------------------- Ansichten
  function head(inner) {
    const lock = state.parent
      ? `<button class="lock on" data-lock aria-label="Eltern-Modus beenden"><span class="fill"></span>${ico('unlock', 22, '#FFFFFF')}</button>`
      : `<button class="lock" data-lock aria-label="Eltern-Modus (gedrückt halten)"><span class="fill"></span>${ico('lock', 22)}</button>`;
    const extra = state.parent
      ? `<button class="icon-btn" data-action="backup" aria-label="Sichern und Teilen">${ico('more', 22)}</button>`
      : `<button class="icon-btn" data-action="hoer" aria-label="Hör-Modus">${ico('ear', 22)}</button>`;
    return `<header class="head">${inner}<div class="head-btns">${extra}${lock}</div></header>`;
  }

  function kisteView() {
    const list = kisteSounds();
    const tiles = list.map((s) => {
      const p = picOf(s);
      const tools = state.parent ? `<div class="tile-tools">
          <button class="mini" data-action="edit" data-id="${s.id}" aria-label="Schneiden">${ico('cut', 22)}</button>
          <button class="mini" data-action="rerec-sound" data-id="${s.id}" aria-label="Neu aufnehmen">${ico('mic', 22)}</button>
          <button class="mini danger" data-action="del-sound" data-id="${s.id}" aria-label="Löschen">${ico('trash', 22)}</button>
        </div>` : '';
      return `<div class="tile-wrap" data-sound-id="${s.id}">
          <button class="tile" data-action="play-sound" data-id="${s.id}" style="${tint(p.c)}" aria-label="${esc(p.label)} abspielen">
            ${svg(p.d)}<span class="label">${esc(p.label)}</span></button>${tools}</div>`;
    });
    tiles.push(newTile('new-sound'));
    const pages = [];
    for (let i = 0; i < tiles.length; i += 6) pages.push(tiles.slice(i, i + 6));
    state.page = Math.min(state.page, pages.length - 1);
    const dots = pages.length > 1
      ? `<div class="dots">${pages.map((_, i) => `<button data-action="dot" data-page="${i}" class="${i === state.page ? 'active' : ''}" aria-label="Seite ${i + 1}"><span></span></button>`).join('')}</div>`
      : (list.length ? '' : '<p class="empty-hint">Tippe aufs Mikrofon und mach ein Geräusch!</p>');
    return head('<div class="head-text"><h1>Geräusche-Kiste</h1></div>')
      + `<div class="pages">${pages.map((p) => `<div class="page">${p.join('')}</div>`).join('')}</div>${dots}`;
  }

  function sceneHtml(id, i, num) {
    const s = byId(id);
    if (!s) return '';
    const p = picOf(s);
    const voice = s.kind === 'erzaehler';
    const name = voice ? 'Erzählstimme' : `Bild ${num}`;
    const right = state.parent
      ? `<div class="scene-tools">
          <button class="tool" data-action="edit" data-id="${s.id}" aria-label="Schneiden">${ico('cut', 22)}</button>
          <button class="tool" data-action="move-up" data-index="${i}" aria-label="Nach oben" ${i === 0 ? 'disabled' : ''}>${ico('up', 22)}</button>
          <button class="tool" data-action="move-down" data-index="${i}" aria-label="Nach unten" ${i === state.story.items.length - 1 ? 'disabled' : ''}>${ico('down', 22)}</button>
          <button class="tool" data-action="remove-scene" data-index="${i}" aria-label="Aus der Geschichte nehmen">${ico('remove', 22)}</button>
        </div>`
      : `<div class="scene-btns">
          <button class="round rec" data-action="rerec-scene" data-index="${i}" aria-label="${name} neu aufnehmen"><span class="dot"></span></button>
          <button class="round play" data-action="play-scene" data-index="${i}" aria-label="${name} abspielen">${playIco(26)}</button>
        </div>`;
    return `<div class="scene${voice ? ' voice' : ''}" data-index="${i}" data-sound-id="${s.id}">
        <button class="scene-pic" data-action="play-scene" data-index="${i}" style="background:${COLORS[p.c][0]}" aria-label="${esc(name)} abspielen">
          ${svg(p.d)}${voice ? '' : `<span class="badge">${num}</span>`}</button>
        ${right}
        <div class="bars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        <span class="playing-label">spielt …</span>
      </div>`;
  }

  function geschichteView() {
    const title = state.parent
      ? `<input class="title-input" data-field="title" value="${esc(state.story.title)}" maxlength="40" aria-label="Titel der Geschichte">`
      : `<h1>${esc(state.story.title)}</h1>`;
    const has = state.story.items.length > 0;
    let num = 0;
    const scenes = state.story.items.map((id, i) => {
      const s = byId(id);
      if (s && s.kind !== 'erzaehler') num++;
      return sceneHtml(id, i, num);
    }).join('');
    const playBtn = `<button class="pill" data-action="play-all" ${has ? '' : 'disabled'}>${storyPlaying ? `${stopIco(28)} Stopp` : `${playIco(28)} Ganze Geschichte`}</button>`;
    return head(`<div class="head-text"><span class="overline">Unsere Geschichte</span>${title}</div>`)
      + `<div class="story">${scenes}
          <div class="add-row">
            <button class="add-scene" data-action="add-scene"><span class="plus">${ico('plus', 40, '#7A6558', 2.4)}</span><span class="label">Neues Bild</span></button>
            <button class="add-voice" data-action="add-voice" aria-label="Erzählstimme aufnehmen"><span class="plus">${svg(NARRATOR.d, { sw: 2 })}</span><span class="label">Erzählen</span></button>
          </div>
        </div>
        ${state.parent ? `<div class="pill-row">${playBtn}<button class="pill square" data-action="share-story" aria-label="Geschichte als MP3 teilen" ${has ? '' : 'disabled'}>${ico('share', 28, '#FFFFFF')}</button></div>` : playBtn}`;
  }

  function waveHtml() {
    const peaks = zauberPeaks || new Array(24).fill(0.15);
    return peaks.map((p) => `<span style="height:${Math.round(8 + p * 48)}px"></span>`).join('');
  }

  function zauberView() {
    const has = !!state.zauber;
    const clip = has
      ? `<button class="round play big" data-action="zauber-orig" aria-label="Original abspielen">${playIco(30)}</button><div class="wave" aria-hidden="true">${waveHtml()}</div>`
      : `<span class="round big" style="background:var(--chip)">${ico('mic', 30, '#7A6558')}</span><span class="none">Noch nichts aufgenommen</span>`;
    return head('<div class="head-text"><h1>Stimmen-Zauber</h1></div>')
      + `<div class="clip">${clip}</div>
        <span class="overline" style="font-size:15px">Verzaubern</span>
        <div class="fx-grid">${FX.map((f) => `<button class="fx" data-action="zauber-fx" data-fx="${f.id}" style="${tint(f.c)}" ${has ? '' : 'disabled'}>
            ${svg(f.d, { sw: 2 })}<span class="label">${f.label}</span><span class="sub">${f.sub}</span></button>`).join('')}</div>
        <button class="pill red" data-action="zauber-rec">${ico('mic', 28, '#FFFFFF')} ${has ? 'Neu aufnehmen' : 'Aufnehmen'}</button>`;
  }

  const VIEWS = { kiste: kisteView, geschichte: geschichteView, zauber: zauberView };
  const TABS = { kiste: ['box', 'Kiste'], geschichte: ['strip', 'Geschichte'], zauber: ['wand', 'Zauber'] };

  function render() {
    const v = $('#view');
    v.innerHTML = VIEWS[state.tab]();
    $$('.tab').forEach((t) => {
      const [icon, label] = TABS[t.dataset.tab];
      t.classList.toggle('active', t.dataset.tab === state.tab);
      t.innerHTML = `${ico(icon, 26)}<span>${label}</span>`;
    });
    if (state.tab === 'kiste') {
      const pages = $('.pages', v);
      if (pages) {
        pages.scrollLeft = state.page * pages.clientWidth;
        pages.addEventListener('scroll', () => {
          const p = Math.round(pages.scrollLeft / Math.max(1, pages.clientWidth));
          if (p !== state.page) {
            state.page = p;
            $$('.dots button', v).forEach((b, i) => b.classList.toggle('active', i === p));
          }
        }, { passive: true });
      }
    }
    if (state.tab === 'zauber' && state.zauber && !zauberPeaks) {
      getZauberBuf().then((buf) => {
        if (!buf || !state.zauber) return;
        const z = state.zauber;
        zauberPeaks = computePeaks(buf, z.trimStart || 0, z.trimEnd || buf.duration);
        const w = $('.wave');
        if (w && state.tab === 'zauber') w.innerHTML = waveHtml();
      });
    }
  }

  // ---------------------------------------------------------------- Ereignisse
  let pendingDel = null;
  const ACTIONS = {
    tab: (t) => {
      if (t.dataset.tab === state.tab) return;
      stopAll();
      state.tab = t.dataset.tab;
      try { localStorage.setItem('soundbert-tab', state.tab); } catch (e) { /* egal */ }
      render();
    },
    'play-sound': (t) => { const s = byId(t.dataset.id); if (s) playMarked(s, t.closest('.tile-wrap')); },
    'new-sound': () => newSoundFlow(false),
    'rerec-sound': (t) => reRecord(t.dataset.id, null),
    'del-sound': (t) => {
      if (pendingDel === t) { pendingDel = null; deleteSound(t.dataset.id); return; }
      $$('.mini.confirm').forEach((b) => b.classList.remove('confirm'));
      pendingDel = t;
      t.classList.add('confirm');
      const used = state.story.items.includes(t.dataset.id);
      toast(used ? 'Steckt auch in der Geschichte – nochmal tippen zum Löschen' : 'Nochmal tippen zum Löschen');
      setTimeout(() => { if (pendingDel === t) { pendingDel = null; t.classList.remove('confirm'); } }, 3000);
    },
    edit: (t) => openEditor(t.dataset.id),
    dot: (t) => {
      const pages = $('.pages');
      if (pages) pages.scrollTo({ left: +t.dataset.page * pages.clientWidth, behavior: 'smooth' });
    },
    'play-scene': (t) => {
      const i = +t.dataset.index;
      const s = byId(state.story.items[i]);
      if (s) playMarked(s, t.closest('.scene'));
    },
    'rerec-scene': (t) => {
      const i = +t.dataset.index;
      const id = state.story.items[i];
      const s = byId(id);
      const num = state.story.items.slice(0, i + 1).filter((x) => { const y = byId(x); return y && y.kind !== 'erzaehler'; }).length;
      reRecord(id, s && s.kind === 'erzaehler' ? 'Erzählstimme' : `Bild ${num}`, i);
    },
    'add-scene': () => pickFromKiste(),
    'add-voice': () => narrationFlow(),
    'move-up': (t) => moveScene(+t.dataset.index, -1),
    'move-down': (t) => moveScene(+t.dataset.index, 1),
    'remove-scene': (t) => removeScene(+t.dataset.index),
    'play-all': () => (storyPlaying ? stopAll() : playStory()),
    'share-story': () => { if (sheetResolve) closeSheet(null); shareStory(); },
    'share-file': async () => {
      if (!pendingFile) return;
      try { await navigator.share({ files: [pendingFile], title: state.story.title }); }
      catch (e) { if (e && e.name !== 'AbortError') toast('Teilen hat nicht geklappt – lade die Datei herunter.'); }
    },
    'download-file': () => { if (pendingFile) downloadBlob(pendingFile, pendingFile.name); },
    'preview-file': (t) => {
      if (!pendingFile) return;
      if (current) { stopPlayback(); return; }
      const f = pendingFile;
      playClip(async () => decode(await f.arrayBuffer()));
    },
    'zauber-orig': (t) => playZauber(null, t),
    'zauber-fx': (t) => playZauber(t.dataset.fx, t),
    'zauber-rec': () => recordZauber(),
    hoer: () => openHoer(),
    backup: () => openBackup(),
    'export-zip': () => exportZip(),
    'import-zip': () => $('#import-file').click(),
    'sheet-close': () => closeSheet(null),
    noop: () => {},
    'pick-pic': (t) => closeSheet(t.dataset.pic),
    'pick-sound': (t) => closeSheet({ sound: t.dataset.id }),
    'pick-new': () => closeSheet({ new: true }),
    'rec-stop': () => recCtl && recCtl.stop(),
    'rec-cancel': () => recCtl && recCtl.cancel(),
    'ed-play': () => editorPlay(),
    'ed-auto': () => { if (!editor) return; stopEditorPlay(); const a = analyze(editor.buf); editor.start = a.start; editor.end = a.end; drawEditor(); },
    'ed-all': () => { if (!editor) return; stopEditorPlay(); editor.start = 0; editor.end = editor.buf.duration; drawEditor(); },
    'ed-pic': () => editorPicture(),
    'ed-save': () => editorSave(),
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t || t.disabled) return;
    const fn = ACTIONS[t.dataset.action];
    if (fn) fn(t, e);
  });

  document.addEventListener('change', async (e) => {
    if (e.target.matches('[data-field="title"]')) {
      state.story.title = e.target.value.trim() || 'Meine Geschichte';
      await saveStory();
    }
    if (e.target.id === 'import-file') {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (f) { closeSheet(null); importZip(f); }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-field="title"]')) e.target.blur();
  });

  // Eltern-Modus: zum Einschalten 1,2 Sekunden gedrückt halten, zum Ausschalten tippen.
  let holdTimer = null;
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-lock]');
    if (!b) return;
    e.preventDefault();
    if (state.parent) {
      stopAll();
      state.parent = false;
      render();
      toast('Eltern-Modus aus');
      return;
    }
    b.classList.add('holding');
    holdTimer = setTimeout(() => {
      holdTimer = null;
      stopAll();
      state.parent = true;
      render();
      toast('Eltern-Modus an');
    }, 1200);
  });
  const endHold = () => {
    if (!holdTimer) return;
    clearTimeout(holdTimer);
    holdTimer = null;
    $$('.lock.holding').forEach((b) => b.classList.remove('holding'));
    toast('Für Eltern: gedrückt halten');
  };
  document.addEventListener('pointerup', endHold);
  document.addEventListener('pointercancel', endHold);

  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('input')) e.preventDefault();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (recCtl) recCtl.stop();
    if (hoer) return; // Hör-Modus bleibt offen (Bildschirm bleibt an)
    stopAll();
    if (state.parent && !$('#overlay').innerHTML) {
      state.parent = false;
      render();
    }
  });

  // ---------------------------------------------------------------- Start & Migration
  // Ältere Aufnahmen (ohne Schnitt/Angleichung) einmalig nachbearbeiten.
  async function migrate() {
    for (const s of state.sounds) {
      if (s.v === 2 && s.trimStart !== undefined) continue;
      try {
        const buf = await bufferOf(s);
        const a = analyze(buf);
        Object.assign(s, {
          v: 2, kind: s.kind || 'geraeusch', source: s.source || 'kiste', updated: s.updated || s.created, edited: s.edited || null,
          duration: buf.duration, trimStart: a.start, trimEnd: a.end, gain: gainFor(buf, a.start, a.end), autoTrim: [a.start, a.end], note: s.note || '',
        });
        await saveSound(s);
      } catch (e) { /* bleibt unbearbeitet */ }
    }
    const z = state.zauber;
    if (z && z.trimStart === undefined) {
      try {
        const buf = await getZauberBuf();
        const a = analyze(buf);
        Object.assign(z, { trimStart: a.start, trimEnd: a.end, gain: gainFor(buf, a.start, a.end), duration: buf.duration });
        await DB.put('meta', z, 'zauber');
      } catch (e) { /* egal */ }
    }
  }

  async function start() {
    try {
      const t = localStorage.getItem('soundbert-tab');
      if (t && VIEWS[t]) state.tab = t;
    } catch (e) { /* egal */ }
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.id = 'import-file';
    inp.accept = '.zip,application/zip';
    inp.hidden = true;
    document.body.appendChild(inp);
    render();
    const ok = await DB.open();
    if (ok) {
      const [sounds, story, zauber] = await Promise.all([DB.all('sounds'), DB.get('meta', 'story'), DB.get('meta', 'zauber')]);
      state.sounds = (sounds || []).map((s) => ({ kind: 'geraeusch', ...s })).sort((a, b) => a.created - b.created);
      if (story && Array.isArray(story.items)) state.story = { title: story.title || 'Meine Geschichte', items: story.items };
      state.story.items = state.story.items.filter((id) => byId(id));
      state.zauber = zauber || null;
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } else {
      toast('Speichern geht hier nicht – Aufnahmen sind nach dem Schließen weg.');
    }
    render();
    migrate();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  start();
})();
