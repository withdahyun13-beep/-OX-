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
  function weekTitle(w) { return (data.weekTitles && data.weekTitles[w]) || ""; }
  function firstUnsolved(w) {
    var qs = qsOf(w);
    for (var i = 0; i < qs.length; i++) if (!progress[qs[i].id]) return i;
    return 0;
  }

  function render() {
    var ws = weeks();
    var list = $("weekList");
    list.textContent = "";
    if (!ws.length) {
      $("card").hidden = true; $("empty").hidden = false;
      $("empty").textContent = "아직 등록된 문제가 없어요.";
      return;
    }
    if (ws.indexOf(state.week) < 0) { state.week = ws[0]; state.idx = firstUnsolved(ws[0]); }
    ws.forEach(function (w) {
      var qs = qsOf(w);
      var done = qs.filter(function (q) { return progress[q.id]; }).length;
      var b = document.createElement("button");
      b.type = "button"; b.className = "wk" + (w === state.week ? " on" : "");
      var t = document.createElement("b"); t.textContent = weekLabel(w);
      var s = document.createElement("small"); s.textContent = done + " / " + qs.length;
      b.append(t, s);
      b.onclick = function () { state.week = w; state.idx = firstUnsolved(w); render(); };
      list.appendChild(b);
    });

    var qs = qsOf(state.week);
    if (state.idx >= qs.length) state.idx = qs.length - 1;
    var q = qs[state.idx];
    $("card").hidden = false; $("empty").hidden = true;

    var title = weekTitle(state.week);
    $("weekTitle").textContent = weekLabel(state.week) + (title ? " · " + title : "");
    var solved = 0, right = 0;
    qs.forEach(function (x) { if (progress[x.id]) { solved++; if (progress[x.id] === x.answer) right++; } });
    var sc = $("score"); sc.textContent = "맞힌 문제 ";
    var bb = document.createElement("b"); bb.textContent = right + " / " + solved; sc.append(bb);
    sc.append(" · 전체 " + qs.length + "문제");

    var dots = $("dots"); dots.textContent = "";
    qs.forEach(function (x, i) {
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
      var ok = pick === q.answer;
      var v = $("verdict"); v.textContent = ""; v.className = "verdict " + (ok ? "good" : "bad");
      var chip = document.createElement("span"); chip.className = "chip"; chip.textContent = ok ? "정답" : "오답";
      v.append(chip, ok ? "맞았어요" : "틀렸어요. 정답은 " + (q.answer === "O" ? "○" : "×") + " 입니다");
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
      state.week = nw; state.idx = firstUnsolved(nw);
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
    if (e.metaKey || e.ctrlKey || e.altKey || !data.questions.length) return;
    var k = e.key.toLowerCase();
    if (k === "o") answer("O");
    else if (k === "x") answer("X");
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  });

  fetch("questions.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { data = d; data.weekTitles = data.weekTitles || {}; render(); })
    .catch(function () { $("empty").textContent = "문제를 불러오지 못했어요. 잠시 후 새로고침해 주세요."; });
})();
