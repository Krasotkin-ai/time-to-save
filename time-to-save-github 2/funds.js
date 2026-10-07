/* Time to Save — donations, group funds and the receipts inbox.
   Each volunteer group chooses how it works:
     "animal" — money is raised for each animal and its stages (the default);
     "fund"   — donors give to the group's common fund, and the group picks which animals to
                rescue and leads them from start to finish.
   Donors pay by the shown details and upload their receipt; it waits in the inbox
   (a free Cloudflare Worker, see worker/worker.js) until a volunteer accepts it. */
(function () {
  "use strict";
  var A = window.__TTS;
  if (!A || document.getElementById("dondlg")) return;
  var CFG = window.TTS_CONFIG || {}, INBOX = (CFG.receipts || "").replace(/\/+$/, "");
  var AMOUNTS = [1000, 2000, 5000, 10000, 20000];
  var L = {
    ru: {
      funds: "Фонды групп", fundsNote: "Эти группы собирают общий фонд: вы помогаете группе, а она сама выбирает, кого спасать, и ведёт животное до дома.",
      inW: "собрано", outW: "потрачено", left: "в фонде", leads: "ведёт животных", helpFund: "Помочь фонду", pickDog: "Стать куратором собаки", chooseTitle: "Выберите собаку", chooseNote: "Куратор ведёт одну собаку от отлова до дома и оплачивает весь её путь.", wholeLeft: "осталось", wholePaid: "оплачено полностью",
      paidTitle: "Путь полностью оплачен — сообщите кураторам", paidMsg: "Здравствуйте! Весь путь собаки %s полностью оплачен. Спасибо, что ведёте её!", told: "Сообщил(а)", copyMsg: "Скопировать сообщение",
      donate: "Пожертвовать", donateFund: "Помочь фонду «%s»", ledBy: "Спасает группа «%s» из общего фонда",
      title: "Пожертвование", titleFund: "Помочь фонду «%s»", forDog: "Для", period: "Как помогать", once: "Один раз", monthly: "Каждый месяц", amount: "Сумма", other: "Своя сумма",
      payTitle: "1. Переведите деньги", payNone: "Реквизиты пока не указаны, напишите волонтёрам.",
      upTitle: "2. Загрузите чек", upNote: "Фото или скриншот чека, можно PDF. Сумма и дата заполнятся сами, номера карт и телефонов закроются.",
      pick: "Выбрать чек", reading: "Читаю чек…", readOk: "Чек прочитан, проверьте сумму.", readBad: "Сумму не нашёл, впишите её.",
      name: "Ваше имя", show: "Показать имя на сайте", send: "Отправить чек", sending: "Отправляю…",
      sent: "Спасибо! Чек отправлен. Волонтёры проверят его, и пожертвование появится на сайте.",
      noInbox: "Отправьте чек волонтёрам в мессенджер:", copy: "Скопировать текст", copied: "Текст скопирован.",
      err: "Не получилось отправить. Попробуйте ещё раз или отправьте чек в мессенджер.", needFile: "Сначала выберите чек.", needAmount: "Укажите сумму.",
      msg: "Здравствуйте! Я перевёл(а) %a на %t. Чек прикрепляю.", toFund: "фонд группы «%s»", toDog: "собаку %s", toSite: "помощь животным",
      cmt: "Комментарий к переводу", cmtNote: "Так деньги будет проще найти и отчитаться за них.", cmtDog: "Помощь животным %s", cmtFund: "Помощь животным, фонд %s", cmtAny: "Помощь животным", cmtCopy: "Скопировать",
      orTg: "Или отправьте чек в Telegram", follow: "Следить в Telegram", followNote: "Новости о собаке: новые чеки, этапы, когда путь оплачен.",
      tgTitle: "Telegram-бот", tgOff: "Бот не подключён: добавьте в Cloudflare секрет TG_TOKEN и нажмите «Включить бота».", tgOn: "Бот @%s работает.", tgSetup: "Включить бота", tgMe: "Подключить мой Telegram",
      tgMeNote: "Откройте ссылку в телефоне и нажмите «Старт». После этого пересылайте боту фото чеков с подписью, например «D012 ветеринар 15000» — они появятся здесь.", tgLink: "Открыть бота", tgFail: "Не получилось. Проверьте настройки в Cloudflare.",
      fromTg: "из Telegram", exp: "расход", pdf: "PDF", notified: "Подписчикам в Telegram отправлено сообщений: %s.",
      // admin
      gTitle: "Как работает ваша группа", gNote: "Выберите систему. Её видят посетители на сайте.",
      mAnimal: "Сбор на каждое животное", mAnimalNote: "Деньги собираются на конкретное животное и его этапы.",
      mFund: "Общий фонд группы", mFundNote: "Донаторы дают деньги в фонд группы, а группа сама выбирает, кого спасать, и ведёт его до конца.",
      pay: "Реквизиты для перевода (видно всем)", payPh: "Например: Kaspi Gold +7 7xx xxx xx xx, Айгерим К.", about: "О фонде (видно всем)",
      sitePay: "Общие реквизиты сайта (для животных без группы)", save: "Сохранить", saved: "Сохранено. Не забудьте опубликовать.",
      take: "Взять в фонд", drop: "Убрать из фонда", led: "Ведёт фонд",
      inbox: "Входящие чеки", inboxNote: "Здесь чеки донаторов с сайта и из Telegram и чеки волонтёров из Telegram. Проверьте и нажмите «Принять» — запись появится на сайте после публикации.",
      inboxOff: "Приём чеков на сайте ещё не подключён.", empty: "Новых чеков нет.", accept: "Принять", reject: "Отклонить", sureReject: "Точно отклонить?",
      accepted: "Принято. Нажмите «Опубликовать на сайте».", load: "Загружаю…", refresh: "Обновить", anon: "Аноним", noAmount: "сумма не указана"
    },
    en: {
      funds: "Group funds", fundsNote: "These groups raise a common fund: you help the group, and it decides whom to rescue and leads the animal home.",
      inW: "raised", outW: "spent", left: "in the fund", leads: "animals in care", helpFund: "Help the fund", pickDog: "Curate one dog", chooseTitle: "Choose a dog", chooseNote: "A curator leads one dog from rescue to home and pays for its whole way.", wholeLeft: "left", wholePaid: "fully paid",
      paidTitle: "Fully paid — tell the curators", paidMsg: "Hello! The whole way of dog %s is fully paid. Thank you for leading it!", told: "Told them", copyMsg: "Copy message",
      donate: "Donate", donateFund: "Help the “%s” fund", ledBy: "Rescued by “%s” from the common fund",
      title: "Donation", titleFund: "Help the “%s” fund", forDog: "For", period: "How to help", once: "Once", monthly: "Every month", amount: "Amount", other: "Other amount",
      payTitle: "1. Transfer the money", payNone: "No payment details yet, please message the volunteers.",
      upTitle: "2. Upload the receipt", upNote: "Photo or screenshot of the receipt, PDF works too. Amount and date fill in by themselves; card and phone numbers are covered.",
      pick: "Choose receipt", reading: "Reading the receipt…", readOk: "Receipt read, check the amount.", readBad: "No amount found, please type it.",
      name: "Your name", show: "Show my name on the site", send: "Send receipt", sending: "Sending…",
      sent: "Thank you! Receipt sent. Volunteers will check it and the donation will appear on the site.",
      noInbox: "Send the receipt to the volunteers in a messenger:", copy: "Copy text", copied: "Text copied.",
      err: "Could not send. Try again or send the receipt in a messenger.", needFile: "Choose a receipt first.", needAmount: "Enter the amount.",
      msg: "Hello! I transferred %a for %t. The receipt is attached.", toFund: "the “%s” group fund", toDog: "dog %s", toSite: "the animals",
      cmt: "Transfer comment", cmtNote: "It makes the money easy to find and report.", cmtDog: "Помощь животным %s", cmtFund: "Помощь животным, фонд %s", cmtAny: "Помощь животным", cmtCopy: "Copy",
      orTg: "Or send the receipt in Telegram", follow: "Follow in Telegram", followNote: "News about the dog: new receipts, stages, when the way is paid.",
      tgTitle: "Telegram bot", tgOff: "The bot is off: add the TG_TOKEN secret in Cloudflare and press “Turn on the bot”.", tgOn: "Bot @%s is on.", tgSetup: "Turn on the bot", tgMe: "Connect my Telegram",
      tgMeNote: "Open the link on your phone and press Start. Then forward receipt photos to the bot with a caption like “D012 vet 15000” — they show up here.", tgLink: "Open the bot", tgFail: "Did not work. Check the Cloudflare settings.",
      fromTg: "from Telegram", exp: "expense", pdf: "PDF", notified: "Telegram messages sent to followers: %s.",
      gTitle: "How your group works", gNote: "Choose the system. Visitors see it on the site.",
      mAnimal: "Raise money for each animal", mAnimalNote: "Money is raised for a specific animal and its stages.",
      mFund: "Group common fund", mFundNote: "Donors give to the group's fund; the group chooses whom to rescue and leads it to the end.",
      pay: "Payment details (public)", payPh: "e.g. Kaspi Gold +7 7xx xxx xx xx, Aigerim K.", about: "About the fund (public)",
      sitePay: "Site-wide payment details (for animals without a group)", save: "Save", saved: "Saved. Remember to publish.",
      take: "Take into fund", drop: "Remove from fund", led: "Led by fund",
      inbox: "Incoming receipts", inboxNote: "Donor receipts from the site and Telegram, and volunteer receipts from Telegram. Check and press Accept; the entry appears after publishing.",
      inboxOff: "Receipt upload is not connected yet.", empty: "No new receipts.", accept: "Accept", reject: "Reject", sureReject: "Reject for sure?",
      accepted: "Accepted. Press Publish.", load: "Loading…", refresh: "Refresh", anon: "Anonymous", noAmount: "no amount"
    }
  };
  function lang() { return A.ui && A.ui.lang === "en" ? "en" : "ru"; }
  function T() { return L[lang()]; }
  function f(s, v) { return String(s).replace("%s", v); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cur() { return A.state.settings.currency || "₸"; }
  function money(n) { return Math.round(+n || 0).toLocaleString(lang() === "ru" ? "ru-RU" : "en-GB").replace(/,/g, " ") + " " + cur(); }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function dog(id) { return (A.state.dogs || []).filter(function (d) { return d.id === id; })[0]; }
  function groups() { var s = A.state.settings; s.groups = s.groups && typeof s.groups === "object" ? s.groups : {}; return s.groups; }
  function isFund(g) { var x = g && groups()[g]; return !!(x && x.mode === "fund"); }
  function fundOf(d) { return d && d.lead && isFund(d.lead) ? d.lead : ""; }
  function fundGroups() { var G = groups(); return Object.keys(G).filter(function (k) { return G[k].mode === "fund"; }).sort(); }
  function totals(g) {
    var i = 0, o = 0;
    (A.state.ledger || []).forEach(function (e) { if ((e.fund || "") !== g) return; if (e.type === "in") i += +e.amount || 0; else o += +e.amount || 0; });
    return { i: i, o: o, n: (A.state.dogs || []).filter(function (d) { return d.lead === g && d.status !== "adopted"; }).length };
  }
  function admin() { return !!(A.ui && A.ui.admin); }
  var BOT = "";
  if (INBOX) fetch(INBOX + "/tg/info").then(function (r) { return r.json(); }).then(function (j) { BOT = j.bot || ""; soon(); }).catch(function () {});
  function b64u(str) { var u8 = new TextEncoder().encode(str), o = ""; for (var i = 0; i < u8.length; i++) o += String.fromCharCode(u8[i]); return btoa(o).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function tgReceipt(t) {
    var p = "r_" + b64u(JSON.stringify(t.fund ? { d: t.dog || "", f: t.fund } : { d: t.dog || "" }));
    if (p.length > 64) p = "r_" + b64u(JSON.stringify({ d: t.dog || "" }));
    return "https://t.me/" + BOT + "?start=" + p;
  }
  function comment(t) { var x = T(); return t.fund ? f(x.cmtFund, t.fund) : t.dog ? f(x.cmtDog, t.dog) : x.cmtAny; }
  window.__FUND = function () { var G = window.__GH && window.__GH.group(); return G && isFund(G) ? G : ""; };

  var css = document.createElement("style");
  css.textContent =
    "#fundsbox{margin:18px 0 6px}#fundsbox h2{font-size:20px}#fundsbox .fl{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:10px}" +
    "#fundsbox .fc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;flex-direction:column;gap:8px}" +
    "#fundsbox .fc b.nm{font:700 16px var(--f-display)}#fundsbox .fc .ab{font-size:13px;color:var(--muted)}" +
    "#fundsbox .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:12px;color:var(--muted)}#fundsbox .nums b{display:block;font-size:15px;color:var(--ink)}" +
    ".don{display:flex;gap:6px;margin-top:6px}.don .dbt{flex:1;display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:999px;border:1.5px solid var(--accent);color:var(--accent);font-weight:600;font-size:13px;cursor:pointer;background:var(--surface)}" +
    ".don .dbt:hover{background:var(--accent-soft)}.don .led{font-size:12px;color:var(--muted)}" +
    "#dondlg{width:min(560px,calc(100vw - 24px))}#dondlg .in{padding:22px 20px 20px;display:flex;flex-direction:column;gap:14px}#dondlg h2{font-size:20px;padding-right:40px}" +
    "#dondlg .lead{font-size:14px;color:var(--muted);margin:0}#dondlg .grp{display:flex;flex-direction:column;gap:6px}#dondlg .grp>span{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em}" +
    "#dondlg .chips{display:flex;flex-wrap:wrap;gap:6px}#dondlg .chip{border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 14px;font:600 14px var(--f-body);cursor:pointer}" +
    "#dondlg .chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}" +
    "#dondlg input[type=text],#dondlg input[type=number],#dondlg input[type=date]{padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:15px var(--f-body);min-width:0}" +
    "#dondlg .pay{padding:12px;border-radius:10px;background:var(--sunk);font-size:15px;white-space:pre-wrap;user-select:all}" +
    "#dondlg .rc{display:flex;gap:10px;align-items:center}#dondlg .rc img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}" +
    "#dondlg .note{font-size:12px;color:var(--muted);margin:0}#dondlg .tog{display:flex;gap:8px;align-items:center;font-size:14px}#dondlg .row{display:flex;gap:8px;flex-wrap:wrap}#dondlg .row>*{flex:1 1 140px}" +
    "#dondlg .ok{padding:14px;border-radius:10px;background:var(--ok-soft);color:var(--ink);font-size:15px}" +
    "#ghfund .opt{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1.5px solid var(--line);border-radius:10px;cursor:pointer}#ghfund .opt.on{border-color:var(--accent);background:var(--accent-soft)}" +
    "#ghfund .opt small{display:block;color:var(--muted);font-size:12px}#ghfund textarea,#ghfund input[type=text]{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:14px var(--f-body)}" +
    "#ghinbox .it{display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:10px}#ghinbox .it img{width:72px;height:72px;object-fit:cover;border-radius:8px;cursor:zoom-in;background:var(--sunk)}" +
    "#ghinbox .it .a{display:flex;gap:6px;flex-wrap:wrap}#ghinbox .it small{color:var(--muted)}.fundadm{margin-top:6px}";
  document.head.appendChild(css);

  /* ---------- donation dialog ---------- */
  var dlg = document.createElement("dialog"); dlg.id = "dondlg"; document.body.appendChild(dlg);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  var st = {};
  function payFor(t) {
    var G = groups(), g = t.fund || (t.dog && dog(t.dog) && (fundOf(dog(t.dog)) || dog(t.dog).lead)) || "";
    return (g && G[g] && G[g].pay) || A.state.settings.pay || "";
  }
  function contacts() {
    var s = A.state.settings, out = [];
    var tg = (s.telegram || "").trim().replace(/^@|^https?:\/\/t\.me\//g, ""), ig = (s.instagram || "").trim().replace(/^@|^https?:\/\/(www\.)?instagram\.com\//g, "").replace(/\/$/, ""), wa = (s.whatsapp || "").replace(/\D/g, "");
    if (wa) out.push({ k: "wa", label: "WhatsApp", url: "https://wa.me/" + wa });
    if (tg) out.push({ k: "tg", label: "Telegram", url: "https://t.me/" + encodeURIComponent(tg) });
    if (ig) out.push({ k: "ig", label: "Instagram", url: "https://ig.me/m/" + encodeURIComponent(ig) });
    return out;
  }
  function openDonate(t) {
    var d = t.dog ? dog(t.dog) : null, fd = t.fund || fundOf(d);
    st = { dog: fd ? (d ? d.id : "") : (d ? d.id : ""), fund: fd || "", period: "once", amount: 5000, custom: false, name: "", show: true, file: null, read: null, date: today(), done: false };
    draw(); if (!dlg.open) dlg.showModal();
  }
  function message() {
    var t = T(), d = st.dog ? dog(st.dog) : null;
    var target = st.fund ? f(t.toFund, st.fund) : d ? f(t.toDog, d.id + (d.name ? " (" + d.name + ")" : "")) : t.toSite;
    return t.msg.replace("%a", money(st.amount)).replace("%t", target) + "\n" + t.cmt + ": " + comment(st) + (st.name ? "\n" + t.name + ": " + st.name : "");
  }
  function draw() {
    var t = T(), d = st.dog ? dog(st.dog) : null, pay = payFor(st);
    if (st.done) {
      dlg.innerHTML = '<button class="x" aria-label="×" data-close>×</button><div class="in"><h2>' + t.title + '</h2><div class="ok">' + t.sent + "</div></div>";
      dlg.querySelector("[data-close]").onclick = function () { dlg.close(); };
      return;
    }
    function chip(k, v, label) { return '<button type="button" class="chip" data-' + k + '="' + v + '" aria-pressed="' + (st[k] === v) + '">' + label + "</button>"; }
    dlg.innerHTML = '<button class="x" aria-label="×" data-close>×</button><div class="in">' +
      "<h2>" + (st.fund ? esc(f(t.titleFund, st.fund)) : t.title) + "</h2>" +
      (d ? '<p class="lead">' + t.forDog + ": " + esc(d.id + (d.name ? " · " + d.name : "")) + (st.fund ? " · " + esc(f(t.ledBy, st.fund)) : "") + "</p>" : "") +
      (st.fund && groups()[st.fund] && groups()[st.fund].about ? '<p class="lead">' + esc(groups()[st.fund].about) + "</p>" : "") +
      '<div class="grp"><span>' + t.period + '</span><div class="chips">' + chip("period", "once", t.once) + chip("period", "month", t.monthly) + "</div></div>" +
      '<div class="grp"><span>' + t.amount + '</span><div class="chips">' + AMOUNTS.map(function (a) { return '<button type="button" class="chip" data-amt="' + a + '" aria-pressed="' + (!st.custom && st.amount === a) + '">' + money(a) + "</button>"; }).join("") +
      '<input type="number" min="1" step="any" id="donamt" placeholder="' + t.other + '" value="' + (st.custom && st.amount ? st.amount : "") + '" style="flex:1 1 130px"></div></div>' +
      '<div class="grp"><span>' + t.payTitle + "</span>" + (pay ? '<div class="pay">' + esc(pay) + "</div>" : '<p class="note">' + t.payNone + "</p>") +
      '<p class="note">' + t.cmt + ': <b id="doncmt">' + esc(comment(st)) + '</b> <button type="button" class="btn ghost sm" id="doncmtc">' + t.cmtCopy + "</button><br>" + t.cmtNote + "</p></div>" +
      '<div class="grp"><span>' + t.upTitle + '</span><p class="note">' + t.upNote + "</p>" +
      '<div class="rc">' + (st.read ? '<img alt="" src="' + st.read.thumbUrl + '">' : "") + '<label class="btn ghost" style="cursor:pointer">' + t.pick + '<input type="file" id="donfile" accept="image/*,application/pdf,.pdf" hidden></label></div>' +
      '<p class="note" id="donstat"></p>' +
      '<div class="row"><input type="number" id="donsum" min="1" step="any" placeholder="' + t.amount + ", " + esc(cur()) + '" value="' + (st.read && st.read.amount ? st.read.amount : "") + '"><input type="date" id="dondate" value="' + esc(st.date) + '"></div>' +
      (BOT ? '<a class="note" target="_blank" rel="noopener" href="' + esc(tgReceipt(st)) + '">' + t.orTg + " →</a>" : "") + "</div>" +
      '<div class="grp"><span>' + t.name + '</span><input type="text" id="donname" maxlength="60" autocomplete="name" value="' + esc(st.name) + '"><label class="tog"><input type="checkbox" id="donshow"' + (st.show ? " checked" : "") + "> " + t.show + "</label></div>" +
      (INBOX ? '<button class="btn" id="donsend">' + t.send + "</button>" :
        '<div class="grp"><span>' + t.noInbox + '</span><div class="row">' + contacts().map(function (c) { return '<a class="btn" target="_blank" rel="noopener" data-send="' + c.k + '" href="' + esc(c.url + (c.k === "wa" ? "?text=" + encodeURIComponent(message()) : "")) + '">' + c.label + "</a>"; }).join("") +
        '<button type="button" class="btn ghost" id="doncopy">' + t.copy + "</button></div></div>") + "</div>";
    dlg.querySelector("[data-close]").onclick = function () { dlg.close(); };
    dlg.querySelectorAll("[data-period]").forEach(function (b) { b.onclick = function () { st.period = b.dataset.period; draw(); }; });
    dlg.querySelectorAll("[data-amt]").forEach(function (b) { b.onclick = function () { st.amount = +b.dataset.amt; st.custom = false; draw(); }; });
    var amt = dlg.querySelector("#donamt"); amt.oninput = function () { st.custom = !!amt.value; st.amount = +amt.value || 0; };
    dlg.querySelector("#donname").oninput = function (e) { st.name = e.target.value.trim(); };
    dlg.querySelector("#donshow").onchange = function (e) { st.show = e.target.checked; };
    dlg.querySelector("#dondate").oninput = function (e) { st.date = e.target.value; };
    dlg.querySelector("#donfile").onchange = function (e) { var file = e.target.files[0]; if (file) readFile(file); };
    dlg.querySelector("#doncmtc").onclick = function () { try { navigator.clipboard.writeText(comment(st)).then(function () { A.toast(T().copied); }); } catch (x) {} };
    var cp = dlg.querySelector("#doncopy"); if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(message()).then(function () { A.toast(T().copied); }); } catch (x) {} };
    var sb = dlg.querySelector("#donsend"); if (sb) sb.onclick = send;
  }
  function stat(s) { var e = dlg.querySelector("#donstat"); if (e) e.textContent = s || ""; }
  function loadReader() {
    if (window.TTSReceipts) return Promise.resolve(window.TTSReceipts);
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "receipts.js"; s.onload = function () { res(window.TTSReceipts); }; s.onerror = rej; document.head.appendChild(s); });
  }
  async function readFile(file) {
    stat(T().reading);
    try {
      var R = await loadReader(), r = await R.read(file);
      st.read = { amount: r.amount, date: r.date, full: r.full, thumbUrl: URL.createObjectURL(r.thumb), ok: r.ok };
      if (r.date) st.date = r.date;
      if (r.ok && !st.custom) { st.amount = r.amount; }
      draw(); stat(r.ok ? T().readOk : T().readBad);
    } catch (e) { console.warn(e); stat(T().err); }
  }
  function dataUrl(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(b); }); }
  async function send() {
    var t = T(), b = dlg.querySelector("#donsend"), sum = +dlg.querySelector("#donsum").value || 0;
    if (!st.read) return A.toast(t.needFile);
    if (!(sum > 0)) return A.toast(t.needAmount);
    b.disabled = true; b.textContent = t.sending;
    try {
      var img = await dataUrl(st.read.full);
      var r = await fetch(INBOX + "/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        image: img, amount: sum, date: st.date, name: st.name, show: st.show, dog: st.dog, fund: st.fund, kind: "donation", period: st.period, read: !!st.read.ok
      }) });
      if (!r.ok) throw new Error("http " + r.status);
      st.done = true; draw();
    } catch (e) { console.warn(e); b.disabled = false; b.textContent = t.send; A.toast(t.err); }
  }

  function leftOf(d) { if (!d || !window.__STAGES) return 0; var w = window.__STAGES.whole(d); return Math.max(0, w.g - w.r); }
  // Pick one dog of the group to curate (or any dog still waiting if the group leads none yet).
  function choose(g) {
    var t = T(), mine = (A.state.dogs || []).filter(function (d) { return d.lead === g && d.status !== "adopted"; });
    var list = mine.length ? mine : (A.state.dogs || []).filter(function (d) { return d.status !== "adopted"; });
    dlg.innerHTML = '<button class="x" aria-label="×" data-close>×</button><div class="in"><h2>' + t.chooseTitle + '</h2><p class="lead">' + t.chooseNote + "</p>" +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">' + list.map(function (d) {
        var w = window.__STAGES ? window.__STAGES.whole(d) : { g: 0, r: 0, paid: false };
        return '<button type="button" data-dchoose="' + esc(d.id) + '" style="all:unset;cursor:pointer;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface);display:flex;flex-direction:column">' +
          '<img alt="" src="' + esc(d.photos && d.photos[0] ? A.photoURL(d.photos[0], true) : "") + '" style="width:100%;aspect-ratio:1;object-fit:cover;background:var(--sunk)">' +
          '<span style="padding:8px;font-size:13px;display:flex;flex-direction:column;gap:2px"><b>' + esc(d.id + (d.name ? " · " + d.name : "")) + "</b>" +
          (w.g ? '<span class="muted">' + (w.paid ? t.wholePaid + " ✓" : t.wholeLeft + " " + money(w.g - w.r)) + "</span>" : "") + "</span></button>";
      }).join("") + "</div></div>";
    dlg.querySelector("[data-close]").onclick = function () { dlg.close(); };
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- public: funds strip, card and dog page buttons ---------- */
  var fbox = document.createElement("section"); fbox.id = "fundsbox";
  function drawFunds() {
    var t = T(), F = fundGroups(), G = groups();
    var sig = JSON.stringify([F, F.map(totals), F.map(function (g) { return G[g]; }), lang()]);
    if (fbox.dataset.sig === sig) return; fbox.dataset.sig = sig;
    fbox.innerHTML = !F.length ? "" : "<h2>" + t.funds + '</h2><p class="muted" style="margin:4px 0 0;font-size:14px">' + t.fundsNote + '</p><div class="fl">' + F.map(function (g) {
      var s = totals(g);
      return '<div class="fc"><b class="nm">' + esc(g) + "</b>" + (G[g].about ? '<span class="ab">' + esc(G[g].about) + "</span>" : "") +
        '<div class="nums"><span>' + t.inW + "<b>" + money(s.i) + "</b></span><span>" + t.outW + "<b>" + money(s.o) + "</b></span><span>" + t.left + "<b>" + money(s.i - s.o) + "</b></span></div>" +
        '<span class="ab">' + t.leads + ": <b>" + s.n + '</b></span><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn" data-dfund="' + esc(g) + '" style="flex:1 1 140px">' + t.helpFund + '</button><button type="button" class="btn ghost" data-dpick="' + esc(g) + '" style="flex:1 1 140px">' + t.pickDog + "</button></div></div>";
    }).join("") + "</div>";
  }
  function placeFunds() {
    if (admin()) { if (fbox.isConnected) fbox.remove(); return; }
    var grid = document.querySelector("#app .grid"), filters = document.querySelector("#app .filters");
    var anchor = filters || grid; if (!anchor) return;
    if (fbox.nextElementSibling !== anchor) anchor.parentNode.insertBefore(fbox, anchor);
    drawFunds();
  }
  function decorateCards() {
    document.querySelectorAll(".card").forEach(function (card) {
      var tid = card.querySelector(".tid"), d = tid && dog(tid.textContent.trim()); if (!d) return;
      var fd = fundOf(d), sig = JSON.stringify([fd, d.status, lang()]), box = card.querySelector(".don");
      if (box && box.dataset.sig === sig) return;
      if (!box) { box = document.createElement("div"); box.className = "don"; card.querySelector(".cb").appendChild(box); }
      box.dataset.sig = sig;
      box.innerHTML = d.status === "adopted" ? "" : '<span class="dbt" role="button" data-ddog="' + esc(d.id) + '">' + (fd ? esc(f(T().donateFund, fd)) : T().donate) + "</span>";
    });
  }
  function decorateDialog() {
    document.querySelectorAll("dialog[open] .dinfo").forEach(function (info) {
      var tid = info.querySelector(".tid"), d = tid && dog(tid.textContent.trim()); if (!d) return;
      var fd = fundOf(d), sig = JSON.stringify([fd, d.status, lang(), BOT]), box = info.querySelector(".donx");
      if (box && box.dataset.sig === sig) return;
      if (!box) { box = document.createElement("div"); box.className = "donx"; box.style.cssText = "display:flex;flex-direction:column;gap:6px;margin-top:12px"; var cx = info.querySelector(".curx") || info.querySelector(".apply"); info.insertBefore(box, cx || null); }
      box.dataset.sig = sig;
      box.innerHTML = (fd ? '<span class="muted" style="font-size:13px">' + esc(f(T().ledBy, fd)) + "</span>" : "") +
        (d.status === "adopted" ? "" : '<button type="button" class="btn" data-ddog="' + esc(d.id) + '">' + (fd ? esc(f(T().donateFund, fd)) : T().donate) + "</button>") +
        (BOT ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://t.me/' + esc(BOT) + "?start=f_" + esc(d.id) + '">' + T().follow + '</a><span class="muted" style="font-size:12px">' + T().followNote + "</span>" : "");
    });
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-ddog],[data-dfund],[data-flead],[data-dpick],[data-dchoose],[data-told]"); if (!el) return;
    e.preventDefault(); e.stopPropagation();
    if (el.dataset.dpick) return choose(el.dataset.dpick);
    if (el.dataset.dchoose) { dlg.close(); if (window.__CUR) window.__CUR.open(el.dataset.dchoose, { role: "main", period: "once", full: true, amount: leftOf(dog(el.dataset.dchoose)) || 5000, custom: true }); return; }
    if (el.dataset.told) { var dd = dog(el.dataset.told); if (dd) { dd.paidNotified = true; A.render(); drawInbox(); } return; }
    if (el.dataset.flead) return toggleLead(el.dataset.flead);
    openDonate(el.dataset.dfund ? { fund: el.dataset.dfund } : { dog: el.dataset.ddog });
  }, true);

  /* ---------- admin: group system, fund animals, receipts inbox ---------- */
  function me() { return window.__GH ? window.__GH.group() : ""; }
  function owner() { return window.__GH && window.__GH.owner(); }
  var gbox = document.createElement("section"); gbox.id = "ghfund"; gbox.style.cssText = "max-width:1240px;margin:0 auto 24px;padding:0 max(16px,3vw)";
  function drawGroup() {
    var t = T(), g = me(), G = groups(), mine = G[g] || {}, mode = mine.mode || "animal";
    gbox.innerHTML = '<div class="panel"><h2>' + t.gTitle + ": «" + esc(g) + '»</h2><p class="muted" style="font-size:14px">' + t.gNote + "</p>" +
      '<label class="opt' + (mode === "animal" ? " on" : "") + '"><input type="radio" name="gmode" value="animal"' + (mode === "animal" ? " checked" : "") + "><span><b>" + t.mAnimal + "</b><small>" + t.mAnimalNote + "</small></span></label>" +
      '<label class="opt' + (mode === "fund" ? " on" : "") + '"><input type="radio" name="gmode" value="fund"' + (mode === "fund" ? " checked" : "") + "><span><b>" + t.mFund + "</b><small>" + t.mFundNote + "</small></span></label>" +
      '<label class="field"><span>' + t.pay + '</span><input type="text" id="gpay" maxlength="200" placeholder="' + esc(t.payPh) + '" value="' + esc(mine.pay || "") + '"></label>' +
      (mode === "fund" ? '<label class="field"><span>' + t.about + '</span><textarea id="gabout" rows="2" maxlength="300">' + esc(mine.about || "") + "</textarea></label>" : "") +
      (owner() ? '<label class="field"><span>' + t.sitePay + '</span><input type="text" id="spay" maxlength="200" placeholder="' + esc(t.payPh) + '" value="' + esc(A.state.settings.pay || "") + '"></label>' : "") +
      '<div><button class="btn" id="gsave">' + t.save + "</button></div></div>";
    gbox.querySelectorAll("input[name=gmode]").forEach(function (r) { r.onchange = function () { G[g] = Object.assign({}, G[g] || {}, { mode: r.value }); A.render(); drawGroup(); }; });
    gbox.querySelector("#gsave").onclick = function () {
      var x = Object.assign({}, G[g] || {}, { mode: (gbox.querySelector("input[name=gmode]:checked") || {}).value || "animal", pay: gbox.querySelector("#gpay").value.trim() });
      var ab = gbox.querySelector("#gabout"); if (ab) x.about = ab.value.trim();
      G[g] = x;
      var sp = gbox.querySelector("#spay"); if (sp) A.state.settings.pay = sp.value.trim();
      A.render(); A.toast(t.saved);
    };
  }
  function toggleLead(id) {
    var d = dog(id), g = me(); if (!d) return;
    if (d.lead === g || (owner() && d.lead)) delete d.lead; else if (!d.lead) d.lead = g;
    A.render(); A.toast(T().saved);
  }
  function decorateAdminRows() {
    document.querySelectorAll("tbody tr[data-id]").forEach(function (tr) {
      var d = dog(tr.dataset.id), cell = tr.cells[2]; if (!d || !cell) return;
      var g = me(), show = isFund(g) || (owner() && d.lead), sig = JSON.stringify([d.lead, g, show]);
      var b = cell.querySelector(".fundadm");
      if (b && b.dataset.sig === sig) return;
      if (!show) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "btn ghost sm fundadm"; cell.appendChild(b); }
      b.dataset.sig = sig; b.dataset.flead = d.id;
      b.disabled = !!(d.lead && d.lead !== g && !owner());
      b.textContent = d.lead ? (d.lead === g || owner() ? T().drop + " (" + d.lead + ")" : T().led + ": " + d.lead) : T().take;
    });
  }

  var ibox = document.createElement("section"); ibox.id = "ghinbox"; ibox.style.cssText = "max-width:1240px;margin:0 auto 24px;padding:0 max(16px,3vw)";
  var inbox = { items: null, busy: false, accepted: {} };
  function tokenHdr() { var t = ""; try { t = localStorage.getItem("tts.ghtoken") || ""; } catch (e) {} return { Authorization: "Bearer " + t }; }
  async function loadInbox() {
    if (!INBOX) return drawInbox();
    inbox.busy = true; drawInbox();
    try { var r = await fetch(INBOX + "/pending", { headers: tokenHdr() }); var j = await r.json(); inbox.items = (j.items || []).filter(function (x) { return !inbox.accepted[x.id]; }); }
    catch (e) { console.warn(e); inbox.items = []; }
    inbox.busy = false; drawInbox();
  }
  function drawInbox() {
    var t = T();
    var paid = (A.state.dogs || []).filter(function (d) { return (d.curators || []).length && !d.paidNotified && window.__STAGES && window.__STAGES.whole(d).paid; });
    ibox.innerHTML = (paid.length ? '<div class="panel" style="margin-bottom:16px;border-color:var(--ok)"><h2>' + t.paidTitle + "</h2>" + paid.map(function (d) {
        var msg = f(t.paidMsg, d.id + (d.name ? " (" + d.name + ")" : ""));
        return '<div class="it" style="grid-template-columns:1fr auto"><div><b>' + esc(d.id) + "</b> · " + esc((d.curators || []).map(function (c) { return c.name || t.anon; }).join(", ")) + '<br><small>' + esc(msg) + '</small></div><div class="a"><button class="btn ghost sm" data-copymsg="' + esc(msg) + '">' + t.copyMsg + '</button><button class="btn sm" data-told="' + esc(d.id) + '">' + t.told + "</button></div></div>";
      }).join("") + "</div>" : "") +
      '<div class="panel"><h2>' + t.inbox + '</h2><p class="muted" style="font-size:14px">' + (INBOX ? t.inboxNote : t.inboxOff) + "</p>" +
      (!INBOX ? "" : inbox.busy ? '<p class="muted">' + t.load + "</p>" : !inbox.items || !inbox.items.length ? '<p class="muted">' + t.empty + "</p>" :
        '<div style="display:flex;flex-direction:column;gap:8px">' + inbox.items.map(function (x) {
          var d = x.dog ? dog(x.dog) : null, target = x.fund ? f(t.toFund, x.fund) : d ? f(t.toDog, d.id) : x.dog ? f(t.toDog, x.dog) : t.toSite, ex = x.kind === "expense";
          return '<div class="it" data-iid="' + esc(x.id) + '"><img alt="' + (x.pdf ? t.pdf : "") + '" data-iimg="' + esc(x.id) + '"><div><b>' + (ex ? "−" : "") + (x.amount ? money(x.amount) : t.noAmount) + "</b> · " + (ex ? t.exp + " · " : "") + esc(target) +
            "<br><small>" + esc(x.date || x.at.slice(0, 10)) + " · " + esc(ex ? x.name || "" : x.show && x.name ? x.name : (x.name ? x.name + " (" + t.anon.toLowerCase() + ")" : t.anon)) + (x.period === "month" ? " · " + t.monthly : "") + (x.from === "tg" ? " · " + t.fromTg : "") + (x.note ? "<br>«" + esc(x.note) + "»" : "") + '</small></div><div class="a"><button class="btn sm" data-iok="' + esc(x.id) + '">' + t.accept + '</button><button class="btn ghost sm" data-ino="' + esc(x.id) + '">' + t.reject + "</button></div></div>";
        }).join("") + "</div>") +
      (INBOX ? '<div><button class="btn ghost sm" id="ghirf">' + t.refresh + "</button></div>" : "") + "</div>" +
      (INBOX ? '<div class="panel" style="margin-top:16px"><h2>' + t.tgTitle + '</h2><p class="muted" style="font-size:14px">' + (BOT ? esc(f(t.tgOn, BOT)) : t.tgOff) + "</p>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (BOT ? '<button class="btn sm" id="ghtgme">' + t.tgMe + "</button>" : "") + (owner() ? '<button class="btn ghost sm" id="ghtgset">' + t.tgSetup + "</button>" : "") + '</div><p id="ghtgout" style="font-size:14px"></p></div>' : "");
    var rf = ibox.querySelector("#ghirf"); if (rf) rf.onclick = loadInbox;
    var tme = ibox.querySelector("#ghtgme"), tset = ibox.querySelector("#ghtgset"), tout = ibox.querySelector("#ghtgout");
    if (tme) tme.onclick = async function () {
      try {
        var r = await fetch(INBOX + "/tg/code", { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, tokenHdr()), body: JSON.stringify({ group: me() }) });
        var j = await r.json(); if (!j.code) throw 0;
        tout.innerHTML = esc(t.tgMeNote) + '<br><a class="btn sm" target="_blank" rel="noopener" style="margin-top:6px" href="https://t.me/' + esc(j.bot || BOT) + "?start=v_" + esc(j.code) + '">' + t.tgLink + "</a>";
      } catch (e) { tout.textContent = t.tgFail; }
    };
    if (tset) tset.onclick = async function () {
      try {
        var r = await fetch(INBOX + "/tg/setup", { method: "POST", headers: tokenHdr() }); var j = await r.json();
        if (!j.bot) throw 0; BOT = j.bot; drawInbox();
      } catch (e) { tout.textContent = t.tgFail; }
    };
    ibox.querySelectorAll("[data-copymsg]").forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.dataset.copymsg).then(function () { A.toast(T().copied); }); } catch (x) {} }; });
    ibox.querySelectorAll("[data-iimg]").forEach(function (im) {
      thumb(im.dataset.iimg).then(function (u) {
        if (!u) return;
        fetch(u).then(function (r) { return r.blob(); }).then(function (b) {
          var bu = URL.createObjectURL(b);
          if (/pdf/.test(b.type)) { im.removeAttribute("src"); im.style.cssText = "display:grid;place-items:center;font:700 14px var(--f-body)"; }
          else im.src = bu;
          im.onclick = function () { window.open(bu, "_blank"); };
        });
      });
    });
    ibox.querySelectorAll("[data-iok]").forEach(function (b) { b.onclick = function () { accept(b.dataset.iok, b); }; });
    ibox.querySelectorAll("[data-ino]").forEach(function (b) {
      b.onclick = async function () {
        if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = t.sureReject; b.classList.add("danger"); return; }
        try { await fetch(INBOX + "/pending/" + b.dataset.ino, { method: "DELETE", headers: tokenHdr() }); } catch (e) {}
        inbox.items = inbox.items.filter(function (x) { return x.id !== b.dataset.ino; }); drawInbox();
      };
    });
  }
  var full = {};
  async function getFull(id) {
    if (full[id]) return full[id];
    var r = await fetch(INBOX + "/pending/" + id, { headers: tokenHdr() }); if (!r.ok) return null;
    full[id] = await r.json(); return full[id];
  }
  async function thumb(id) { try { var v = await getFull(id); return v && v.image; } catch (e) { return null; } }
  async function accept(id, btn) {
    btn.disabled = true;
    try {
      var v = await getFull(id); if (!v) throw new Error("gone");
      if (v.meta.from === "tg" || v.meta.kind === "expense") return await acceptRead(id, v, btn);
      var x = v.meta, blob = await (await fetch(v.image)).blob(), img = await createImageBitmap(blob);
      function jpg(max, q) { var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return new Promise(function (r) { c.toBlob(r, "image/jpeg", q); }); }
      var e = { id: "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: "in", date: x.date || x.at.slice(0, 10), amount: +x.amount || 0, dog: x.dog || "", stage: "", note: x.period === "month" ? (lang() === "ru" ? "ежемесячно" : "monthly") : "", who: x.show ? x.name : "" };
      if (!(e.amount > 0)) { e.amount = 0; e.noAmount = true; }
      var d = e.dog ? dog(e.dog) : null;
      if (x.fund) { e.fund = x.fund; e.g = x.fund; }
      else if (d) { e.stage = d.status === "adopted" ? "home" : d.stage || "capture"; if (fundOf(d)) { e.fund = fundOf(d); e.g = e.fund; } }
      e.receipt = "r-" + e.id.toLowerCase();
      A.LOCAL.set(e.receipt + "|f", URL.createObjectURL(await jpg(1800, 0.85)));
      A.LOCAL.set(e.receipt + "|t", URL.createObjectURL(await jpg(360, 0.8)));
      if (!e.g && window.__GH) e.g = window.__GH.group();
      A.state.ledger = A.state.ledger || []; A.state.ledger.push(e);
      if (d && e.stage && !e.fund && e.amount > 0) {
        d.funds = d.funds || {}; var fs = d.funds[e.stage] = d.funds[e.stage] || { raised: 0, goal: "" };
        fs.raised = Math.round(((+fs.raised || 0) + e.amount) * 100) / 100;
      }
      inbox.accepted[id] = 1; inbox.items = inbox.items.filter(function (y) { return y.id !== id; });
      A.render(); drawInbox(); A.toast(T().accepted);
    } catch (err) { console.warn(err); btn.disabled = false; A.toast(T().err); }
  }
  // Receipts from Telegram are not yet read or redacted: read them now (amount, date, covered card and phone numbers).
  async function acceptRead(id, v, btn) {
    var x = v.meta, blob = await (await fetch(v.image)).blob();
    var file = new File([blob], x.pdf ? "receipt.pdf" : "receipt.jpg", { type: blob.type });
    var R = await loadReader(), r = await R.read(file);
    var ex = x.kind === "expense", d = x.dog ? dog(x.dog) : null;
    var amount = +x.amount || (r.ok ? r.amount : 0);
    var what = String(x.note || "").replace(/(^|\s)[DdДд]\s*-?\s*\d{1,5}(?!\d)/, " ").replace(/\d[\d\s.,]*\d|\d/g, " ").replace(/\s+/g, " ").trim();
    var e = { id: "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: ex ? "out" : "in", date: r.date || x.date || x.at.slice(0, 10), amount: amount, dog: d ? d.id : "", stage: "", note: "", auto: true };
    if (!(amount > 0)) { e.amount = 0; e.noAmount = true; }
    if (ex) { e.what = what || (r.ok && r.seller) || (lang() === "ru" ? "Покупка сделана" : "Purchase made"); e.stage = x.stage || (d ? (d.status === "adopted" ? "home" : d.stage || "capture") : ""); }
    else { e.who = x.show ? x.name : ""; if (d) e.stage = d.status === "adopted" ? "home" : d.stage || "capture"; }
    if (x.fund) e.fund = x.fund; else if (d && fundOf(d)) e.fund = fundOf(d);
    e.g = e.fund || (window.__GH ? window.__GH.group() : "");
    e.receipt = "r-" + e.id.toLowerCase();
    A.LOCAL.set(e.receipt + "|f", URL.createObjectURL(r.full));
    A.LOCAL.set(e.receipt + "|t", URL.createObjectURL(r.thumb));
    A.state.ledger = A.state.ledger || []; A.state.ledger.push(e);
    if (!ex && d && e.stage && !e.fund && e.amount > 0) {
      d.funds = d.funds || {}; var fs = d.funds[e.stage] = d.funds[e.stage] || { raised: 0, goal: "" };
      fs.raised = Math.round(((+fs.raised || 0) + e.amount) * 100) / 100;
    }
    inbox.accepted[id] = 1; inbox.items = inbox.items.filter(function (y) { return y.id !== id; });
    A.render(); drawInbox(); A.toast(T().accepted);
  }

  /* ---------- Telegram news for people who follow a dog ---------- */
  var base = null;
  function snapDogs() {
    var o = {};
    (A.state.dogs || []).forEach(function (d) {
      var p = (window.__STAGES ? window.__STAGES.plan(d) : {}) || {};
      o[d.id] = { st: d.status === "adopted" ? "home" : d.stage || "capture", ad: d.status === "adopted", paid: !!(window.__STAGES && window.__STAGES.whole(d).paid), done: ["capture", "vet", "foster", "home"].filter(function (s) { return (p[s] || {}).done; }), rc: [] };
    });
    (A.state.ledger || []).forEach(function (e) { if (e.dog && e.type === "out" && o[e.dog]) o[e.dog].rc.push(e.id); });
    return o;
  }
  var STN = { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом" };
  function news(prev, now) {
    var out = [];
    Object.keys(now).forEach(function (id) {
      var a = prev[id], b = now[id], d = dog(id); if (!a || !d) return;
      var nm = d.id + (d.name ? " " + d.name : ""), msg = [];
      var S = ["capture", "vet", "foster", "home"], pl = window.__STAGES ? window.__STAGES.plan(d) : {};
      if (b.ad && !a.ad) msg.push("🏠 " + nm + " нашла дом!");
      else if (S.indexOf(b.st) > S.indexOf(a.st)) { var dt = (pl[b.st] || {}).start; msg.push("🐾 " + nm + ": новый этап — «" + STN[b.st] + "»" + (dt ? ", с " + window.__STAGES.show(dt) : "") + "."); }
      var fresh = b.rc.filter(function (x) { return a.rc.indexOf(x) < 0; });
      fresh.slice(0, 5).forEach(function (lid) {
        var e = (A.state.ledger || []).filter(function (y) { return y.id === lid; })[0]; if (!e) return;
        msg.push("🧾 Новый чек: " + (e.what || "расход") + (e.noAmount ? "" : ", " + money(e.amount)) + ".");
      });
      if (b.paid && !a.paid) msg.push("✅ Весь путь собаки полностью оплачен. Спасибо!");
      if (msg.length) out.push({ dog: id, text: msg.join("\n") + "\n" + location.origin + location.pathname.replace(/[^/]*$/, "") + "#" + encodeURIComponent(id) });
    });
    return out;
  }
  async function sendNews(list) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      var from = 0;
      for (var k = 0; k < 20; k++) {
        try {
          var r = await fetch(INBOX + "/notify", { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, tokenHdr()), body: JSON.stringify({ dog: list[i].dog, text: list[i].text, from: from }) });
          var j = await r.json(); n += j.sent || 0; if (!j.rest) break; from = j.next;
        } catch (e) { break; }
      }
    }
    if (n) A.toast(f(T().notified, n));
  }
  window.addEventListener("tts:published", function () {
    if (!INBOX || !base) return;
    var now = snapDogs(), list = news(base, now); base = now;
    if (BOT && list.length) sendNews(list);
  });

  // Accepted receipts leave the inbox once the site is published.
  window.addEventListener("tts:published", function () {
    Object.keys(inbox.accepted).forEach(function (id) { fetch(INBOX + "/pending/" + id, { method: "DELETE", headers: tokenHdr() }).catch(function () {}); delete inbox.accepted[id]; });
  });

  function placeAdmin() {
    if (!admin()) return;
    var anchor = document.getElementById("ghmoney") || document.getElementById("ghhist") || document.getElementById("ghvp") || document.getElementById("toast");
    if (!ibox.isConnected) { anchor.parentNode.insertBefore(ibox, anchor); loadInbox(); }
    if (!gbox.isConnected && window.__GH) { ibox.parentNode.insertBefore(gbox, ibox); drawGroup(); }
    if (!window.__FOSTLOAD) { window.__FOSTLOAD = 1; var fs = document.createElement("script"); fs.src = "fosters.js"; document.body.appendChild(fs); }
    if (!base && (A.state.dogs || []).length) base = snapDogs();
  }

  // The public catalog loads dogs and settings only; fund totals also need the money log.
  var ledgerLoad = false;
  function needLedger() {
    if (ledgerLoad || admin() || Array.isArray(A.state.ledger)) return;
    ledgerLoad = true;
    fetch("data.json?l=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { if (!Array.isArray(A.state.ledger)) A.state.ledger = j.ledger || []; soon(); }).catch(function () { ledgerLoad = false; });
  }
  var paidSig = "";
  function all() {
    needLedger(); placeFunds(); decorateCards(); decorateDialog();
    if (admin()) {
      placeAdmin(); decorateAdminRows();
      var ps = JSON.stringify((A.state.dogs || []).map(function (d) { return [d.id, d.paidNotified, (d.curators || []).length, window.__STAGES && window.__STAGES.whole(d).paid]; }));
      if (ps !== paidSig) { paidSig = ps; if (ibox.isConnected && !inbox.busy) drawInbox(); }
    }
  }
  var queued = false;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; all(); }); }
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
  setInterval(all, 1500);
  all();
})();
