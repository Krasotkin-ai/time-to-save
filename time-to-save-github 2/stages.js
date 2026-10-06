/* Time to Save — dates, estimated costs and "done" marks for each stage of a dog's way home.
   Volunteers fill them in the admin (a date or free text like "примерно 15 октября");
   visitors see them on the card and the dog's page. The estimated cost of a stage is the
   stage goal, so "still needed" and "fully paid" follow it. */
(function () {
  "use strict";
  var A = window.__TTS;
  if (!A || document.getElementById("stgdlg")) return;
  var S = ["capture", "vet", "foster", "home"];
  var L = {
    ru: {
      st: { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом" },
      a: { capture: "Забрали из отлова", vet: "Привезли к ветеринару", foster: "На передержке с", home: "Переезд домой" },
      b: { capture: "", vet: "Выход от ветеринара", foster: "До (примерно)", home: "" },
      cost: "Нужно примерно", raised: "собрано", done: "Готово", ph: "дата или «примерно 15 октября»",
      btn: "Этапы и даты", title: "Этапы и даты", note: "Дату можно выбрать в календаре или написать словами, если она пока неизвестна. Сумму можно менять, когда цена станет понятнее. «Готово» отмечает пройденный этап.",
      save: "Сохранить", saved: "Сохранено. Не забудьте опубликовать.", way: "Путь собаки", total: "Весь путь", paid: "Весь путь оплачен", left: "осталось", since: "с", till: "до", exit: "выход"
    },
    en: {
      st: { capture: "Rescue", vet: "Vet", foster: "Foster", home: "Home" },
      a: { capture: "Taken from the center", vet: "Arrived at the vet", foster: "In foster since", home: "Moved home" },
      b: { capture: "", vet: "Leaves the vet", foster: "Until (about)", home: "" },
      cost: "Needed, about", raised: "raised", done: "Done", ph: "date or “around 15 October”",
      btn: "Stages and dates", title: "Stages and dates", note: "Pick a date in the calendar or write it in words if it is not known yet. Change the amount when the price becomes clearer. “Done” marks a finished stage.",
      save: "Save", saved: "Saved. Remember to publish.", way: "The dog's way", total: "Whole way", paid: "Whole way paid", left: "left", since: "since", till: "until", exit: "leaves"
    }
  };
  function lang() { return A.ui && A.ui.lang === "en" ? "en" : "ru"; }
  function T() { return L[lang()]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cur() { return A.state.settings.currency || "₸"; }
  function money(n) { return Math.round(+n || 0).toLocaleString(lang() === "ru" ? "ru-RU" : "en-GB").replace(/,/g, " ") + " " + cur(); }
  function dog(id) { return (A.state.dogs || []).filter(function (d) { return d.id === id; })[0]; }
  function plan(d) { return (d.plan && d.plan[0] === undefined) ? d.plan : {}; }
  function fund(d, s) { var f = (d.funds || {})[s] || {}, g = A.state.settings.goals || {}; return { r: +f.raised || 0, g: +f.goal || +g[s] || 0 }; }
  function whole(d) { var r = 0, g = 0; S.forEach(function (s) { var x = fund(d, s); r += x.r; g += x.g; }); return { r: r, g: g, paid: g > 0 && r >= g }; }
  // "2026-10-03" -> "03.10"; free text stays as written.
  function show(v) { var m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + "." + m[2] + (m[1] !== String(new Date().getFullYear()) ? "." + m[1] : "") : String(v || ""); }
  window.__STAGES = { whole: whole, plan: plan, show: show };

  var css = document.createElement("style");
  css.textContent =
    "#stgdlg{width:min(640px,calc(100vw - 24px))}#stgdlg .in{padding:22px 20px 20px;display:flex;flex-direction:column;gap:12px}#stgdlg h2{font-size:20px;padding-right:40px}" +
    "#stgdlg .note{font-size:13px;color:var(--muted);margin:0}#stgdlg .sg{border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid;gap:8px}" +
    "#stgdlg .sg.on{border-color:var(--ok);background:var(--ok-soft)}#stgdlg .sh{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:700}" +
    "#stgdlg .rw{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center}#stgdlg label.f{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}" +
    "#stgdlg input[type=text],#stgdlg input[type=number]{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:14px var(--f-body);min-width:0;width:100%;box-sizing:border-box}" +
    "#stgdlg input[type=date]{width:38px;padding:6px 4px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:transparent}#stgdlg input[type=date]::-webkit-datetime-edit{display:none}" +
    "#stgdlg .tog{display:flex;gap:6px;align-items:center;font-size:14px;font-weight:600}" +
    ".stgadm{margin-top:4px}.way .dt{font-size:12px;color:var(--muted);margin-top:2px}.way .paid{font-size:13px;font-weight:700;color:var(--ok);margin-top:6px}" +
    ".wayx{margin-top:12px;display:flex;flex-direction:column;gap:6px}.wayx h3{font-size:15px}.wayx ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}" +
    ".wayx li{display:grid;grid-template-columns:18px 1fr auto;gap:8px;align-items:baseline;font-size:14px}.wayx li i{font-style:normal;color:var(--muted)}.wayx li.ok i{color:var(--ok)}" +
    ".wayx li small{display:block;color:var(--muted);font-size:12px}.wayx .tt{font-size:13px;color:var(--muted)}.wayx .tt b{color:var(--ink)}";
  document.head.appendChild(css);

  /* ---------- admin editor ---------- */
  var dlg = document.createElement("dialog"); dlg.id = "stgdlg"; document.body.appendChild(dlg);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  function open(id) {
    var d = dog(id); if (!d) return;
    var t = T(), p = plan(d);
    function field(s, k, label) {
      if (!label) return "";
      return '<label class="f">' + label + '<span class="rw"><input type="text" data-k="' + s + "." + k + '" maxlength="60" placeholder="' + esc(t.ph) + '" value="' + esc((p[s] || {})[k] || "") + '"><input type="date" data-pick="' + s + "." + k + '" aria-label="📅"></span></label>';
    }
    dlg.innerHTML = '<button class="x" aria-label="×" data-close>×</button><div class="in"><h2>' + t.title + " · " + esc(d.id + (d.name ? " " + d.name : "")) + '</h2><p class="note">' + t.note + "</p>" +
      S.map(function (s) {
        var x = p[s] || {}, f = fund(d, s);
        return '<div class="sg' + (x.done ? " on" : "") + '"><div class="sh"><span>' + t.st[s] + '</span><label class="tog"><input type="checkbox" data-done="' + s + '"' + (x.done ? " checked" : "") + "> " + t.done + "</label></div>" +
          field(s, "start", t.a[s]) + field(s, "end", t.b[s]) +
          '<label class="f">' + t.cost + ", " + esc(cur()) + " · " + t.raised + " " + money(f.r) + '<input type="number" min="0" step="any" data-cost="' + s + '" value="' + (f.g || "") + '"></label></div>';
      }).join("") + '<div><button class="btn" id="stgsave">' + t.save + "</button></div></div>";
    dlg.querySelector("[data-close]").onclick = function () { dlg.close(); };
    dlg.querySelectorAll("[data-pick]").forEach(function (pk) {
      pk.onchange = function () { var inp = dlg.querySelector('[data-k="' + pk.dataset.pick + '"]'); var m = pk.value.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) inp.value = m[3] + "." + m[2] + "." + m[1]; };
    });
    dlg.querySelectorAll("[data-done]").forEach(function (cb) { cb.onchange = function () { cb.closest(".sg").classList.toggle("on", cb.checked); }; });
    dlg.querySelector("#stgsave").onclick = function () {
      var np = {};
      S.forEach(function (s) {
        var x = { start: "", end: "", done: false };
        var a = dlg.querySelector('[data-k="' + s + '.start"]'), b = dlg.querySelector('[data-k="' + s + '.end"]');
        x.start = a ? a.value.trim() : ""; x.end = b ? b.value.trim() : "";
        x.done = dlg.querySelector('[data-done="' + s + '"]').checked;
        if (x.start || x.end || x.done) np[s] = x;
        var c = dlg.querySelector('[data-cost="' + s + '"]').value;
        d.funds = d.funds || {};
        var fs = d.funds[s] = d.funds[s] || { raised: 0, goal: "" };
        fs.goal = c === "" ? "" : Math.max(0, +c);
      });
      if (Object.keys(np).length) d.plan = np; else delete d.plan;
      // The current stage is the first one not marked done.
      var first = S.filter(function (s) { return !(np[s] && np[s].done); })[0];
      if (Object.keys(np).some(function (s) { return np[s].done; })) d.stage = first || "home";
      A.render(); dlg.close(); A.toast(T().saved);
    };
    if (!dlg.open) dlg.showModal();
  }
  function decorateAdmin() {
    if (!(A.ui && A.ui.admin)) return;
    document.querySelectorAll("tbody tr[data-id]").forEach(function (tr) {
      var sel = tr.querySelector("[data-act=stage]"); if (!sel || sel.parentNode.querySelector(".stgadm")) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "btn ghost sm stgadm"; b.dataset.stg = tr.dataset.id; b.textContent = T().btn;
      sel.parentNode.appendChild(b);
    });
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-stg]"); if (!el) return;
    e.preventDefault(); e.stopPropagation(); open(el.dataset.stg);
  }, true);

  /* ---------- public: card and dog page ---------- */
  function line(d, s) {
    var t = T(), x = plan(d)[s] || {}, out = [];
    if (x.start) out.push((s === "vet" || s === "foster" ? t.since + " " : "") + show(x.start));
    if (x.end) out.push((s === "vet" ? t.exit + " " : t.till + " ") + show(x.end));
    return out.join(" · ");
  }
  function decorateCards() {
    document.querySelectorAll(".card").forEach(function (card) {
      var tid = card.querySelector(".tid"), d = tid && dog(tid.textContent.trim()), box = card.querySelector(".way .box"); if (!d || !box) return;
      var s = d.status === "adopted" ? "home" : d.stage || "capture", w = whole(d), sig = JSON.stringify([d.plan, s, w, lang(), box.childElementCount]);
      if (box.dataset.stg === sig) return;
      box.querySelectorAll(".dt,.paid").forEach(function (n) { n.remove(); });
      var txt = line(d, s);
      if (txt) { var p = document.createElement("div"); p.className = "dt"; p.textContent = txt; var hd = box.querySelector(".hd"); hd.parentNode.insertBefore(p, hd.nextSibling); }
      if (w.paid) { var q = document.createElement("div"); q.className = "paid"; q.textContent = T().paid + " ✓"; box.appendChild(q); }
      box.dataset.stg = JSON.stringify([d.plan, s, w, lang(), box.childElementCount]);
    });
  }
  function decorateDialog() {
    document.querySelectorAll("dialog[open] .dinfo").forEach(function (info) {
      var tid = info.querySelector(".tid"), d = tid && dog(tid.textContent.trim()); if (!d) return;
      var w = whole(d), sig = JSON.stringify([d.plan, d.stage, d.status, w, lang()]), box = info.querySelector(".wayx");
      if (box && box.dataset.sig === sig) return;
      if (!box) { box = document.createElement("div"); box.className = "wayx"; var at = info.querySelector(".donx") || info.querySelector(".curx") || info.querySelector(".apply"); info.insertBefore(box, at || null); }
      box.dataset.sig = sig;
      var t = T(), p = plan(d), now = d.status === "adopted" ? 4 : Math.max(0, S.indexOf(d.stage || "capture"));
      box.innerHTML = "<h3>" + t.way + "</h3><ol>" + S.map(function (s, i) {
        var x = p[s] || {}, ok = x.done || i < now, f = fund(d, s), ln = line(d, s);
        return '<li class="' + (ok ? "ok" : "") + '"><i>' + (ok ? "✓" : i === now ? "●" : "○") + "</i><span><b>" + t.st[s] + "</b>" + (ln ? "<small>" + esc(ln) + "</small>" : "") + "</span><span style=\"font-size:13px;color:var(--muted)\">" + (f.g ? money(f.r) + " / " + money(f.g) : f.r ? money(f.r) : "") + "</span></li>";
      }).join("") + "</ol>" +
        (w.g ? '<div class="tt">' + t.total + ": <b>" + money(w.r) + "</b> / " + money(w.g) + (w.paid ? " · <b style=\"color:var(--ok)\">" + t.paid + " ✓</b>" : " · " + t.left + " <b>" + money(w.g - w.r) + "</b>") + "</div>" : "");
    });
  }

  function all() { decorateAdmin(); decorateCards(); decorateDialog(); }
  var queued = false;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; all(); }); }
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
  setInterval(all, 1500);
  all();
})();
