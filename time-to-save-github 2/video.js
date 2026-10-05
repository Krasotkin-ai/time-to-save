/* Time to Save — photos from videos. Volunteers drop videos filmed at the shelter;
   the browser picks the frames where the animal is seen best (sharp, animal in view),
   brightens them, groups frames by animal, reads the kennel number painted on the cage,
   and creates catalog cards with new IDs. Videos never leave the computer: only the
   chosen photos are published. */
(function () {
  "use strict";
  var A = window.__TTS;
  if (!A || document.getElementById("ghvid")) return;
  var ru = (navigator.language || "ru").toLowerCase().indexOf("ru") === 0 || localStorage.getItem("tts.lang") === "ru";
  var T = ru ? {
    title: "Фото из видео",
    note: "Перетащите видео, снятые у вольеров. Сайт сам выберет кадры, где животное видно лучше всего, сделает их светлее и чётче, разделит по животным, найдёт номер вольера и создаст карточки с новыми ID. Видео никуда не загружаются, на сайт попадают только выбранные фото.",
    drop: "<b>Перетащите видео сюда</b> или нажмите, чтобы выбрать.<br><span class=\"muted\" style=\"font-size:13px\">MP4, MOV, WEBM. Можно несколько сразу.</span>",
    bright: "Сделать фото светлее и чётче", cageOcr: "Искать номер вольера на видео", perDog: "Кадров на животное",
    city: "Город", place: "Место (приют, центр отлова)",
    loading: "Загружаю нейросеть (один раз)…", reading: "Смотрю видео", frames: "кадр", of: "из", ocr: "Ищу номер вольера…",
    found: "Найдено животных", cage: "Вольер", none: "В этом видео животное не нашлось. Попробуйте снять ближе или светлее.",
    badVideo: "Не получилось открыть видео. Сохраните его в MP4 и попробуйте ещё раз.",
    add: "Добавить в каталог", added: "Добавлено карточек", afterAdd: "Окрас и возраст определятся сами. Проверьте и нажмите «Опубликовать на сайте».",
    take: "Взять", clear: "Очистить", dog: "Животное", noCage: "не найден, впишите"
  } : {
    title: "Photos from videos",
    note: "Drop videos filmed at the kennels. The site picks the frames where the animal is seen best, brightens and sharpens them, splits them by animal, reads the kennel number and creates cards with new IDs. Videos are not uploaded; only the chosen photos are published.",
    drop: "<b>Drop videos here</b> or click to choose.<br><span class=\"muted\" style=\"font-size:13px\">MP4, MOV, WEBM. Several at once is fine.</span>",
    bright: "Make photos brighter and sharper", cageOcr: "Look for the kennel number", perDog: "Frames per animal",
    city: "City", place: "Place (shelter, control center)",
    loading: "Loading the model (once)…", reading: "Watching video", frames: "frame", of: "of", ocr: "Looking for the kennel number…",
    found: "Animals found", cage: "Kennel", none: "No animal found in this video. Try filming closer or in better light.",
    badVideo: "Could not open the video. Save it as MP4 and try again.",
    add: "Add to the catalog", added: "Cards added", afterAdd: "Coat and age will be filled in automatically. Check them and press Publish.",
    take: "Use", clear: "Clear", dog: "Animal", noCage: "not found, type it"
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function blob(c, q) { return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error("blob")); }, "image/jpeg", q); }); }
  function scaled(src, max) { var k = Math.min(1, max / Math.max(src.width, src.height)), c = canvas(src.width * k, src.height * k); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c; }

  /* ---------- engines (loaded on first use) ---------- */
  function script(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  var vision = null, tess = null;
  async function getVision(progress) {
    if (vision) return vision;
    if (!window.Vision) await script("js/vision.js");
    await window.Vision.init(progress || function () {});
    vision = window.Vision; return vision;
  }
  async function getOcr() {
    if (tess) return tess;
    var local = true;
    if (!window.Tesseract) { try { await script("lib/tesseract/tesseract.min.js"); } catch (e) { local = false; await script("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"); } }
    var opt = local ? { workerPath: new URL("lib/tesseract/worker.min.js", location.href).href, corePath: new URL("lib/tesseract/", location.href).href, langPath: new URL("lib/tessdata", location.href).href, workerBlobURL: false } : {};
    tess = await window.Tesseract.createWorker(["rus", "eng"], 1, opt);
    return tess;
  }

  /* ---------- image measures ---------- */
  function measure(c) {
    var s = scaled(c, 320), g = s.getContext("2d").getImageData(0, 0, s.width, s.height).data, w = s.width, h = s.height;
    var L = new Float32Array(w * h), sum = 0;
    for (var i = 0; i < L.length; i++) { L[i] = g[i * 4] * .299 + g[i * 4 + 1] * .587 + g[i * 4 + 2] * .114; sum += L[i]; }
    var mean = sum / L.length, lap = 0, lap2 = 0, n = 0, v = 0;
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
      var k = y * w + x, l = 4 * L[k] - L[k - 1] - L[k + 1] - L[k - w] - L[k + w];
      lap += l; lap2 += l * l; n++;
    }
    for (var j = 0; j < L.length; j++) v += (L[j] - mean) * (L[j] - mean);
    return { sharp: lap2 / n - (lap / n) * (lap / n), bright: mean / 255, contrast: Math.sqrt(v / L.length) / 255 };
  }
  // Stretch levels so the animal behind the bars is easier to see; lift shadows; light sharpening.
  function enhance(c) {
    var g = c.getContext("2d"), im = g.getImageData(0, 0, c.width, c.height), d = im.data, hist = new Uint32Array(256), n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) hist[(d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) | 0]++;
    function pct(p) { var t = n * p, a = 0; for (var k = 0; k < 256; k++) { a += hist[k]; if (a >= t) return k; } return 255; }
    var lo = pct(0.006), hi = pct(0.994); if (hi - lo < 40) { lo = Math.max(0, lo - 20); hi = Math.min(255, hi + 20); }
    var mean = 0; for (var k = 0; k < 256; k++) mean += k * hist[k]; mean = (mean / n - lo) / Math.max(1, hi - lo);
    var gamma = mean < 0.45 ? Math.max(0.6, Math.log(0.5) / Math.log(Math.max(0.05, mean))) : 1;
    var lut = new Uint8ClampedArray(256);
    for (var v = 0; v < 256; v++) lut[v] = 255 * Math.pow(Math.min(1, Math.max(0, (v - lo) / Math.max(1, hi - lo))), gamma);
    for (var p = 0; p < d.length; p += 4) {
      var r = lut[d[p]], gg = lut[d[p + 1]], b = lut[d[p + 2]], l2 = r * .299 + gg * .587 + b * .114;
      d[p] = l2 + (r - l2) * 1.12; d[p + 1] = l2 + (gg - l2) * 1.12; d[p + 2] = l2 + (b - l2) * 1.12;
    }
    // unsharp mask (3x3), strength 0.35
    var w = c.width, h = c.height, src = new Uint8ClampedArray(d), s = 0.35;
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
      var o = (y * w + x) * 4;
      for (var ch = 0; ch < 3; ch++) {
        var bl = (src[o + ch - 4] + src[o + ch + 4] + src[o + ch - w * 4] + src[o + ch + w * 4] + 4 * src[o + ch]) / 8;
        d[o + ch] = src[o + ch] + s * (src[o + ch] - bl) * 2;
      }
    }
    g.putImageData(im, 0, 0);
    return c;
  }

  /* ---------- video ---------- */
  function openVideo(file) {
    return new Promise(function (res, rej) {
      var v = document.createElement("video"), url = URL.createObjectURL(file), done = false;
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      v.onloadeddata = function () { if (!done) { done = true; res(v); } };
      v.onerror = function () { if (!done) { done = true; URL.revokeObjectURL(url); rej(new Error("video")); } };
      setTimeout(function () { if (!done) { done = true; rej(new Error("timeout")); } }, 20000);
    });
  }
  function seek(v, t) {
    return new Promise(function (res) {
      var ok = false, f = function () { if (ok) return; ok = true; v.removeEventListener("seeked", f); res(); };
      v.addEventListener("seeked", f); v.currentTime = Math.min(Math.max(0, t), Math.max(0, v.duration - 0.05));
      setTimeout(f, 3000);
    });
  }
  function grab(v, max) { var k = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight)), c = canvas(v.videoWidth * k, v.videoHeight * k); c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); return c; }
  // The square the model found the animal in (same crops as js/vision.js), widened a little so the whole animal fits.
  function cropOf(w, h, i, webgl) {
    var s = Math.min(w, h), C = [[(w - s) / 2, (h - s) / 2, s]];
    if (w > h * 1.15) C.push([0, 0, h], [w - h, 0, h]); else if (h > w * 1.15) C.push([0, 0, w], [0, h - w, w]);
    var s2 = s * 0.62, cl = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    (webgl ? [[.5, .5], [.22, .28], [.78, .28], [.22, .72], [.78, .72]] : [[.5, .5]]).forEach(function (f) { C.push([cl(f[0] * w - s2 / 2, 0, w - s2), cl(f[1] * h - s2 / 2, 0, h - s2), s2]); });
    var c = C[i] || C[0], k = c[2] < s ? 1.45 : 1.15, size = Math.min(Math.max(w, h), c[2] * k), cx = c[0] + c[2] / 2, cy = c[1] + c[2] / 2;
    var cw = Math.min(w, size * (w > h ? 1.25 : 1)), ch = Math.min(h, size);
    return [cl(cx - cw / 2, 0, w - cw), cl(cy - ch / 2, 0, h - ch), cw, ch];
  }
  function cut(c, r, baseW) {
    if (!r) return c;
    var k = c.width / baseW, o = canvas(r[2] * k, r[3] * k);
    o.getContext("2d").drawImage(c, r[0] * k, r[1] * k, r[2] * k, r[3] * k, 0, 0, o.width, o.height);
    return o;
  }
  function cos(a, b) { var s = 0, na = 0, nb = 0; for (var i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return s / Math.sqrt(na * nb + 1e-9); }

  // Kennel number: words like "вольер 12", "№ 7", or a large standalone 1–3 digit number, voted across frames.
  function cageFromName(name) { var m = String(name).match(/(вольер|клетк\S*|kennel|cage|v|в)[ _\-.№#]*(\d{1,3})(?!\d)/i); return m ? m[2] : ""; }
  async function readCage(frames, status) {
    status(T.ocr);
    var w = await getOcr(), votes = {};
    for (var i = 0; i < frames.length; i++) {
      var c = scaled(frames[i], 1600), r = await w.recognize(c, {}, { blocks: true, text: true }), H = c.height;
      (r.data.blocks || []).forEach(function (bl) { (bl.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) {
        var text = (l.words || []).map(function (x) { return x.text; }).join(" "), m;
        var re = /(вольер\S*|клетк\S*|кл\.?|№|no\.?|n°)\s*[:.]?\s*(\d{1,3})(?!\d)/gi;
        while ((m = re.exec(text))) votes[m[2]] = (votes[m[2]] || 0) + 3;
        (l.words || []).forEach(function (x) {
          var t = (x.text || "").replace(/[^\d]/g, "");
          if (/^\d{1,3}$/.test(x.text || "") && x.confidence >= 75 && (x.bbox.y1 - x.bbox.y0) >= H * 0.025) votes[t] = (votes[t] || 0) + 1;
        });
      }); }); });
    }
    var best = "", bv = 0;
    Object.keys(votes).forEach(function (k) { if (votes[k] > bv) { bv = votes[k]; best = k; } });
    return bv >= 2 ? best : "";
  }

  async function processVideo(file, opt, status) {
    var v = await openVideo(file), dur = v.duration;
    if (!isFinite(dur) || dur <= 0) dur = 10;
    var n = Math.max(8, Math.min(90, Math.round(dur / 0.5))), step = dur / (n + 1), samples = [];
    for (var i = 1; i <= n; i++) {
      var t = step * i;
      await seek(v, t);
      var c = grab(v, 480), m = measure(c);
      samples.push({ t: t, c: c, sharp: m.sharp, bright: m.bright, contrast: m.contrast });
      status(T.reading + " «" + file.name + "»: " + T.frames + " " + i + " " + T.of + " " + n);
      if (i % 6 === 0) await sleep(0);
    }
    // Keep the clearest frames, spread through the video.
    var maxS = Math.max.apply(null, samples.map(function (s) { return s.sharp; })) || 1;
    samples.forEach(function (s) { s.q = (s.sharp / maxS) * (0.6 + 0.4 * Math.min(1, s.contrast * 4)) * (s.bright < 0.08 ? 0.3 : 1); });
    var cand = samples.slice().sort(function (a, b) { return b.q - a.q; }).slice(0, Math.min(28, Math.ceil(samples.length * 0.5)));
    var V = await getVision(function (p) { status(T.loading + " " + Math.round(p * 100) + "%"); });
    for (var k = 0; k < cand.length; k++) {
      status(T.reading + " «" + file.name + "»: " + (k + 1) + " " + T.of + " " + cand.length);
      var a = await V.analyze(cand[k].c);
      cand[k].emb = a.emb; cand[k].p = a.pAnimal; cand[k].vs = a.sharp; cand[k].crop = cropOf(cand[k].c.width, cand[k].c.height, a.crop, V.backend === "webgl");
    }
    var withDog = cand.filter(function (s) { return s.p >= 0.5; });
    // Group frames by animal (average linkage on image embeddings).
    var groups = withDog.map(function (s) { return [s]; });
    for (;;) {
      var bi = -1, bj = -1, bs = 0;
      for (var x = 0; x < groups.length; x++) for (var y = x + 1; y < groups.length; y++) {
        var sum = 0, cnt = 0;
        groups[x].forEach(function (a) { groups[y].forEach(function (b) { sum += cos(a.emb, b.emb); cnt++; }); });
        if (sum / cnt > bs) { bs = sum / cnt; bi = x; bj = y; }
      }
      if (bi < 0 || bs < 0.86) break;
      groups[bi] = groups[bi].concat(groups[bj]); groups.splice(bj, 1);
    }
    groups = groups.filter(function (g) { return g.length >= (withDog.length > 6 ? 2 : 1); }).sort(function (a, b) { return b.length - a.length; }).slice(0, 6);
    // Best few frames per animal, not near-duplicates.
    var dogs = [];
    for (var gi = 0; gi < groups.length; gi++) {
      var G = groups[gi].sort(function (a, b) { return (b.p * b.q) - (a.p * a.q); }), pick = [];
      for (var q = 0; q < G.length && pick.length < opt.perDog; q++) {
        if (pick.some(function (s) { return cos(s.emb, G[q].emb) > 0.975 || Math.abs(s.t - G[q].t) < 0.6; })) continue;
        pick.push(G[q]);
      }
      var shots = [];
      for (var z = 0; z < pick.length; z++) {
        await seek(v, pick[z].t);
        var full = cut(grab(v, 1920), pick[z].crop, pick[z].c.width);
        if (opt.bright) enhance(full);
        shots.push({ t: pick[z].t, full: full, thumb: scaled(full, 260), wide: opt.cage && z === 0 ? grab(v, 1600) : null });
      }
      dogs.push({ shots: shots, use: true });
    }
    var cage = cageFromName(file.name);
    if (!cage && opt.cage && dogs.length) {
      var fr = [];
      for (var f = 1; f <= 5; f++) { await seek(v, dur * f / 6); fr.push(grab(v, 1600)); }
      dogs.forEach(function (d) { d.shots.forEach(function (s) { if (s.wide) fr.push(s.wide); }); });
      try { cage = await readCage(fr.slice(0, 9), status); } catch (e) { console.warn(e); }
    }
    URL.revokeObjectURL(v.src);
    return { name: file.name, dogs: dogs, cage: cage };
  }

  /* ---------- catalog ---------- */
  function nextId(used) { var n = 1; while (used[("D" + String(n).padStart(3, "0"))]) n++; var id = "D" + String(n).padStart(3, "0"); used[id] = 1; return id; }
  function photoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  async function addToCatalog(results, place) {
    var used = {}, made = [];
    (A.state.dogs || []).forEach(function (d) { used[d.id] = 1; });
    for (var r = 0; r < results.length; r++) {
      var R = results[r];
      for (var i = 0; i < R.dogs.length; i++) {
        var D = R.dogs[i]; if (!D.use || !D.shots.length) continue;
        var photos = [];
        for (var s = 0; s < D.shots.length; s++) {
          var sh = D.shots[s], pid = photoId();
          A.LOCAL.set(pid + "|f", URL.createObjectURL(await blob(scaled(sh.full, 1100), 0.82)));
          A.LOCAL.set(pid + "|t", URL.createObjectURL(await blob(scaled(sh.full, 420), 0.74)));
          photos.push(pid);
        }
        var dog = { id: nextId(used), name: "", species: "dog", color: "", colorText: "", age: "", ageGroup: "", city: place.city, location: place.location, cage: R.cage || "",
          status: "available", urgent: false, deadline: "", note: "", note_en: "", photos: photos, photoNames: [], colorNote: "", colorNote_en: "", aiFields: [], aiDone: false, aiFlag: "", stage: "capture" };
        A.state.dogs.push(dog); made.push(dog.id);
      }
    }
    A.resetCards(); A.render();
    return made;
  }
  // Let the catalog's own AI fill coat and age for the new cards.
  async function runAI() {
    var tab = Array.prototype.filter.call(document.querySelectorAll(".tabs button"), function (b) { return b.dataset.tab === "admin"; })[0];
    if (tab && tab.getAttribute("aria-selected") !== "true") { tab.click(); await sleep(400); }
    var only = document.getElementById("aionly"), go = document.getElementById("airun");
    if (only) only.checked = true;
    if (go) go.click();
  }

  /* ---------- panel ---------- */
  var css = document.createElement("style");
  css.textContent = "#ghvid .opts{display:flex;flex-wrap:wrap;gap:10px 18px;font-size:14px;align-items:center}#ghvid .opts label{display:flex;gap:6px;align-items:center}" +
    "#ghvid .opts input[type=text]{padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);min-width:0;flex:1 1 160px}" +
    "#ghvid .vr{border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}" +
    "#ghvid .vr .hd{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:14px}#ghvid .vr .hd input{width:80px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)}" +
    "#ghvid .dg{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px}#ghvid .dg img{width:84px;height:84px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}" +
    "#ghvid .dg.off img{opacity:.35}#ghvidstat{font-size:13px;min-height:1em}";
  document.head.appendChild(css);
  var box = document.createElement("section");
  box.id = "ghvid";
  box.className = "panel";
  box.style.cssText = "margin:18px 0";
  var state = { results: [], busy: false, opt: { bright: true, cage: true, perDog: 3 }, city: "", location: "" };
  function draw() {
    var o = state.opt, total = 0;
    state.results.forEach(function (r) { r.dogs.forEach(function (d) { if (d.use) total++; }); });
    box.innerHTML = "<h2>" + T.title + '</h2><p class="muted" style="font-size:14px">' + T.note + "</p>" +
      '<div class="drop" id="ghvdz" tabindex="0" role="button">' + T.drop + '<input type="file" id="ghvfiles" accept="video/*,.mov,.mp4,.m4v,.webm" multiple></div>' +
      '<div class="opts"><label><input type="checkbox" id="ghvb"' + (o.bright ? " checked" : "") + "> " + T.bright + '</label><label><input type="checkbox" id="ghvc"' + (o.cage ? " checked" : "") + "> " + T.cageOcr + "</label>" +
      "<label>" + T.perDog + ' <select id="ghvn">' + [1, 2, 3, 4, 5].map(function (k) { return "<option" + (k === o.perDog ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="opts"><input type="text" id="ghvcity" placeholder="' + T.city + '" value="' + esc(state.city) + '"><input type="text" id="ghvloc" placeholder="' + T.place + '" value="' + esc(state.location) + '"></div>' +
      '<p id="ghvidstat" class="muted"></p>' +
      state.results.map(function (r, ri) {
        return '<div class="vr"><div class="hd"><b>' + esc(r.name) + "</b><span>" + T.found + ": <b>" + r.dogs.length + "</b></span>" +
          (r.dogs.length ? "<label>" + T.cage + ' <input data-vcage="' + ri + '" value="' + esc(r.cage) + '" placeholder="—"></label>' + (r.cage ? "" : '<span class="muted" style="font-size:12px">' + T.noCage + "</span>") : "") + "</div>" +
          (r.error ? '<p class="muted" style="margin:0">' + r.error + "</p>" : !r.dogs.length ? '<p class="muted" style="margin:0">' + T.none + "</p>" :
            r.dogs.map(function (d, di) {
              return '<div class="dg' + (d.use ? "" : " off") + '"><label style="display:flex;gap:6px;align-items:center;min-width:110px"><input type="checkbox" data-vuse="' + ri + ":" + di + '"' + (d.use ? " checked" : "") + "> " + T.dog + " " + (di + 1) + "</label>" +
                d.shots.map(function (s) { return '<img alt="" src="' + s.thumb.toDataURL("image/jpeg", 0.7) + '">'; }).join("") + "</div>";
            }).join("")) + "</div>";
      }).join("") +
      (state.results.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="ghvadd"' + (total ? "" : " disabled") + ">" + T.add + " (" + total + ')</button><button class="btn ghost" id="ghvclr">' + T.clear + "</button></div>" : "");
    var dz = box.querySelector("#ghvdz"), fi = box.querySelector("#ghvfiles");
    dz.onclick = function (e) { if (!state.busy && e.target !== fi) fi.click(); };
    dz.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dz.click(); } };
    dz.ondragover = function (e) { e.preventDefault(); dz.classList.add("over"); };
    dz.ondragleave = function () { dz.classList.remove("over"); };
    dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove("over"); run(e.dataTransfer.files); };
    fi.onchange = function () { run(fi.files); };
    box.querySelector("#ghvb").onchange = function (e) { o.bright = e.target.checked; };
    box.querySelector("#ghvc").onchange = function (e) { o.cage = e.target.checked; };
    box.querySelector("#ghvn").onchange = function (e) { o.perDog = +e.target.value; };
    box.querySelector("#ghvcity").oninput = function (e) { state.city = e.target.value; };
    box.querySelector("#ghvloc").oninput = function (e) { state.location = e.target.value; };
    box.querySelectorAll("[data-vcage]").forEach(function (inp) { inp.oninput = function () { state.results[+inp.dataset.vcage].cage = inp.value.trim(); }; });
    box.querySelectorAll("[data-vuse]").forEach(function (cb) { cb.onchange = function () { var p = cb.dataset.vuse.split(":"); state.results[+p[0]].dogs[+p[1]].use = cb.checked; draw(); }; });
    var add = box.querySelector("#ghvadd");
    if (add) add.onclick = async function () {
      add.disabled = true;
      var made = await addToCatalog(state.results, { city: state.city.trim(), location: state.location.trim() });
      state.results = []; draw();
      status(T.added + ": " + made.length + " (" + made.join(", ") + "). " + T.afterAdd);
      A.toast(T.added + ": " + made.length);
      if (made.length) runAI();
    };
    var clr = box.querySelector("#ghvclr"); if (clr) clr.onclick = function () { state.results = []; draw(); };
  }
  function status(t) { var s = box.querySelector("#ghvidstat"); if (s) s.textContent = t || ""; }
  async function run(list) {
    var files = Array.prototype.filter.call(list || [], function (f) { return /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i.test(f.name); });
    if (!files.length || state.busy) return;
    state.busy = true;
    for (var i = 0; i < files.length; i++) {
      try { state.results.push(await processVideo(files[i], state.opt, status)); }
      catch (e) { console.warn(e); state.results.push({ name: files[i].name, dogs: [], cage: "", error: T.badVideo }); }
      draw();
    }
    state.busy = false; status("");
  }
  draw();
  // Keep the panel next to the photo upload in "Manage"; the app redraws its own page often.
  function place() {
    var pdz = document.getElementById("pdz"), host = pdz && pdz.closest(".panel");
    if (host && host.parentNode) { if (box.previousElementSibling !== host) host.parentNode.insertBefore(box, host.nextSibling); }
    else if (!box.isConnected || document.getElementById("app").contains(box)) {
      var anchor = document.getElementById("ghmoney") || document.getElementById("ghhist") || document.getElementById("ghvp") || document.getElementById("toast");
      anchor.parentNode.insertBefore(box, anchor);
    }
  }
  var queued = false;
  new MutationObserver(function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; place(); }); }).observe(document.getElementById("app"), { childList: true, subtree: true });
  place();
})();
