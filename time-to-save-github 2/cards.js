/* Time to Save — catalog cards show all four stages with money raised, and where the dog is now. */
(function () {
  "use strict";
  var STAGES = ["capture", "vet", "foster", "home"];
  var L = {
    ru: { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом", now: "Сейчас", atHome: "Уже дома", noGoal: "цель не указана", held: "В резерве у", until: "до", of: "из" },
    en: { capture: "Rescue", vet: "Vet", foster: "Foster", home: "Home", now: "Now", atHome: "Already home", noGoal: "no goal set", held: "Reserved by", until: "until", of: "of" }
  };
  var css = document.createElement("style");
  css.textContent =
    ".card .mini,.card .minitxt{display:none}" +
    ".cst{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:8px}" +
    ".cst div{display:flex;flex-direction:column;gap:3px;min-width:0;font-size:11px;line-height:1.25;color:var(--muted);font-variant-numeric:tabular-nums}" +
    ".cst i{display:block;height:6px;border-radius:99px;background:var(--sunk);overflow:hidden;margin-bottom:2px}" +
    ".cst i em{display:block;height:100%;border-radius:99px;background:var(--accent);opacity:.35}" +
    ".cst .done i{background:var(--ok)}.cst .done i em{display:none}" +
    ".cst .now i{background:var(--accent)}.cst .now i em{display:none}" +
    ".cst .nm{white-space:nowrap}.card .cb{container-type:inline-size}" +
    "@container (max-width:330px){.cst div{font-size:10px;letter-spacing:-.02em}.cst .of{font-size:9px}}" +
    "@container (max-width:250px){.cst{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:8px}}" +
    ".cst .now .nm{color:var(--accent);font-weight:700}.cst .done .nm{color:var(--ink)}" +
    ".cst b{color:var(--ink);font-weight:600}.cst .of{font-size:10px}" +
    ".card .where.cwh{color:var(--ink);font-size:13px;margin-top:6px}.card .where.cwh b{font-weight:600}" +
    ".card .where.cwh .rsv{display:block;color:var(--muted);font-size:12px;margin-top:2px}";
  document.head.appendChild(css);

  function lang() { var A = window.__TTS; return A && A.ui && A.ui.lang === "en" ? "en" : "ru"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n, cur) { return Math.round(n).toLocaleString(lang() === "ru" ? "ru-RU" : "en-GB").replace(/,/g, " ") + (cur ? " " + cur : ""); }
  function idx(d) { return d.status === "adopted" ? 4 : Math.max(0, STAGES.indexOf(d.stage || "capture")); }

  function block(d, st) {
    var t = L[lang()], cur = st.settings.currency || "₸", goals = st.settings.goals || {}, now = idx(d);
    var rows = STAGES.map(function (s, i) {
      var f = (d.funds || {})[s] || {}, r = +f.raised || 0, g = +f.goal || +goals[s] || 0;
      var cls = i < now ? "done" : i === now ? "now" : "next";
      var pct = g ? Math.min(100, Math.round(r / g * 100)) : (r ? 100 : 0);
      return '<div class="' + cls + '"' + (i === now ? ' aria-current="step"' : "") + '><i><em style="width:' + pct + '%"></em></i><span class="nm">' + t[s] + "</span><span><b>" + money(r, cur) + "</b></span>" + (g ? '<span class="of">' + t.of + " " + money(g, "") + "</span>" : "") + "</div>";
    }).join("");
    var place = [d.location, d.city].filter(Boolean).join(", ");
    var where = d.status === "adopted" ? "<b>" + t.atHome + "</b>" + (place ? " · " + esc(place) : "")
      : t.now + ": <b>" + t[STAGES[now]] + "</b>" + (place ? " · " + esc(place) : "");
    if (d.status === "reserved" && d.reserve && d.reserve.group) {
      var u = String(d.reserve.until || "").split("-");
      where += '<span class="rsv">' + t.held + " «" + esc(d.reserve.group) + "»" + (u.length === 3 ? " " + t.until + " " + u[2] + "." + u[1] : "") + "</span>";
    }
    return { stages: rows, where: where };
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
      var sig = JSON.stringify([d.funds, d.stage, d.status, d.reserve, d.city, d.location, st.settings.goals, st.settings.currency, lang()]);
      if (card.dataset.cst === sig) return;
      card.dataset.cst = sig;
      var b = block(d, st), cb = card.querySelector(".cb");
      var box = cb.querySelector(".cst");
      if (!box) { box = document.createElement("div"); box.className = "cst"; var mt = cb.querySelector(".minitxt"); cb.insertBefore(box, mt ? mt.nextSibling : null); }
      box.innerHTML = b.stages;
      var old = cb.querySelectorAll(".where:not(.cwh)"); for (var i = 0; i < old.length; i++) old[i].style.display = "none";
      var w = cb.querySelector(".cwh");
      if (!w) { w = document.createElement("p"); w.className = "where cwh"; cb.insertBefore(w, box); }
      w.innerHTML = b.where;
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
