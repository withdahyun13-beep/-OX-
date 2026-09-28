(function () {
  "use strict";
  var data = { weekTitles: {}, questions: [] };
  var state = { week: null, idx: 0 };
  var progress = {};

  function $(id) { return document.getElementById(id); }
  try { progress = JSON.parse(localStorage.getItem("ox-progress") || "{}") || {}; } catch (e) {}
  function saveProgress() { try { localStorage.setItem("ox-progress", JSON.stringify(progress)); } catch (e) {} }

  function weeks() {
    var set = {};
    data.questions.forEach(function (q) { set[q.week] = true; });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }
  function qsOf(w) { return data.questions.filter(function (q) { return q.week === w; }); }
  function weekLabel(w) { return w + "주차"; }
  function firstUnsolved(w) {
    var qs = qsOf(w);
    for (var i = 0; i < qs.length; i++) if (!progress[qs[i].id]) return i;
    return 0;
  }

  function color(w) { return "c" + (weeks().indexOf(w) % 6); }
  function stats(w) {
    var qs = qsOf(w), solved = 0, right = 0;
    qs.forEach(function (x) { if (progress[x.id]) { solved++; if (progress[x.id] === x.answer) right++; } });
    return { total: qs.length, solved: solved, right: right };
  }

  // "#w2" opens week 2; anything else shows the week list
  function route() {
    var m = location.hash.match(/^#w(\d+)$/);
    var w = m ? parseInt(m[1], 10) : null;
    if (w !== null && weeks().indexOf(w) >= 0) {
      if (state.week !== w) { state.week = w; state.idx = firstUnsolved(w); }
      $("homeView").hidden = true; $("quizView").hidden = false;
      document.body.classList.remove("at-home");
      render();
    } else {
      state.week = null;
      $("quizView").hidden = true; $("homeView").hidden = false;
      document.body.classList.add("at-home");
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  function renderHome() {
    var grid = $("weekGrid"); grid.textContent = "";
    var ws = weeks();
    if (!ws.length) {
      var e = document.createElement("p"); e.className = "empty"; e.textContent = "아직 등록된 문제가 없어요.";
      grid.appendChild(e); return;
    }
    ws.forEach(function (w) {
      var st = stats(w);
      var a = document.createElement("a");
      a.className = "wcard " + color(w); a.href = "#w" + w;
      var main = document.createElement("div"); main.className = "wc-main";
      var t = document.createElement("b"); t.textContent = weekLabel(w);
      var info = document.createElement("span");
      info.textContent = st.total + "문제" + (st.solved ? " · " + st.solved + "문제 풀었어요 · 맞힌 문제 " + st.right : "");
      main.append(t, info);
      var go = document.createElement("div"); go.className = "wc-go";
      go.textContent = !st.solved ? "시작하기 →" : st.solved < st.total ? "이어 풀기 →" : "다 풀었어요 ✓";
      var bar = document.createElement("div"); bar.className = "bar";
      var fill = document.createElement("i"); fill.style.width = Math.round(st.solved / st.total * 100) + "%";
      bar.appendChild(fill);
      a.append(main, go, bar);
      grid.appendChild(a);
    });
  }

  function render() {
    var ws = weeks();
    var list = $("weekList");
    list.textContent = "";
    ws.forEach(function (w) {
      var st = stats(w);
      var b = document.createElement("a");
      b.className = "wk " + color(w) + (w === state.week ? " on" : ""); b.href = "#w" + w;
      var t = document.createElement("b"); t.textContent = weekLabel(w);
      var s = document.createElement("small"); s.textContent = st.solved + " / " + st.total;
      b.append(t, s);
      list.appendChild(b);
    });

    var qs = qsOf(state.week);
    if (state.idx >= qs.length) state.idx = qs.length - 1;
    var q = qs[state.idx];
    $("card").hidden = false; $("empty").hidden = true;

    $("weekTitle").textContent = weekLabel(state.week);
    var solved = 0, right = 0;
    qs.forEach(function (x) { if (progress[x.id]) { solved++; if (progress[x.id] === x.answer) right++; } });
    var sc = $("score"); sc.textContent = "맞힌 문제 ";
    var bb = document.createElement("b"); bb.textContent = right + " / " + solved; sc.append(bb);
    sc.append(" · 전체 " + qs.length + "문제");

    var dots = $("dots"); dots.textContent = "";
    var n = qs.length, show = {}, last = -1;
    [0, 1, state.idx, n - 2, n - 1].forEach(function (i) { if (i >= 0 && i < n) show[i] = true; });
    Object.keys(show).map(Number).sort(function (a, b) { return a - b; }).forEach(function (i) {
      if (i - last > 1) {
        var gap = document.createElement("span"); gap.className = "gap"; gap.textContent = "…";
        dots.appendChild(gap);
      }
      last = i;
      var x = qs[i];
      var d = document.createElement("button");
      d.type = "button"; d.className = "dot";
      var p = progress[x.id];
      if (p) d.className += p === x.answer ? " right" : " wrong";
      if (i === state.idx) d.className += " cur";
      d.textContent = i + 1;
      d.setAttribute("aria-label", (i + 1) + "번 문제");
      d.onclick = function () { state.idx = i; render(); };
      dots.appendChild(d);
    });

    $("qmeta").textContent = "문제 " + (state.idx + 1) + " / " + qs.length;
    $("qtext").textContent = q.text;
    var pick = progress[q.id];
    ["O", "X"].forEach(function (v) {
      var btn = $("btn" + v);
      btn.className = "oxbtn";
      btn.disabled = !!pick;
      if (pick) {
        if (v === q.answer) btn.className += " answer";
        else if (v === pick) btn.className += " miss";
        else btn.className += " dim";
      }
    });
    $("result").hidden = !pick;
    if (pick) {
      var chip = $("ansChip"); chip.className = "ans-chip " + q.answer; chip.textContent = "정답 " + (q.answer === "O" ? "○" : "×");
      $("expl").textContent = q.explanation;
      $("basis").hidden = !q.basis; $("basis").textContent = q.basis || "";
    }
    $("prev").disabled = state.idx === 0;
    var last = state.idx === qs.length - 1;
    var nextWeek = ws[ws.indexOf(state.week) + 1];
    $("next").hidden = last && nextWeek === undefined;
    $("next").textContent = last ? weekLabel(nextWeek) + "로" : "다음 문제";
  }

  function answer(v) {
    var q = qsOf(state.week)[state.idx];
    if (!q || progress[q.id]) return;
    progress[q.id] = v; saveProgress(); render();
  }
  function go(delta) {
    var qs = qsOf(state.week), ws = weeks();
    var n = state.idx + delta;
    if (n < 0) return;
    if (n >= qs.length) {
      var nw = ws[ws.indexOf(state.week) + 1];
      if (nw === undefined) return;
      location.hash = "w" + nw; return;
    } else state.idx = n;
    render();
  }
  $("btnO").onclick = function () { answer("O"); };
  $("btnX").onclick = function () { answer("X"); };
  $("prev").onclick = function () { go(-1); };
  $("next").onclick = function () { go(1); };
  $("retry").onclick = function () {
    qsOf(state.week).forEach(function (q) { delete progress[q.id]; });
    saveProgress(); state.idx = 0; render();
  };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || state.week === null) return;
    var k = e.key.toLowerCase();
    if (k === "o") answer("O");
    else if (k === "x") answer("X");
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  });

  fetch("questions.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { data = d; data.questions = data.questions || []; route(); })
    .catch(function () { $("homeView").hidden = false; $("homeEmpty").textContent = "문제를 불러오지 못했어요. 잠시 후 새로고침해 주세요."; });
  window.addEventListener("hashchange", route);
})();
