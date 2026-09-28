(function () {
  "use strict";
  // Where questions.json lives. Detected from a github.io address, with this repo as the fallback.
  var OWNER = "withdahyun13-beep", REPO = "-OX-", FILE = "docs/questions.json";
  var m = location.hostname.match(/^([^.]+)\.github\.io$/);
  if (m) { OWNER = m[1]; var seg = location.pathname.split("/")[1]; if (seg && !/\.html?$/.test(seg)) REPO = seg; }
  var API = "https://api.github.com/repos/" + OWNER + "/" + REPO;

  var saved = { weekTitles: {}, questions: [] }; // what the site currently has
  var data = clone(saved);
  var fileSha = null, branch = null;
  var dirty = false, editing = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(id) { return document.getElementById(id); }
  function getToken() { try { return localStorage.getItem("ox-gh-token") || ""; } catch (e) { return ""; } }
  function setToken(t) { try { if (t) localStorage.setItem("ox-gh-token", t); else localStorage.removeItem("ox-gh-token"); } catch (e) {} }

  function gh(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + getToken(),
      "X-GitHub-Api-Version": "2022-11-28"
    }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) { var e = new Error(body.message || r.status); e.status = r.status; throw e; }
        return body;
      });
    });
  }
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(b64.replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------- loading ----------
  function loadFromGitHub() {
    return gh("").then(function (repo) {
      branch = repo.default_branch;
      if (!repo.permissions || !repo.permissions.push) throw Object.assign(new Error("no push"), { status: 403 });
      return gh("/contents/" + FILE + "?ref=" + encodeURIComponent(branch));
    }).then(function (f) {
      fileSha = f.sha;
      return JSON.parse(b64decode(f.content));
    });
  }
  function loadPublic() {
    return fetch("questions.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); });
  }
  function applyLoaded(d) {
    d.weekTitles = d.weekTitles || {}; d.questions = d.questions || [];
    saved = d; data = clone(d); dirty = false;
    resetForm(); render();
  }
  function connect() {
    renderAuth("연결 중…");
    return loadFromGitHub().then(function (d) {
      applyLoaded(d);
      renderAuth();
    }, function (e) {
      var msg = e.status === 401 ? "토큰이 올바르지 않거나 만료됐어요. 새 토큰을 입력해 주세요."
        : e.status === 403 || e.status === 404 ? "이 토큰으로는 " + REPO + " 저장소에 쓸 수 없어요. Contents 권한이 Read and write인지 확인해 주세요."
        : "GitHub에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
      setToken("");
      renderAuth(null, msg);
      return loadPublic().then(applyLoaded);
    });
  }
  function renderAuth(pending, err) {
    var ok = !!getToken() && !pending && !err;
    $("authForm").hidden = ok;
    $("authDone").hidden = !ok;
    $("authStatus").textContent = ok ? "연결됨 · " + OWNER + "/" + REPO + " (" + branch + ")" : "";
    $("authNote").className = "note" + (err ? " msg err" : "");
    $("authNote").textContent = err || pending ||
      "문제를 사이트에 저장하려면 이 저장소에 쓸 수 있는 GitHub 토큰이 필요해요. 한 번 입력하면 이 브라우저에 기억돼요.";
    if (ok) $("authNote").textContent = "연결됐어요. 문제를 추가·수정한 뒤 아래 '사이트에 저장'을 누르면 1~2분 안에 사이트에 반영돼요.";
  }
  $("connect").onclick = function () {
    var t = $("token").value.trim();
    if (!t) { renderAuth(null, "토큰을 붙여 넣어 주세요."); return; }
    setToken(t); $("token").value = ""; connect();
  };
  $("disconnect").onclick = function () { setToken(""); fileSha = null; renderAuth(); };

  // ---------- list & form ----------
  function weeks() {
    var set = {};
    data.questions.forEach(function (q) { set[q.week] = true; });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }
  function qsOf(w) { return data.questions.filter(function (q) { return q.week === w; }); }
  function weekTitle(w) { return (data.weekTitles && data.weekTitles[w]) || ""; }

  function render() {
    $("count").textContent = "총 " + data.questions.length + "문제";
    var box = $("qlist"); box.textContent = "";
    var ws = weeks();
    if (!ws.length) {
      var p = document.createElement("p"); p.className = "hint"; p.textContent = "아직 문제가 없어요. 위에서 첫 문제를 입력해 보세요.";
      box.appendChild(p);
    }
    ws.forEach(function (w) {
      var g = document.createElement("div"); g.className = "group";
      var h = document.createElement("h3");
      h.textContent = w + "주차" + (weekTitle(w) ? " · " + weekTitle(w) : "");
      g.appendChild(h);
      qsOf(w).forEach(function (q) {
        var it = document.createElement("div");
        it.className = "item" + (editing === q.id ? " editing" : "");
        var a = document.createElement("span"); a.className = "a " + q.answer; a.textContent = q.answer === "O" ? "○" : "×";
        var t = document.createElement("div"); t.className = "t"; t.textContent = q.text;
        var sm = document.createElement("small"); sm.textContent = q.basis || "근거 조문 없음"; t.appendChild(sm);
        var acts = document.createElement("div"); acts.className = "acts";
        var ed = document.createElement("button"); ed.type = "button"; ed.className = "btn"; ed.textContent = "수정";
        ed.onclick = function () { startEdit(q.id); };
        var del = document.createElement("button"); del.type = "button"; del.className = "btn danger"; del.textContent = "삭제";
        del.onclick = function () {
          if (!del.classList.contains("armed")) {
            del.classList.add("armed"); del.textContent = "정말 삭제";
            setTimeout(function () { del.classList.remove("armed"); del.textContent = "삭제"; }, 3000);
            return;
          }
          data.questions = data.questions.filter(function (x) { return x.id !== q.id; });
          if (editing === q.id) resetForm();
          markDirty();
        };
        acts.append(ed, del);
        it.append(a, t, acts);
        g.appendChild(it);
      });
      box.appendChild(g);
    });
    $("savebar").hidden = !dirty;
  }

  function resetForm(keepWeek) {
    var w = keepWeek || (weeks().slice(-1)[0] || 1);
    editing = null;
    $("fWeek").value = w;
    $("fWeekTitle").value = weekTitle(w);
    $("fText").value = ""; $("fExpl").value = ""; $("fBasis").value = "";
    $("fAnsO").checked = true;
    $("formTitle").textContent = "새 문제 입력";
    $("fSubmit").textContent = "목록에 추가";
    $("fCancel").hidden = true;
    $("formErr").hidden = true;
  }
  function startEdit(id) {
    var q = data.questions.filter(function (x) { return x.id === id; })[0];
    if (!q) return;
    editing = id;
    $("fWeek").value = q.week; $("fWeekTitle").value = weekTitle(q.week);
    $("fText").value = q.text; $("fExpl").value = q.explanation; $("fBasis").value = q.basis || "";
    $("fAns" + q.answer).checked = true;
    $("formTitle").textContent = "문제 수정";
    $("fSubmit").textContent = "수정 반영";
    $("fCancel").hidden = false;
    $("formErr").hidden = true;
    render();
    $("qform").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("fWeek").addEventListener("change", function () {
    var w = parseInt($("fWeek").value, 10);
    if (w && weekTitle(w)) $("fWeekTitle").value = weekTitle(w);
  });
  $("fCancel").onclick = function () { resetForm(); render(); };
  $("qform").addEventListener("submit", function (e) {
    e.preventDefault();
    var w = parseInt($("fWeek").value, 10);
    var text = $("fText").value.trim(), expl = $("fExpl").value.trim();
    var err = !(w >= 1 && w <= 99) ? "주차를 1~99 사이 숫자로 입력해 주세요."
      : !text ? "문제를 입력해 주세요." : !expl ? "해설을 입력해 주세요." : "";
    if (err) { $("formErr").textContent = err; $("formErr").hidden = false; return; }
    var q = {
      id: editing || "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      week: w, text: text,
      answer: $("fAnsX").checked ? "X" : "O",
      explanation: expl, basis: $("fBasis").value.trim()
    };
    if (editing) data.questions = data.questions.map(function (x) { return x.id === q.id ? q : x; });
    else data.questions.push(q);
    var wt = $("fWeekTitle").value.trim();
    if (wt) data.weekTitles[w] = wt; else delete data.weekTitles[w];
    resetForm(w);
    markDirty();
  });

  function markDirty() {
    dirty = JSON.stringify(data) !== JSON.stringify(saved);
    $("pubMsg").hidden = true;
    render();
  }
  $("discard").onclick = function () { data = clone(saved); resetForm(); markDirty(); };
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  function showMsg(text, isErr) {
    var el = $("pubMsg"); el.textContent = text; el.className = "msg" + (isErr ? " err" : ""); el.hidden = false;
  }

  // ---------- save ----------
  $("publish").onclick = function () {
    if (!getToken() || !fileSha) {
      showMsg("먼저 위에서 GitHub 토큰을 연결해 주세요.", true);
      $("authPanel").scrollIntoView({ behavior: "smooth" });
      return;
    }
    var btn = $("publish");
    btn.disabled = true; btn.textContent = "저장 중…";
    var body = JSON.stringify(data, null, 2) + "\n";
    gh("/contents/" + FILE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "문제 업데이트 (" + data.questions.length + "문제)",
        content: b64encode(body), sha: fileSha, branch: branch
      })
    }).then(function (res) {
      fileSha = res.content.sha;
      saved = clone(data); dirty = false; render();
      showMsg("저장했어요. 1~2분 뒤 사이트를 새로고침하면 반영돼 있어요.");
    }, function (e) {
      if (e.status === 409) showMsg("다른 곳에서 먼저 저장된 내용이 있어요. 페이지를 새로고침한 뒤 다시 입력해 주세요.", true);
      else if (e.status === 401) showMsg("토큰이 만료됐어요. 위에서 다시 연결해 주세요.", true);
      else showMsg("저장하지 못했어요 (" + e.message + "). 잠시 후 다시 시도해 주세요.", true);
    }).then(function () { btn.disabled = false; btn.textContent = "사이트에 저장"; });
  };

  // ---------- boot ----------
  if (getToken()) connect();
  else { renderAuth(); loadPublic().then(applyLoaded, function () { applyLoaded({}); }); }
})();
