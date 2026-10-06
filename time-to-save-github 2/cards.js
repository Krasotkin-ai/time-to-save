/* Time to Save — catalog cards show the dog's way home: four stages with icons,
   the current one lit up, money raised for each stage, and where the dog is now. */
(function () {
  "use strict";
  var STAGES = ["capture", "vet", "foster", "home"];
  var L = {
    ru: { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом", now: "Сейчас", atHome: "Уже дома", held: "В резерве у", until: "до",
      lab: { vet: "Вете&shy;ринар", foster: "Пере&shy;держка" }, raised: "собрано", of: "из", need: "Не хватает", onStage: "на этап", noGoal: "Собрано на этом этапе", done: "Этап пройден", homeDone: "Нашла свой дом", ledBy: "Спасает группа «%s» из общего фонда", spent: "Потрачено на собаку" },
    en: { capture: "Rescue", vet: "Vet", foster: "Foster", home: "Home", now: "Now", atHome: "Already home", held: "Reserved by", until: "until",
      lab: {}, raised: "raised", of: "of", need: "Still needed", onStage: "for", noGoal: "Raised for this stage", done: "Stage done", homeDone: "Found a home", ledBy: "Rescued by “%s” from the common fund", spent: "Spent on this dog" }
  };
  var ICON = {
    capture: '<path d="M8 13.5c-2 0-3.5-1.2-3.5-2.7 0-1.3 1.6-3.3 3.5-3.3s3.5 2 3.5 3.3c0 1.5-1.5 2.7-3.5 2.7z"/><circle cx="3.6" cy="6.6" r="1.4"/><circle cx="6" cy="3.6" r="1.4"/><circle cx="10" cy="3.6" r="1.4"/><circle cx="12.4" cy="6.6" r="1.4"/>',
    vet: '<path d="M6.3 2.5h3.4v3.8h3.8v3.4H9.7v3.8H6.3V9.7H2.5V6.3h3.8z"/>',
    foster: '<path d="M8 13.6S2.2 10.1 2.2 6.2C2.2 4.3 3.6 3 5.3 3c1.1 0 2.1.6 2.7 1.5C8.6 3.6 9.6 3 10.7 3c1.7 0 3.1 1.3 3.1 3.2 0 3.9-5.8 7.4-5.8 7.4z"/>',
    home: '<path d="M8 2.2 1.8 7.4h1.9v6.2h3.2V10h2.2v3.6h3.2V7.4h1.9z"/>',
    check: '<path d="M3.2 8.4 6.5 11.6 12.8 4.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  var css = document.createElement("style");
  css.textContent =
    ".card .mini,.card .minitxt{display:none}.card .cb{container-type:inline-size}" +
    ".card{--c-capture:217 116 28;--c-vet:210 63 91;--c-foster:116 82 209;--c-home:43 143 85;--c-ink:255 255 255}" +
    "@media (prefers-color-scheme: dark){:root:not([data-theme=light]) .card{--c-capture:240 162 78;--c-vet:242 122 144;--c-foster:165 140 240;--c-home:93 196 140;--c-ink:13 22 27}}" +
    ":root[data-theme=dark] .card{--c-capture:240 162 78;--c-vet:242 122 144;--c-foster:165 140 240;--c-home:93 196 140;--c-ink:13 22 27}" +
    ".way{margin-top:10px}" +
    ".way ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));position:relative}" +
    ".way li{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;position:relative;text-align:center}" +
    ".way li::before{content:'';position:absolute;top:13px;right:50%;width:100%;height:3px;background:var(--sunk);z-index:0}" +
    ".way li:first-child::before{display:none}" +
    ".way li.done::before,.way li.now::before{background:rgb(var(--sc))}" +
    ".way .dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;position:relative;z-index:1;background:var(--surface);border:2px solid var(--line);color:var(--muted)}" +
    ".way .dot svg{width:15px;height:15px;fill:currentColor}" +
    ".way li.done .dot{background:rgb(var(--sc));border-color:rgb(var(--sc));color:rgb(var(--c-ink))}" +
    ".way li.now .dot{background:rgb(var(--sc));border-color:rgb(var(--sc));color:rgb(var(--c-ink));transform:scale(1.18);box-shadow:0 0 0 4px rgb(var(--sc)/.22);animation:waypulse 2.2s ease-out infinite}" +
    "@keyframes waypulse{0%{box-shadow:0 0 0 0 rgb(var(--sc)/.55)}70%{box-shadow:0 0 0 10px rgb(var(--sc)/0)}100%{box-shadow:0 0 0 0 rgb(var(--sc)/0)}}" +
    "@media (prefers-reduced-motion:reduce){.way li.now .dot{animation:none}}" +
    ".way .nm{font-size:11px;line-height:1.15;color:var(--muted);hyphens:manual;overflow-wrap:normal;margin-top:3px;max-width:100%}" +
    ".way li.now .nm{color:rgb(var(--sc));font-weight:700}.way li.done .nm{color:var(--ink)}" +
    ".way .am{font-size:10.5px;color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}" +
    ".way li.next .am{color:var(--muted);font-weight:500}" +
    ".way .box{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgb(var(--sc)/.12);border:1px solid rgb(var(--sc)/.35)}" +
    ".way .box .hd{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink)}" +
    ".way .box .hd b{color:rgb(var(--sc));font-weight:700}" +
    ".way .box .hd .pin{width:8px;height:8px;border-radius:50%;background:rgb(var(--sc));flex:none}" +
    ".way .box .pl{font-size:12px;color:var(--muted);margin-top:2px}" +
    ".way .wbar{height:8px;border-radius:99px;background:rgb(var(--sc)/.18);margin-top:8px;overflow:hidden}" +
    ".way .wbar i{display:block;height:100%;border-radius:99px;background:rgb(var(--sc));transition:width .6s ease}" +
    ".way .nums{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}" +
    ".way .nums b{color:var(--ink);font-weight:700}.way .need{color:rgb(var(--sc));font-weight:600}" +
    ".way .rsv{font-size:12px;color:var(--muted);margin-top:6px}" +
    "@container (max-width:300px){.way .nm{font-size:9.5px;letter-spacing:-.02em}.way .am{font-size:9.5px}.way .dot{width:24px;height:24px}.way li::before{top:11px}.way .dot svg{width:13px;height:13px}}" +
    ".card .where.cwh{display:none}";
  document.head.appendChild(css);

  function lang() { var A = window.__TTS; return A && A.ui && A.ui.lang === "en" ? "en" : "ru"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n, cur) { return Math.round(n).toLocaleString(lang() === "ru" ? "ru-RU" : "en-GB").replace(/,/g, " ") + (cur ? " " + cur : ""); }
  function idx(d) { return d.status === "adopted" ? 4 : Math.max(0, STAGES.indexOf(d.stage || "capture")); }
  function svg(k) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + ICON[k] + "</svg>"; }

  function block(d, st) {
    var t = L[lang()], cur = st.settings.currency || "₸", goals = st.settings.goals || {}, now = idx(d), adopted = now === 4;
    var focus = adopted ? "home" : STAGES[now];
    function fund(s) { var f = (d.funds || {})[s] || {}; return { r: +f.raised || 0, g: +f.goal || +goals[s] || 0 }; }
    var steps = STAGES.map(function (s, i) {
      var cls = i < now ? "done" : i === now ? "now" : "next", f = fund(s);
      return '<li class="' + cls + '" style="--sc:var(--c-' + s + ')"' + (i === now ? ' aria-current="step"' : "") + '><span class="dot">' + svg(i < now ? "check" : s) + '</span><span class="nm">' + (t.lab[s] || t[s]) + '</span><span class="am">' + money(f.r, cur) + "</span></li>";
    }).join("");
    var place = [d.location, d.city].filter(Boolean).join(", "), f = fund(focus), box;
    var G = st.settings.groups || {}, fundG = d.lead && G[d.lead] && G[d.lead].mode === "fund" ? d.lead : "";
    if (fundG && !adopted) {
      var spent = 0; (st.ledger || []).forEach(function (e) { if (e.dog === d.id && e.type === "out") spent += +e.amount || 0; });
      box = '<div class="hd"><span class="pin"></span>' + t.now + ": <b>" + t[focus] + "</b></div>" + (place ? '<div class="pl">' + esc(place) + "</div>" : "") +
        '<div class="nums"><span>' + t.ledBy.replace("%s", esc(fundG)) + "</span></div>" + (spent ? '<div class="nums"><span>' + t.spent + ": <b>" + money(spent, cur) + "</b></span></div>" : "");
    } else if (adopted) {
      box = '<div class="hd"><span class="pin"></span><b>' + t.homeDone + "</b></div>" + (place ? '<div class="pl">' + esc(place) + "</div>" : "");
    } else {
      var pct = f.g ? Math.min(100, Math.round(f.r / f.g * 100)) : 0;
      box = '<div class="hd"><span class="pin"></span>' + t.now + ": <b>" + t[focus] + "</b></div>" + (place ? '<div class="pl">' + esc(place) + "</div>" : "") +
        (f.g
          ? '<div class="wbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
            '<div class="nums"><span><b>' + money(f.r, "") + "</b> " + t.of + " " + money(f.g, cur) + "</span><span>" + pct + "%</span></div>" +
            (f.r < f.g ? '<div class="nums"><span class="need">' + t.need + " " + money(f.g - f.r, cur) + "</span></div>" : '<div class="nums"><span class="need">' + t.done + " ✓</span></div>")
          : '<div class="nums"><span>' + t.noGoal + ": <b>" + money(f.r, cur) + "</b></span></div>");
    }
    if (d.status === "reserved" && d.reserve && d.reserve.group) {
      var u = String(d.reserve.until || "").split("-");
      box += '<div class="rsv">' + t.held + " «" + esc(d.reserve.group) + "»" + (u.length === 3 ? " " + t.until + " " + u[2] + "." + u[1] : "") + "</div>";
    }
    return '<ol>' + steps + '</ol><div class="box" style="--sc:var(--c-' + focus + ')">' + box + "</div>";
  }

  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  // A reservation past its date no longer holds the dog.
  function expire(A) {
    if (A.ui && A.ui.admin) return;
    var t = today(), changed = false;
    A.state.dogs.forEach(function (d) {
      if (d.reserve && d.reserve.until && d.reserve.until < t) { delete d.reserve; if (d.status === "reserved") d.status = "available"; changed = true; }
    });
    if (changed) { A.resetCards(); A.render(); }
  }
  function apply() {
    var A = window.__TTS; if (!A || !A.state || !A.state.dogs) return;
    expire(A);
    var st = A.state, byId = {};
    st.dogs.forEach(function (d) { byId[d.id] = d; });
    document.querySelectorAll(".card").forEach(function (card) {
      var tid = card.querySelector(".tid"); if (!tid) return;
      var d = byId[tid.textContent.trim()]; if (!d) return;
      var sig = JSON.stringify([d.funds, d.stage, d.status, d.reserve, d.city, d.location, d.lead, (st.settings.groups || {})[d.lead], st.settings.goals, st.settings.currency, lang(), (st.ledger || []).length]);
      if (card.dataset.way === sig) return;
      card.dataset.way = sig;
      var cb = card.querySelector(".cb"), box = cb.querySelector(".way");
      if (!box) { box = document.createElement("div"); box.className = "way"; var mt = cb.querySelector(".minitxt"); cb.insertBefore(box, mt ? mt.nextSibling : null); }
      box.innerHTML = block(d, st);
      var old = cb.querySelectorAll(".where"); for (var i = 0; i < old.length; i++) old[i].style.display = "none";
    });
  }
  var queued = false;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; apply(); }); }
  function start() {
    var app = document.getElementById("app"); if (!app) return;
    new MutationObserver(soon).observe(app, { childList: true, subtree: true });
    setInterval(apply, 1500); // picks up data edits that re-use the same card elements
    apply();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
