/* iraady.com v3: header, theme, industry tabs, work rail, reveals, count-up.
   (Mobile nav, portfolio filters, contact form and checkout come from /js/site.js.) */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header turns solid after the hero starts scrolling
  var hdr = document.getElementById('hdr');
  function onScroll() { if (hdr) hdr.classList.toggle('solid', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // theme (dark by default; v3 keeps its own preference)
  var themeBtn = document.getElementById('themeBtn');
  function label() {
    if (themeBtn) themeBtn.setAttribute('aria-label', doc.getAttribute('data-theme') === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }
  label();
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    doc.setAttribute('data-theme', next);
    try { localStorage.setItem('iraady-v3-theme', next); } catch (e) {}
    label();
  });

  // industry tabs (WAI-ARIA tabs with arrow keys)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function select(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.classList.toggle('on', on);
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      var p = document.getElementById(x.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (j === null) return;
      e.preventDefault();
      select(tabs[(j + tabs.length) % tabs.length], true);
    });
  });

  // work rail buttons
  var rail = document.getElementById('rail');
  document.querySelectorAll('[data-rail]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!rail) return;
      rail.scrollBy({ left: Number(b.getAttribute('data-rail')) * Math.min(rail.clientWidth * 0.8, 820), behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  // filtering hides cards: bring the rail back to the start
  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () { if (rail) rail.scrollTo({ left: 0 }); });
  });

  // count-up for the numbers band
  function countUp(el) {
    var end = Number(el.getAttribute('data-count')) || 0;
    if (reduce || end < 2) { el.textContent = String(end); return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var k = Math.min(1, (ts - start) / 1100);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // reveals
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      var n = en.target.querySelector('[data-count]');
      if (n) countUp(n);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
    io.observe(el);
  });
})();
