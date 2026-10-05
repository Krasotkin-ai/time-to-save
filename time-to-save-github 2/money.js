/* Time to Save — money log for volunteers: donations and expenses with receipts.
   Entries live in data.json (ledger). A donation for a dog adds to that dog's stage total. */
(function () {
  "use strict";
  var A = window.__TTS;
  if (!A || document.getElementById("ghmoney")) return;
  var ru = (navigator.language || "ru").toLowerCase().indexOf("ru") === 0 || localStorage.getItem("tts.lang") === "ru";
  var T = ru ? {
    title: "Деньги", note: "Записывайте каждый донат и каждый расход. Донат для собаки сразу добавляется к «собрано» на её этапе. Всё попадает на сайт после «Опубликовать».",
    inW: "Донат", outW: "Расход", date: "Дата", amount: "Сумма", dog: "Собака", fund: "Общий фонд", stage: "Этап",
    who: "Имя дарителя на сайте", whoNote: "Только если человек согласен. Пусто — на сайте будет «Аноним». Телефоны и номера карт не пишите.",
    what: "На что потрачено", receipt: "Фото чека", receiptNote: "Скриншот или фото. Перед загрузкой закройте номера карт и телефоны.",
    comment: "Комментарий", add: "Добавить", del: "Удалить", sure: "Точно удалить?", anon: "Аноним",
    totalIn: "Пришло", totalOut: "Потрачено", left: "Остаток", none: "Записей пока нет.", report: "Открыть отчёт на сайте",
    badAmount: "Укажите сумму больше нуля.", badWhat: "Напишите, на что потрачено.", badImg: "Не получилось открыть фото. Пришлите скриншот в JPG или PNG.",
    added: "Добавлено. Нажмите «Опубликовать на сайте», чтобы сохранить.", photo: "чек",
    st: { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом" }
  } : {
    title: "Money", note: "Log every donation and every expense. A donation for a dog is added to “raised” for its stage right away. Everything goes live after Publish.",
    inW: "Donation", outW: "Expense", date: "Date", amount: "Amount", dog: "Dog", fund: "General fund", stage: "Stage",
    who: "Donor name on the site", whoNote: "Only with the donor’s consent. Leave empty to show “Anonymous”. No phone or card numbers.",
    what: "Spent on", receipt: "Receipt photo", receiptNote: "A screenshot or photo. Cover card and phone numbers first.",
    comment: "Comment", add: "Add", del: "Delete", sure: "Delete for sure?", anon: "Anonymous",
    totalIn: "Received", totalOut: "Spent", left: "Balance", none: "No entries yet.", report: "Open the public report",
    badAmount: "Enter an amount above zero.", badWhat: "Say what the money was spent on.", badImg: "Could not open the photo. Use a JPG or PNG screenshot.",
    added: "Added. Press “Publish to the site” to save it.", photo: "receipt",
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
  function bump(e, sign) {
    if (e.type !== "in" || !e.dog || !e.stage) return;
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

  var css = document.createElement("style");
  css.textContent = "#ghmoney .mr{display:grid;grid-template-columns:96px 72px 120px minmax(90px,1fr) 96px minmax(140px,2fr) 52px 96px;gap:10px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line);font-size:14px;min-width:820px}" +
    "#ghmoney .mr:last-child{border-bottom:0}#ghmoney .mh{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--sunk)}" +
    "#ghmoney .ma{white-space:nowrap;font-size:13px}#ghmoney .mo{color:var(--muted)}#ghmoney .mr img{width:44px;height:44px;object-fit:cover;border-radius:6px;display:block}";
  document.head.appendChild(css);
  var box = document.createElement("section");
  box.id = "ghmoney";
  box.style.cssText = "max-width:1240px;margin:0 auto 24px;padding:0 max(16px,3vw)";
  var anchor = document.getElementById("ghvp") || document.getElementById("toast");
  document.body.insertBefore(box, anchor);

  var form = { type: "in", stage: "" };
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
        var desc = e.type === "in" ? (e.who ? esc(e.who) : '<span class="muted">' + T.anon + "</span>") : esc(e.what || "");
        if (e.note) desc += '<br><span class="muted" style="font-size:12px">' + esc(e.note) + "</span>";
        var pic = e.receipt ? '<a href="' + esc(A.photoURL(e.receipt)) + '" target="_blank" rel="noopener"><img src="' + esc(A.photoURL(e.receipt, true)) + '" alt="' + T.photo + '"></a>' : "";
        return '<div class="mr" role="row" data-lid="' + esc(e.id) + '"><span class="mono">' + esc(e.date || "") + "</span><span>" + (e.type === "in" ? T.inW : T.outW) + '</span><span class="mono ma ' + (e.type === "in" ? "mi" : "mo") + '">' + (e.type === "in" ? "+" : "−") + money(+e.amount || 0) + "</span><span>" + (e.dog ? esc(d ? dogLabel(d) : e.dog) : T.fund) + "</span><span>" + (e.stage ? T.st[e.stage] || "" : "") + "</span><span>" + desc + "</span><span>" + pic + '</span><span><button class="btn ghost sm" data-ldel>' + T.del + "</button></span></div>";
      }).join("") + "</div>";
  }
  function draw() {
    var t = totals(), isIn = form.type === "in";
    box.innerHTML = '<div class="panel"><h2>' + T.title + '</h2><p class="muted" style="font-size:14px">' + T.note + "</p>" +
      '<p style="display:flex;gap:20px;flex-wrap:wrap;font-size:15px"><span>' + T.totalIn + ": <b>" + money(t.i) + "</b></span><span>" + T.totalOut + ": <b>" + money(t.o) + "</b></span><span>" + T.left + ": <b>" + money(t.i - t.o) + '</b></span><a href="report.html" target="_blank" rel="noopener" style="font-size:14px">' + T.report + "</a></p>" +
      '<form id="ghmf" style="display:grid;gap:12px;margin:16px 0 20px">' +
      '<div class="seg" role="radiogroup"><label><input type="radio" name="mt" value="in"' + (isIn ? " checked" : "") + "> " + T.inW + '</label><label><input type="radio" name="mt" value="out"' + (isIn ? "" : " checked") + "> " + T.outW + "</label></div>" +
      '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      '<label class="field"><span>' + T.date + '</span><input name="date" type="date" value="' + (form.date || today()) + '" required></label>' +
      '<label class="field"><span>' + T.amount + ", " + esc(st().settings.currency || "₸") + '</span><input name="amount" type="number" min="0" step="any" inputmode="decimal" required></label>' +
      '<label class="field"><span>' + T.dog + '</span><select name="dog">' + dogOptions(form.dog) + "</select></label>" +
      '<label class="field"><span>' + T.stage + '</span><select name="stage">' + stageOptions(form.stage) + "</select></label></div>" +
      (isIn
        ? '<label class="field"><span>' + T.who + '</span><input name="who" maxlength="60" autocomplete="off"><small class="muted" style="font-size:12px">' + T.whoNote + "</small></label>"
        : '<label class="field"><span>' + T.what + '</span><input name="what" maxlength="120" required></label>' +
          '<label class="field"><span>' + T.receipt + '</span><input name="receipt" type="file" accept="image/*"><small class="muted" style="font-size:12px">' + T.receiptNote + "</small></label>") +
      '<label class="field"><span>' + T.comment + '</span><input name="note" maxlength="200"></label>' +
      '<div><button class="btn" type="submit" id="ghmadd">' + T.add + "</button></div></form>" +
      rows() + "</div>";
    var f = document.getElementById("ghmf");
    f.querySelectorAll('input[name=mt]').forEach(function (r) { r.onchange = function () { keep(f); form.type = r.value; draw(); }; });
    f.elements.dog.onchange = function () { var d = dogById(f.elements.dog.value); f.elements.stage.value = d ? (d.status === "adopted" ? "home" : d.stage || "capture") : ""; };
    f.onsubmit = function (ev) { ev.preventDefault(); add(f); };
    box.querySelectorAll("[data-ldel]").forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = T.sure; b.classList.add("danger"); return; }
        var id = b.closest("[data-lid]").dataset.lid, L = ledger();
        for (var i = 0; i < L.length; i++) if (L[i].id === id) { bump(L[i], -1); L.splice(i, 1); break; }
        A.render(); draw();
      };
    });
  }
  function keep(f) { form.date = f.elements.date.value; form.dog = f.elements.dog.value; form.stage = f.elements.stage.value; }
  async function add(f) {
    var amt = +String(f.elements.amount.value).replace(",", ".");
    if (!(amt > 0)) return A.toast(T.badAmount);
    var e = { id: "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: form.type, date: f.elements.date.value || today(), amount: amt,
      dog: f.elements.dog.value, stage: f.elements.stage.value, note: f.elements.note.value.trim() };
    if (e.type === "in") e.who = f.elements.who.value.trim();
    else {
      e.what = f.elements.what.value.trim();
      if (!e.what) return A.toast(T.badWhat);
      var file = f.elements.receipt.files[0];
      if (file) {
        var btn = document.getElementById("ghmadd"); btn.disabled = true;
        try {
          var full = await shrink(file, 1800, 0.85), thumb = await shrink(file, 360, 0.8);
          e.receipt = "r-" + e.id.toLowerCase();
          A.LOCAL.set(e.receipt + "|f", URL.createObjectURL(full));
          A.LOCAL.set(e.receipt + "|t", URL.createObjectURL(thumb));
        } catch (x) { btn.disabled = false; return A.toast(T.badImg); }
      }
    }
    ledger().push(e);
    bump(e, 1);
    keep(f);
    A.render(); draw();
    A.toast(T.added);
  }
  function key() { return JSON.stringify(ledger().map(function (e) { return e.id; })) + "|" + (st().dogs || []).map(function (d) { return d.id + d.name; }).join(","); }
  var last = "";
  var _draw = draw;
  draw = function () { _draw(); last = key(); };
  draw();
  // Redraw when entries or dogs change underneath us (publish, discard, import), unless someone is typing here.
  setInterval(function () { if (key() !== last && !box.contains(document.activeElement)) draw(); }, 1000);
})();
