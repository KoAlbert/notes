/* 文章用的小動畫：逐步推導、方塊次方、方塊合併、log 尺規。
 * 依賴 KaTeX（頁面先載入 katex.min.js）。 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ORANGE = '#e8590c';
  var BLUE = '#1c7ed6';

  function tex(el, s, display) {
    katex.render(s, el, { displayMode: !!display, throwOnError: false });
  }

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function button(label, onClick) {
    var b = h('button', 'w-btn', label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function header(w) {
    var t = w.getAttribute('data-title');
    if (t) w.appendChild(h('div', 'w-title', t));
  }

  function groupDigits(v) {
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
  }

  /* ── 逐步推導：一行一行出現，可自動播放 ───────────────────────────── */
  function initStepper(w) {
    var steps = JSON.parse(w.querySelector('script[type="application/json"]').textContent);
    w.textContent = '';
    header(w);
    var eqs = h('div', 'st-eqs');
    var note = h('div', 'st-note');
    var ctrl = h('div', 'w-ctrl');
    w.appendChild(eqs);
    w.appendChild(note);
    w.appendChild(ctrl);

    var lines = steps.map(function (s) {
      var d = h('div', 'st-line');
      tex(d, s.tex, true);
      eqs.appendChild(d);
      return d;
    });

    var i = 0;
    var timer = null;
    var prev = button('← 上一步', function () { stop(); go(i - 1); });
    var count = h('span', 'w-count');
    var next = button('下一步 →', function () { stop(); go(i + 1); });
    var play = button('▶ 播放', function () {
      if (timer) { stop(); return; }
      if (i >= steps.length - 1) go(0);
      play.textContent = '❚❚ 暫停';
      timer = setInterval(function () {
        if (i >= steps.length - 1) { stop(); return; }
        go(i + 1);
      }, 2400);
    });
    [prev, count, next, play].forEach(function (x) { ctrl.appendChild(x); });

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      play.textContent = '▶ 播放';
    }

    function go(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      lines.forEach(function (d, k) {
        d.classList.toggle('shown', k <= i);
        d.classList.toggle('current', k === i);
      });
      note.textContent = steps[i].note || '';
      count.textContent = (i + 1) + ' / ' + steps.length;
      prev.disabled = i === 0;
      next.disabled = i === steps.length - 1;
    }

    go(0);
  }

  /* ── 次方滑桿：n 個方塊連乘 ──────────────────────────────────────── */
  function initPower(w) {
    var base = +w.getAttribute('data-base') || 2;
    var max = +w.getAttribute('data-max') || 8;
    var start = +w.getAttribute('data-start') || 3;
    var withLog = w.hasAttribute('data-log');
    header(w);
    var row = h('div', 'chips');
    var eq = h('div', 'w-eq');
    var eq2 = withLog ? h('div', 'w-eq') : null;
    var ctrl = h('div', 'w-ctrl');
    w.appendChild(row);
    w.appendChild(eq);
    if (eq2) w.appendChild(eq2);
    w.appendChild(ctrl);

    var lab = h('label', 'w-slider');
    lab.appendChild(document.createTextNode(withLog ? '乘了幾次：' : '次數 n = '));
    var val = h('b');
    var input = h('input');
    input.type = 'range';
    input.min = 0;
    input.max = max;
    input.value = start;
    lab.appendChild(val);
    lab.appendChild(input);
    ctrl.appendChild(lab);
    input.addEventListener('input', function () { render(+input.value); });

    function render(k) {
      val.textContent = k;
      while (row.children.length > k) row.removeChild(row.lastChild);
      while (row.children.length < k) {
        var c = h('span', 'chip', String(base));
        if (!reduceMotion) c.classList.add('pop');
        row.appendChild(c);
      }
      row.classList.toggle('empty', k === 0);
      var value = groupDigits(Math.pow(base, k));
      if (k === 0) {
        tex(eq, base + '^{0} = 1 \\quad \\text{（一個 ' + base + ' 都沒乘）}', true);
      } else {
        var terms = [];
        for (var j = 0; j < k; j++) terms.push(base);
        tex(eq, base + '^{' + k + '} = ' + terms.join(' \\times ') + ' = ' + value, true);
      }
      if (eq2) {
        tex(eq2, '\\log ' + value + ' = \\textcolor{' + ORANGE + '}{' + k + '}' +
          ' \\quad \\text{（' + base + ' 要乘 ' + k + ' 次才會等於 ' + value.replace(/\{,\}/g, ',') + '）}', true);
      }
    }

    render(start);
  }

  /* ── 方塊合併：同底數相乘，指數相加 ──────────────────────────────── */
  function initMerge(w) {
    var base = w.getAttribute('data-base') || '2';
    var groups = w.getAttribute('data-groups').split(',').map(Number);
    var total = groups.reduce(function (a, b) { return a + b; }, 0);
    header(w);
    var box = h('div', 'groups');
    var eq = h('div', 'w-eq');
    var ctrl = h('div', 'w-ctrl');
    w.appendChild(box);
    w.appendChild(eq);
    w.appendChild(ctrl);

    var chips = [];
    groups.forEach(function (g, gi) {
      var grp = h('div', 'group');
      var lbl = h('div', 'group-label');
      tex(lbl, base + '^{' + g + '}');
      grp.appendChild(lbl);
      var r = h('div', 'chips');
      for (var k = 0; k < g; k++) {
        var c = h('span', 'chip', base);
        r.appendChild(c);
        chips.push(c);
      }
      grp.appendChild(r);
      box.appendChild(grp);
      if (gi < groups.length - 1) box.appendChild(h('div', 'group-op', '×'));
    });

    var before = groups.map(function (g) { return base + '^{' + g + '}'; }).join(' \\times ');
    var sameSize = groups.length > 2 && groups.every(function (g) { return g === groups[0]; });
    var explain = sameSize
      ? groups.length + '\\text{ 組} \\times ' + groups[0] + '\\text{ 個} = ' + total + '\\text{ 個}'
      : groups.join(' + ') + ' = ' + total + '\\text{ 個}';
    var timers = [];
    var merged = false;
    var btn = button('合併', function () { if (merged) reset(); else merge(); });
    ctrl.appendChild(btn);

    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      merged = false;
      box.classList.remove('merged');
      chips.forEach(function (c) { c.classList.remove('lit'); c.removeAttribute('data-n'); });
      btn.textContent = '合併';
      tex(eq, before + ' = \\;?', true);
    }

    function merge() {
      merged = true;
      btn.textContent = '重來';
      box.classList.add('merged');
      var step = reduceMotion ? 0 : 160;
      var lead = reduceMotion ? 0 : 450;
      chips.forEach(function (c, k) {
        timers.push(setTimeout(function () {
          c.classList.add('lit');
          c.setAttribute('data-n', k + 1);
        }, lead + k * step));
      });
      timers.push(setTimeout(function () {
        tex(eq, before + ' = ' + base + '^{\\textcolor{' + ORANGE + '}{' + total + '}}' +
          ' \\qquad (' + explain + ')', true);
      }, lead + total * step));
    }

    reset();
  }

  /* ── log 尺規：整數部分決定位數，小數部分決定開頭 ────────────────── */
  function initLogRuler(w) {
    var maxE = +w.getAttribute('data-max') || 31;
    header(w);
    var ruler = h('div', 'ruler');
    w.appendChild(ruler);
    for (var k = 0; k <= maxE; k++) {
      var major = k % 5 === 0;
      var t = h('div', major ? 'tick major' : 'tick');
      t.style.left = (k / maxE * 100) + '%';
      if (major) {
        var l = h('span', 'tick-label');
        tex(l, '10^{' + k + '}');
        t.appendChild(l);
      }
      ruler.appendChild(t);
    }
    var bar = h('div', 'bar');
    var ip = h('div', 'bar-int');
    var fp = h('div', 'bar-frac');
    bar.appendChild(ip);
    bar.appendChild(fp);
    ruler.appendChild(bar);
    var marker = h('div', 'marker');
    ruler.appendChild(marker);

    var out = h('div', 'w-eq');
    var out2 = h('div', 'w-note');
    var ctrl = h('div', 'w-ctrl');
    w.appendChild(out);
    w.appendChild(out2);
    w.appendChild(ctrl);

    var lab = h('label', 'w-slider');
    lab.appendChild(document.createTextNode('log N = '));
    var v = h('b');
    var input = h('input');
    input.type = 'range';
    input.min = 0;
    input.max = maxE;
    input.step = 0.001;
    lab.appendChild(v);
    lab.appendChild(input);
    ctrl.appendChild(lab);
    input.addEventListener('input', function () { render(+input.value); });

    var presets = h('div', 'w-presets');
    ctrl.appendChild(presets);
    [
      ['N = 1000', 3],
      ['N = 2^{10} = 1024', Math.log10(1024)],
      ['N = 5 \\times 10^{8}', 8 + Math.log10(5)],
      ['N = 2^{100}', 100 * Math.log10(2)]
    ].forEach(function (p) {
      var b = button('', function () { animateTo(p[1]); });
      tex(b, p[0]);
      presets.appendChild(b);
    });

    var anim = null;
    function animateTo(target) {
      if (anim) cancelAnimationFrame(anim);
      var from = +input.value;
      if (reduceMotion) { input.value = target; render(target); return; }
      var t0 = null;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 900);
        var x = from + (target - from) * (1 - Math.pow(1 - p, 3));
        input.value = x;
        render(x);
        if (p < 1) anim = requestAnimationFrame(frame);
      }
      anim = requestAnimationFrame(frame);
    }

    function render(x) {
      var n = Math.floor(x + 1e-9);
      var f = Math.max(0, x - n);
      var b = Math.min(9.99, Math.pow(10, f));
      v.textContent = x.toFixed(3);
      marker.style.left = (x / maxE * 100) + '%';
      ip.style.width = (n / maxE * 100) + '%';
      fp.style.width = (f / maxE * 100) + '%';
      var nb = '\\textcolor{' + BLUE + '}{' + n + '}';
      var fo = '\\textcolor{' + ORANGE + '}{' + f.toFixed(3) + '}';
      tex(out, '\\begin{gathered}\\log N = ' + nb + ' + ' + fo +
        ' \\\\ N = 10^{' + fo + '} \\times 10^{' + nb + '} \\approx ' +
        '\\textcolor{' + ORANGE + '}{' + b.toFixed(2) + '} \\times 10^{' + nb + '}\\end{gathered}', true);
      out2.textContent = '藍色的整數部分 ' + n + ' 決定 N 有 ' + (n + 1) +
        ' 位數；橙色的小數部分決定開頭的數字約為 ' + b.toFixed(2) + '。';
    }

    input.value = 3;
    render(3);
  }

  function init() {
    document.querySelectorAll('.w-stepper').forEach(initStepper);
    document.querySelectorAll('.w-power').forEach(initPower);
    document.querySelectorAll('.w-merge').forEach(initMerge);
    document.querySelectorAll('.w-logruler').forEach(initLogRuler);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
