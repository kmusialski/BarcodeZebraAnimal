/* =====================================================================
 * BarcodeZebraAnimal — wspólna biblioteka (shared.js)
 * Używana przez scanner.html (Zebra) oraz studio.html (desktop).
 *
 * Zawiera:
 *  - ZOO.CATALOG ........ domyślny katalog zwierząt (emoji + nazwa PL + dźwięk)
 *  - ZOO.getCatalog() ... katalog domyślny + własne zwierzęta z localStorage
 *  - ZOO.code128svg() ... generator kodu kreskowego Code128 (SVG, bez bibliotek)
 *  - ZOO.Sound .......... silnik dźwięku (Web Audio) + mowa po polsku (TTS)
 *  - ZOO.storage ........ zapis/odczyt/eksport/import własnych zwierząt
 * ===================================================================== */
(function (global) {
  "use strict";

  const ZOO = {};
  ZOO.PREFIX = "ZOO:"; // prefiks treści kodu kreskowego, np. "ZOO:LION"

  /* ------------------------------------------------------------------ *
   * 1. DOMYŚLNY KATALOG ZWIERZĄT
   * id      – identyfikator zapisywany w kodzie (wielkie litery)
   * name    – nazwa po polsku (wyświetlana + wymawiana)
   * emoji   – domyślny "rysunek"
   * sound   – rodzaj efektu dźwiękowego (patrz ZOO.Sound)
   * ------------------------------------------------------------------ */
  ZOO.CATALOG = [
    { id: "LEW",        name: "Lew",        emoji: "🦁", sound: "roar" },
    { id: "TYGRYS",     name: "Tygrys",     emoji: "🐯", sound: "roar" },
    { id: "SLON",       name: "Słoń",       emoji: "🐘", sound: "trumpet" },
    { id: "PIES",       name: "Pies",       emoji: "🐶", sound: "bark" },
    { id: "KOT",        name: "Kot",        emoji: "🐱", sound: "meow" },
    { id: "KROWA",      name: "Krowa",      emoji: "🐄", sound: "moo" },
    { id: "KON",        name: "Koń",        emoji: "🐴", sound: "neigh" },
    { id: "SWINKA",     name: "Świnka",     emoji: "🐷", sound: "oink" },
    { id: "OWCA",       name: "Owca",       emoji: "🐑", sound: "baa" },
    { id: "KACZKA",     name: "Kaczka",     emoji: "🦆", sound: "quack" },
    { id: "ZABA",       name: "Żaba",       emoji: "🐸", sound: "ribbit" },
    { id: "MALPA",      name: "Małpa",      emoji: "🐵", sound: "monkey" },
    { id: "NIEDZWIEDZ", name: "Niedźwiedź", emoji: "🐻", sound: "roar" },
    { id: "WILK",       name: "Wilk",       emoji: "🐺", sound: "howl" },
    { id: "KURA",       name: "Kura",       emoji: "🐔", sound: "cluck" },
    { id: "KOGUT",      name: "Kogut",      emoji: "🐓", sound: "rooster" },
    { id: "SOWA",       name: "Sowa",       emoji: "🦉", sound: "hoot" },
    { id: "WAZ",        name: "Wąż",        emoji: "🐍", sound: "hiss" },
    { id: "PSZCZOLA",   name: "Pszczoła",   emoji: "🐝", sound: "buzz" },
    { id: "ZYRAFA",     name: "Żyrafa",     emoji: "🦒", sound: "chime" },
    { id: "ZEBRA",      name: "Zebra",      emoji: "🦓", sound: "neigh" },
    { id: "PINGWIN",    name: "Pingwin",    emoji: "🐧", sound: "chime" },
    { id: "SLIMAK",     name: "Ślimak",     emoji: "🐌", sound: "chime" },
    { id: "RYBA",       name: "Ryba",       emoji: "🐟", sound: "blub" },
    { id: "PTASZEK",    name: "Ptaszek",    emoji: "🐦", sound: "tweet" }
  ];

  /* ------------------------------------------------------------------ *
   * 2. PRZECHOWYWANIE WŁASNYCH ZWIERZĄT (localStorage)
   * ------------------------------------------------------------------ */
  const STORE_KEY = "zoo_custom_catalog_v1";

  ZOO.storage = {
    loadCustom() {
      try {
        const raw = global.localStorage.getItem(STORE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    },
    saveCustom(arr) {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(arr || []));
    },
    /** Dodaje lub aktualizuje własne zwierzę (po id). */
    upsert(animal) {
      const list = ZOO.storage.loadCustom();
      const i = list.findIndex((a) => a.id === animal.id);
      if (i >= 0) list[i] = animal; else list.push(animal);
      ZOO.storage.saveCustom(list);
      return list;
    },
    remove(id) {
      const list = ZOO.storage.loadCustom().filter((a) => a.id !== id);
      ZOO.storage.saveCustom(list);
      return list;
    },
    /** Eksport własnych zwierząt do tekstu JSON. */
    exportJSON() {
      return JSON.stringify(
        { app: "BarcodeZebraAnimal", version: 1, animals: ZOO.storage.loadCustom() },
        null,
        2
      );
    },
    /** Import z tekstu JSON (scala po id). Zwraca liczbę dodanych. */
    importJSON(text) {
      const data = JSON.parse(text);
      const incoming = Array.isArray(data) ? data : (data.animals || []);
      let n = 0;
      incoming.forEach((a) => {
        if (a && a.id && a.name) { ZOO.storage.upsert(ZOO.normalize(a)); n++; }
      });
      return n;
    },
    /** Link do skanera z katalogiem zaszytym w #hash (transfer bez serwera). */
    shareLink(scannerUrl) {
      const payload = { animals: ZOO.storage.loadCustom() };
      const b64 = ZOO.b64encodeUnicode(JSON.stringify(payload));
      const base = scannerUrl || (location.origin + location.pathname.replace(/[^/]+$/, "") + "scanner.html");
      return base + "#cat=" + b64;
    }
  };

  /* Normalizacja rekordu zwierzęcia (uzupełnia braki, czyści id). */
  ZOO.normalize = function (a) {
    const id = ZOO.makeId(a.id || a.name);
    return {
      id,
      name: String(a.name || id),
      emoji: a.emoji || "❓",
      image: a.image || null,        // dataURL lub URL obrazka (opcjonalnie)
      sound: a.sound || "chime",
      custom: true
    };
  };

  /* Tworzy poprawny identyfikator (A-Z 0-9, bez polskich znaków). */
  ZOO.makeId = function (text) {
    const map = { ą: "A", ć: "C", ę: "E", ł: "L", ń: "N", ó: "O", ś: "S", ź: "Z", ż: "Z" };
    return String(text || "")
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (c) => map[c] || c)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "ZWIERZE";
  };

  /* Pełny katalog: domyślny + własne (własne nadpisują domyślne po id). */
  ZOO.getCatalog = function () {
    const custom = ZOO.storage.loadCustom().map(ZOO.normalize);
    const byId = {};
    ZOO.CATALOG.forEach((a) => (byId[a.id] = Object.assign({}, a)));
    custom.forEach((a) => (byId[a.id] = a));
    return Object.values(byId);
  };

  ZOO.findById = function (id) {
    const clean = String(id || "").trim().toUpperCase();
    return ZOO.getCatalog().find((a) => a.id === clean) || null;
  };

  /* Parsuje surową treść kodu kreskowego -> zwierzę (lub null). */
  ZOO.parseScan = function (raw) {
    let v = String(raw || "").trim();
    if (!v) return null;
    if (v.toUpperCase().startsWith(ZOO.PREFIX)) v = v.slice(ZOO.PREFIX.length);
    return ZOO.findById(v);
  };

  /* Treść do zakodowania w kodzie kreskowym dla danego zwierzęcia. */
  ZOO.barcodeValue = function (animal) {
    return ZOO.PREFIX + animal.id;
  };

  /* ------------------------------------------------------------------ *
   * 3. GENERATOR KODU KRESKOWEGO — Code128 (zestaw B), zwraca <svg>
   *    Bez zewnętrznych bibliotek. Czyta go każdy czytnik 1D (Zebra).
   * ------------------------------------------------------------------ */
  // Tabela wzorów modułów dla wartości 0..106 (stop = 106, 7 modułów).
  const C128 = [
    "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
    "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
    "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
    "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
    "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
    "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
    "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
    "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
    "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
    "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
    "114131","311141","411131","211412","211214","211232","2331112"
  ];
  const C128_START_B = 104;
  const C128_STOP = 106;

  /**
   * Generuje SVG z kodem Code128-B dla podanego tekstu (ASCII 32..126).
   * opts: { moduleWidth, height, quiet, showText, fontSize }
   */
  ZOO.code128svg = function (text, opts) {
    opts = opts || {};
    const mw = opts.moduleWidth || 2;       // szerokość pojedynczego modułu (px)
    const h = opts.height || 80;            // wysokość pasków (px)
    const quiet = opts.quiet != null ? opts.quiet : 10; // margines (moduły)
    const showText = opts.showText !== false;
    const fontSize = opts.fontSize || 14;

    // Walidacja zakresu znaków
    const codes = [C128_START_B];
    for (const ch of String(text)) {
      const v = ch.charCodeAt(0) - 32;
      if (v < 0 || v > 94) throw new Error("Niedozwolony znak w kodzie: " + ch);
      codes.push(v);
    }
    // Suma kontrolna (mod 103)
    let sum = C128_START_B;
    for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
    codes.push(sum % 103);
    codes.push(C128_STOP);

    // Sklej wzory modułów w jeden ciąg szerokości pasków (bar/space na zmianę)
    let widths = "";
    for (const c of codes) widths += C128[c];

    // Buduj prostokąty (paski czarne na pozycjach parzystych — start od paska)
    let x = quiet;
    let bars = "";
    for (let i = 0; i < widths.length; i++) {
      const w = parseInt(widths[i], 10);
      if (i % 2 === 0) {
        bars += `<rect x="${x * mw}" y="0" width="${w * mw}" height="${h}"/>`;
      }
      x += w;
    }
    const totalModules = x + quiet;
    const svgW = totalModules * mw;
    const svgH = h + (showText ? fontSize + 8 : 0);
    const label = showText
      ? `<text x="${svgW / 2}" y="${h + fontSize + 2}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="#000">${escapeXml(text)}</text>`
      : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" shape-rendering="crispEdges"><rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#fff"/><g fill="#000">${bars}</g>${label}</svg>`;
  };

  function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
    );
  }

  /* ------------------------------------------------------------------ *
   * 4. SILNIK DŹWIĘKU — procedualne odgłosy (Web Audio) + mowa PL (TTS)
   * ------------------------------------------------------------------ */
  ZOO.Sound = (function () {
    let ctx = null;
    let master = null;
    let volume = 0.8;

    function ensure() {
      if (!ctx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    }

    // pojedynczy oscylator z obwiednią i opcjonalnym glissando/vibrato
    function tone(o) {
      const t0 = ctx.currentTime + (o.delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(o.f0, t0);
      if (o.f1 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
      if (o.vibrato) {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = o.vibrato.rate || 8;
        lg.gain.value = o.vibrato.depth || 20;
        lfo.connect(lg).connect(osc.frequency);
        lfo.start(t0); lfo.stop(t0 + o.dur);
      }
      const peak = (o.gain != null ? o.gain : 0.5);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.03, o.dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      let node = osc;
      if (o.filter) {
        const flt = ctx.createBiquadFilter();
        flt.type = o.filter.type || "lowpass";
        flt.frequency.value = o.filter.freq || 1000;
        node.connect(flt); flt.connect(g);
      } else {
        node.connect(g);
      }
      g.connect(master);
      osc.start(t0); osc.stop(t0 + o.dur + 0.02);
    }

    // szum (np. syk węża, ryk)
    function noise(o) {
      const t0 = ctx.currentTime + (o.delay || 0);
      const dur = o.dur || 0.4;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = o.filterType || "bandpass";
      flt.frequency.value = o.freq || 1000;
      flt.Q.value = o.Q || 1;
      const g = ctx.createGain();
      const peak = o.gain != null ? o.gain : 0.4;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(flt); flt.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + dur);
    }

    // definicje odgłosów (procedualne przybliżenia)
    const RECIPES = {
      roar() { noise({ freq: 200, Q: 0.7, gain: 0.5, dur: 0.9, filterType: "lowpass" });
               tone({ type: "sawtooth", f0: 180, f1: 70, dur: 0.9, gain: 0.4, vibrato: { rate: 18, depth: 30 } }); },
      growl() { this.roar(); },
      trumpet() { tone({ type: "sawtooth", f0: 180, f1: 520, dur: 0.5, gain: 0.4, filter: { type: "lowpass", freq: 2000 } });
                  tone({ type: "square", f0: 520, f1: 300, dur: 0.5, delay: 0.45, gain: 0.35 }); },
      bark() { tone({ type: "square", f0: 320, f1: 150, dur: 0.14, gain: 0.5, filter: { type: "lowpass", freq: 1500 } });
               tone({ type: "square", f0: 300, f1: 140, dur: 0.14, gain: 0.5, delay: 0.22, filter: { type: "lowpass", freq: 1500 } }); },
      meow() { tone({ type: "sawtooth", f0: 500, f1: 800, dur: 0.25, gain: 0.35, filter: { type: "bandpass", freq: 900 } });
               tone({ type: "sawtooth", f0: 800, f1: 400, dur: 0.35, delay: 0.24, gain: 0.35, filter: { type: "bandpass", freq: 900 } }); },
      moo() { tone({ type: "sawtooth", f0: 160, f1: 130, dur: 0.8, gain: 0.45, filter: { type: "lowpass", freq: 800 }, vibrato: { rate: 6, depth: 10 } }); },
      neigh() { tone({ type: "sawtooth", f0: 600, f1: 350, dur: 0.6, gain: 0.35, vibrato: { rate: 22, depth: 60 }, filter: { type: "bandpass", freq: 1200 } }); },
      oink() { tone({ type: "sawtooth", f0: 300, f1: 200, dur: 0.18, gain: 0.4, filter: { type: "bandpass", freq: 700 } });
               tone({ type: "sawtooth", f0: 300, f1: 200, dur: 0.18, delay: 0.26, gain: 0.4, filter: { type: "bandpass", freq: 700 } }); },
      baa() { tone({ type: "sawtooth", f0: 420, f1: 380, dur: 0.7, gain: 0.35, vibrato: { rate: 14, depth: 40 }, filter: { type: "bandpass", freq: 1000 } }); },
      quack() { tone({ type: "square", f0: 320, f1: 260, dur: 0.12, gain: 0.4, filter: { type: "bandpass", freq: 1200, } });
                tone({ type: "square", f0: 320, f1: 260, dur: 0.12, delay: 0.18, gain: 0.4, filter: { type: "bandpass", freq: 1200 } }); },
      ribbit() { tone({ type: "square", f0: 180, f1: 120, dur: 0.18, gain: 0.4, filter: { type: "lowpass", freq: 600 } });
                 tone({ type: "square", f0: 200, f1: 130, dur: 0.2, delay: 0.22, gain: 0.4, filter: { type: "lowpass", freq: 600 } }); },
      monkey() { tone({ type: "square", f0: 700, f1: 1100, dur: 0.12, gain: 0.35 });
                 tone({ type: "square", f0: 900, f1: 600, dur: 0.12, delay: 0.16, gain: 0.35 });
                 tone({ type: "square", f0: 800, f1: 1200, dur: 0.12, delay: 0.34, gain: 0.35 }); },
      howl() { tone({ type: "sine", f0: 300, f1: 550, dur: 1.0, gain: 0.4, vibrato: { rate: 5, depth: 25 } }); },
      cluck() { for (let i = 0; i < 3; i++) tone({ type: "square", f0: 900, f1: 500, dur: 0.06, gain: 0.35, delay: i * 0.12, filter: { type: "bandpass", freq: 1500 } }); },
      rooster() { tone({ type: "sawtooth", f0: 500, f1: 700, dur: 0.2, gain: 0.4 });
                  tone({ type: "sawtooth", f0: 700, f1: 500, dur: 0.4, delay: 0.2, gain: 0.4, vibrato: { rate: 10, depth: 40 } }); },
      hoot() { tone({ type: "sine", f0: 420, f1: 380, dur: 0.3, gain: 0.4 });
               tone({ type: "sine", f0: 420, f1: 360, dur: 0.4, delay: 0.45, gain: 0.4 }); },
      hiss() { noise({ freq: 6000, Q: 0.5, gain: 0.25, dur: 0.7, filterType: "highpass" }); },
      buzz() { tone({ type: "sawtooth", f0: 220, dur: 0.7, gain: 0.3, vibrato: { rate: 45, depth: 25 }, filter: { type: "bandpass", freq: 900 } }); },
      blub() { tone({ type: "sine", f0: 600, f1: 200, dur: 0.18, gain: 0.4 });
               tone({ type: "sine", f0: 500, f1: 180, dur: 0.18, delay: 0.22, gain: 0.4 }); },
      tweet() { tone({ type: "sine", f0: 1800, f1: 2600, dur: 0.1, gain: 0.3 });
                tone({ type: "sine", f0: 2400, f1: 1800, dur: 0.12, delay: 0.13, gain: 0.3 }); },
      chime() { [523, 659, 784].forEach((f, i) => tone({ type: "sine", f0: f, dur: 0.4, gain: 0.3, delay: i * 0.1 })); }
    };

    function effect(kind) {
      if (!ensure()) return;
      const fn = RECIPES[kind] || RECIPES.chime;
      try { fn.call(RECIPES); } catch (e) { /* ignoruj */ }
    }

    // Mowa po polsku (nazwa zwierzęcia)
    function speak(text, delay) {
      if (!global.speechSynthesis) return;
      setTimeout(() => {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "pl-PL";
          u.rate = 0.95;
          u.pitch = 1.15;
          u.volume = volume;
          const v = global.speechSynthesis.getVoices().find((x) => /pl/i.test(x.lang));
          if (v) u.voice = v;
          global.speechSynthesis.cancel();
          global.speechSynthesis.speak(u);
        } catch (e) { /* ignoruj */ }
      }, delay || 0);
    }

    /** Główne API: zagraj odgłos zwierzęcia i wymów jego nazwę. */
    function playAnimal(animal) {
      effect(animal.sound || "chime");
      speak(animal.name, 750);
    }

    // odblokowanie audio na pierwszy gest (wymóg przeglądarek)
    function unlock() { ensure(); }

    return { ensure, unlock, setVolume, effect, speak, playAnimal };
  })();

  /* ------------------------------------------------------------------ *
   * 5. NARZĘDZIA base64 dla UTF-8 (transfer katalogu w linku #cat=)
   * ------------------------------------------------------------------ */
  ZOO.b64encodeUnicode = function (str) {
    return btoa(unescape(encodeURIComponent(str)));
  };
  ZOO.b64decodeUnicode = function (b64) {
    return decodeURIComponent(escape(atob(b64)));
  };

  global.ZOO = ZOO;
})(typeof window !== "undefined" ? window : this);
