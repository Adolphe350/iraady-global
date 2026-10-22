/* iraady.com front end: nav, portfolio filters, contact form, source-code checkout. */
(function () {
  'use strict';

  // ---- mobile nav ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }
    });
  }

  // ---- portfolio filters ----
  var filters = document.querySelectorAll('[data-filter]');
  var cards = document.querySelectorAll('.work-card');
  var count = document.querySelector('[data-work-count]');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var g = btn.getAttribute('data-filter');
      var shown = 0;
      filters.forEach(function (b) { var on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
      cards.forEach(function (c) {
        var show = g === 'All' || c.getAttribute('data-group') === g;
        c.hidden = !show;
        if (show) shown++;
      });
      if (count) count.textContent = shown;
    });
  });

  // ---- pricing buttons prefill the budget ----
  document.querySelectorAll('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () {
      var msg = document.querySelector('#contact-form textarea[name="message"]');
      if (msg && !msg.value) msg.value = 'We are interested in a ' + a.getAttribute('data-plan') + ' project: ';
    });
  });

  // ---- contact form: keep a copy for the dashboard, then the usual email via formsubmit ----
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      var done = function () { HTMLFormElement.prototype.submit.call(form); };
      fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: true })
        .then(done, done);
    });
  }

  // ---- source-code checkout (Flutterwave) ----
  var projects = [];
  try { projects = JSON.parse(document.getElementById('projects-data').textContent); } catch (e) {}
  var modal = document.getElementById('checkout');
  var checkoutForm = document.getElementById('checkout-form');
  var selected = null;

  function price(v) { var n = Number(v); return Number.isFinite(n) ? n.toFixed(2).replace(/\.00$/, '') : '0'; }
  function openCheckout(p) {
    selected = p;
    document.getElementById('checkout-title').textContent = 'Buy ' + p.name;
    document.getElementById('checkout-sub').textContent = '$' + price(p.price) + ' · full source code · commercial licence';
    document.getElementById('checkout-submit').textContent = 'Continue to payment — $' + price(p.price);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = checkoutForm.querySelector('input');
    if (first) first.focus();
  }
  function closeCheckout() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    checkoutForm.reset();
    selected = null;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy]');
    if (b) {
      var p = projects.find(function (x) { return x.id === b.getAttribute('data-buy'); });
      if (p && typeof p.price === 'number') openCheckout(p);
      return;
    }
    if (modal && !modal.hidden && (e.target === modal || e.target.closest('[data-close]'))) closeCheckout();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCheckout(); });

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = selected;
      if (!p) return;
      var fd = new FormData(checkoutForm);
      var name = String(fd.get('name') || '').trim();
      var email = String(fd.get('email') || '').trim();
      var phone = String(fd.get('phone') || '').trim();
      if (!name || !email || !phone) return;
      if (typeof window.FlutterwaveCheckout !== 'function') {
        alert('The payment service did not load. Please refresh the page and try again.');
        return;
      }
      var txRef = 'TX-' + p.id + '-' + Date.now();
      closeCheckout();
      window.FlutterwaveCheckout({
        public_key: 'FLWPUBK-1be4df0b721ba2090406cacf32555e93-X',
        tx_ref: txRef,
        amount: Number(p.price),
        currency: 'USD',
        payment_options: 'card, mobilemoney, ussd',
        customer: { email: email, name: name, phone_number: phone },
        meta: { project_id: p.id, project_name: p.name, seller_email: 'info@iraady.com' },
        customizations: { title: 'Buy ' + p.name, description: 'Full source code · commercial licence', logo: 'https://iraady.com/logo.jpg' },
        callback: function (response) {
          if (response.status !== 'successful') return;
          // Existing delivery webhook (unchanged).
          fetch('https://zcw4cgscs0kk8ckgokcsgk0k.app.kimuse.rw/api/webhook/payment', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'charge.completed', data: { customer: { name: name, email: email, phone_number: phone }, amount: Number(p.price), currency: 'USD', tx_ref: response.transaction_id, meta: { project_name: p.name, seller_email: 'info@iraady.com' } } })
          }).catch(function () {});
          // Copy for the dashboard.
          fetch('/api/orders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: p.id, name: name, email: email, phone: phone, transactionId: String(response.transaction_id || ''), txRef: txRef })
          }).catch(function () {});
          alert('Payment received — transaction ' + response.transaction_id + '.\n\nWe will email the source code to ' + email + ' within 24 hours.');
        },
        onclose: function () {}
      });
    });
  }
})();
