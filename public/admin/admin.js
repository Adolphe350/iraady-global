/* iraady.com dashboard. Hash routes; every content section is edited through
   one schema-driven list editor, saved immediately to /api/admin/content/:section. */
(function () {
  'use strict';

  var STRANDS = { navy: '#2E3192', sky: '#29ABE2', yellow: '#F2C811', green: '#1E9E4A', lime: '#B5E61D' };
  var state = { content: null, enquiries: null, orders: null, me: null };
  var view = document.getElementById('view');

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var toastTimer;
  function toast(m) {
    var t = $('#toast'); t.textContent = m; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    return fetch(path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401 && path !== '/api/admin/login') { showLogin(); throw new Error('Please sign in again'); }
        if (!r.ok) throw new Error(data.error || 'Request failed (' + r.status + ')');
        return data;
      });
    });
  }
  function when(d) {
    if (!d) return '—';
    var t = new Date(d), s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    if (s < 86400 * 7) { var n = Math.round(s / 86400); return n + (n === 1 ? ' day ago' : ' days ago'); }
    return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function money(n) { return '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
  function confirmBox(title, body, action, danger) {
    return new Promise(function (resolve) {
      var o = document.createElement('div');
      o.className = 'overlay center';
      o.innerHTML = '<div class="dialog" role="alertdialog" aria-modal="true"><h2>' + esc(title) + '</h2>' + (body ? '<p>' + esc(body) + '</p>' : '') +
        '<div class="dialog-actions"><button class="btn btn-ghost" data-a="no">Cancel</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-a="yes">' + esc(action) + '</button></div></div>';
      function close(v) { o.remove(); document.removeEventListener('keydown', key); resolve(v); }
      function key(e) { if (e.key === 'Escape') close(false); }
      o.addEventListener('click', function (e) { if (e.target === o) return close(false); var b = e.target.closest('[data-a]'); if (b) close(b.dataset.a === 'yes'); });
      document.addEventListener('keydown', key);
      document.body.appendChild(o);
      o.querySelector('[data-a="yes"]').focus();
    });
  }
  function drawer(title, bodyHtml, footHtml) {
    var o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = '<aside class="drawer" role="dialog" aria-modal="true"><div class="d-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-x aria-label="Close">×</button></div>' +
      '<div class="d-body">' + bodyHtml + '</div>' + (footHtml ? '<div class="d-foot">' + footHtml + '</div>' : '') + '</aside>';
    function close() { o.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('[data-x]')) close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(o);
    o.close = close;
    return o;
  }

  // ---------- schemas ----------
  var SECTIONS = {
    projects: {
      title: 'Portfolio', hint: 'Projects on the site. Personal and Mobile Apps items with a price appear in the shop.',
      item: 'project',
      fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'id', label: 'ID (used in links and checkout)', required: true, help: 'Lowercase letters, numbers and dashes.' },
        { name: 'group', label: 'Group', type: 'select', options: ['Personal', 'Mobile Apps', 'Client'] },
        { name: 'niche', label: 'Niche' },
        { name: 'url', label: 'Project URL', type: 'url' },
        { name: 'price', label: 'Source-code price (USD)', type: 'number', help: 'Leave empty if it is not for sale.' },
        { name: 'image', label: 'Screenshot', type: 'image', wide: true },
        { name: 'description', label: 'Description', type: 'textarea', wide: true },
        { name: 'techs', label: 'Tech stack', type: 'list', wide: true }
      ],
      columns: function (p) {
        return '<td><img class="thumb" src="' + esc(p.image || '/assets/placeholder.svg') + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'/assets/placeholder.svg\'"></td>' +
          '<td class="main"><strong>' + esc(p.name) + '</strong><span>' + esc(p.group) + (p.niche ? ' · ' + esc(p.niche) : '') + '</span></td>' +
          '<td class="num">' + (typeof p.price === 'number' ? money(p.price) : '—') + '</td>';
      },
      head: '<th></th><th>Project</th><th>Price</th>',
      search: function (p) { return [p.name, p.group, p.niche, p.description].join(' '); },
      filter: { field: 'group', options: ['Personal', 'Mobile Apps', 'Client'] }
    },
    products: {
      title: 'Products', hint: 'Flagship products and everyday tools. The first four appear on the hero strands.', item: 'product',
      fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'id', label: 'ID', required: true },
        { name: 'kind', label: 'Kind', type: 'select', options: ['Flagship', 'Tool'] },
        { name: 'status', label: 'Status label', help: 'e.g. Live, Beta' },
        { name: 'url', label: 'URL', type: 'url', wide: true },
        { name: 'strand', label: 'Strand colour', type: 'strand', wide: true },
        { name: 'summary', label: 'Summary', type: 'textarea', wide: true }
      ],
      head: '<th>Product</th><th>Kind</th><th>Strand</th>',
      columns: function (p) {
        return '<td class="main"><strong>' + esc(p.name) + '</strong><span>' + esc(p.url) + '</span></td><td>' + esc(p.kind) + '</td>' +
          '<td><span class="swatch" style="background:' + (STRANDS[p.strand] || STRANDS.navy) + '"></span>' + esc(p.strand || 'navy') + '</td>';
      }
    },
    team: {
      title: 'Team', item: 'person',
      fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'role', label: 'Role' },
        { name: 'location', label: 'Country / city' },
        { name: 'photo', label: 'Photo', type: 'image' },
        { name: 'bio', label: 'Short bio', type: 'textarea', wide: true }
      ],
      head: '<th></th><th>Person</th>',
      columns: function (p) {
        return '<td><img class="thumb" style="width:36px;height:36px;border-radius:50%" src="' + esc(p.photo || '/assets/placeholder.svg') + '" alt=""></td>' +
          '<td class="main"><strong>' + esc(p.name) + '</strong><span>' + esc(p.role) + (p.location ? ' · ' + esc(p.location) : '') + '</span></td>';
      }
    },
    pricing: {
      title: 'Pricing', item: 'plan',
      fields: [
        { name: 'name', label: 'Plan name', required: true },
        { name: 'price', label: 'Starting price', help: 'Shown as “From …”, e.g. $10,000' },
        { name: 'best', label: 'Best for', type: 'textarea', wide: true },
        { name: 'items', label: 'What is included', type: 'list', wide: true },
        { name: 'popular', label: 'Highlight as most chosen', type: 'bool' }
      ],
      head: '<th>Plan</th><th>From</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.name) + (p.popular ? ' ★' : '') + '</strong><span>' + esc(p.best) + '</span></td><td class="num">' + esc(p.price) + '</td>'; }
    },
    faq: {
      title: 'FAQ', item: 'question',
      fields: [{ name: 'q', label: 'Question', required: true, wide: true }, { name: 'a', label: 'Answer', type: 'textarea', wide: true }],
      head: '<th>Question</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.q) + '</strong><span>' + esc(p.a) + '</span></td>'; }
    },
    blog: {
      title: 'Blog', hint: 'Posts without a link show as “Coming soon”.', item: 'post',
      fields: [
        { name: 'title', label: 'Title', required: true, wide: true },
        { name: 'date', label: 'Month', type: 'month' },
        { name: 'url', label: 'Link to the article', type: 'url' },
        { name: 'summary', label: 'Summary', type: 'textarea', wide: true }
      ],
      head: '<th>Post</th><th>Month</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.title) + '</strong><span>' + (p.url ? esc(p.url) : 'No link yet — shows as coming soon') + '</span></td><td class="num">' + esc(p.date) + '</td>'; }
    },
    services: {
      title: 'Services', item: 'service',
      fields: [{ name: 'title', label: 'Title', required: true, wide: true }, { name: 'summary', label: 'Summary', type: 'textarea', wide: true }],
      head: '<th>Service</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.title) + '</strong><span>' + esc(p.summary) + '</span></td>'; }
    },
    process: {
      title: 'Process steps', item: 'step',
      fields: [{ name: 'title', label: 'Step', required: true }, { name: 'summary', label: 'One line', wide: true }],
      head: '<th>Step</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.title) + '</strong><span>' + esc(p.summary) + '</span></td>'; }
    },
    metrics: {
      title: 'Headline numbers', hint: 'The strip under the hero. Use figures you can stand behind.', item: 'number',
      fields: [{ name: 'value', label: 'Value', required: true, help: 'e.g. 2,400+' }, { name: 'label', label: 'Label', required: true }],
      head: '<th>Value</th><th>Label</th>',
      columns: function (p) { return '<td class="num">' + esc(p.value) + '</td><td>' + esc(p.label) + '</td>'; }
    },
    offices: {
      title: 'Offices', item: 'office',
      fields: [
        { name: 'name', label: 'City', required: true }, { name: 'tag', label: 'Label', help: 'e.g. Headquarters' },
        { name: 'phone', label: 'Phone' }, { name: 'hours', label: 'Opening hours' },
        { name: 'lines', label: 'Address lines', type: 'list', wide: true }, { name: 'map', label: 'Map link', type: 'url', wide: true }
      ],
      head: '<th>Office</th><th>Phone</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.name) + '</strong><span>' + esc((p.lines || []).join(', ')) + '</span></td><td class="num">' + esc(p.phone) + '</td>'; }
    }
  };

  var SITE_FIELDS = [
    { name: 'eyebrow', label: 'Hero eyebrow', wide: true },
    { name: 'heroTitle', label: 'Hero headline', wide: true, required: true },
    { name: 'heroSub', label: 'Hero introduction', type: 'textarea', wide: true },
    { name: 'trustLine', label: 'Trust line', wide: true },
    { name: 'contactEmail', label: 'Contact email', type: 'email', help: 'Enquiries are also emailed here.' },
    { name: 'whatsapp', label: 'WhatsApp number', help: 'Digits only, with country code. Empty hides the button.' },
    { name: 'companyNumber', label: 'UK company number' },
    { name: 'markets', label: 'Markets line', wide: true },
    { name: 'quote', label: 'Quote', type: 'textarea', wide: true },
    { name: 'quoteBy', label: 'Quote by', wide: true },
    { name: 'aboutTitle', label: 'About headline', wide: true },
    { name: 'about', label: 'About text', type: 'textarea', wide: true },
    { name: 'linkedin', label: 'LinkedIn URL', type: 'url' },
    { name: 'twitter', label: 'X / Twitter URL', type: 'url' },
    { name: 'github', label: 'GitHub URL', type: 'url' }
  ];

  // ---------- form building ----------
  function fieldHtml(f, value) {
    var id = 'f_' + f.name;
    var req = f.required ? ' required' : '';
    var help = f.help ? ' <span class="help">' + esc(f.help) + '</span>' : '';
    var wide = f.wide ? ' wide' : '';
    if (f.type === 'textarea') return '<label class="' + wide + '">' + esc(f.label) + help + '<textarea id="' + id + '" name="' + f.name + '" rows="4"' + req + '>' + esc(value) + '</textarea></label>';
    if (f.type === 'select') return '<label class="' + wide + '">' + esc(f.label) + '<select name="' + f.name + '">' + f.options.map(function (o) { return '<option' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>';
    if (f.type === 'bool') return '<label class="check' + wide + '"><input type="checkbox" name="' + f.name + '"' + (value ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
    if (f.type === 'strand') return '<div class="' + wide + '"><p class="tag" style="margin-bottom:6px">' + esc(f.label) + '</p><div class="strand-pick">' + Object.keys(STRANDS).map(function (k) {
      return '<label><input type="radio" name="' + f.name + '" value="' + k + '"' + ((value || 'navy') === k ? ' checked' : '') + '><span class="swatch" style="background:' + STRANDS[k] + '"></span>' + k + '</label>';
    }).join('') + '</div></div>';
    if (f.type === 'image') return '<label class="' + wide + '">' + esc(f.label) + help + '<span class="img-field"><img src="' + esc(value || '/assets/placeholder.svg') + '" alt="" referrerpolicy="no-referrer" onerror="this.src=\'/assets/placeholder.svg\'"><input type="text" name="' + f.name + '" value="' + esc(value) + '" placeholder="https://… or upload"><button type="button" class="btn btn-ghost btn-sm" data-upload>Upload</button><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></span></label>';
    if (f.type === 'list') return '<div class="list-field' + wide + '" data-list="' + f.name + '"><p class="tag">' + esc(f.label) + '</p>' +
      (value || []).map(function (v) { return listRow(v); }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-add-row style="justify-self:start">+ Add line</button></div>';
    var type = f.type === 'number' ? 'number" step="0.01' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : f.type === 'month' ? 'month' : 'text';
    var v = value == null ? '' : value;
    return '<label class="' + wide + '">' + esc(f.label) + help + '<input type="' + type + '" name="' + f.name + '" value="' + esc(v) + '"' + req + '></label>';
  }
  function listRow(v) {
    return '<div class="list-row"><input type="text" value="' + esc(v) + '"><button type="button" class="mini danger" data-del-row aria-label="Remove line">×</button></div>';
  }
  function wireForm(root) {
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-add-row]')) {
        e.target.closest('[data-add-row]').insertAdjacentHTML('beforebegin', listRow(''));
        var rows = e.target.closest('.list-field').querySelectorAll('.list-row input');
        rows[rows.length - 1].focus();
      }
      if (e.target.closest('[data-del-row]')) e.target.closest('.list-row').remove();
      if (e.target.closest('[data-upload]')) e.target.closest('.img-field').querySelector('input[type=file]').click();
    });
    root.addEventListener('change', function (e) {
      if (e.target.type === 'file' && e.target.files[0]) {
        var file = e.target.files[0];
        var box = e.target.closest('.img-field');
        if (file.size > 5 * 1024 * 1024) return toast('Images must be 5 MB or less');
        var reader = new FileReader();
        reader.onload = function () {
          toast('Uploading…');
          api('/api/admin/upload', { method: 'POST', body: { dataUrl: reader.result } }).then(function (r) {
            box.querySelector('input[type=text]').value = r.url;
            box.querySelector('img').src = r.url;
            toast('Image uploaded');
          }).catch(function (err) { toast(err.message); });
        };
        reader.readAsDataURL(file);
      }
    });
    root.addEventListener('input', function (e) {
      if (e.target.matches('.img-field input[type=text]')) e.target.closest('.img-field').querySelector('img').src = e.target.value || '/assets/placeholder.svg';
    });
  }
  function readForm(root, fields, base) {
    var out = Object.assign({}, base || {});
    fields.forEach(function (f) {
      if (f.type === 'list') {
        out[f.name] = $$('[data-list="' + f.name + '"] .list-row input', root).map(function (i) { return i.value.trim(); }).filter(Boolean);
      } else if (f.type === 'bool') {
        out[f.name] = !!root.querySelector('[name="' + f.name + '"]').checked;
      } else if (f.type === 'strand') {
        var c = root.querySelector('[name="' + f.name + '"]:checked');
        out[f.name] = c ? c.value : 'navy';
      } else if (f.type === 'number') {
        var v = root.querySelector('[name="' + f.name + '"]').value.trim();
        if (v === '') delete out[f.name]; else out[f.name] = Number(v);
      } else {
        out[f.name] = root.querySelector('[name="' + f.name + '"]').value.trim();
      }
    });
    return out;
  }

  // ---------- data ----------
  function loadContent(force) {
    if (state.content && !force) return Promise.resolve(state.content);
    return api('/api/admin/content').then(function (c) { state.content = c; return c; });
  }
  function saveSection(key, value) {
    return api('/api/admin/content/' + key, { method: 'PUT', body: { value: value } }).then(function (r) {
      state.content[key] = r.value;
      return r.value;
    });
  }

  // ---------- nav ----------
  var NAV = [
    ['Run the business', [['overview', 'Overview'], ['enquiries', 'Enquiries'], ['orders', 'Orders']]],
    ['Site content', [['projects', 'Portfolio', 'navy'], ['products', 'Products', 'sky'], ['team', 'Team', 'yellow'], ['pricing', 'Pricing', 'green'], ['services', 'Services & process'], ['faq', 'FAQ'], ['blog', 'Blog'], ['site', 'Site & contact']]],
    ['Account', [['account', 'Password']]]
  ];
  function renderSide(active) {
    var newCount = (state.enquiries || []).filter(function (e) { return e.status === 'new'; }).length;
    $('#side').innerHTML = NAV.map(function (g) {
      return '<p class="tag">' + g[0] + '</p>' + g[1].map(function (i) {
        return '<a class="a-link' + (i[0] === active ? ' active' : '') + '" href="#' + i[0] + '"' + (i[2] ? ' style="--c:' + STRANDS[i[2]] + '"' : '') + '><span class="dot"></span>' + i[1] +
          (i[0] === 'enquiries' && newCount ? '<span class="count">' + newCount + '</span>' : '') + '</a>';
      }).join('');
    }).join('') + '<div class="a-side-foot"><span class="who">' + esc(state.me || '') + '</span><button class="btn btn-ghost btn-sm" id="logout">Sign out</button></div>';
    $('#logout').addEventListener('click', function () {
      api('/api/admin/logout', { method: 'POST' }).finally(function () { location.hash = ''; showLogin(); });
    });
  }

  // ---------- views ----------
  function overview() {
    return Promise.all([api('/api/admin/overview'), loadEnquiries()]).then(function (r) {
      var o = r[0];
      view.innerHTML = '<div class="a-inner">' +
        '<div class="page-head"><div><p class="tag">Overview</p><h1>Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening') + '.</h1><p>What is happening on iraady.com.</p></div>' +
        '<div class="page-actions"><a class="btn btn-ghost" href="/" target="_blank" rel="noopener">View site ↗</a></div></div>' +
        '<div class="kpis">' +
          kpi('New enquiries', o.enquiries.new, 'waiting for a reply', 'yellow') +
          kpi('Enquiries', o.enquiries.last30, 'in the last 30 days', 'sky') +
          kpi('Orders', o.orders.last30, 'in the last 30 days', 'green') +
          kpi('Sales reported', money(o.orders.revenue), 'all time · confirm in Flutterwave', 'navy') +
        '</div>' +
        '<div class="grid2"><section class="panel"><div class="panel-head"><h2>Latest enquiries</h2><a class="btn btn-ghost btn-sm" href="#enquiries">All enquiries</a></div>' +
          (o.recent.length ? '<ul class="recent">' + o.recent.map(function (e) {
            return '<li data-enq="' + esc(e.id) + '"><div><strong>' + esc(e.name) + (e.company ? ' · ' + esc(e.company) : '') + '</strong><span>' + esc((e.message || '').slice(0, 90)) + '</span></div><div style="text-align:right"><span class="status st-' + esc(e.status) + '">' + esc(e.status) + '</span><br><span>' + when(e.createdAt) + '</span></div></li>';
          }).join('') + '</ul>' : '<div class="empty"><h3>No enquiries yet</h3><p>Messages sent from the contact form land here.</p></div>') +
        '</section><section class="panel"><div class="panel-head"><h2>On the site</h2></div><div class="panel-body quick">' +
          '<a href="#projects">Portfolio projects <span class="mono">' + o.content.projects + '</span></a>' +
          '<a href="#projects">For sale in the shop <span class="mono">' + o.content.shop + '</span></a>' +
          '<a href="#products">Products <span class="mono">' + o.content.products + '</span></a>' +
          '<a href="#team">Team members <span class="mono">' + o.content.team + '</span></a>' +
          '<a href="#site">Hero, contact &amp; numbers <span class="mono">edit</span></a>' +
        '</div></section></div></div>';
      $$('[data-enq]').forEach(function (li) { li.addEventListener('click', function () { openEnquiry(li.dataset.enq); }); });
    });
  }
  function kpi(label, value, sub, strand) {
    return '<div class="kpi" style="--c:' + STRANDS[strand] + '"><p class="tag">' + label + '</p><p class="kpi-v">' + esc(value) + '</p><p class="kpi-s">' + sub + '</p></div>';
  }

  function loadEnquiries() {
    return api('/api/admin/enquiries').then(function (r) { state.enquiries = r.enquiries; renderSide(currentRoute()); return r.enquiries; });
  }
  var enqFilter = 'open';
  function enquiries() {
    return loadEnquiries().then(function (list) {
      var counts = { open: 0, all: list.length };
      ['new', 'contacted', 'proposal', 'won', 'lost', 'spam'].forEach(function (s) { counts[s] = 0; });
      list.forEach(function (e) { counts[e.status] = (counts[e.status] || 0) + 1; if (['new', 'contacted', 'proposal'].indexOf(e.status) >= 0) counts.open++; });
      view.innerHTML = '<div class="a-inner"><div class="page-head"><div><p class="tag">Enquiries</p><h1>People who want to work with you</h1><p>Every message from the contact form. Each one is also emailed to the contact address.</p></div></div>' +
        '<section class="panel"><div class="panel-head"><div class="chips">' +
          [['open', 'Open'], ['new', 'New'], ['contacted', 'Contacted'], ['proposal', 'Proposal'], ['won', 'Won'], ['lost', 'Lost'], ['spam', 'Spam'], ['all', 'All']].map(function (f) {
            return '<button class="chip-btn' + (enqFilter === f[0] ? ' active' : '') + '" data-f="' + f[0] + '">' + f[1] + '<span class="n">' + (counts[f[0]] || 0) + '</span></button>';
          }).join('') +
        '</div><input type="search" id="enqSearch" placeholder="Search name, email, company" style="max-width:260px"></div><div id="enqTable"></div></section></div>';
      function draw() {
        var q = ($('#enqSearch').value || '').toLowerCase();
        var rows = list.filter(function (e) {
          var okF = enqFilter === 'all' || (enqFilter === 'open' ? ['new', 'contacted', 'proposal'].indexOf(e.status) >= 0 : e.status === enqFilter);
          return okF && (!q || [e.name, e.email, e.company, e.message].join(' ').toLowerCase().indexOf(q) >= 0);
        });
        $('#enqTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>From</th><th>Budget</th><th>Timeline</th><th>Status</th><th>Received</th></tr></thead><tbody>' +
          rows.map(function (e) {
            return '<tr class="clickable" data-id="' + esc(e.id) + '"><td class="main"><strong>' + esc(e.name) + (e.company ? ' · ' + esc(e.company) : '') + '</strong><span>' + esc(e.message) + '</span></td>' +
              '<td class="num">' + esc(e.budget || '—') + '</td><td class="num">' + esc(e.timeline || '—') + '</td><td><span class="status st-' + esc(e.status) + '">' + esc(e.status) + '</span></td><td class="num">' + when(e.createdAt) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty"><h3>Nothing here</h3><p>' + (list.length ? 'No enquiries match this filter.' : 'Messages from the contact form will appear here.') + '</p></div>';
        $$('#enqTable tr[data-id]').forEach(function (tr) { tr.addEventListener('click', function () { openEnquiry(tr.dataset.id); }); });
      }
      $$('.chip-btn').forEach(function (b) { b.addEventListener('click', function () { enqFilter = b.dataset.f; enquiries(); }); });
      $('#enqSearch').addEventListener('input', draw);
      draw();
    });
  }
  function openEnquiry(id) {
    var e = (state.enquiries || []).find(function (x) { return x.id === id; });
    if (!e) return;
    var reply = 'mailto:' + encodeURIComponent(e.email) + '?subject=' + encodeURIComponent('Re: your enquiry to Iraady') + '&body=' + encodeURIComponent('Hi ' + (e.name || '').split(' ')[0] + ',\n\nThank you for getting in touch.\n\n');
    var wa = e.phone ? 'https://wa.me/' + String(e.phone).replace(/[^\d]/g, '') : '';
    var d = drawer(e.name || 'Enquiry',
      '<dl class="kv"><dt>Email</dt><dd><a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a></dd>' +
      (e.phone ? '<dt>Phone</dt><dd>' + esc(e.phone) + '</dd>' : '') + (e.company ? '<dt>Company</dt><dd>' + esc(e.company) + '</dd>' : '') +
      '<dt>Budget</dt><dd>' + esc(e.budget || '—') + '</dd><dt>Timeline</dt><dd>' + esc(e.timeline || '—') + '</dd><dt>Received</dt><dd>' + new Date(e.createdAt).toLocaleString() + '</dd></dl>' +
      '<div class="msg">' + esc(e.message) + '</div>' +
      '<label>Status<select id="eStatus">' + ['new', 'contacted', 'proposal', 'won', 'lost', 'spam'].map(function (s) { return '<option' + (s === e.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
      '<label>Private note<textarea id="eNote" rows="4" placeholder="Next steps, what was agreed…">' + esc(e.note || '') + '</textarea></label>',
      '<button class="btn btn-danger" data-del style="margin-right:auto">Delete</button>' +
      (wa ? '<a class="btn btn-ghost" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
      '<a class="btn btn-ghost" href="' + esc(reply) + '">Reply by email</a><button class="btn btn-primary" data-save>Save</button>');
    d.querySelector('[data-save]').addEventListener('click', function () {
      api('/api/admin/enquiries/' + encodeURIComponent(id), { method: 'PATCH', body: { status: $('#eStatus', d).value, note: $('#eNote', d).value } })
        .then(function () { toast('Enquiry updated'); d.close(); route(); }).catch(function (err) { toast(err.message); });
    });
    d.querySelector('[data-del]').addEventListener('click', function () {
      confirmBox('Delete this enquiry?', 'It is removed from the dashboard. The email copy stays in your inbox.', 'Delete', true).then(function (ok) {
        if (!ok) return;
        api('/api/admin/enquiries/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { toast('Enquiry deleted'); d.close(); route(); });
      });
    });
    if (e.status === 'new') {
      // Opening it is not the same as replying; leave the status to the admin.
    }
  }

  function orders() {
    return api('/api/admin/orders').then(function (r) {
      state.orders = r.orders;
      view.innerHTML = '<div class="a-inner"><div class="page-head"><div><p class="tag">Orders</p><h1>Source-code sales</h1><p>Recorded when Flutterwave reports a successful payment in the buyer’s browser. Confirm each one in your Flutterwave dashboard before delivering.</p></div></div>' +
        '<section class="panel">' + (r.orders.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>Product</th><th>Buyer</th><th>Amount</th><th>Transaction</th><th>Status</th><th>When</th></tr></thead><tbody>' +
          r.orders.map(function (o) {
            return '<tr class="clickable" data-id="' + esc(o.id) + '"><td class="main"><strong>' + esc(o.projectName) + '</strong></td><td class="main"><strong>' + esc(o.name) + '</strong><span>' + esc(o.email) + '</span></td>' +
              '<td class="num">' + money(o.amount) + '</td><td class="num">' + esc(o.transactionId || '—') + '</td><td><span class="status st-' + esc(o.status) + '">' + esc(o.status) + '</span></td><td class="num">' + when(o.createdAt) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty"><h3>No orders yet</h3><p>Purchases from the shop on iraady.com will appear here.</p></div>') + '</section></div>';
      $$('tr[data-id]').forEach(function (tr) { tr.addEventListener('click', function () { openOrder(tr.dataset.id); }); });
    });
  }
  function openOrder(id) {
    var o = state.orders.find(function (x) { return x.id === id; });
    var d = drawer(o.projectName,
      '<dl class="kv"><dt>Buyer</dt><dd>' + esc(o.name) + '</dd><dt>Email</dt><dd><a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a></dd><dt>Phone</dt><dd>' + esc(o.phone || '—') + '</dd>' +
      '<dt>Amount</dt><dd>' + money(o.amount) + ' ' + esc(o.currency) + '</dd><dt>Transaction</dt><dd class="mono">' + esc(o.transactionId || '—') + '</dd><dt>Reference</dt><dd class="mono">' + esc(o.txRef || '—') + '</dd><dt>When</dt><dd>' + new Date(o.createdAt).toLocaleString() + '</dd></dl>' +
      '<label>Status<select id="oStatus">' + ['reported', 'verified', 'delivered', 'refunded'].map(function (s) { return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
      '<label>Note<textarea id="oNote" rows="3">' + esc(o.note || '') + '</textarea></label>',
      '<a class="btn btn-ghost" href="mailto:' + esc(o.email) + '?subject=' + encodeURIComponent('Your ' + o.projectName + ' source code') + '">Email buyer</a><button class="btn btn-primary" data-save>Save</button>');
    d.querySelector('[data-save]').addEventListener('click', function () {
      api('/api/admin/orders/' + encodeURIComponent(id), { method: 'PATCH', body: { status: $('#oStatus', d).value, note: $('#oNote', d).value } })
        .then(function () { toast('Order updated'); d.close(); route(); }).catch(function (err) { toast(err.message); });
    });
  }

  // Generic list editor
  function listEditor(key, opts) {
    opts = opts || {};
    return loadContent().then(function (c) {
      var schema = SECTIONS[key];
      var items = (c[key] || []).slice();
      var target = opts.into || view;
      var holder = document.createElement('div'); // fresh element per render, so listeners never stack
      target.innerHTML = '';
      target.appendChild(holder);
      var filterVal = 'All';
      holder.innerHTML = (opts.into ? '' : '<div class="a-inner">') +
        (opts.into ? '' : '<div class="page-head"><div><p class="tag">Site content</p><h1>' + esc(schema.title) + '</h1>' + (schema.hint ? '<p>' + esc(schema.hint) + '</p>' : '') + '</div></div>') +
        '<section class="panel"><div class="panel-head"><h2>' + (opts.into ? esc(schema.title) : items.length + ' ' + esc(schema.item) + (items.length === 1 ? '' : 's')) + '</h2><div class="page-actions">' +
        (schema.filter ? '<select data-filter style="width:auto">' + ['All'].concat(schema.filter.options).map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select>' : '') +
        (schema.search ? '<input type="search" data-search placeholder="Search" style="width:200px">' : '') +
        '<button class="btn btn-primary btn-sm" data-add>+ Add ' + esc(schema.item) + '</button></div></div><div data-table></div></section>' + (opts.into ? '' : '</div>');
      var tableBox = holder.querySelector('[data-table]');
      function draw() {
        var q = holder.querySelector('[data-search]') ? holder.querySelector('[data-search]').value.toLowerCase() : '';
        var filtering = !!q || filterVal !== 'All';
        var rows = items.map(function (it, i) { return { it: it, i: i }; }).filter(function (r) {
          return (filterVal === 'All' || r.it[schema.filter.field] === filterVal) && (!q || schema.search(r.it).toLowerCase().indexOf(q) >= 0);
        });
        tableBox.innerHTML = rows.length ? '<div class="table-wrap"><table class="t"><thead><tr>' + schema.head + '<th></th></tr></thead><tbody>' + rows.map(function (r) {
          return '<tr data-i="' + r.i + '">' + schema.columns(r.it) + '<td class="acts">' +
            '<button class="mini" data-up title="Move up"' + (filtering || r.i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="mini" data-down title="Move down"' + (filtering || r.i === items.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button class="btn btn-ghost btn-sm" data-edit>Edit</button><button class="mini danger" data-del title="Delete">×</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty"><h3>Nothing yet</h3><p>Add the first ' + esc(schema.item) + '.</p></div>';
      }
      function persist(next, msg) {
        return saveSection(key, next).then(function (v) { items = v.slice(); draw(); toast(msg); });
      }
      function edit(index) {
        var isNew = index == null;
        var item = isNew ? {} : items[index];
        var d = drawer((isNew ? 'Add ' : 'Edit ') + schema.item,
          '<form class="form form-grid" novalidate>' + schema.fields.map(function (f) { return fieldHtml(f, item[f.name]); }).join('') + '</form>',
          (isNew ? '' : '<button class="btn btn-danger" data-del style="margin-right:auto">Delete</button>') + '<button class="btn btn-ghost" data-x>Cancel</button><button class="btn btn-primary" data-save>' + (isNew ? 'Add' : 'Save') + '</button>');
        var form = d.querySelector('form');
        wireForm(form);
        var first = form.querySelector('input,textarea'); if (first) first.focus();
        d.querySelector('[data-save]').addEventListener('click', function () {
          var missing = schema.fields.filter(function (f) { return f.required && !String(form.querySelector('[name="' + f.name + '"]').value || '').trim(); });
          if (missing.length) { toast(missing[0].label + ' is required'); form.querySelector('[name="' + missing[0].name + '"]').focus(); return; }
          var val = readForm(form, schema.fields, item);
          if (val.id !== undefined) {
            val.id = String(val.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
            if (items.some(function (x, i) { return x.id === val.id && i !== index; })) { toast('Another ' + schema.item + ' already uses that ID'); return; }
          }
          var next = items.slice();
          if (isNew) next.push(val); else next[index] = val;
          persist(next, isNew ? 'Added — live on the site' : 'Saved — live on the site').then(function () { d.close(); }).catch(function (err) { toast(err.message); });
        });
        var del = d.querySelector('[data-del]');
        if (del) del.addEventListener('click', function () { d.close(); remove(index); });
      }
      function remove(index) {
        var it = items[index];
        confirmBox('Delete “' + (it.name || it.title || it.q || it.value || schema.item) + '”?', 'It disappears from the site straight away.', 'Delete', true).then(function (ok) {
          if (!ok) return;
          var next = items.slice(); next.splice(index, 1);
          persist(next, 'Deleted').catch(function (err) { toast(err.message); });
        });
      }
      holder.addEventListener('click', function (e) {
        if (e.target.closest('[data-add]')) return edit(null);
        var tr = e.target.closest('tr[data-i]');
        if (!tr) return;
        var i = Number(tr.dataset.i);
        if (e.target.closest('[data-edit]')) return edit(i);
        if (e.target.closest('[data-del]')) return remove(i);
        var dir = e.target.closest('[data-up]') ? -1 : e.target.closest('[data-down]') ? 1 : 0;
        if (dir) {
          var next = items.slice(); var t = next[i]; next[i] = next[i + dir]; next[i + dir] = t;
          persist(next, 'Order saved').catch(function (err) { toast(err.message); });
        }
      });
      var s = holder.querySelector('[data-search]'); if (s) s.addEventListener('input', draw);
      var f = holder.querySelector('[data-filter]'); if (f) f.addEventListener('change', function () { filterVal = f.value; draw(); });
      draw();
    });
  }

  function servicesPage() {
    view.innerHTML = '<div class="a-inner"><div class="page-head"><div><p class="tag">Site content</p><h1>Services &amp; process</h1><p>What you offer and how a project runs.</p></div></div><div id="svc"></div><div style="height:16px"></div><div id="proc"></div></div>';
    return listEditor('services', { into: $('#svc') }).then(function () { return listEditor('process', { into: $('#proc') }); });
  }

  function sitePage() {
    return loadContent().then(function (c) {
      var s = c.site || {};
      view.innerHTML = '<div class="a-inner"><div class="page-head"><div><p class="tag">Site content</p><h1>Site &amp; contact</h1><p>The hero, contact details, quote and about text. Saved changes are live at once.</p></div></div>' +
        '<section class="panel"><div class="panel-head"><h2>Text and contact details</h2></div><form class="panel-body form form-grid" id="siteForm" novalidate>' +
        SITE_FIELDS.map(function (f) { return fieldHtml(f, s[f.name]); }).join('') +
        '</form><div class="savebar"><span class="dirty-note hidden" id="dirty">Unsaved changes</span><button class="btn btn-primary" id="saveSite">Save</button></div></section>' +
        '<div style="height:16px"></div><div id="met"></div><div style="height:16px"></div><div id="off"></div></div>';
      var form = $('#siteForm');
      wireForm(form);
      form.addEventListener('input', function () { $('#dirty').classList.remove('hidden'); });
      $('#saveSite').addEventListener('click', function () {
        if (!form.querySelector('[name="heroTitle"]').value.trim()) return toast('The hero headline is required');
        saveSection('site', readForm(form, SITE_FIELDS, s)).then(function () { $('#dirty').classList.add('hidden'); toast('Saved — live on the site'); }).catch(function (err) { toast(err.message); });
      });
      return listEditor('metrics', { into: $('#met') }).then(function () { return listEditor('offices', { into: $('#off') }); });
    });
  }

  function accountPage() {
    view.innerHTML = '<div class="a-inner"><div class="page-head"><div><p class="tag">Account</p><h1>Password</h1><p>Signed in as ' + esc(state.me) + '.</p></div></div>' +
      '<section class="panel" style="max-width:520px"><form class="panel-body form" id="pwForm">' +
      '<label>Current password<input type="password" name="current" autocomplete="current-password" required></label>' +
      '<label>New password <span class="help">At least 12 characters.</span><input type="password" name="next" autocomplete="new-password" minlength="12" required></label>' +
      '<label>Repeat new password<input type="password" name="again" autocomplete="new-password" required></label>' +
      '<button class="btn btn-primary" type="submit" style="justify-self:start">Change password</button></form></section></div>';
    $('#pwForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (f.next.value !== f.again.value) return toast('The new passwords do not match');
      api('/api/admin/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } })
        .then(function () { f.reset(); toast('Password changed'); }).catch(function (err) { toast(err.message); });
    });
  }

  // ---------- router ----------
  function currentRoute() { return (location.hash || '#overview').slice(1).split('/')[0] || 'overview'; }
  function route() {
    var r = currentRoute();
    renderSide(r);
    $('#side').classList.remove('open');
    var p;
    if (r === 'overview') p = overview();
    else if (r === 'enquiries') p = enquiries();
    else if (r === 'orders') p = orders();
    else if (r === 'services') p = servicesPage();
    else if (r === 'site') p = sitePage();
    else if (r === 'account') p = Promise.resolve(accountPage());
    else if (SECTIONS[r]) p = listEditor(r);
    else { location.hash = '#overview'; return; }
    Promise.resolve(p).catch(function (err) { view.innerHTML = '<div class="a-inner"><div class="empty"><h3>Could not load this page</h3><p>' + esc(err.message) + '</p></div></div>'; });
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function showLogin() {
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
    var em = $('#loginForm [name=email]'); if (em) em.focus();
  }
  function showApp(email) {
    state.me = email;
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    loadEnquiries().catch(function () {});
    route();
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector('button');
    btn.disabled = true; btn.textContent = 'Signing in…';
    $('#loginError').classList.add('hidden');
    api('/api/admin/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } })
      .then(function (r) { f.password.value = ''; showApp(r.email); })
      .catch(function (err) { $('#loginError').textContent = err.message; $('#loginError').classList.remove('hidden'); })
      .finally(function () { btn.disabled = false; btn.textContent = 'Sign in'; });
  });
  $('#menuBtn').addEventListener('click', function () { $('#side').classList.toggle('open'); });
  window.addEventListener('hashchange', function () { if (!$('#app').classList.contains('hidden')) route(); });

  api('/api/admin/me').then(function (r) { showApp(r.email); }).catch(showLogin);
})();
