/* Time to Save — money log for volunteers: donations and expenses with receipts.
   Entries live in data.json (ledger). A donation for a dog adds to that dog's stage total.
   Receipts are read automatically (receipts.js): amount, date, seller; private numbers are blacked out. */
(function () {
  "use strict";
  var A = window.__TTS;
  if (!A || document.getElementById("ghmoney")) return;
  var ru = (navigator.language || "ru").toLowerCase().indexOf("ru") === 0 || localStorage.getItem("tts.lang") === "ru";
  var T = ru ? {
    title: "Деньги", note: "Записывайте каждый донат и каждый расход. Донат для собаки сразу добавляется к «собрано» на её этапе. Всё попадает на сайт после «Опубликовать».",
    inW: "Донат", outW: "Расход", date: "Дата", amount: "Сумма", dog: "Собака", fund: "Общий фонд", stage: "Этап",
    who: "Имя дарителя на сайте", whoNote: "Только если человек согласен. Пусто — на сайте будет «Аноним». Телефоны и номера карт не пишите.",
    what: "На что потрачено", receipt: "Чек", receiptNote: "Фото, скриншот или PDF. Сумма и дата заполнятся сами, телефоны и номера карт закроются.",
    comment: "Комментарий", add: "Добавить", save: "Сохранить", cancel: "Отмена", edit: "Изменить", del: "Удалить", sure: "Точно удалить?", anon: "Аноним",
    totalIn: "Пришло", totalOut: "Потрачено", left: "Остаток", none: "Записей пока нет.", report: "Открыть отчёт на сайте",
    badAmount: "Укажите сумму больше нуля.", badImg: "Не получилось открыть файл. Пришлите фото, скриншот или PDF.",
    added: "Добавлено. Нажмите «Опубликовать на сайте», чтобы сохранить.", saved: "Изменено. Не забудьте опубликовать.", photo: "чек",
    bought: "Покупка сделана", noSum: "сумма не распознана",
    drop: "<b>Перетащите чеки сюда</b> или нажмите, чтобы выбрать.<br><span class=\"muted\" style=\"font-size:13px\">Фото, скриншоты Kaspi, PDF. Можно сразу много. Каждый чек станет расходом: сумма, дата и магазин заполнятся сами. Если прочитать не получится, будет запись «Покупка сделана».</span>",
    loadingOCR: "Загружаю распознавание чеков (один раз, около 10 МБ)…", reading: "Читаю чеки", of: "из",
    bulkDone: function (n, ok, hid, dup) { if (!n) return "Эти чеки уже добавлены, пропущено: " + dup + "."; return "Добавлено чеков: " + n + ". С суммой: " + ok + (n - ok ? ", «Покупка сделана»: " + (n - ok) : "") + "." + (dup ? " Уже были, пропущено: " + dup + "." : "") + (hid ? " Закрыто личных данных: " + hid + "." : "") + (n ? " Проверьте и опубликуйте." : ""); },
    readOne: "Читаю чек…", readDone: "Чек прочитан, проверьте сумму.", readFail: "Сумму не нашёл, впишите её сами.",
    st: { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом" }
  } : {
    title: "Money", note: "Log every donation and every expense. A donation for a dog is added to “raised” for its stage right away. Everything goes live after Publish.",
    inW: "Donation", outW: "Expense", date: "Date", amount: "Amount", dog: "Dog", fund: "General fund", stage: "Stage",
    who: "Donor name on the site", whoNote: "Only with the donor’s consent. Leave empty to show “Anonymous”. No phone or card numbers.",
    what: "Spent on", receipt: "Receipt", receiptNote: "Photo, screenshot or PDF. Amount and date fill in by themselves; phone and card numbers are covered.",
    comment: "Comment", add: "Add", save: "Save", cancel: "Cancel", edit: "Edit", del: "Delete", sure: "Delete for sure?", anon: "Anonymous",
    totalIn: "Received", totalOut: "Spent", left: "Balance", none: "No entries yet.", report: "Open the public report",
    badAmount: "Enter an amount above zero.", badImg: "Could not open the file. Use a photo, screenshot or PDF.",
    added: "Added. Press “Publish to the site” to save it.", saved: "Changed. Remember to publish.", photo: "receipt",
    bought: "Purchase made", noSum: "amount not found",
    drop: "<b>Drop receipts here</b> or click to choose.<br><span class=\"muted\" style=\"font-size:13px\">Photos, Kaspi screenshots, PDFs, many at once. Each receipt becomes an expense with amount, date and shop filled in. If a receipt can’t be read it is logged as “Purchase made”.</span>",
    loadingOCR: "Loading receipt reader (once, about 10 MB)…", reading: "Reading receipts", of: "of",
    bulkDone: function (n, ok, hid, dup) { if (!n) return "These receipts are already logged, skipped: " + dup + "."; return "Receipts added: " + n + ". With amount: " + ok + (n - ok ? ", “Purchase made”: " + (n - ok) : "") + "." + (dup ? " Already logged, skipped: " + dup + "." : "") + (hid ? " Private details covered: " + hid + "." : "") + (n ? " Check and publish." : ""); },
    readOne: "Reading the receipt…", readDone: "Receipt read, check the amount.", readFail: "No amount found, type it in.",
    st: { capture: "Rescue", vet: "Vet", foster: "Foster", home: "Home" }
  };
  var STAGES = ["capture", "vet", "foster", "home"];
  function st() { return A.state; }
  function ledger() { var s = st(); if (!Array.isArray(s.ledger)) s.ledger = []; return s.ledger; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString(ru ? "ru-RU" : "en-GB", { maximumFractionDigits: 2 }) + " " + (st().settings.currency || "₸"); }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function dogById(id) { return (st().dogs || []).filter(function (d) { return d.id === id; })[0]; }
  function dogLabel(d) { return d.id + (d.name ? " · " + d.name : ""); }
  function newId() { return "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function bump(e, sign) {
    if (e.type !== "in" || !e.dog || !e.stage || !(e.amount > 0)) return;
    var d = dogById(e.dog); if (!d) return;
    d.funds = d.funds || {};
    var f = d.funds[e.stage] = d.funds[e.stage] || { raised: 0, goal: "" };
    f.raised = Math.max(0, Math.round(((+f.raised || 0) + sign * e.amount) * 100) / 100);
  }
  function shrink(file, max, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res(b) : rej(new Error("toBlob")); }, "image/jpeg", q);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }
  var recLoad = null;
  function reader() {
    if (window.TTSReceipts) return Promise.resolve(window.TTSReceipts);
    if (!recLoad) recLoad = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "receipts.js";
      s.onload = function () { res(window.TTSReceipts); }; s.onerror = function () { recLoad = null; rej(new Error("receipts.js")); };
      document.head.appendChild(s);
    });
    return recLoad;
  }
  // Read one receipt. Falls back to a plain picture when the reader is unavailable.
  async function readReceipt(file) {
    try { var R = await reader(); return await R.read(file); }
    catch (e) {
      console.warn("receipt reader", e);
      if (/pdf/i.test(file.type) || /\.pdf$/i.test(file.name || "")) throw e;
      return { ok: false, amount: 0, date: "", seller: "", hidden: 0, full: await shrink(file, 1800, 0.85), thumb: await shrink(file, 360, 0.8) };
    }
  }
  async function fileHash(file) {
    var d = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.prototype.map.call(new Uint8Array(d).slice(0, 8), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function attachPic(e, r) {
    e.receipt = "r-" + e.id.toLowerCase();
    A.LOCAL.set(e.receipt + "|f", URL.createObjectURL(r.full));
    A.LOCAL.set(e.receipt + "|t", URL.createObjectURL(r.thumb));
  }

  var css = document.createElement("style");
  css.textContent = "#ghmoney .mr{display:grid;grid-template-columns:96px 72px 130px minmax(90px,1fr) 96px minmax(140px,2fr) 52px 190px;gap:10px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line);font-size:14px;min-width:860px}" +
    "#ghmoney .mr:last-child{border-bottom:0}#ghmoney .mh{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--sunk)}" +
    "#ghmoney .ma{white-space:nowrap;font-size:13px}#ghmoney .mo{color:var(--muted)}#ghmoney .mw{color:#B4541A;font-size:12px}#ghmoney .mr img{width:44px;height:44px;object-fit:cover;border-radius:6px;display:block}" +
    "#ghmoney .mr .acts{display:flex;gap:6px;justify-content:flex-end}#ghmoney .drop{margin:4px 0 8px}#ghmstat{font-size:13px;min-height:1em}";
  document.head.appendChild(css);
  var box = document.createElement("section");
  box.id = "ghmoney";
  box.style.cssText = "max-width:1240px;margin:0 auto 24px;padding:0 max(16px,3vw)";
  var anchor = document.getElementById("ghvp") || document.getElementById("toast");
  document.body.insertBefore(box, anchor);

  var form = { type: "in", stage: "" }, pending = null, busy = false;
  function dogOptions(sel) {
    return '<option value="">' + T.fund + "</option>" + (st().dogs || []).map(function (d) {
      return '<option value="' + esc(d.id) + '"' + (d.id === sel ? " selected" : "") + ">" + esc(dogLabel(d)) + "</option>";
    }).join("");
  }
  function stageOptions(sel) {
    return '<option value="">—</option>' + STAGES.map(function (s) { return '<option value="' + s + '"' + (s === sel ? " selected" : "") + ">" + T.st[s] + "</option>"; }).join("");
  }
  function totals() {
    var i = 0, o = 0;
    ledger().forEach(function (e) { if (e.type === "in") i += +e.amount || 0; else o += +e.amount || 0; });
    return { i: i, o: o };
  }
  function rows() {
    var L = ledger().slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || (b.id > a.id ? 1 : -1); });
    if (!L.length) return '<p class="muted" style="font-size:14px">' + T.none + "</p>";
    var head = "<div class=\"mr mh\"><span>" + T.date + "</span><span></span><span>" + T.amount + "</span><span>" + T.dog + "</span><span>" + T.stage + "</span><span>" + T.who + " / " + T.what + "</span><span></span><span></span></div>";
    return '<div class="tbl" role="table">' + head + L.map(function (e) {
        var d = e.dog ? dogById(e.dog) : null;
        var desc = e.type === "in" ? (e.who ? esc(e.who) : '<span class="muted">' + T.anon + "</span>") : esc(e.what || T.bought);
        if (e.note) desc += '<br><span class="muted" style="font-size:12px">' + esc(e.note) + "</span>";
        if (e.g) desc += '<br><span class="muted" style="font-size:11px">' + esc(e.g) + "</span>";
        var amt = e.noAmount ? '<span class="mw">' + T.noSum + "</span>" : (e.type === "in" ? "+" : "−") + money(+e.amount || 0);
        var pic = e.receipt ? '<a href="' + esc(A.photoURL(e.receipt)) + '" target="_blank" rel="noopener"><img src="' + esc(A.photoURL(e.receipt, true)) + '" alt="' + T.photo + '"></a>' : "";
        return '<div class="mr" role="row" data-lid="' + esc(e.id) + '"><span class="mono">' + esc(e.date || "") + "</span><span>" + (e.type === "in" ? T.inW : T.outW) + '</span><span class="mono ma ' + (e.type === "in" ? "mi" : "mo") + '">' + amt + "</span><span>" + (e.dog ? esc(d ? dogLabel(d) : e.dog) : T.fund) + "</span><span>" + (e.stage ? T.st[e.stage] || "" : "") + "</span><span>" + desc + "</span><span>" + pic + '</span><span class="acts"><button class="btn ghost sm" data-ledit>' + T.edit + '</button><button class="btn ghost sm" data-ldel>' + T.del + "</button></span></div>";
      }).join("") + "</div>";
  }
  function draw() {
    var t = totals(), isIn = form.type === "in", ed = form.editId ? ledger().filter(function (e) { return e.id === form.editId; })[0] : null;
    if (form.editId && !ed) form.editId = null;
    box.innerHTML = '<div class="panel"><h2>' + T.title + '</h2><p class="muted" style="font-size:14px">' + T.note + "</p>" +
      '<p style="display:flex;gap:20px;flex-wrap:wrap;font-size:15px"><span>' + T.totalIn + ": <b>" + money(t.i) + "</b></span><span>" + T.totalOut + ": <b>" + money(t.o) + "</b></span><span>" + T.left + ": <b>" + money(t.i - t.o) + '</b></span><a href="report.html" target="_blank" rel="noopener" style="font-size:14px">' + T.report + "</a></p>" +
      '<div class="drop" id="ghmdz" tabindex="0" role="button">' + T.drop + '<input type="file" id="ghmfiles" accept="image/*,application/pdf,.pdf" multiple></div><p id="ghmstat" class="muted"></p>' +
      '<form id="ghmf" style="display:grid;gap:12px;margin:8px 0 20px">' +
      '<div class="seg" role="radiogroup"><label><input type="radio" name="mt" value="in"' + (isIn ? " checked" : "") + "> " + T.inW + '</label><label><input type="radio" name="mt" value="out"' + (isIn ? "" : " checked") + "> " + T.outW + "</label></div>" +
      '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      '<label class="field"><span>' + T.date + '</span><input name="date" type="date" value="' + esc(form.date || today()) + '" required></label>' +
      '<label class="field"><span>' + T.amount + ", " + esc(st().settings.currency || "₸") + '</span><input name="amount" type="number" min="0" step="any" inputmode="decimal"></label>' +
      '<label class="field"><span>' + T.dog + '</span><select name="dog">' + dogOptions(form.dog) + "</select></label>" +
      '<label class="field"><span>' + T.stage + '</span><select name="stage">' + stageOptions(form.stage) + "</select></label></div>" +
      (isIn
        ? '<label class="field"><span>' + T.who + '</span><input name="who" maxlength="60" autocomplete="off"><small class="muted" style="font-size:12px">' + T.whoNote + "</small></label>"
        : '<label class="field"><span>' + T.what + '</span><input name="what" maxlength="120" placeholder="' + T.bought + '"></label>' +
          '<label class="field"><span>' + T.receipt + '</span><input name="receipt" type="file" accept="image/*,application/pdf,.pdf"><small class="muted" style="font-size:12px">' + T.receiptNote + "</small></label>") +
      '<label class="field"><span>' + T.comment + '</span><input name="note" maxlength="200"></label>' +
      '<div style="display:flex;gap:8px"><button class="btn" type="submit" id="ghmadd">' + (ed ? T.save : T.add) + "</button>" + (ed ? '<button class="btn ghost" type="button" id="ghmcancel">' + T.cancel + "</button>" : "") + "</div></form>" +
      rows() + "</div>";
    var f = document.getElementById("ghmf");
    if (ed) {
      f.elements.amount.value = ed.noAmount ? "" : ed.amount;
      f.elements.note.value = ed.note || "";
      if (isIn) f.elements.who.value = ed.who || ""; else f.elements.what.value = ed.what || "";
      document.getElementById("ghmcancel").onclick = function () { form.editId = null; pending = null; draw(); };
    }
    f.querySelectorAll('input[name=mt]').forEach(function (r) { r.onchange = function () { keep(f); form.type = r.value; draw(); }; });
    f.elements.dog.onchange = function () { var d = dogById(f.elements.dog.value); f.elements.stage.value = d ? (d.status === "adopted" ? "home" : d.stage || "capture") : ""; };
    if (f.elements.receipt) f.elements.receipt.onchange = function () { pickOne(f); };
    f.onsubmit = function (ev) { ev.preventDefault(); submit(f); };
    var dz = document.getElementById("ghmdz"), fi = document.getElementById("ghmfiles");
    dz.onclick = function (e) { if (!busy && e.target !== fi) fi.click(); };
    dz.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dz.click(); } };
    dz.ondragover = function (e) { e.preventDefault(); dz.classList.add("over"); };
    dz.ondragleave = function () { dz.classList.remove("over"); };
    dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove("over"); bulk(e.dataTransfer.files); };
    fi.onchange = function () { bulk(fi.files); };
    box.querySelectorAll("[data-ldel]").forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = T.sure; b.classList.add("danger"); return; }
        var id = b.closest("[data-lid]").dataset.lid, L = ledger();
        for (var i = 0; i < L.length; i++) if (L[i].id === id) { bump(L[i], -1); L.splice(i, 1); break; }
        if (form.editId === id) form.editId = null;
        A.render(); draw();
      };
    });
    box.querySelectorAll("[data-ledit]").forEach(function (b) {
      b.onclick = function () {
        var e = ledger().filter(function (x) { return x.id === b.closest("[data-lid]").dataset.lid; })[0]; if (!e) return;
        form = { type: e.type, date: e.date, dog: e.dog, stage: e.stage, editId: e.id }; pending = null;
        draw(); document.getElementById("ghmf").scrollIntoView({ block: "center", behavior: "smooth" });
      };
    });
  }
  function keep(f) { form.date = f.elements.date.value; form.dog = f.elements.dog.value; form.stage = f.elements.stage.value; }
  function status(t) { var s = document.getElementById("ghmstat"); if (s) s.textContent = t || ""; }

  async function pickOne(f) {
    var file = f.elements.receipt.files[0]; pending = null; if (!file) return;
    var btn = document.getElementById("ghmadd"); btn.disabled = true; status(window.TTSReceipts ? T.readOne : T.loadingOCR);
    try {
      var r = await readReceipt(file); pending = r;
      if (r.ok && !f.elements.amount.value) f.elements.amount.value = r.amount;
      if (r.date) f.elements.date.value = r.date;
      if (r.seller && !f.elements.what.value) f.elements.what.value = r.seller;
      status(r.ok ? T.readDone : T.readFail);
    } catch (e) { status(""); A.toast(T.badImg); f.elements.receipt.value = ""; }
    btn.disabled = false;
  }
  async function submit(f) {
    var raw = String(f.elements.amount.value).replace(",", "."), amt = raw === "" ? 0 : +raw;
    var isOut = form.type === "out";
    if (!(amt > 0) && !(isOut && raw === "")) return A.toast(T.badAmount);
    var old = form.editId ? ledger().filter(function (x) { return x.id === form.editId; })[0] : null;
    var e = old || { id: newId() };
    if (!old && window.__GH) e.g = window.__GH.group();
    if (!old && window.__FUND && window.__FUND()) e.fund = window.__FUND();
    if (old) bump(old, -1);
    e.type = form.type; e.date = f.elements.date.value || today(); e.amount = amt; e.dog = f.elements.dog.value; e.stage = f.elements.stage.value; e.note = f.elements.note.value.trim();
    if (amt > 0) delete e.noAmount; else e.noAmount = true;
    if (isOut) {
      e.what = f.elements.what.value.trim() || T.bought; delete e.who;
      var file = f.elements.receipt.files[0];
      if (file) {
        var btn = document.getElementById("ghmadd"); btn.disabled = true;
        try { attachPic(e, pending || await readReceipt(file)); }
        catch (x) { btn.disabled = false; if (old) bump(old, 1); return A.toast(T.badImg); }
      }
    } else { e.who = f.elements.who.value.trim(); delete e.what; }
    if (!old) ledger().push(e);
    bump(e, 1);
    keep(f); pending = null; form.editId = null;
    A.render(); draw(); status("");
    A.toast(old ? T.saved : T.added);
  }
  async function bulk(list) {
    var files = Array.prototype.filter.call(list || [], function (x) { return /^image\//.test(x.type) || /pdf$/i.test(x.type) || /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(x.name); });
    if (!files.length || busy) return;
    busy = true;
    var f = document.getElementById("ghmf"); if (f) keep(f);
    var dog = form.dog || "", stage = form.stage || "", n = 0, ok = 0, hid = 0, dup = 0;
    var seen = {}; ledger().forEach(function (x) { if (x.fh) seen[x.fh] = 1; });
    status(window.TTSReceipts ? T.reading + "…" : T.loadingOCR);
    for (var i = 0; i < files.length; i++) {
      if (window.TTSReceipts) status(T.reading + " " + (i + 1) + " " + T.of + " " + files.length + "…");
      var r, fh = "";
      try { fh = await fileHash(files[i]); } catch (x) {}
      if (fh && seen[fh]) { dup++; continue; }
      try { r = await readReceipt(files[i]); } catch (x) { continue; }
      var e = { id: newId(), type: "out", date: r.date || today(), amount: r.ok ? r.amount : 0, dog: dog, stage: stage, note: "", what: r.ok && r.seller ? r.seller : T.bought, auto: true, g: window.__GH ? window.__GH.group() : "", fund: window.__FUND ? window.__FUND() : "" };
      if (fh) { e.fh = fh; seen[fh] = 1; }
      if (!r.ok) e.noAmount = true;
      attachPic(e, r);
      ledger().push(e);
      n++; if (r.ok) ok++; hid += r.hidden || 0;
    }
    busy = false;
    var fi = document.getElementById("ghmfiles"); if (fi) fi.value = "";
    A.render(); draw();
    var msg = n || dup ? T.bulkDone(n, ok, hid, dup) : T.badImg;
    status(msg); A.toast(msg);
  }
  function key() { return JSON.stringify(ledger().map(function (e) { return e.id + (e.amount || 0); })) + "|" + (st().dogs || []).map(function (d) { return d.id + d.name; }).join(","); }
  var last = "";
  var _draw = draw;
  draw = function () { var s = document.getElementById("ghmstat"), keepStat = s ? s.textContent : ""; _draw(); last = key(); status(keepStat); };
  draw();
  // Redraw when entries or dogs change underneath us (publish, discard, import), unless someone is busy here.
  setInterval(function () { if (!busy && key() !== last && !box.contains(document.activeElement)) draw(); }, 1000);
})();
