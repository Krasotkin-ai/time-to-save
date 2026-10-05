/* Time to Save — volunteer groups: who is signed in, reservations with an end date,
   "only my group's dogs" filter and the change journal. Loaded by gh-admin.js. */
(function () {
  "use strict";
  var A = window.__TTS, G = window.__GH;
  if (!A || !G || document.getElementById("ghgbar")) return;
  var ru = (navigator.language || "ru").toLowerCase().indexOf("ru") === 0 || localStorage.getItem("tts.lang") === "ru";
  var DAYS = 7;
  var T = ru ? {
    you: "Вы вошли как", mine: "Только собаки моей группы", take: "Забронировать на " + DAYS + " дней", extend: "Продлить", drop: "Снять бронь",
    held: "Бронь", until: "до", busy: "Эта собака уже в брони у группы", taken: "Забронировано до", extended: "Бронь продлена до", dropped: "Бронь снята.",
    hTitle: "История изменений", hNote: "Кто, когда и что поменял. Записи появляются после «Опубликовать на сайте».", hFind: "Найти: ID собаки или группа", hNone: "Пока пусто.", hMore: "Показать ещё",
    noGroup: "без группы", pub: "Не забудьте опубликовать."
  } : {
    you: "Signed in as", mine: "Only my group's dogs", take: "Reserve for " + DAYS + " days", extend: "Extend", drop: "Release",
    held: "Reserved", until: "until", busy: "This dog is already reserved by", taken: "Reserved until", extended: "Reservation extended to", dropped: "Reservation released.",
    hTitle: "Change history", hNote: "Who changed what and when. Entries appear after Publish.", hFind: "Find: dog ID or group", hNone: "Nothing yet.", hMore: "Show more",
    noGroup: "no group", pub: "Remember to publish."
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function plus(days) { var d = new Date(); d.setDate(d.getDate() + days); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function dm(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? p[2] + "." + p[1] : iso; }
  function me() { return G.group(); }
  function dog(id) { return (A.state.dogs || []).filter(function (d) { return d.id === id; })[0]; }
  function active(d) { return d.reserve && d.reserve.group && (!d.reserve.until || d.reserve.until >= today()); }

  var css = document.createElement("style");
  css.textContent = "#ghgbar{max-width:1240px;margin:0 auto;padding:10px max(16px,3vw) 0;display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:14px;padding-right:110px}" +
    "#ghgbar label{display:flex;gap:6px;align-items:center;cursor:pointer}" +
    ".grs{font-size:11px;margin-top:4px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}.grs .who{color:var(--muted)}.grs .who b{color:var(--ink)}" +
    ".grs .row{display:flex;gap:4px;flex-wrap:wrap}.grs .btn{padding:3px 8px;font-size:11px}" +
    "#ghhist .hl{display:grid;grid-template-columns:110px 70px minmax(110px,160px) 1fr;gap:10px;padding:7px 10px;border-bottom:1px solid var(--line);font-size:13px}" +
    "#ghhist .hl:last-child{border-bottom:0}#ghhist .hl span:first-child{color:var(--muted);font-family:var(--f-mono);font-size:12px}" +
    "@media (max-width:640px){#ghhist .hl{grid-template-columns:1fr 1fr}#ghhist .hl span:last-child{grid-column:1/-1}}";
  document.head.appendChild(css);

  /* who is signed in + "only my group" */
  var onlyMine = false;
  try { onlyMine = sessionStorage.getItem("tts.mine") === "1"; } catch (e) {}
  var bar = document.createElement("div");
  bar.id = "ghgbar";
  bar.innerHTML = "<span>" + T.you + ": <b>" + esc(me()) + '</b></span><label><input type="checkbox" id="ghmine"' + (onlyMine ? " checked" : "") + "> " + T.mine + "</label>";
  var app = document.getElementById("app");
  app.parentNode.insertBefore(bar, app);
  document.getElementById("ghmine").onchange = function (e) {
    onlyMine = e.target.checked;
    try { sessionStorage.setItem("tts.mine", onlyMine ? "1" : "0"); } catch (x) {}
    decorate();
  };

  /* reservation controls in the admin table */
  function controls(d) {
    var g = me(), html = "";
    if (active(d)) {
      var mine = d.reserve.group === g;
      html = '<span class="who">' + T.held + ": <b>" + esc(d.reserve.group) + "</b>" + (d.reserve.until ? " " + T.until + " " + dm(d.reserve.until) : "") + "</span>";
      if (mine || G.owner()) html += '<span class="row"><button class="btn ghost sm" data-gr="extend">' + T.extend + '</button><button class="btn ghost sm" data-gr="drop">' + T.drop + "</button></span>";
    } else if (d.status !== "adopted") {
      html = '<span class="row"><button class="btn ghost sm" data-gr="take">' + T.take + "</button></span>";
    }
    return html;
  }
  function decorate() {
    document.querySelectorAll("tbody tr[data-id]").forEach(function (tr) {
      var d = dog(tr.dataset.id); if (!d) return;
      var hide = onlyMine && !(d.reserve && d.reserve.group === me());
      tr.style.display = hide ? "none" : "";
      var sel = tr.querySelector("[data-act=status]"); if (!sel) return;
      var sig = JSON.stringify([d.reserve, d.status, me()]);
      var box = tr.querySelector(".grs");
      if (box && box.dataset.sig === sig) return;
      if (!box) { box = document.createElement("div"); box.className = "grs"; sel.parentNode.appendChild(box); }
      box.dataset.sig = sig;
      box.innerHTML = controls(d);
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-gr]"); if (!b) return;
    var tr = b.closest("tr[data-id]"), d = tr && dog(tr.dataset.id); if (!d) return;
    e.preventDefault(); e.stopPropagation();
    var act = b.dataset.gr, g = me();
    if (act === "take") {
      if (active(d) && d.reserve.group !== g) return A.toast(T.busy + " «" + d.reserve.group + "».");
      d.reserve = { group: g, until: plus(DAYS), at: new Date().toISOString() }; d.status = "reserved";
      A.toast(T.taken + " " + dm(d.reserve.until) + ". " + T.pub);
    } else if (act === "extend") {
      d.reserve = { group: d.reserve.group, until: plus(DAYS), at: d.reserve.at || new Date().toISOString() };
      A.toast(T.extended + " " + dm(d.reserve.until) + ". " + T.pub);
    } else if (act === "drop") {
      delete d.reserve; if (d.status === "reserved") d.status = "available";
      A.toast(T.dropped + " " + T.pub);
    }
    A.render();
  }, true);
  // The app's own status menu: "reserved" means reserved by my group; anything else ends the reservation.
  document.addEventListener("change", function (e) {
    var sel = e.target; if (!sel.matches || !sel.matches("tbody [data-act=status]")) return;
    var tr = sel.closest("tr[data-id]"), d = tr && dog(tr.dataset.id); if (!d) return;
    setTimeout(function () {
      if (d.status === "reserved") {
        if (!active(d)) d.reserve = { group: me(), until: plus(DAYS), at: new Date().toISOString() };
      } else if (d.reserve) delete d.reserve;
      decorate();
    }, 0);
  }, true);

  /* change history */
  var hist = document.createElement("section");
  hist.id = "ghhist";
  hist.style.cssText = "max-width:1240px;margin:0 auto 24px;padding:0 max(16px,3vw)";
  var anchor = document.getElementById("ghvp") || document.getElementById("toast");
  document.body.insertBefore(hist, anchor);
  var shown = 50, query = "";
  function drawHist() {
    var q = query.trim().toLowerCase();
    var L = (A.state.log || []).slice().reverse().filter(function (e) { return !q || (e.dog || "").toLowerCase().indexOf(q) >= 0 || (e.g || "").toLowerCase().indexOf(q) >= 0; });
    var rows = L.slice(0, shown).map(function (e) {
      var t = new Date(e.t), when = isNaN(t) ? "" : t.toLocaleDateString(ru ? "ru-RU" : "en-GB", { day: "2-digit", month: "2-digit" }) + " " + t.toLocaleTimeString(ru ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit" });
      return '<div class="hl"><span>' + esc(when) + '</span><span class="mono">' + esc(e.dog || "—") + "</span><span><b>" + esc(e.g || T.noGroup) + "</b></span><span>" + esc(e.d) + "</span></div>";
    }).join("");
    hist.innerHTML = '<div class="panel"><h2>' + T.hTitle + '</h2><p class="muted" style="font-size:14px">' + T.hNote + "</p>" +
      '<input id="ghhq" type="search" placeholder="' + T.hFind + '" value="' + esc(query) + '" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);max-width:320px">' +
      (rows ? '<div class="tbl">' + rows + "</div>" : '<p class="muted" style="font-size:14px">' + T.hNone + "</p>") +
      (L.length > shown ? '<div><button class="btn ghost sm" id="ghhm">' + T.hMore + "</button></div>" : "") + "</div>";
    var qi = document.getElementById("ghhq");
    qi.oninput = function () { query = qi.value; var pos = qi.selectionStart; drawHist(); var n = document.getElementById("ghhq"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} };
    var m = document.getElementById("ghhm"); if (m) m.onclick = function () { shown += 100; drawHist(); };
  }
  drawHist();

  var queued = false, lastLog = -1;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; decorate(); }); }
  new MutationObserver(soon).observe(app, { childList: true, subtree: true });
  setInterval(function () {
    decorate();
    var n = (A.state.log || []).length;
    if (n !== lastLog) { lastLog = n; if (!hist.contains(document.activeElement)) drawHist(); }
  }, 1000);
  decorate();
})();
