/* Time to Save — the volunteers' private list of fosters.
   Kept in the Cloudflare Worker (never in the public site data): name, city, contact, price,
   how many dogs fit, status (reliable / needs checking / do not send), date of the last check
   and notes. Visible and editable only for logged-in volunteers. Dogs are linked to a foster in
   "Stages and dates" (stages.js), so the list shows how many dogs each foster has now. */
(function () {
  "use strict";
  var A = window.__TTS;
  if (!A || document.getElementById("ghfost")) return;
  var CFG = window.TTS_CONFIG || {}, INBOX = (CFG.receipts || "").replace(/\/+$/, "");
  var T = {
    title: "Передержки", priv: "Этот список видят только волонтёры, на сайте его нет.",
    off: "Список хранится закрыто в Cloudflare. Он заработает, когда Cloudflare будет подключён.",
    add: "Добавить передержку", none: "Пока никого нет.", load: "Загружаю…", err: "Не получилось сохранить. Попробуйте ещё раз.",
    name: "Имя или название", city: "Город, район", contact: "Контакт (телефон, Telegram)", price: "Цена в сутки, ₸", cap: "Сколько собак может взять",
    status: "Статус", st: { ok: "Надёжная", check: "Проверить", no: "Не отправлять" }, checked: "Последняя проверка (дата)", how: "Как проверяли",
    howOpts: ["Живой видеозвонок", "Приезжали лично", "Только видео", "Отзывы волонтёров", "Не проверяли"],
    official: "Официально (ИП)", notes: "Заметки — только факты с датами", notesPh: "12.10 — видеозвонок: 6 вольеров, вода есть, новые собаки отдельно.",
    save: "Сохранить", del: "Удалить", sure: "Точно удалить?", saved: "Сохранено.", now: "сейчас собак", edit: "Изменить", cancel: "Отмена",
    guide: "Как проверить передержку",
    guideText: [
      "Перед первой собакой — живой видеозвонок с обходом или визит: вольеры, вода, чистота, сколько собак, где держат новых отдельно.",
      "Спросите отзывы у других волонтёров и групп.",
      "Сначала одна собака на пробу, потом больше.",
      "Тревожные признаки: отказ от любого живого видео, оплата за много месяцев вперёд, собак больше, чем мест, собаки «пропадают», нет записей ветеринара.",
      "Если узнали, что условия плохие: заберите собак как можно быстрее, снимите фото и видео с датами, остановите оплату, честно напишите кураторам. При жестоком обращении — заявление в полицию или акимат.",
      "Пишите в заметках только факты с датами, без оценок. Список закрытый: не публикуйте его — за публичные обвинения можно получить иск."
    ]
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tokenHdr() { var t = ""; try { t = localStorage.getItem("tts.ghtoken") || ""; } catch (e) {} return { Authorization: "Bearer " + t }; }
  var list = [], loaded = false, busy = false, editing = null;
  window.__FOST = { list: function () { return loaded ? list : null; }, get: function (id) { return list.filter(function (x) { return x.id === id; })[0]; } };

  var css = document.createElement("style");
  css.textContent =
    "#ghfost .fl{display:flex;flex-direction:column;gap:8px}#ghfost .fi{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--line);border-radius:10px}" +
    "#ghfost .fi.no{border-color:#C0392B;background:rgba(192,57,43,.06)}#ghfost .fi.check{border-color:#D68910}#ghfost .fi small{display:block;color:var(--muted);font-size:12px;white-space:pre-wrap}" +
    "#ghfost .tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:6px}#ghfost .tag.ok{background:var(--ok-soft);color:var(--ok)}#ghfost .tag.check{background:#FDEBD0;color:#9A5B00}#ghfost .tag.no{background:#FADBD8;color:#A93226}" +
    "#ghfost form{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;padding:12px;border:1px solid var(--accent);border-radius:10px}" +
    "#ghfost form .w{grid-column:1/-1}#ghfost input,#ghfost select,#ghfost textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:14px var(--f-body)}" +
    "#ghfost label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}#ghfost details{font-size:14px}#ghfost details li{margin:4px 0}";
  document.head.appendChild(css);
  var box = document.createElement("section"); box.id = "ghfost"; box.style.cssText = "max-width:1240px;margin:0 auto 24px;padding:0 max(16px,3vw)";

  async function load() {
    if (!INBOX) { loaded = true; return draw(); }
    busy = true; draw();
    try { var r = await fetch(INBOX + "/fosters", { headers: tokenHdr() }); var j = await r.json(); list = Array.isArray(j.list) ? j.list : []; loaded = true; }
    catch (e) { console.warn(e); }
    busy = false; draw();
  }
  // Re-read the list right before writing so two volunteers do not overwrite each other.
  async function change(fn) {
    var r = await fetch(INBOX + "/fosters", { headers: tokenHdr() }); var j = await r.json(), cur = Array.isArray(j.list) ? j.list : [];
    cur = fn(cur);
    var w = await fetch(INBOX + "/fosters", { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, tokenHdr()), body: JSON.stringify({ list: cur }) });
    if (!w.ok) throw new Error("http " + w.status);
    list = cur;
  }
  function dogsAt(id) {
    return (A.state.dogs || []).filter(function (d) { var p = d.plan || {}; return d.status !== "adopted" && (p.foster || {}).who === id && (d.stage === "foster" || ((p.foster || {}).start && !(p.foster || {}).done)); });
  }
  function form(x) {
    x = x || { status: "check", how: "" };
    return '<form id="ghff"><label>' + T.name + '<input name="name" maxlength="80" required value="' + esc(x.name || "") + '"></label>' +
      "<label>" + T.city + '<input name="city" maxlength="80" value="' + esc(x.city || "") + '"></label>' +
      "<label>" + T.contact + '<input name="contact" maxlength="120" value="' + esc(x.contact || "") + '"></label>' +
      "<label>" + T.price + '<input name="price" type="number" min="0" step="any" value="' + esc(x.price || "") + '"></label>' +
      "<label>" + T.cap + '<input name="cap" type="number" min="0" step="1" value="' + esc(x.cap || "") + '"></label>' +
      "<label>" + T.status + '<select name="status">' + ["ok", "check", "no"].map(function (k) { return '<option value="' + k + '"' + (x.status === k ? " selected" : "") + ">" + T.st[k] + "</option>"; }).join("") + "</select></label>" +
      "<label>" + T.checked + '<input name="checked" type="date" value="' + esc(x.checked || "") + '"></label>' +
      "<label>" + T.how + '<select name="how"><option value=""></option>' + T.howOpts.map(function (o) { return "<option" + (x.how === o ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></label>" +
      '<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="official" style="width:auto"' + (x.official ? " checked" : "") + "> " + T.official + "</label>" +
      '<label class="w">' + T.notes + '<textarea name="notes" rows="3" maxlength="3000" placeholder="' + esc(T.notesPh) + '">' + esc(x.notes || "") + "</textarea></label>" +
      '<div class="w" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">' + T.save + '</button><button class="btn ghost" type="button" id="ghfc">' + T.cancel + "</button>" +
      (x.id ? '<button class="btn ghost" type="button" id="ghfd" style="margin-left:auto">' + T.del + "</button>" : "") + "</div></form>";
  }
  function draw() {
    var h = '<div class="panel"><h2>' + T.title + '</h2><p class="muted" style="font-size:14px">' + (INBOX ? T.priv : T.off) + "</p>" +
      "<details><summary><b>" + T.guide + "</b></summary><ul>" + T.guideText.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul></details>";
    if (INBOX) {
      if (busy && !loaded) h += '<p class="muted">' + T.load + "</p>";
      else {
        h += editing === "new" ? form() : '<div><button class="btn sm" id="ghfa">' + T.add + "</button></div>";
        h += '<div class="fl">' + (list.length ? list.slice().sort(function (a, b) { return ["no", "check", "ok"].indexOf(a.status) - ["no", "check", "ok"].indexOf(b.status) || String(a.name).localeCompare(b.name); }).map(function (x) {
          if (editing === x.id) return form(x);
          var n = dogsAt(x.id);
          return '<div class="fi ' + esc(x.status) + '"><div><b>' + esc(x.name) + '</b><span class="tag ' + esc(x.status) + '">' + T.st[x.status] + "</span>" + (x.official ? '<span class="tag ok">ИП</span>' : "") +
            "<small>" + esc([x.city, x.contact, x.price ? x.price + " ₸/сут" : "", x.cap ? T.now + ": " + n.length + " / " + x.cap : n.length ? T.now + ": " + n.length : ""].filter(Boolean).join(" · ")) + "</small>" +
            (n.length ? "<small>" + esc(n.map(function (d) { return d.id + (d.name ? " " + d.name : ""); }).join(", ")) + "</small>" : "") +
            (x.checked || x.how ? "<small>" + esc(T.checked + ": " + [x.checked, x.how].filter(Boolean).join(", ")) + "</small>" : "") +
            (x.notes ? "<small>" + esc(x.notes) + "</small>" : "") + '</div><button class="btn ghost sm" data-fe="' + esc(x.id) + '">' + T.edit + "</button></div>";
        }).join("") : '<p class="muted">' + T.none + "</p>") + "</div>";
      }
    }
    box.innerHTML = h + "</div>";
    var a = box.querySelector("#ghfa"); if (a) a.onclick = function () { editing = "new"; draw(); };
    box.querySelectorAll("[data-fe]").forEach(function (b) { b.onclick = function () { editing = b.dataset.fe; draw(); }; });
    var f = box.querySelector("#ghff"); if (!f) return;
    box.querySelector("#ghfc").onclick = function () { editing = null; draw(); };
    var del = box.querySelector("#ghfd");
    if (del) del.onclick = async function () {
      if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = T.sure; return; }
      var id = editing;
      try { await change(function (cur) { return cur.filter(function (x) { return x.id !== id; }); }); editing = null; draw(); A.toast(T.saved); } catch (e) { A.toast(T.err); }
    };
    f.onsubmit = async function (e) {
      e.preventDefault();
      var el = f.elements, id = editing === "new" ? "f" + Date.now().toString(36) : editing;
      var x = { id: id, name: el.name.value.trim(), city: el.city.value.trim(), contact: el.contact.value.trim(), price: el.price.value, cap: el.cap.value, status: el.status.value, checked: el.checked.value, how: el.how.value, official: el.official.checked, notes: el.notes.value.trim(), by: window.__GH ? window.__GH.group() : "", at: new Date().toISOString() };
      try { await change(function (cur) { return cur.filter(function (y) { return y.id !== id; }).concat([x]); }); editing = null; draw(); A.toast(T.saved); } catch (err) { A.toast(T.err); }
    };
  }
  function place() {
    if (!(A.ui && A.ui.admin)) return;
    if (!box.isConnected) {
      var after = document.getElementById("ghinbox");
      if (after) after.parentNode.insertBefore(box, after.nextSibling);
      else { var anchor = document.getElementById("ghmoney") || document.getElementById("toast"); anchor.parentNode.insertBefore(box, anchor); }
      load();
    }
  }
  var sig = "";
  setInterval(function () {
    place();
    if (editing) return;
    var s = JSON.stringify((A.state.dogs || []).map(function (d) { return [d.id, d.stage, d.status, (d.plan || {}).foster]; }));
    if (s !== sig) { sig = s; if (box.isConnected && loaded) draw(); }
  }, 1500);
  place();
})();
