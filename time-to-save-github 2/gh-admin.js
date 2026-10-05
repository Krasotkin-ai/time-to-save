/* Time to Save — volunteer sign-in and publishing through GitHub.
   The site repository is the database: data.json + photo files. */
(function () {
  "use strict";
  var CFG = (window.TTS_CONFIG || {}).github || {};
  var API = "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo;
  var BR = CFG.branch || "main";
  var KEY = "tts.ghtoken";
  var ru = (navigator.language || "ru").toLowerCase().indexOf("ru") === 0 || localStorage.getItem("tts.lang") === "ru";
  var T = ru ? {
    title: "Вход для волонтёров", note: "Нужен ключ доступа GitHub с правом записи в репозиторий сайта. Ключ хранится только в этом браузере.",
    token: "Ключ доступа (github_pat_…)", enter: "Войти", how: "Как получить ключ",
    steps: "1) Откройте ссылку ниже. 2) «Repository access» → «Only select repositories» → " + CFG.repo + ". 3) «Permissions» → «Contents» → «Read and write». 4) «Generate token», скопируйте ключ и вставьте сюда.",
    bad: "Ключ не подошёл или у него нет права записи.", unsaved: "Неопубликованные изменения", unsavedNote: "Посетители увидят их после публикации.",
    pub: "Опубликовать на сайте", pubbing: "Публикую…", discard: "Отменить", done: "Опубликовано. Сайт обновится примерно через минуту.",
    conflict: "Сайт изменили после того, как вы открыли эту страницу. Обновите страницу и повторите изменения.", err: "Не удалось опубликовать. Проверьте интернет и попробуйте ещё раз.",
    signout: "Выйти", toSite: "На сайт", loading: "Загружаю…",
    pwTitle: "Вход для волонтёров", pwNote: "Введите пароль, который вам дали координаторы.", pw: "Пароль", pwBad: "Неверный пароль.", useKey: "Вход по ключу GitHub",
    vTitle: "Пароль для волонтёров", vNote: "Волонтёры входят по этому паролю без ключей GitHub. Не короче 10 символов; передавайте его только своим волонтёрам.", vSet: "Сохранить пароль", vReset: "Отключить все пароли",
    vShort: "Пароль должен быть не короче 10 символов.", vDone: "Пароль сохранён. Работает примерно через минуту.", vOff: "Все пароли отключены.", vCount: "Активных паролей",
    gTitle: "Группы волонтёров", gNote: "У каждой группы своё название и свой пароль (не короче 10 символов). Брони, деньги и изменения подписываются группой. Отключить можно одну группу, не трогая остальные.",
    gName: "Название группы", gPw: "Пароль группы", gAdd: "Добавить группу", gOff: "Отключить", gNone: "Групп пока нет.", gDone: "Группа добавлена. Пароль работает примерно через минуту.", gOffDone: "Группа отключена.",
    owner: "Координатор", defGroup: "Волонтёры", pw1: "пароль", pwN: "пароля"
  } : {
    title: "Volunteer sign-in", note: "You need a GitHub access token with write access to the site repository. It stays only in this browser.",
    token: "Access token (github_pat_…)", enter: "Sign in", how: "How to get a token",
    steps: "1) Open the link below. 2) Repository access → Only select repositories → " + CFG.repo + ". 3) Permissions → Contents → Read and write. 4) Generate token, copy it and paste it here.",
    bad: "The token was rejected or cannot write to the repository.", unsaved: "Unpublished changes", unsavedNote: "Visitors see them after you publish.",
    pub: "Publish to the site", pubbing: "Publishing…", discard: "Discard", done: "Published. The site updates in about a minute.",
    conflict: "The site changed after you opened this page. Reload and redo your changes.", err: "Publishing failed. Check your connection and try again.",
    signout: "Sign out", toSite: "To the site", loading: "Loading…",
    pwTitle: "Volunteer sign-in", pwNote: "Enter the password the coordinators gave you.", pw: "Password", pwBad: "Wrong password.", useKey: "Sign in with a GitHub token",
    vTitle: "Volunteer password", vNote: "Volunteers sign in with this password, no GitHub token needed. At least 10 characters; share it only with your volunteers.", vSet: "Save password", vReset: "Turn off all passwords",
    vShort: "The password must be at least 10 characters.", vDone: "Password saved. It works in about a minute.", vOff: "All passwords turned off.", vCount: "Active passwords",
    gTitle: "Volunteer groups", gNote: "Each group has its own name and password (at least 10 characters). Reservations, money and changes are signed with the group. You can turn off one group without touching the others.",
    gName: "Group name", gPw: "Group password", gAdd: "Add group", gOff: "Turn off", gNone: "No groups yet.", gDone: "Group added. The password works in about a minute.", gOffDone: "Group turned off.",
    owner: "Coordinator", defGroup: "Volunteers", pw1: "password", pwN: "passwords"
  };
  function token() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function path(p) { return [CFG.dir, p].filter(Boolean).join("/"); }
  function encPath(p) { return p.split("/").map(encodeURIComponent).join("/"); }
  async function gh(p, opt) {
    opt = opt || {};
    var h = { Authorization: "Bearer " + token(), Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (opt.body) h["Content-Type"] = "application/json";
    var r = await fetch(API + p, { method: opt.method || "GET", body: opt.body, headers: h, cache: "no-store" });
    if (!r.ok) { var e = new Error("github " + r.status); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  }
  function b64text(s) { var b = new TextEncoder().encode(s), o = ""; for (var i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); }
  function unb64(s) { return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), function (c) { return c.charCodeAt(0); })); }
  function blobB64(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(",")[1]); }; r.onerror = rej; r.readAsDataURL(b); }); }

  var sha = null, baseline = "", busy = false, sent = {};
  function snap(s) { return JSON.stringify({ dogs: s.dogs, settings: s.settings, ledger: s.ledger || [] }); }

  var MODE = "tts.mode", GRP = "tts.group";
  function myGroup() { var g = ""; try { g = localStorage.getItem(GRP) || ""; if (!g) g = localStorage.getItem(MODE) === "pass" ? T.defGroup : T.owner; } catch (e) { g = T.owner; } return g; }
  function isOwner() { try { return localStorage.getItem(MODE) !== "pass"; } catch (e) { return true; } }
  window.__GH = { group: myGroup, owner: isOwner };
  function b64(u8) { var o = ""; for (var i = 0; i < u8.length; i++) o += String.fromCharCode(u8[i]); return btoa(o); }
  function unb64u8(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  async function keyFrom(pw, salt) {
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function seal(pw, secret) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, await keyFrom(pw, salt), new TextEncoder().encode(secret));
    return { salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)), created: new Date().toISOString() };
  }
  async function unseal(pw, e) {
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64u8(e.iv) }, await keyFrom(pw, unb64u8(e.salt)), unb64u8(e.ct));
    return new TextDecoder().decode(pt);
  }
  async function volunteers() {
    try { var r = await fetch("volunteers.json", { cache: "no-store" }); if (!r.ok) return []; var j = await r.json(); return j.entries || []; } catch (e) { return []; }
  }
  async function passForm(msg) {
    var list = await volunteers();
    if (!list.length) return loginForm(msg);
    document.getElementById("app").innerHTML =
      '<section style="max-width:420px;margin:48px auto;padding:0 16px"><form class="panel" id="ghpf"><h2>' + T.pwTitle + '</h2>' +
      '<p class="muted" style="font-size:14px">' + T.pwNote + '</p>' +
      '<label class="field"><span>' + T.pw + '</span><input id="ghpw" type="password" autocomplete="current-password" required></label>' +
      '<p class="report" id="ghe"' + (msg ? "" : " hidden") + '><span class="w">' + esc(msg || "") + '</span></p>' +
      '<button class="btn" type="submit" id="ghpb">' + T.enter + '</button>' +
      '<p style="font-size:13px;display:flex;gap:16px;flex-wrap:wrap"><a href="./">' + T.toSite + '</a><a href="#" id="ghkey">' + T.useKey + '</a></p></form></section>';
    document.getElementById("ghkey").onclick = function (e) { e.preventDefault(); loginForm(); };
    document.getElementById("ghpf").onsubmit = async function (e) {
      e.preventDefault();
      var b = document.getElementById("ghpb"); b.disabled = true; b.textContent = T.loading;
      var pw = document.getElementById("ghpw").value, tok = null;
      var hit = null;
      for (var i = 0; i < list.length && !tok; i++) { try { tok = await unseal(pw, list[i]); hit = list[i]; } catch (x) {} }
      if (!tok) return passForm(T.pwBad);
      try { localStorage.setItem(KEY, tok); localStorage.setItem(MODE, "pass"); localStorage.setItem(GRP, (hit && hit.group) || T.defGroup); } catch (x) {}
      start();
    };
  }
  async function commitFiles(files, message) {
    var tree = [];
    for (var i = 0; i < files.length; i++) {
      var r = await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: b64text(files[i][1]), encoding: "base64" }) });
      tree.push({ path: path(files[i][0]), mode: "100644", type: "blob", sha: r.sha });
    }
    var ref = await gh("/git/ref/heads/" + encodeURIComponent(BR));
    var head = await gh("/git/commits/" + ref.object.sha);
    var nt = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree: tree }) });
    var nc = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: message, tree: nt.sha, parents: [ref.object.sha] }) });
    await gh("/git/refs/heads/" + encodeURIComponent(BR), { method: "PATCH", body: JSON.stringify({ sha: nc.sha }) });
  }
  async function volunteerPanel() {
    if (!isOwner() || document.getElementById("ghvp")) return;
    var box = document.createElement("section");
    box.id = "ghvp";
    box.style.cssText = "max-width:1240px;margin:0 auto 120px;padding:0 max(16px,3vw)";
    document.body.insertBefore(box, document.getElementById("toast"));
    var A = window.__TTS, inp = "padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);min-width:0;flex:1 1 180px";
    async function draw() {
      var list = await volunteers(), groups = {};
      list.forEach(function (e) { var g = e.group || T.defGroup; groups[g] = (groups[g] || 0) + 1; });
      var names = Object.keys(groups).sort();
      box.innerHTML = '<div class="panel"><h2>' + T.gTitle + '</h2><p class="muted" style="font-size:14px">' + T.gNote + '</p>' +
        '<p style="font-size:13px">' + T.vCount + ': <b id="ghvc">' + list.length + '</b></p>' +
        (names.length ? '<div style="display:flex;flex-direction:column;gap:6px">' + names.map(function (g) {
          return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>' + esc(g) + '</b><span class="muted" style="font-size:13px">' + groups[g] + " " + (groups[g] === 1 ? T.pw1 : T.pwN) + '</span><button class="btn ghost sm" data-goff="' + esc(g) + '">' + T.gOff + "</button></div>";
        }).join("") + "</div>" : '<p class="muted" style="font-size:14px">' + T.gNone + "</p>") +
        '<div class="contacts"><input id="ghgn" type="text" maxlength="40" placeholder="' + T.gName + '" style="' + inp + '"><input id="ghvpw" type="text" autocomplete="off" spellcheck="false" placeholder="' + T.gPw + '" style="' + inp + '">' +
        '<button class="btn sm" id="ghvs">' + T.gAdd + '</button><button class="btn ghost sm" id="ghvr">' + T.vReset + "</button></div></div>";
      document.getElementById("ghvs").onclick = async function () {
        var pw = document.getElementById("ghvpw").value.trim(), name = document.getElementById("ghgn").value.trim() || T.defGroup;
        if (pw.length < 10) return A.toast(T.vShort);
        try {
          var cur = await volunteers(), e = await seal(pw, token());
          e.group = name; cur.push(e);
          await commitFiles([["volunteers.json", JSON.stringify({ v: 1, entries: cur }, null, 1)]], "Группа волонтёров: " + name);
          A.toast(T.gDone); await draw();
        } catch (x) { console.error(x); A.toast(T.err); }
      };
      document.getElementById("ghvr").onclick = async function () {
        try { await commitFiles([["volunteers.json", JSON.stringify({ v: 1, entries: [] })]], "Отключены пароли волонтёров"); A.toast(T.vOff); await draw(); }
        catch (x) { console.error(x); A.toast(T.err); }
      };
      box.querySelectorAll("[data-goff]").forEach(function (btn) {
        btn.onclick = async function () {
          var g = btn.dataset.goff;
          try {
            var cur = (await volunteers()).filter(function (e) { return (e.group || T.defGroup) !== g; });
            await commitFiles([["volunteers.json", JSON.stringify({ v: 1, entries: cur }, null, 1)]], "Отключена группа: " + g);
            A.toast(T.gOffDone); await draw();
          } catch (x) { console.error(x); A.toast(T.err); }
        };
      });
    }
    await draw();
  }

  function loginForm(msg) {
    var pat = "https://github.com/settings/personal-access-tokens/new?name=" + encodeURIComponent("Time to Save site") +
      "&description=" + encodeURIComponent("Edit the Time to Save site") + "&target_name=" + encodeURIComponent(CFG.owner) + "&expires_in=365&contents=write";
    document.getElementById("app").innerHTML =
      '<section style="max-width:460px;margin:48px auto;padding:0 16px"><form class="panel" id="ghf"><h2>' + T.title + '</h2>' +
      '<p class="muted" style="font-size:14px">' + T.note + '</p>' +
      '<label class="field"><span>' + T.token + '</span><input id="ght" type="password" autocomplete="off" spellcheck="false" required></label>' +
      '<p class="report" id="ghe"' + (msg ? "" : " hidden") + '><span class="w">' + esc(msg || "") + '</span></p>' +
      '<button class="btn" type="submit" id="ghb">' + T.enter + '</button>' +
      '<details><summary style="cursor:pointer;font-size:14px">' + T.how + '</summary><p class="muted" style="font-size:13px;margin-top:8px">' + esc(T.steps) +
      '</p><p style="font-size:13px"><a href="' + esc(pat) + '" target="_blank" rel="noopener">github.com → ' + T.how.toLowerCase() + '</a></p></details>' +
      '<p style="font-size:13px"><a href="./">' + T.toSite + '</a></p></form></section>';
    document.getElementById("ghf").onsubmit = function (e) {
      e.preventDefault();
      try { localStorage.setItem(KEY, document.getElementById("ght").value.trim()); localStorage.setItem(MODE, "key"); localStorage.setItem(GRP, T.owner); } catch (x) {}
      start();
    };
  }

  async function start() {
    if (!token()) return passForm();
    try {
      var repo = await gh("");
      if (!repo.permissions || !repo.permissions.push) throw new Error("readonly");
    } catch (e) {
      var wasPass = false; try { wasPass = localStorage.getItem(MODE) === "pass"; localStorage.removeItem(KEY); } catch (x) {}
      return wasPass ? passForm(T.pwBad) : loginForm(T.bad);
    }
    document.getElementById("app").innerHTML = '<p class="muted" style="padding:48px;text-align:center">' + T.loading + '</p>';
    window.TTS_ADMIN = true;
    var s = document.createElement("script");
    s.src = "app.js";
    s.onload = attach;
    document.body.appendChild(s);
  }

  async function attach() {
    for (var i = 0; i < 100 && !(window.__TTS && window.__TTS.ui.admin); i++) await new Promise(function (r) { setTimeout(r, 100); });
    var A = window.__TTS;
    var f = await gh("/contents/" + encPath(path("data.json")) + "?ref=" + encodeURIComponent(BR));
    sha = f.sha;
    var j = JSON.parse(unb64(f.content || ""));
    var st = A.state;
    st.dogs = j.dogs || [];
    if (j.settings) st.settings = Object.assign({}, st.settings, j.settings);
    if (j.updated) st.updated = j.updated;
    st.ledger = j.ledger || [];
    st.log = j.log || [];
    expire(st);
    st.examples = false;
    A.ui.demo = false;
    baseline = snap(st);
    A.resetCards();
    A.render();
    setInterval(bar, 700);
    window.addEventListener("beforeunload", function (e) { if (!busy && dirty()) { e.preventDefault(); e.returnValue = ""; } });
    footer();
    volunteerPanel();
    var ms = document.createElement("script"); ms.src = "money.js"; document.body.appendChild(ms);
    var gs = document.createElement("script"); gs.src = "groups.js"; document.body.appendChild(gs);
  }
  function dirty() { return window.__TTS && snap(window.__TTS.state) !== baseline; }
  function footer() {
    if (document.getElementById("ghout")) return;
    var b = document.createElement("button");
    b.id = "ghout"; b.className = "linkbtn"; b.textContent = T.signout;
    b.style.cssText = "position:fixed;right:16px;top:12px;z-index:30;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 12px";
    b.onclick = function () { try { localStorage.removeItem(KEY); localStorage.removeItem(MODE); localStorage.removeItem(GRP); } catch (e) {} location.reload(); };
    document.body.appendChild(b);
  }
  function bar() {
    var el = document.getElementById("ghbar");
    if (!dirty() && !busy) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "ghbar"; el.className = "bar"; document.body.appendChild(el); }
    if (el.dataset.state === (busy ? "busy" : "idle")) return;
    el.dataset.state = busy ? "busy" : "idle";
    el.innerHTML = "<span><b>" + T.unsaved + "</b> · " + T.unsavedNote + "</span>" +
      '<button class="btn" id="ghp"' + (busy ? " disabled" : "") + ">" + (busy ? T.pubbing : T.pub) + "</button>" +
      '<button class="btn ghost" id="ghd"' + (busy ? " disabled" : "") + ">" + T.discard + "</button>";
    document.getElementById("ghp").onclick = publish;
    document.getElementById("ghd").onclick = function () {
      var A = window.__TTS, o = JSON.parse(baseline);
      A.state.dogs = o.dogs; A.state.settings = o.settings; A.state.ledger = o.ledger || []; A.resetCards(); A.render();
    };
  }
  async function pool(items, n, fn) {
    var i = 0;
    async function run() { while (i < items.length) { var k = i++; await fn(items[k], k); } }
    var w = []; for (var k = 0; k < Math.min(n, items.length); k++) w.push(run());
    await Promise.all(w);
  }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  // Reservations end by themselves after their date.
  function expire(st) {
    var t = today();
    (st.dogs || []).forEach(function (d) {
      if (d.reserve && d.reserve.until && d.reserve.until < t) { delete d.reserve; if (d.status === "reserved") d.status = "available"; }
    });
  }
  var STN = { capture: "Отлов", vet: "Ветеринар", foster: "Передержка", home: "Дом" }, STS = { available: "ищет дом", reserved: "бронь", adopted: "дома" };
  function num(n) { return Math.round(+n || 0).toLocaleString("ru-RU"); }
  function dmy(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : iso; }
  // What changed since the page was loaded, as journal lines signed with the group.
  function changes(st) {
    var base = JSON.parse(baseline), out = [], now = new Date().toISOString(), g = myGroup(), old = {}, cur = {};
    function add(dog, text) { out.push({ t: now, g: g, dog: dog || "", d: text }); }
    (base.dogs || []).forEach(function (d) { old[d.id] = d; });
    (st.dogs || []).forEach(function (d) {
      cur[d.id] = 1;
      var o = old[d.id];
      if (!o) return add(d.id, "Новая карточка");
      if ((o.stage || "capture") !== (d.stage || "capture")) add(d.id, "Этап: " + STN[o.stage || "capture"] + " → " + STN[d.stage || "capture"]);
      var or = o.reserve || {}, nr = d.reserve || {}, rc = or.group !== nr.group || or.until !== nr.until;
      if (rc) {
        if (!nr.group) add(d.id, "Бронь снята" + (or.group ? " (была у «" + or.group + "»)" : ""));
        else if (or.group === nr.group) add(d.id, "Бронь продлена до " + dmy(nr.until));
        else add(d.id, "Бронь: «" + nr.group + "» до " + dmy(nr.until));
      }
      if ((o.status || "available") !== (d.status || "available") && !(rc && (o.status === "reserved" || d.status === "reserved"))) add(d.id, "Статус: " + STS[o.status || "available"] + " → " + STS[d.status || "available"]);
      ["name", "city", "location", "cage"].forEach(function (k) { if ((o[k] || "") !== (d[k] || "")) add(d.id, { name: "Имя", city: "Город", location: "Место", cage: "Вольер" }[k] + ": " + (d[k] || "—")); });
      Object.keys(STN).forEach(function (k) {
        var a = +((o.funds || {})[k] || {}).raised || 0, b = +((d.funds || {})[k] || {}).raised || 0;
        if (a !== b) add(d.id, "Собрано на этапе «" + STN[k] + "»: " + num(a) + " → " + num(b));
      });
    });
    Object.keys(old).forEach(function (id) { if (!cur[id]) add(id, "Карточка удалена"); });
    var ol = {}, nl = {};
    (base.ledger || []).forEach(function (e) { ol[e.id] = e; });
    (st.ledger || []).forEach(function (e) {
      nl[e.id] = 1;
      var o = ol[e.id], txt = (e.type === "in" ? "Донат " : "Расход ") + (e.noAmount ? "без суммы" : num(e.amount)) + (e.type === "out" && e.what ? ": " + e.what : "");
      if (!o) add(e.dog, "Деньги: " + txt);
      else if (o.amount !== e.amount || o.what !== e.what || o.dog !== e.dog) add(e.dog, "Деньги изменены: " + txt);
    });
    Object.keys(ol).forEach(function (id) { if (!nl[id]) { var e = ol[id]; add(e.dog, "Деньги удалены: " + (e.type === "in" ? "донат " : "расход ") + num(e.amount)); } });
    return out;
  }
  async function publish() {
    if (busy) return;
    var A = window.__TTS, st = A.state;
    busy = true; bar();
    try {
      var cur = await gh("/contents/" + encPath(path("data.json")) + "?ref=" + encodeURIComponent(BR));
      if (cur.sha !== sha) { A.toast(T.conflict); return; }
      var ids = [];
      st.dogs.forEach(function (d) { (d.photos || []).forEach(function (p) { if (A.LOCAL.has(p + "|f") && !sent[p] && ids.indexOf(p) < 0) ids.push(p); }); });
      (st.ledger || []).forEach(function (e) { var p = e.receipt; if (p && A.LOCAL.has(p + "|f") && !sent[p] && ids.indexOf(p) < 0) ids.push(p); });
      var jobs = [];
      ids.forEach(function (id) { ["f", "t"].forEach(function (k) { jobs.push([id, k]); }); });
      var tree = [], done = 0;
      await pool(jobs, 4, async function (job) {
        var blob = await fetch(A.LOCAL.get(job[0] + "|" + job[1])).then(function (r) { return r.blob(); });
        var r = await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: await blobB64(blob), encoding: "base64" }) });
        tree.push({ path: path("p-" + job[1] + "-" + job[0] + ".jpg"), mode: "100644", type: "blob", sha: r.sha });
        done++;
        var b = document.getElementById("ghp"); if (b) b.textContent = T.pubbing + " " + Math.ceil(done / 2) + "/" + ids.length;
      });
      st.updated = new Date().toISOString();
      var log = (st.log || []).concat(changes(st)).slice(-3000);
      var json = JSON.stringify({ v: 3, updated: st.updated, settings: st.settings, dogs: st.dogs, ledger: st.ledger || [], log: log });
      var db = await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: b64text(json), encoding: "base64" }) });
      tree.push({ path: path("data.json"), mode: "100644", type: "blob", sha: db.sha });
      var ref = await gh("/git/ref/heads/" + encodeURIComponent(BR));
      var head = await gh("/git/commits/" + ref.object.sha);
      var nt = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree: tree }) });
      var nc = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: "Обновление каталога", tree: nt.sha, parents: [ref.object.sha] }) });
      await gh("/git/refs/heads/" + encodeURIComponent(BR), { method: "PATCH", body: JSON.stringify({ sha: nc.sha }) });
      sha = db.sha;
      st.log = log;
      ids.forEach(function (id) { sent[id] = true; });
      baseline = snap(st);
      A.resetCards(); A.render();
      A.toast(T.done);
    } catch (e) {
      console.error(e);
      A.toast(e.status === 401 || e.status === 403 ? T.bad : T.err);
    } finally {
      busy = false;
      var el = document.getElementById("ghbar"); if (el) el.dataset.state = "";
      bar();
    }
  }
  start();
})();
