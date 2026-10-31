/* iraady.com v3: the interactive hero sentence.
   (Mobile nav, contact form, [data-plan] prefill and checkout come from /js/site.js.) */
(function () {
  'use strict';
  var picks = [];
  try { picks = JSON.parse(document.getElementById('picks-data').textContent); } catch (e) {}
  var hero = document.getElementById('hero');
  if (!hero || !picks.length) return;

  var word = document.getElementById('heroWord');
  var line = document.getElementById('heroLine');
  var demo = document.getElementById('heroDemo');
  var shot = document.getElementById('heroImg');
  var hostEl = document.getElementById('heroHost');
  var cap = document.getElementById('heroCap');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-pick]'));
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = 0;

  // keep the big word on one line: shrink it to fit the column
  function fit() {
    var max = window.innerWidth < 640 ? 64 : 116, min = 34;
    word.style.setProperty('--word-size', max + 'px');
    var avail = word.parentNode.clientWidth;
    var need = word.scrollWidth;
    if (need > avail) word.style.setProperty('--word-size', Math.max(min, Math.floor(max * avail / need) - 1) + 'px');
  }
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  // warm the cache so switching feels instant
  picks.forEach(function (p) { var i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = p.image; });

  function show(i, focus) {
    if (i === current) return;
    current = i;
    var p = picks[i];
    hero.setAttribute('data-tone', p.tone);
    word.textContent = p.word;
    fit();
    if (!reduce) { word.classList.remove('swap'); void word.offsetWidth; word.classList.add('swap'); }
    line.textContent = p.line;
    demo.href = p.url;
    demo.textContent = 'Try ' + p.name;
    hostEl.textContent = p.host;
    cap.textContent = p.name + ', a live demo with sample data';
    shot.classList.add('fading');
    setTimeout(function () { shot.src = p.image; shot.alt = p.name + ', home page'; shot.classList.remove('fading'); }, reduce ? 0 : 180);
    buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
    if (focus) buttons[i].focus();
  }

  buttons.forEach(function (b, i) {
    b.addEventListener('click', function () { show(i); });
    b.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (j === null) return;
      e.preventDefault();
      show((j + picks.length) % picks.length, true);
    });
  });
  // the big word itself moves to the next organisation
  word.style.cursor = 'pointer';
  word.addEventListener('click', function () { show((current + 1) % picks.length); });
})();
