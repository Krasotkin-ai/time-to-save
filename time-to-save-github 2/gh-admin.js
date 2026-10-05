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
    signout: "Выйти", toSite: "На сайт", loading: "Загружаю…"
  } : {
    title: "Volunteer sign-in", note: "You need a GitHub access token with write access to the site repository. It stays only in this browser.",
    token: "Access token (github_pat_…)", enter: "Sign in", how: "How to get a token",
    steps: "1) Open the link below. 2) Repository access → Only select repositories → " + CFG.repo + ". 3) Permissions → Contents → Read and write. 4) Generate token, copy it and paste it here.",
    bad: "The token was rejected or cannot write to the repository.", unsaved: "Unpublished changes", unsavedNote: "Visitors see them after you publish.",
    pub: "Publish to the site", pubbing: "Publishing…", discard: "Discard", done: "Published. The site updates in about a minute.",
    conflict: "The site changed after you opened this page. Reload and redo your changes.", err: "Publishing failed. Check your connection and try again.",
    signout: "Sign out", toSite: "To the site", loading: "Loading…"
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
  function snap(s) { return JSON.stringify({ dogs: s.dogs, settings: s.settings }); }

  function loginForm(msg) {
    var pat = "https://github.com/settings/personal-access-tokens/new?name=" + encodeURIComponent("Time to Save site") +
      "&description=" + encodeURIComponent("Edit the Time to Save site") + "&target_name=" + encodeURIComponent(CFG.owner) + "&expires_in=366&contents=write";
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
      try { localStorage.setItem(KEY, document.getElementById("ght").value.trim()); } catch (x) {}
      start();
    };
  }

  async function start() {
    if (!token()) return loginForm();
    try {
      var repo = await gh("");
      if (!repo.permissions || !repo.permissions.push) throw new Error("readonly");
    } catch (e) {
      try { localStorage.removeItem(KEY); } catch (x) {}
      return loginForm(T.bad);
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
    st.examples = false;
    A.ui.demo = false;
    baseline = snap(st);
    A.resetCards();
    A.render();
    setInterval(bar, 700);
    window.addEventListener("beforeunload", function (e) { if (!busy && dirty()) { e.preventDefault(); e.returnValue = ""; } });
    footer();
  }
  function dirty() { return window.__TTS && snap(window.__TTS.state) !== baseline; }
  function footer() {
    if (document.getElementById("ghout")) return;
    var b = document.createElement("button");
    b.id = "ghout"; b.className = "linkbtn"; b.textContent = T.signout;
    b.style.cssText = "position:fixed;right:16px;top:12px;z-index:30;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 12px";
    b.onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
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
      A.state.dogs = o.dogs; A.state.settings = o.settings; A.resetCards(); A.render();
    };
  }
  async function pool(items, n, fn) {
    var i = 0;
    async function run() { while (i < items.length) { var k = i++; await fn(items[k], k); } }
    var w = []; for (var k = 0; k < Math.min(n, items.length); k++) w.push(run());
    await Promise.all(w);
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
      var json = JSON.stringify({ v: 3, updated: st.updated, settings: st.settings, dogs: st.dogs });
      var db = await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: b64text(json), encoding: "base64" }) });
      tree.push({ path: path("data.json"), mode: "100644", type: "blob", sha: db.sha });
      var ref = await gh("/git/ref/heads/" + encodeURIComponent(BR));
      var head = await gh("/git/commits/" + ref.object.sha);
      var nt = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree: tree }) });
      var nc = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: "Обновление каталога", tree: nt.sha, parents: [ref.object.sha] }) });
      await gh("/git/refs/heads/" + encodeURIComponent(BR), { method: "PATCH", body: JSON.stringify({ sha: nc.sha }) });
      sha = db.sha;
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
