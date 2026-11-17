/* Soundbert – Geräusche aufnehmen, sammeln und zu Geschichten zusammensetzen.
   Reines JavaScript ohne Build-Schritt. Daten bleiben im Browser (IndexedDB). */
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
  ];

  const svg = (inner, { cls = 'pic', size, sw = 1.8, stroke = 'currentColor' } = {}) =>
    `<svg class="${cls}" ${size ? `width="${size}" height="${size}"` : ''} viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const EYES = (y) => `<path d="M9 ${y}h.01M15 ${y}h.01" stroke-width="2.8"/>`;

  // Bildauswahl für Geräusche: id, Beschriftung, Farbe, Zeichnung
  const PICS = [
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
  const picOf = (id) => PIC[id] || PICS[0];

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

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
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
    sounds: [], // { id, pic, audio: ArrayBuffer, type, created }
    story: { title: 'Meine Geschichte', items: [] }, // items: Geräusch-ids (Verweise auf die Kiste)
    zauber: null, // { audio, type }
    page: 0,
  };
  const byId = (id) => state.sounds.find((s) => s.id === id);
  const saveStory = () => DB.put('meta', { title: state.story.title, items: state.story.items.slice() }, 'story');

  const urls = new Map();
  function urlFor(sound) {
    if (!urls.has(sound.id)) urls.set(sound.id, URL.createObjectURL(new Blob([sound.audio], { type: sound.type })));
    return urls.get(sound.id);
  }
  function dropUrl(id) {
    if (urls.has(id)) URL.revokeObjectURL(urls.get(id));
    urls.delete(id);
  }

  // ---------------------------------------------------------------- Audio
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

  let current = null; // laufende Wiedergabe: { stop() }
  function stopPlayback() {
    if (current) { const c = current; current = null; c.stop(); }
  }
  function playSound(sound) {
    return new Promise((resolve) => {
      stopPlayback();
      const a = new Audio(urlFor(sound));
      let done = false;
      const handle = { stop: () => finish() };
      function finish() {
        if (done) return;
        done = true;
        a.pause();
        if (current === handle) current = null;
        resolve();
      }
      current = handle;
      a.onended = finish;
      a.onerror = finish;
      a.play().catch(finish);
    });
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

  // ---------------------------------------------------------------- Aufnahme
  const MAX_MS = 15000;
  const DOTS = 8;
  let recCtl = null;

  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
  }

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
      <span class="rec-foot">Danach spielt es sofort einmal ab</span>
    </div>`;
  }

  // Öffnet den Aufnahme-Bildschirm. Ergebnis: { audio, type } oder null.
  function record(opts) {
    return new Promise((resolve) => {
      stopAll();
      const ov = $('#overlay');
      ov.innerHTML = recorderHtml(opts);
      const root = $('.recorder', ov);
      let stream = null, rec = null, srcNode = null, sink = null, raf = 0, timer = 0, t0 = 0, finished = false, level = 0;
      const chunks = [];

      const cleanup = () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
        if (stream) stream.getTracks().forEach((t) => t.stop());
        try { if (srcNode) srcNode.disconnect(); if (sink) sink.disconnect(); } catch (e) { /* egal */ }
        ov.innerHTML = '';
        recCtl = null;
      };
      const cancel = () => {
        if (finished) return;
        finished = true;
        if (rec && rec.state !== 'inactive') { rec.onstop = null; try { rec.stop(); } catch (e) { /* egal */ } }
        cleanup();
        resolve(null);
      };
      const stop = () => {
        if (rec && rec.state === 'recording') rec.stop();
      };
      recCtl = { cancel, stop };

      (async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
          toast('Aufnehmen geht in diesem Browser leider nicht.');
          cancel();
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
          });
        } catch (e) {
          toast(e && e.name === 'NotAllowedError' ? 'Bitte das Mikrofon erlauben.' : 'Kein Mikrofon gefunden.');
          cancel();
          return;
        }
        if (finished) { stream.getTracks().forEach((t) => t.stop()); return; }

        const mime = pickMime();
        try {
          rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        } catch (e) {
          toast('Aufnehmen geht in diesem Browser leider nicht.');
          cancel();
          return;
        }
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
          if (finished) return;
          finished = true;
          const dur = performance.now() - t0;
          const type = rec.mimeType || mime || 'audio/webm';
          cleanup();
          if (dur < 400 || !chunks.length) {
            toast('Das war zu kurz – nochmal!');
            resolve(null);
            return;
          }
          const audio = await new Blob(chunks, { type }).arrayBuffer();
          resolve({ audio, type });
        };

        // Pegelanzeige
        let analyser = null, data = null;
        const ctx = getCtx();
        if (ctx) {
          try {
            if (ctx.state === 'suspended') await ctx.resume();
            srcNode = ctx.createMediaStreamSource(stream);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            sink = ctx.createGain();
            sink.gain.value = 0;
            srcNode.connect(analyser);
            analyser.connect(sink);
            sink.connect(ctx.destination);
            data = new Uint8Array(analyser.fftSize);
          } catch (e) { analyser = null; }
        }

        rec.start();
        t0 = performance.now();
        timer = setTimeout(stop, MAX_MS);
        root.classList.remove('waiting');
        $('.rec-text', root).textContent = 'Ich höre zu …';
        $('.stop', root).disabled = false;
        const dots = $$('.countdown span', root);
        const r1 = $('.ring.r1', root), r2 = $('.ring.r2', root);

        const tick = () => {
          const el = performance.now() - t0;
          const on = Math.max(0, Math.ceil(DOTS * (1 - el / MAX_MS)));
          dots.forEach((d, i) => d.classList.toggle('on', i < on));
          if (analyser) {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            level = level * 0.6 + Math.min(1, rms * 5) * 0.4;
            r1.style.transform = `scale(${0.8 + level * 0.2})`;
            r2.style.transform = `scale(${0.84 + level * 0.16})`;
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      })();
    });
  }

  // ---------------------------------------------------------------- Auswahl-Blätter
  let sheetResolve = null;
  function openSheet(title, gridHtml) {
    return new Promise((res) => {
      stopAll();
      sheetResolve = res;
      $('#overlay').innerHTML = `<div class="sheet-backdrop" data-action="sheet-close">
        <div class="sheet" data-action="noop" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="sheet-head"><h2>${esc(title)}</h2>
            <button class="mini" style="background:var(--chip)" data-action="sheet-close" aria-label="Schließen">${ico('x', 22)}</button></div>
          <div class="sheet-grid">${gridHtml}</div>
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
    const grid = PICS.map((p) => `<button class="tile" data-action="pick-pic" data-pic="${p.id}" style="${tint(p.c)}">
        ${svg(p.d)}<span class="label">${esc(p.label)}</span></button>`).join('');
    const id = await openSheet('Welches Bild?', grid);
    return id ? picOf(id) : null;
  }

  async function pickFromKiste() {
    const grid = newTile('pick-new') + state.sounds.slice().reverse().map((s) => {
      const p = picOf(s.pic);
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
      playLatest(res.sound);
    }
  }

  // ---------------------------------------------------------------- Abläufe
  async function newSoundFlow(toStory) {
    const p = await pickPicture();
    if (!p) return;
    const chip = toStory ? `Bild ${state.story.items.length + 1}` : p.label;
    const res = await record({ icon: svg(p.d), bg: COLORS[p.c][0], chip });
    if (!res) return;
    const s = { id: uid(), pic: p.id, audio: res.audio, type: res.type, created: Date.now() };
    state.sounds.push(s);
    await DB.put('sounds', s);
    if (toStory) {
      state.story.items.push(s.id);
      await saveStory();
    } else {
      state.page = Math.floor((state.sounds.length - 1) / 6);
    }
    render();
    playLatest(s.id);
  }

  async function reRecord(id, chip) {
    const s = byId(id);
    if (!s) return;
    const p = picOf(s.pic);
    const res = await record({ icon: svg(p.d), bg: COLORS[p.c][0], chip: chip || p.label });
    if (!res) return;
    s.audio = res.audio;
    s.type = res.type;
    dropUrl(s.id);
    await DB.put('sounds', s);
    render();
    playLatest(s.id, chip ? +chip.replace(/\D/g, '') - 1 : null);
  }

  // Spielt ein Geräusch nach der Aufnahme ab und hebt es dabei hervor.
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
    dropUrl(id);
    await DB.del('sounds', id);
    if (before !== state.story.items.length) await saveStory();
    render();
  }

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
    state.story.items.splice(i, 1);
    await saveStory();
    render();
  }

  // ---------------------------------------------------------------- Stimmen-Zauber
  let zauberBuf = null;
  let zauberPeaks = null;
  let irCache = null;

  async function getZauberBuf() {
    if (zauberBuf) return zauberBuf;
    const ctx = getCtx();
    if (!ctx || !state.zauber) return null;
    try {
      zauberBuf = await ctx.decodeAudioData(state.zauber.audio.slice(0));
    } catch (e) {
      zauberBuf = null;
    }
    return zauberBuf;
  }

  function computePeaks(buf, n = 24) {
    const d = buf.getChannelData(0);
    const step = Math.max(1, Math.floor(d.length / n));
    const peaks = [];
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = i * step; j < Math.min(d.length, (i + 1) * step); j++) m = Math.max(m, Math.abs(d[j]));
      peaks.push(m);
    }
    const max = Math.max(...peaks, 0.0001);
    return peaks.map((p) => p / max);
  }

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

  async function playZauber(fx, btn) {
    stopAll();
    const buf = await getZauberBuf();
    if (!buf) { toast('Erst etwas aufnehmen!'); return; }
    const ctx = getCtx();
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) { /* egal */ } }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const oscs = [];
    let rate = 1;
    let tail = 0.1;

    if (fx === 'riese') {
      rate = 0.6;
      src.playbackRate.value = rate;
      src.connect(master);
    } else if (fx === 'maus') {
      rate = 1.8;
      src.playbackRate.value = rate;
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
      tail = 3.2;
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
      master.gain.value = 1.3;
      osc.start();
      oscs.push(osc);
      tail = 0.4;
    } else {
      src.connect(master);
    }

    let ended = false;
    let t = 0;
    const handle = { stop: () => finish() };
    function finish() {
      if (ended) return;
      ended = true;
      clearTimeout(t);
      try { src.stop(); } catch (e) { /* egal */ }
      oscs.forEach((o) => { try { o.stop(); } catch (e) { /* egal */ } });
      try { master.disconnect(); } catch (e) { /* egal */ }
      if (btn) btn.classList.remove('playing');
      if (current === handle) current = null;
    }
    current = handle;
    if (btn) btn.classList.add('playing');
    src.start();
    t = setTimeout(finish, (buf.duration / rate + tail) * 1000 + 100);
  }

  async function recordZauber() {
    const res = await record({ icon: ico('wand', 22, 'currentColor', 2), bg: COLORS[4][0], chip: 'Zauber' });
    if (!res) return;
    state.zauber = res;
    zauberBuf = null;
    zauberPeaks = null;
    await DB.put('meta', res, 'zauber');
    render();
    const b = $('[data-action="zauber-orig"]');
    playZauber(null, b);
  }

  // ---------------------------------------------------------------- Ansichten
  const lockBtn = () => state.parent
    ? `<button class="lock on" data-lock aria-label="Eltern-Modus beenden"><span class="fill"></span>${ico('unlock', 22, '#FFFFFF')}</button>`
    : `<button class="lock" data-lock aria-label="Eltern-Modus (gedrückt halten)"><span class="fill"></span>${ico('lock', 22)}</button>`;
  const head = (inner) => `<header class="head">${inner}${lockBtn()}</header>`;

  function kisteView() {
    const tiles = state.sounds.map((s) => {
      const p = picOf(s.pic);
      const tools = state.parent ? `<div class="tile-tools">
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
      : (state.sounds.length ? '' : '<p class="empty-hint">Tippe aufs Mikrofon und mach ein Geräusch!</p>');
    return head('<div class="head-text"><h1>Geräusche-Kiste</h1></div>')
      + `<div class="pages">${pages.map((p) => `<div class="page">${p.join('')}</div>`).join('')}</div>${dots}`;
  }

  function sceneHtml(id, i) {
    const s = byId(id);
    if (!s) return '';
    const p = picOf(s.pic);
    const n = i + 1;
    const right = state.parent
      ? `<div class="scene-tools">
          <button class="tool" data-action="move-up" data-index="${i}" aria-label="Nach oben" ${i === 0 ? 'disabled' : ''}>${ico('up', 24)}</button>
          <button class="tool" data-action="move-down" data-index="${i}" aria-label="Nach unten" ${i === state.story.items.length - 1 ? 'disabled' : ''}>${ico('down', 24)}</button>
          <button class="tool" data-action="remove-scene" data-index="${i}" aria-label="Aus der Geschichte nehmen">${ico('remove', 24)}</button>
        </div>`
      : `<div class="scene-btns">
          <button class="round rec" data-action="rerec-scene" data-index="${i}" aria-label="Bild ${n} neu aufnehmen"><span class="dot"></span></button>
          <button class="round play" data-action="play-scene" data-index="${i}" aria-label="Bild ${n} abspielen">${playIco(26)}</button>
        </div>`;
    return `<div class="scene" data-index="${i}" data-sound-id="${s.id}">
        <button class="scene-pic" data-action="play-scene" data-index="${i}" style="background:${COLORS[p.c][0]}" aria-label="${esc(p.label)} abspielen">
          ${svg(p.d)}<span class="badge">${n}</span></button>
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
    return head(`<div class="head-text"><span class="overline">Unsere Geschichte</span>${title}</div>`)
      + `<div class="story">${state.story.items.map(sceneHtml).join('')}
          <button class="add-scene" data-action="add-scene"><span class="plus">${ico('plus', 40, '#7A6558', 2.4)}</span><span class="label">Neues Bild</span></button>
        </div>
        <button class="pill" data-action="play-all" ${has ? '' : 'disabled'}>${storyPlaying ? `${stopIco(28)} Stopp` : `${playIco(28)} Ganze Geschichte`}</button>`;
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
        if (!buf) return;
        zauberPeaks = computePeaks(buf);
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
      if (pendingDel === t) {
        pendingDel = null;
        deleteSound(t.dataset.id);
        return;
      }
      $$('.mini.confirm').forEach((b) => b.classList.remove('confirm'));
      pendingDel = t;
      t.classList.add('confirm');
      toast('Nochmal tippen zum Löschen');
      setTimeout(() => { if (pendingDel === t) { pendingDel = null; t.classList.remove('confirm'); } }, 3000);
    },
    dot: (t) => {
      const pages = $('.pages');
      if (pages) pages.scrollTo({ left: +t.dataset.page * pages.clientWidth, behavior: 'smooth' });
    },
    'play-scene': (t) => {
      const i = +t.dataset.index;
      const s = byId(state.story.items[i]);
      if (s) playMarked(s, t.closest('.scene'));
    },
    'rerec-scene': (t) => { const i = +t.dataset.index; reRecord(state.story.items[i], `Bild ${i + 1}`); },
    'add-scene': () => pickFromKiste(),
    'move-up': (t) => moveScene(+t.dataset.index, -1),
    'move-down': (t) => moveScene(+t.dataset.index, 1),
    'remove-scene': (t) => removeScene(+t.dataset.index),
    'play-all': () => (storyPlaying ? stopAll() : playStory()),
    'zauber-orig': (t) => playZauber(null, t),
    'zauber-fx': (t) => playZauber(t.dataset.fx, t),
    'zauber-rec': () => recordZauber(),
    'sheet-close': () => closeSheet(null),
    noop: () => {},
    'pick-pic': (t) => closeSheet(t.dataset.pic),
    'pick-sound': (t) => closeSheet({ sound: t.dataset.id }),
    'pick-new': () => closeSheet({ new: true }),
    'rec-stop': () => recCtl && recCtl.stop(),
    'rec-cancel': () => recCtl && recCtl.cancel(),
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
    stopAll();
    if (state.parent && !$('#overlay').innerHTML) {
      state.parent = false;
      render();
    }
  });

  // ---------------------------------------------------------------- Start
  async function start() {
    try {
      const t = localStorage.getItem('soundbert-tab');
      if (t && VIEWS[t]) state.tab = t;
    } catch (e) { /* egal */ }
    render();
    const ok = await DB.open();
    if (ok) {
      const [sounds, story, zauber] = await Promise.all([DB.all('sounds'), DB.get('meta', 'story'), DB.get('meta', 'zauber')]);
      state.sounds = (sounds || []).sort((a, b) => a.created - b.created);
      if (story && Array.isArray(story.items)) state.story = { title: story.title || 'Meine Geschichte', items: story.items };
      state.story.items = state.story.items.filter((id) => byId(id));
      state.zauber = zauber || null;
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } else {
      toast('Speichern geht hier nicht – Aufnahmen sind nach dem Schließen weg.');
    }
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  start();
})();
