/* Time to Save — curators. Anyone can offer to become a dog's curator or co-curator
   (any number of people), choosing a monthly or one-time amount; the request goes to the
   coordinators' Telegram / WhatsApp / Instagram. Volunteers confirm curators in the admin,
   and confirmed curators show on the dog's card and page. */
(function () {
  "use strict";
  var A = window.__TTS;
  if (!A || document.getElementById("curdlg")) return;
  var AMOUNTS = [1000, 2000, 5000, 10000, 20000];
  var L = {
    ru: {
      cta: "Стать куратором", ctaFirst: "Стать первым куратором", none: "У собаки пока нет куратора",
      curators: "Кураторы", and: "и ещё", perMonth: "в месяц", once: "разово", anon: "Аноним",
      main: "Куратор", co: "Сокуратор", title: "Стать куратором",
      intro: "Куратор помогает собаке деньгами каждый месяц или один раз и следит, как у неё дела. Кураторов может быть сколько угодно: один главный куратор и любое число сокураторов.",
      role: "Кем хотите быть", period: "Как помогать", monthly: "Каждый месяц", oneTime: "Один раз", amount: "Сумма", other: "Своя сумма",
      name: "Ваше имя", showName: "Показать моё имя на сайте", preview: "Текст сообщения",
      send: "Отправить в", copy: "Скопировать текст", copied: "Текст скопирован. Вставьте его в чат.",
      after: "Волонтёры ответят и подтвердят. После этого вы появитесь на странице собаки.", noContacts: "Контакты для связи пока не указаны. Скопируйте текст и отправьте волонтёрам.",
      hello: "Здравствуйте! Хочу стать", asMain: "куратором", asCo: "сокуратором", dogW: "собаки", canPay: "Могу помогать", nameW: "Имя", showW: "Показывать имя на сайте", yes: "да", no: "нет",
      pickAmount: "Выберите сумму", wholeWay: "Весь путь собаки", wholeLeft: "осталось собрать",
      fullNote: "Куратор оплачивает весь путь собаки: отлов, такси, ветеринара, передержку и поиск дома. Собак мы забираем сразу, не дожидаясь сбора, поэтому каждая неоплаченная часть ложится долгом на волонтёров. Когда вся сумма будет собрана, волонтёры напишут вам, что путь собаки полностью оплачен.",
      adm: "Кураторы", admTitle: "Кураторы собаки", add: "Добавить", del: "Убрать", nameOpt: "Имя (как на сайте)", saved: "Сохранено. Не забудьте опубликовать.",
      admNote: "Добавляйте человека после того, как он написал и вы договорились. Имя на сайте видно, только если стоит галочка."
    },
    en: {
      cta: "Become a curator", ctaFirst: "Be the first curator", none: "No curator yet",
      curators: "Curators", and: "and", perMonth: "a month", once: "one-off", anon: "Anonymous",
      main: "Curator", co: "Co-curator", title: "Become a curator",
      intro: "A curator supports a dog with money every month or once and follows how it is doing. There can be any number of curators: one main curator and as many co-curators as you like.",
      role: "Your role", period: "How to help", monthly: "Every month", oneTime: "Once", amount: "Amount", other: "Other amount",
      name: "Your name", showName: "Show my name on the site", preview: "Message",
      send: "Send via", copy: "Copy text", copied: "Text copied. Paste it into the chat.",
      after: "Volunteers will reply and confirm. Then you will appear on the dog's page.", noContacts: "No contacts set yet. Copy the text and send it to the volunteers.",
      hello: "Hello! I would like to become a", asMain: "curator", asCo: "co-curator", dogW: "for dog", canPay: "I can give", nameW: "Name", showW: "Show name on the site", yes: "yes", no: "no",
      pickAmount: "Choose an amount", wholeWay: "The dog's whole way", wholeLeft: "still needed",
      fullNote: "A curator pays for the dog's whole way: rescue, taxi, vet, foster and finding a home. We take dogs out right away without waiting for the money, so every unpaid part becomes the volunteers' debt. When the full sum is raised, volunteers will message you that the dog's way is fully paid.",
      adm: "Curators", admTitle: "Dog's curators", add: "Add", del: "Remove", nameOpt: "Name (as on the site)", saved: "Saved. Remember to publish.",
      admNote: "Add a person after they wrote to you and you agreed. The name is shown on the site only if the box is ticked."
    }
  };
  function lang() { return A.ui && A.ui.lang === "en" ? "en" : "ru"; }
  function T() { return L[lang()]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cur() { return A.state.settings.currency || "₸"; }
  function money(n, c) { return Math.round(+n || 0).toLocaleString(lang() === "ru" ? "ru-RU" : "en-GB").replace(/,/g, " ") + (c === false ? "" : " " + cur()); }
  function dog(id) { return (A.state.dogs || []).filter(function (d) { return d.id === id; })[0]; }
  function list(d) { return (d.curators || []).slice().sort(function (a, b) { return (a.role === "main" ? 0 : 1) - (b.role === "main" ? 0 : 1); }); }
  function hasMain(d) { return (d.curators || []).some(function (c) { return c.role === "main"; }); }
  function sums(d) { var m = 0, o = 0; (d.curators || []).forEach(function (c) { if (c.period === "once") o += +c.amount || 0; else m += +c.amount || 0; }); return { m: m, o: o }; }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function contacts() {
    var s = A.state.settings, out = [];
    var tg = (s.telegram || "").trim().replace(/^@|^https?:\/\/t\.me\//g, ""), ig = (s.instagram || "").trim().replace(/^@|^https?:\/\/(www\.)?instagram\.com\//g, "").replace(/\/$/, ""), wa = (s.whatsapp || "").replace(/\D/g, "");
    if (tg) out.push({ k: "tg", label: "Telegram", url: "https://t.me/" + encodeURIComponent(tg) });
    if (wa) out.push({ k: "wa", label: "WhatsApp", url: "https://wa.me/" + wa });
    if (ig) out.push({ k: "ig", label: "Instagram", url: "https://ig.me/m/" + encodeURIComponent(ig) });
    return out;
  }
  var PEOPLE = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.5" cy="5" r="2.4"/><circle cx="11" cy="5.6" r="2"/><path d="M1 13.5c0-2.6 2-4.3 4.5-4.3S10 10.9 10 13.5zM10.6 13.5c0-1.6-.5-2.9-1.4-3.8.6-.3 1.2-.4 1.8-.4 2.1 0 3.9 1.5 3.9 4.2z"/></svg>';

  var css = document.createElement("style");
  css.textContent =
    ".cur{margin-top:10px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--muted)}" +
    ".cur .cl{display:flex;gap:6px;align-items:flex-start;color:var(--ink);line-height:1.3}.cur .cl svg{width:15px;height:15px;fill:var(--accent);flex:none;margin-top:1px}" +
    ".cur .cs{font-variant-numeric:tabular-nums}.cur .cs b{color:var(--ink)}" +
    ".ccta{display:inline-flex;align-items:center;justify-content:center;gap:6px;align-self:stretch;padding:8px 12px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font-weight:600;font-size:13px;cursor:pointer;transition:transform .12s,filter .12s}" +
    ".ccta:hover{filter:brightness(1.08);transform:translateY(-1px)}.ccta b{font-size:16px;line-height:1}" +
    "#curdlg{width:min(560px,calc(100vw - 24px))}#curdlg .in{padding:22px 20px 20px;display:flex;flex-direction:column;gap:14px}" +
    "#curdlg h2{font-size:20px;padding-right:40px}#curdlg .lead{font-size:14px;color:var(--muted);margin:0}" +
    "#curdlg .grp{display:flex;flex-direction:column;gap:6px}#curdlg .grp>span{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em}" +
    "#curdlg .chips{display:flex;flex-wrap:wrap;gap:6px}" +
    "#curdlg .chip{border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 14px;font:600 14px var(--f-body);cursor:pointer}" +
    "#curdlg .chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}" +
    "#curdlg input[type=text],#curdlg input[type=number]{padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:15px var(--f-body);min-width:0}" +
    "#curdlg textarea{width:100%;box-sizing:border-box;min-height:96px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--sunk);color:var(--ink);font:13px/1.45 var(--f-body);resize:vertical}" +
    "#curdlg .sends{display:flex;flex-wrap:wrap;gap:8px}#curdlg .sends a,#curdlg .sends button{flex:1 1 140px;text-align:center;text-decoration:none}" +
    "#curdlg .tog{display:flex;gap:8px;align-items:center;font-size:14px}#curdlg .note{font-size:12px;color:var(--muted);margin:0}" +
    "#curdlg .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}#curdlg .row>*{flex:1 1 120px}" +
    "#curdlg .item{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--line);border-radius:10px;font-size:14px}" +
    "#curdlg .item small{color:var(--muted)}" +
    ".curx{border-top:1px solid var(--line);padding-top:14px;margin-top:14px;display:flex;flex-direction:column;gap:8px}.curx h3{font-size:15px}" +
    ".curx ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:14px}.curx li small{color:var(--muted)}" +
    ".curadm{margin-top:6px}";
  document.head.appendChild(css);

  var dlg = document.createElement("dialog");
  dlg.id = "curdlg";
  document.body.appendChild(dlg);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  /* ---------- public: offer form ---------- */
  var f = {};
  function message(d) {
    var t = T(), amt = f.amount ? money(f.amount) + " " + (f.period === "month" ? t.perMonth : t.once) : "—";
    return t.hello + " " + (f.role === "main" ? t.asMain : t.asCo) + " " + t.dogW + " " + d.id + (d.name ? " (" + d.name + ")" : "") + ".\n" +
      t.canPay + ": " + amt + ".\n" + (f.name ? t.nameW + ": " + f.name + ".\n" : "") + t.showW + ": " + (f.show ? t.yes : t.no) + ".\n" + location.origin + location.pathname;
  }
  function openOffer(id, preset) {
    var d = dog(id); if (!d) return;
    f = { id: id, role: hasMain(d) ? "co" : "main", period: "month", amount: 5000, custom: false, name: "", show: true };
    if (preset) Object.keys(preset).forEach(function (k) { f[k] = preset[k]; });
    drawOffer();
    if (!dlg.open) dlg.showModal();
  }
  function drawOffer() {
    var d = dog(f.id), t = T(), cs = contacts();
    function chip(group, val, label) { return '<button type="button" class="chip" data-' + group + '="' + val + '" aria-pressed="' + (f[group] === val) + '">' + label + "</button>"; }
    dlg.innerHTML = '<button class="x" aria-label="×" data-close>×</button><div class="in">' +
      "<h2>" + t.title + "</h2><p class=\"lead\">" + esc(d.id + (d.name ? " · " + d.name : "")) + "</p><p class=\"lead\">" + t.intro + "</p>" + fullNote(d) +
      '<div class="grp"><span>' + t.role + '</span><div class="chips">' + chip("role", "main", t.main) + chip("role", "co", t.co) + "</div></div>" +
      '<div class="grp"><span>' + t.period + '</span><div class="chips">' + chip("period", "month", t.monthly) + chip("period", "once", t.oneTime) + "</div></div>" +
      '<div class="grp"><span>' + t.amount + '</span><div class="chips">' + AMOUNTS.map(function (a) { return '<button type="button" class="chip" data-amt="' + a + '" aria-pressed="' + (!f.custom && f.amount === a) + '">' + money(a) + "</button>"; }).join("") +
      '<input type="number" min="1" step="any" inputmode="numeric" id="curamt" placeholder="' + t.other + '" value="' + (f.custom && f.amount ? f.amount : "") + '" style="flex:1 1 130px"></div></div>' +
      '<div class="grp"><span>' + t.name + '</span><input type="text" id="curname" maxlength="60" autocomplete="name" value="' + esc(f.name) + '"><label class="tog"><input type="checkbox" id="curshow"' + (f.show ? " checked" : "") + "> " + t.showName + "</label></div>" +
      '<div class="grp"><span>' + t.preview + '</span><textarea id="curmsg" readonly>' + esc(message(d)) + "</textarea></div>" +
      '<div class="sends">' + cs.map(function (c) { return '<a class="btn" href="' + esc(c.url + (c.k === "wa" ? "?text=" + encodeURIComponent(message(d)) : "")) + '" target="_blank" rel="noopener" data-send="' + c.k + '">' + t.send + " " + c.label + "</a>"; }).join("") +
      '<button type="button" class="btn ghost" id="curcopy">' + t.copy + "</button></div>" +
      '<p class="note">' + (cs.length ? t.after : t.noContacts) + "</p></div>";
    dlg.querySelector("[data-close]").onclick = function () { dlg.close(); };
    dlg.querySelectorAll("[data-role]").forEach(function (b) { b.onclick = function () { f.role = b.dataset.role; drawOffer(); }; });
    dlg.querySelectorAll("[data-period]").forEach(function (b) { b.onclick = function () { f.period = b.dataset.period; drawOffer(); }; });
    dlg.querySelectorAll("[data-amt]").forEach(function (b) { b.onclick = function () { f.amount = +b.dataset.amt; f.custom = false; drawOffer(); }; });
    var amt = dlg.querySelector("#curamt"), nm = dlg.querySelector("#curname"), sh = dlg.querySelector("#curshow");
    function refresh() {
      var m = dlg.querySelector("#curmsg"); m.value = message(d);
      var wa = dlg.querySelector("[data-send=wa]"); if (wa) wa.href = cs.filter(function (c) { return c.k === "wa"; })[0].url + "?text=" + encodeURIComponent(m.value);
    }
    amt.oninput = function () { var v = +amt.value; f.custom = !!amt.value; f.amount = v > 0 ? v : 0; dlg.querySelectorAll("[data-amt]").forEach(function (b) { b.setAttribute("aria-pressed", String(!f.custom && f.amount === +b.dataset.amt)); }); refresh(); };
    nm.oninput = function () { f.name = nm.value.trim(); refresh(); };
    sh.onchange = function () { f.show = sh.checked; refresh(); };
    function copy() { try { navigator.clipboard.writeText(message(d)).then(function () { A.toast(t.copied); }, function () {}); } catch (e) {} }
    dlg.querySelector("#curcopy").onclick = copy;
    dlg.querySelectorAll("[data-send]").forEach(function (a) { a.addEventListener("click", function (e) { if (!f.amount) { e.preventDefault(); return A.toast(t.pickAmount); } copy(); }); });
  }

  // Curator of one dog in a fund group pays for the whole way: rescue, transport, vet, foster, finding a home.
  function fullNote(d) {
    if (!f.full || !window.__STAGES) return "";
    var t = T(), w = window.__STAGES.whole(d);
    return '<div style="padding:12px;border-radius:10px;background:var(--accent-soft);font-size:14px;display:flex;flex-direction:column;gap:4px">' +
      (w.g ? "<span>" + t.wholeWay + ": <b>" + money(w.g) + "</b> · " + t.wholeLeft + " <b>" + money(Math.max(0, w.g - w.r)) + "</b></span>" : "") +
      "<span>" + t.fullNote + "</span></div>";
  }
  window.__CUR = { open: function (id, preset) { openOffer(id, preset); } };

  /* ---------- admin: confirmed curators ---------- */
  var adm = { id: null };
  function openAdmin(id) { adm = { id: id }; drawAdmin(); if (!dlg.open) dlg.showModal(); }
  function drawAdmin() {
    var d = dog(adm.id), t = T(), C = list(d);
    dlg.innerHTML = '<button class="x" aria-label="×" data-close>×</button><div class="in"><h2>' + t.admTitle + '</h2><p class="lead">' + esc(d.id + (d.name ? " · " + d.name : "")) + '</p><p class="note">' + t.admNote + "</p>" +
      (C.length ? C.map(function (c) {
        return '<div class="item"><span><b>' + esc(c.name || t.anon) + "</b> · " + (c.role === "main" ? t.main : t.co) + "<br><small>" + money(c.amount) + " " + (c.period === "once" ? t.once : t.perMonth) + (c.show ? "" : " · " + t.showName.toLowerCase() + ": " + t.no) + '</small></span><button class="btn ghost sm" data-cdel="' + esc(c.id) + '">' + t.del + "</button></div>";
      }).join("") : '<p class="lead">' + t.none + ".</p>") +
      '<div class="row"><input type="text" id="caname" maxlength="60" placeholder="' + t.nameOpt + '"><select id="carole" class="chip" style="font-weight:500"><option value="co">' + t.co + '</option><option value="main"' + (hasMain(d) ? "" : " selected") + ">" + t.main + "</option></select></div>" +
      '<div class="row"><input type="number" id="caamt" min="1" step="any" placeholder="' + t.amount + ", " + esc(cur()) + '"><select id="caper" class="chip" style="font-weight:500"><option value="month">' + t.monthly + '</option><option value="once">' + t.oneTime + "</option></select></div>" +
      '<label class="tog"><input type="checkbox" id="cashow" checked> ' + t.showName + '</label><div><button class="btn" id="caadd">' + t.add + "</button></div></div>";
    dlg.querySelector("[data-close]").onclick = function () { dlg.close(); };
    dlg.querySelectorAll("[data-cdel]").forEach(function (b) {
      b.onclick = function () { d.curators = (d.curators || []).filter(function (c) { return c.id !== b.dataset.cdel; }); if (!d.curators.length) delete d.curators; A.render(); drawAdmin(); A.toast(t.saved); };
    });
    dlg.querySelector("#caadd").onclick = function () {
      var amount = +dlg.querySelector("#caamt").value;
      if (!(amount > 0)) return A.toast(T().pickAmount);
      var role = dlg.querySelector("#carole").value;
      d.curators = d.curators || [];
      if (role === "main") d.curators.forEach(function (c) { if (c.role === "main") c.role = "co"; });
      d.curators.push({ id: "c" + Date.now().toString(36), name: dlg.querySelector("#caname").value.trim(), show: dlg.querySelector("#cashow").checked, role: role, amount: amount, period: dlg.querySelector("#caper").value, since: today() });
      A.render(); drawAdmin(); A.toast(t.saved);
    };
  }

  /* ---------- cards, dog page, admin table ---------- */
  function summary(d) {
    var t = T(), C = list(d), s = sums(d), names = C.filter(function (c) { return c.show && c.name; }).map(function (c) { return c.name; });
    var shown = names.slice(0, 2), rest = C.length - shown.length;
    var who = !C.length ? t.none : t.curators + ": <b>" + (shown.length ? esc(shown.join(", ")) : C.length) + "</b>" + (shown.length && rest > 0 ? " " + t.and + " " + rest : "");
    var money1 = [];
    if (s.m) money1.push("<b>" + money(s.m) + "</b> " + t.perMonth);
    if (s.o) money1.push("<b>" + money(s.o) + "</b> " + t.once);
    return { who: who, sum: money1.join(" · "), n: C.length };
  }
  function decorateCards() {
    document.querySelectorAll(".card").forEach(function (card) {
      var tid = card.querySelector(".tid"), d = tid && dog(tid.textContent.trim()); if (!d) return;
      var sig = JSON.stringify([d.curators, lang(), d.status]);
      var box = card.querySelector(".cur");
      if (box && box.dataset.sig === sig) return;
      if (!box) { box = document.createElement("div"); box.className = "cur"; card.querySelector(".cb").appendChild(box); }
      box.dataset.sig = sig;
      var s = summary(d), t = T();
      box.innerHTML = '<div class="cl">' + PEOPLE + "<span>" + s.who + "</span></div>" + (s.sum ? '<div class="cs">' + s.sum + "</div>" : "") +
        (d.status === "adopted" ? "" : '<span class="ccta" role="button" data-cur="' + esc(d.id) + '"><b>+</b> ' + (s.n ? t.cta : t.ctaFirst) + "</span>");
    });
  }
  function decorateDialog() {
    document.querySelectorAll("dialog[open] .dinfo").forEach(function (info) {
      var tid = info.querySelector(".tid"), d = tid && dog(tid.textContent.trim()); if (!d) return;
      var sig = JSON.stringify([d.curators, lang()]), box = info.querySelector(".curx");
      if (box && box.dataset.sig === sig) return;
      if (!box) { box = document.createElement("div"); box.className = "curx"; var ap = info.querySelector(".apply"); info.insertBefore(box, ap || null); }
      box.dataset.sig = sig;
      var t = T(), C = list(d), s = summary(d);
      box.innerHTML = "<h3>" + t.curators + "</h3>" + (C.length ? "<ul>" + C.map(function (c) {
        return "<li><b>" + esc(c.show && c.name ? c.name : t.anon) + "</b> · " + (c.role === "main" ? t.main : t.co) + " <small>" + money(c.amount) + " " + (c.period === "once" ? t.once : t.perMonth) + "</small></li>";
      }).join("") + "</ul>" + (s.sum ? '<div style="font-size:13px;color:var(--muted)">' + s.sum + "</div>" : "") : '<p class="muted" style="margin:0;font-size:14px">' + t.none + ".</p>") +
        (d.status === "adopted" ? "" : '<button type="button" class="btn" data-cur="' + esc(d.id) + '">' + (C.length ? t.cta : t.ctaFirst) + "</button>");
    });
  }
  function decorateAdmin() {
    if (!(A.ui && A.ui.admin)) return;
    document.querySelectorAll("tbody tr[data-id]").forEach(function (tr) {
      var d = dog(tr.dataset.id); if (!d) return;
      var cell = tr.cells[2]; if (!cell) return;
      var n = (d.curators || []).length, b = cell.querySelector(".curadm");
      if (b && b.dataset.n === String(n)) return;
      if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "btn ghost sm curadm"; cell.appendChild(b); }
      b.dataset.n = String(n); b.dataset.curadm = d.id;
      b.textContent = T().adm + " (" + n + ")";
    });
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-cur],[data-curadm]"); if (!el) return;
    e.preventDefault(); e.stopPropagation();
    if (el.dataset.curadm) return openAdmin(el.dataset.curadm);
    var d = dog(el.dataset.cur), G = A.state.settings.groups || {}, fundLed = d && d.lead && G[d.lead] && G[d.lead].mode === "fund";
    if (fundLed && window.__STAGES) { var w = window.__STAGES.whole(d); openOffer(d.id, { period: "once", full: true, amount: Math.max(0, w.g - w.r) || 5000, custom: true }); }
    else openOffer(el.dataset.cur);
  }, true);

  function all() { decorateCards(); decorateDialog(); decorateAdmin(); }
  var queued = false;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; all(); }); }
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
  setInterval(all, 1500);
  all();
})();
