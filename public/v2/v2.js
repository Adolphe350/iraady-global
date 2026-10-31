/* iraady.com v2 extras. Nav, portfolio filter, contact form and checkout come
   from /js/site.js (shared with v1); this adds the industry filter, the sticky
   header border and reveal-on-scroll (off for reduced motion). */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  // header border once scrolled
  var hdr = document.querySelector('.hdr');
  function onScroll() { if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // product suite: filter by industry
  var chips = document.querySelectorAll('[data-industry-filter]');
  var prods = document.querySelectorAll('.prod[data-industry]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var want = chip.getAttribute('data-industry-filter');
      chips.forEach(function (c) { var on = c === chip; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
      prods.forEach(function (p) {
        p.hidden = !(want === 'All' || p.getAttribute('data-industry') === want);
        p.classList.add('in');
      });
    });
  });
})();
