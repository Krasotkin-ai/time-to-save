/* Time to Save — reads receipts in the browser.
   Photos and screenshots go through Tesseract OCR, PDFs through pdf.js.
   Finds the amount, date and seller, and blacks out phone, card and ID numbers
   and payer names before the image is published. Nothing leaves the browser. */
(function () {
  "use strict";
  var CDN_TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  var CDN_PDF = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";
  var worker = null, pdfjs = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  async function ocr() {
    if (worker) return worker;
    var local = true;
    try { await loadScript("lib/tesseract/tesseract.min.js"); } catch (e) { local = false; await loadScript(CDN_TESS); }
    var opt = local ? { workerPath: new URL("lib/tesseract/worker.min.js", location.href).href, corePath: new URL("lib/tesseract/", location.href).href, langPath: new URL("lib/tessdata", location.href).href, workerBlobURL: false } : {};
    worker = await window.Tesseract.createWorker(["rus", "eng"], 1, opt);
    await worker.setParameters({ preserve_interword_spaces: "1" });
    return worker;
  }
  async function pdf() {
    if (pdfjs) return pdfjs;
    var base = new URL("lib/pdfjs/", location.href).href;
    try { pdfjs = await import(base + "pdf.min.mjs"); } catch (e) { base = CDN_PDF; pdfjs = await import(base + "pdf.min.mjs"); }
    pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
    return pdfjs;
  }

  function canvasOf(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function imageCanvas(file, max) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = canvasOf(img.naturalWidth * k, img.naturalHeight * k), g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("image")); };
      img.src = url;
    });
  }

  // lines: [{ text, words: [{ text, b: [x0, y0, x1, y1] }] }]
  async function linesFromOCR(c) {
    var w = await ocr();
    var r = await w.recognize(c, {}, { blocks: true, text: true });
    var out = [];
    (r.data.blocks || []).forEach(function (bl) {
      (bl.paragraphs || []).forEach(function (p) {
        (p.lines || []).forEach(function (l) {
          var ws = (l.words || []).filter(function (x) { return x.text && x.text.trim(); }).map(function (x) { return { text: x.text, b: [x.bbox.x0, x.bbox.y0, x.bbox.x1, x.bbox.y1] }; });
          if (ws.length) out.push({ text: ws.map(function (x) { return x.text; }).join(" "), words: ws });
        });
      });
    });
    return out;
  }
  async function readPDF(file) {
    var lib = await pdf();
    var doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    var page = await doc.getPage(1);
    var v0 = page.getViewport({ scale: 1 }), scale = Math.min(4, 1400 / v0.width), vp = page.getViewport({ scale: scale });
    var c = canvasOf(vp.width, vp.height), g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    var tc = await page.getTextContent(), items = [];
    tc.items.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var t = lib.Util.transform(vp.transform, it.transform), fh = Math.hypot(t[2], t[3]), x = t[4], y = t[5];
      var wpx = it.width * scale, n = it.str.length, pos = 0;
      it.str.split(/(\s+)/).forEach(function (part) {
        if (part.trim()) items.push({ text: part, b: [x + wpx * pos / n, y - fh, x + wpx * (pos + part.length) / n, y + fh * 0.25], y: y, fh: fh });
        pos += part.length;
      });
    });
    items.sort(function (a, b) { return a.y - b.y || a.b[0] - b.b[0]; });
    var lines = [];
    items.forEach(function (w) {
      var L = lines[lines.length - 1];
      if (L && Math.abs(L.y - w.y) < w.fh * 0.5) L.words.push(w); else lines.push({ y: w.y, words: [w] });
    });
    lines.forEach(function (L) { L.words.sort(function (a, b) { return a.b[0] - b.b[0]; }); L.text = L.words.map(function (w) { return w.text; }).join(" "); });
    if (lines.length < 2) lines = await linesFromOCR(c); // scanned PDF without a text layer
    return { canvas: c, lines: lines };
  }

  /* ---------- parsing ---------- */
  var NUM = /(\d{1,3}(?:[   '’]\d{3})+|\d+)(?:[.,](\d{1,2}))?(?!\d)/g;
  function nums(s) {
    var out = [], m; NUM.lastIndex = 0;
    while ((m = NUM.exec(s))) {
      var v = parseFloat(m[1].replace(/[^\d]/g, "") + (m[2] ? "." + m[2] : ""));
      out.push({ v: v, i: m.index, raw: m[0] });
    }
    return out;
  }
  function plausible(n) { return n >= 10 && n <= 20000000; }
  function clean(s) { return s.replace(/[|_«»"“”]/g, " ").replace(/\s+/g, " ").trim(); }
  var KEYS = [
    /итог|к\s*оплат|оплачено|сумма\s*(платежа|покупки|перевода|к\s*оплате)|total|jami|барлығы|төлеуге/i,
    /сумма|amount|сомасы/i,
    /всего|перевод\s*выполнен|покупка|оплата/i
  ];
  var NOT = /комисс|сдач|ндс|скидк|бонус|кэшб|cashback|баланс|остат|доступн|лимит|кол-?во|бин|иин|чек\s*№|№|касс|квитанц|телефон|карт|qr|операц/i;
  var CUR = /₸|тг\b|тенге|kzt|т\.?$/i;
  function findAmount(lines) {
    for (var k = 0; k < KEYS.length; k++) {
      for (var i = 0; i < lines.length; i++) {
        var t = lines[i].text;
        if (!KEYS[k].test(t) || NOT.test(t)) continue;
        var after = t.slice(t.search(KEYS[k]));
        var c = nums(after).filter(function (n) { return plausible(n.v) && !/\d{2}[.\/]\d{2}[.\/]\d{2}/.test(after.slice(n.i, n.i + 10)); });
        if (!c.length && lines[i + 1] && !NOT.test(lines[i + 1].text)) c = nums(lines[i + 1].text).filter(function (n) { return plausible(n.v); });
        if (c.length) return c[c.length - 1].v;
      }
    }
    var best = 0;
    lines.forEach(function (l) {
      if (NOT.test(l.text) || !CUR.test(l.text)) return;
      nums(l.text).forEach(function (n) { if (plausible(n.v) && n.v > best) best = n.v; });
    });
    if (best) return best;
    // a big standalone number (Kaspi screenshots show "5 000 ₸" but OCR may drop the sign)
    for (var j = 0; j < Math.min(lines.length, 6); j++) {
      var s = lines[j].text.trim();
      if (/^[\d\s .,]+[₸тT]?$/.test(s) && /\d{3}/.test(s)) { var n = nums(s)[0]; if (n && plausible(n.v)) return n.v; }
    }
    return 0;
  }
  var MON = { "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "ма": 5, "июн": 6, "июл": 7, "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12 };
  function iso(y, m, d) {
    y = +y; m = +m; d = +d; if (y < 100) y += 2000;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1 || y < 2015 || dt > new Date(Date.now() + 864e5 * 2)) return "";
    return dt.toISOString().slice(0, 10);
  }
  function findDate(lines) {
    var txt = lines.map(function (l) { return l.text; }).join("\n"), m, r;
    var re = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4}|\d{2})(?!\d)/g;
    while ((m = re.exec(txt))) if ((r = iso(m[3], m[2], m[1]))) return r;
    re = /(20\d{2})-(\d{2})-(\d{2})/g;
    while ((m = re.exec(txt))) if ((r = iso(m[1], m[2], m[3]))) return r;
    re = /(\d{1,2})\s+([а-яё]+)\s+(20\d{2})/gi;
    while ((m = re.exec(txt))) {
      var w = m[2].toLowerCase();
      for (var k in MON) if (w.indexOf(k) === 0 && (k !== "ма" || /^ма[йя]/.test(w))) { if ((r = iso(m[3], MON[k], m[1]))) return r; }
    }
    return "";
  }
  var SELLER = /получател|магазин|продав|организац|торгов|мерчант|место\s*покуп|поставщик|компания|наименование/i;
  function findSeller(lines) {
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].text;
      if (!SELLER.test(t) || /телефон|карт|счет|счёт|иин|бин/i.test(t)) continue;
      var rest = clean(t.replace(/^.*?(получател\S*|магазин\S*|продав\S*|организац\S*|торгов\S*\s*\S*|мерчант\S*|место\s*покуп\S*|поставщик\S*|компания\S*|наименование\S*)\s*[:\-–]?\s*/i, ""));
      if (rest.length >= 3 && /[а-яa-z]{3}/i.test(rest)) return rest.slice(0, 80);
      if (lines[i + 1]) { var nx = clean(lines[i + 1].text); if (nx.length >= 3 && /[а-яa-z]{3}/i.test(nx) && !/\d{4}/.test(nx)) return nx.slice(0, 80); }
    }
    for (var j = 0; j < Math.min(lines.length, 8); j++) {
      var s = clean(lines[j].text);
      if (/^(ИП|ТОО|АО|ООО|LLP|IP|TOO)(?=\s|$)/i.test(s) && s.length > 4) return s.slice(0, 80);
    }
    return "";
  }

  /* ---------- hiding private data ---------- */
  var SENSITIVE = [
    /(?:\+?\s?[78])[\s(\-]*7\d{2}[\s)\-]*[\d*]{3}[\s\-]*[\d*]{2}[\s\-]*\d{2}/g, // KZ mobile, also masked
    /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g,                         // 10-digit phone without prefix
    /(?:\*{1,4}|•{1,4}|x{2,4})\s?\d[\d ]{2,4}\d\b/gi,                           // masked card *1234 (OCR may split digits)
    /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,                                            // full card number
    /\b\d{12}\b/g,                                                               // IIN / BIN
    /\bKZ\d{2}[A-Z0-9]{13,16}\b/gi                                               // IBAN
  ];
  var PERSON = /^(отправител\S*|плательщ\S*|фио|клиент|покупател\S*|владел\S*\s*карт\S*|карта\s*списания|сч[её]т\s*списания|с\s*карты|со\s*сч[её]та)\s*[:\-–]?\s*/i;
  function redact(c, lines) {
    var g = c.getContext("2d"), n = 0, boxes = [];
    lines.forEach(function (l, li) {
      var pos = [], at = 0;
      l.words.forEach(function (w) { pos.push([at, at + w.text.length]); at += w.text.length + 1; });
      function cover(a, b) { l.words.forEach(function (w, k) { if (pos[k][1] > a && pos[k][0] < b) boxes.push(w.b); }); }
      SENSITIVE.forEach(function (re) { re.lastIndex = 0; var m; while ((m = re.exec(l.text))) { cover(m.index, m.index + m[0].length); n++; } });
      var p = l.text.match(PERSON);
      if (p) {
        if (p[0].length < l.text.length) { cover(p[0].length, l.text.length); n++; }
        else if (lines[li + 1]) { lines[li + 1].words.forEach(function (w) { boxes.push(w.b); }); n++; }
      }
    });
    g.fillStyle = "#111";
    boxes.forEach(function (b) { var h = b[3] - b[1], py = Math.max(2, h * 0.15), px = Math.max(3, h * 0.35); g.fillRect(b[0] - px, b[1] - py, b[2] - b[0] + px * 2, h + py * 2); });
    return n;
  }

  function toBlob(c, max, q) {
    var k = Math.min(1, max / Math.max(c.width, c.height)), o = c;
    if (k < 1) { o = canvasOf(c.width * k, c.height * k); o.getContext("2d").drawImage(c, 0, 0, o.width, o.height); }
    return new Promise(function (res, rej) { o.toBlob(function (b) { b ? res(b) : rej(new Error("toBlob")); }, "image/jpeg", q); });
  }

  async function read(file) {
    var isPDF = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name || "");
    var r = isPDF ? await readPDF(file) : null;
    var c = r ? r.canvas : await imageCanvas(file, 2000);
    var lines = r ? r.lines : await linesFromOCR(c);
    var amount = findAmount(lines), date = findDate(lines), seller = findSeller(lines);
    var hidden = redact(c, lines);
    return {
      amount: amount, date: date, seller: seller, hidden: hidden, ok: amount > 0,
      text: lines.map(function (l) { return l.text; }).join("\n"),
      full: await toBlob(c, 1800, 0.85), thumb: await toBlob(c, 360, 0.8)
    };
  }
  window.TTSReceipts = { read: read, _parse: { findAmount: findAmount, findDate: findDate, findSeller: findSeller } };
})();
