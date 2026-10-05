/* Time to Save — catalog cards show all four stages with money raised, and where the dog is now. */
(function () {
  "use strict";
  var STAGES = ["capture", "vet", "foster", "home"];
  var L = {
    ru: { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом", now: "Сейчас", atHome: "Уже дома", noGoal: "цель не указана" },
    en: { capture: "Rescue", vet: "Vet", foster: "Foster", home: "Home", now: "Now", atHome: "Already home", noGoal: "no goal set" }
  };
  var css = document.createElement("style");
  css.textContent =
    ".card .mini,.card .minitxt{display:none}" +
    ".cst{display:grid;gap:5px;margin-top:8px}" +
    ".cst div{display:grid;grid-template-columns:1fr auto;column-gap:8px;row-gap:3px;align-items:baseline;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}" +
    ".cst span:first-child{display:flex;align-items:center;gap:5px;min-width:0}" +
    ".cst span:first-child::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--sunk);border:1px solid var(--line);flex:none}" +
    ".cst .done span:first-child::before{background:var(--ok);border-color:var(--ok)}" +
    ".cst .now span:first-child::before{background:var(--accent);border-color:var(--accent)}" +
    ".cst .now{color:var(--ink)}.cst .now span:first-child{font-weight:600}" +
    ".cst b{color:var(--ink);font-weight:600}" +
    ".cst i{grid-column:1/-1;height:3px;border-radius:99px;background:var(--sunk);overflow:hidden;display:block}" +
    ".cst i em{display:block;height:100%;background:var(--accent);border-radius:99px}" +
    ".cst .done i em{background:var(--ok)}" +
    ".card .where.cwh{color:var(--ink);font-size:13px;margin-top:6px}.card .where.cwh b{font-weight:600}";
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
      return '<div class="' + cls + '"><span>' + t[s] + "</span><span>" + (g ? "<b>" + money(r, "") + "</b> / " + money(g, cur) : "<b>" + money(r, cur) + "</b>") + '</span><i><em style="width:' + pct + '%"></em></i></div>';
    }).join("");
    var place = [d.location, d.city].filter(Boolean).join(", ");
    var where = d.status === "adopted" ? "<b>" + t.atHome + "</b>" + (place ? " · " + esc(place) : "")
      : t.now + ": <b>" + t[STAGES[now]] + "</b>" + (place ? " · " + esc(place) : "");
    return { stages: rows, where: where };
  }

  function apply() {
    var A = window.__TTS; if (!A || !A.state || !A.state.dogs) return;
    var st = A.state, byId = {};
    st.dogs.forEach(function (d) { byId[d.id] = d; });
    document.querySelectorAll(".card").forEach(function (card) {
      var tid = card.querySelector(".tid"); if (!tid) return;
      var d = byId[tid.textContent.trim()]; if (!d) return;
      var sig = JSON.stringify([d.funds, d.stage, d.status, d.city, d.location, st.settings.goals, st.settings.currency, lang()]);
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
