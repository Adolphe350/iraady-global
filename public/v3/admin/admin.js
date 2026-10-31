/* iraady.com v3 dashboard (dark command centre). Same admin API, session and content
   store as /admin and /v2/admin: an edit here changes v1, v2 and v3 alike.
   Built on the v2 data layer; v3 adds the enquiry board, portfolio gallery,
   command palette (Ctrl/Cmd K), collapsible sidebar and its own theme. */
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
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
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
    return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
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
    o.innerHTML = '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="d-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-x aria-label="Close">×</button></div>' +
      '<div class="d-body">' + bodyHtml + '</div>' + (footHtml ? '<div class="d-foot">' + footHtml + '</div>' : '') + '</aside>';
    function close() { o.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('[data-x]')) close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(o);
    o.close = close;
    return o;
  }
  function head(eyebrow, title, sub, actions) {
    return '<div class="page-head"><div><p class="eyebrow">' + esc(eyebrow) + '</p><h1 class="serif">' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  }

  // ---------- schemas (same fields as v1) ----------
  var SECTIONS = {
    projects: {
      title: 'Portfolio', hint: 'Every project on the site. Our products and Mobile Apps with a price can be bought as source code.', item: 'project',
      fields: [
        { name: 'name', label: 'Name', required: true, help: 'Use “Name – tagline”; v2 shows the tagline under the name.' },
        { name: 'id', label: 'ID (used in links and checkout)', required: true, help: 'Lowercase letters, numbers and dashes.' },
        { name: 'group', label: 'Group', type: 'select', options: ['Personal', 'Mobile Apps', 'Client'] },
        { name: 'niche', label: 'Niche' },
        { name: 'url', label: 'Project URL', type: 'url' },
        { name: 'price', label: 'Source-code price (USD)', type: 'number', help: 'Empty = not for sale.' },
        { name: 'image', label: 'Screenshot', type: 'image', wide: true },
        { name: 'description', label: 'Description', type: 'textarea', wide: true },
        { name: 'techs', label: 'Tech stack', type: 'list', wide: true }
      ],
      head: '<th></th><th>Project</th><th>Group</th><th>Price</th>',
      columns: function (p) {
        return '<td><img class="thumb" src="' + esc(p.image || '/assets/placeholder.svg') + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'/assets/placeholder.svg\'"></td>' +
          '<td class="main"><strong>' + esc(p.name) + '</strong><span>' + esc(p.url || '') + '</span></td>' +
          '<td><span class="status">' + esc(p.group) + '</span></td>' +
          '<td class="num">' + (typeof p.price === 'number' ? money(p.price) : '—') + '</td>';
      },
      search: function (p) { return [p.name, p.id, p.group, p.niche, p.description, p.url].join(' '); },
      filter: { field: 'group', options: ['Personal', 'Mobile Apps', 'Client'] }
    },
    products: {
      title: 'Products', hint: 'Flagship products and everyday tools shown on the v1 home page (the first four sit on the hero strands). The v2 product suite is built from the Portfolio.', item: 'product',
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
      },
      search: function (p) { return [p.name, p.summary, p.url].join(' '); }
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
      head: '<th></th><th>Person</th><th>Location</th>',
      columns: function (p) {
        return '<td><img class="thumb" style="width:40px;height:40px;border-radius:10px" src="' + esc(p.photo || '/assets/placeholder.svg') + '" alt=""></td>' +
          '<td class="main"><strong>' + esc(p.name) + '</strong><span>' + esc(p.role) + '</span></td><td>' + esc(p.location || '—') + '</td>';
      },
      search: function (p) { return [p.name, p.role, p.location].join(' '); }
    },
    pricing: {
      title: 'Pricing', hint: 'Custom-project plans. Shown as “from …” on both versions.', item: 'plan',
      fields: [
        { name: 'name', label: 'Plan name', required: true },
        { name: 'price', label: 'Starting price', help: 'e.g. $10,000' },
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
      columns: function (p) { return '<td class="main"><strong>' + esc(p.q) + '</strong><span>' + esc(p.a) + '</span></td>'; },
      search: function (p) { return [p.q, p.a].join(' '); }
    },
    blog: {
      title: 'Blog', hint: 'Shown on v1. Posts without a link show as “Coming soon”.', item: 'post',
      fields: [
        { name: 'title', label: 'Title', required: true, wide: true },
        { name: 'date', label: 'Month', type: 'month' },
        { name: 'url', label: 'Link to the article', type: 'url' },
        { name: 'summary', label: 'Summary', type: 'textarea', wide: true }
      ],
      head: '<th>Post</th><th>Month</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.title) + '</strong><span>' + (p.url ? esc(p.url) : 'No link yet, shows as coming soon') + '</span></td><td class="num">' + esc(p.date) + '</td>'; }
    },
    services: {
      title: 'Services', item: 'service',
      fields: [{ name: 'title', label: 'Title', required: true, wide: true }, { name: 'summary', label: 'Summary', type: 'textarea', wide: true }],
      head: '<th>Service</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.title) + '</strong><span>' + esc(p.summary) + '</span></td>'; }
    },
    process: {
      title: 'How we work (steps)', item: 'step',
      fields: [{ name: 'title', label: 'Step', required: true }, { name: 'summary', label: 'One line', wide: true }],
      head: '<th>Step</th>',
      columns: function (p) { return '<td class="main"><strong>' + esc(p.title) + '</strong><span>' + esc(p.summary) + '</span></td>'; }
    },
    metrics: {
      title: 'Headline numbers (v1 only)', hint: 'The strip under the v1 hero. v2 does not show these: use only figures you can prove.', item: 'number',
      fields: [{ name: 'value', label: 'Value', required: true }, { name: 'label', label: 'Label', required: true }],
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
    { sub: 'v2 site copy (empty = default text)' },
    { name: 'v2Eyebrow', label: 'v2 hero eyebrow', wide: true },
    { name: 'v2HeroTitle', label: 'v2 hero headline', wide: true },
    { name: 'v2HeroSub', label: 'v2 hero introduction', type: 'textarea', wide: true },
    { name: 'v2ContactTitle', label: 'v2 contact headline', wide: true },
    { name: 'v2EastAfrica', label: 'v2 “Also built for East Africa” text', type: 'textarea', wide: true },
    { sub: 'v1 site copy' },
    { name: 'eyebrow', label: 'Hero eyebrow', wide: true },
    { name: 'heroTitle', label: 'Hero headline', wide: true, required: true },
    { name: 'heroSub', label: 'Hero introduction', type: 'textarea', wide: true },
    { name: 'trustLine', label: 'Trust line', wide: true },
    { name: 'markets', label: 'Markets line', wide: true },
    { name: 'quote', label: 'Quote', type: 'textarea', wide: true },
    { name: 'quoteBy', label: 'Quote by', wide: true },
    { sub: 'Shared by both versions' },
    { name: 'aboutTitle', label: 'About headline', wide: true },
    { name: 'about', label: 'About text (v1)', type: 'textarea', wide: true },
    { name: 'contactEmail', label: 'Contact email', type: 'email', help: 'Enquiries are also emailed here.' },
    { name: 'whatsapp', label: 'WhatsApp number', help: 'Digits with country code. Empty hides the v1 button.' },
    { name: 'companyNumber', label: 'UK company number' },
    { name: 'linkedin', label: 'LinkedIn URL', type: 'url' },
    { name: 'twitter', label: 'X / Twitter URL', type: 'url' },
    { name: 'github', label: 'GitHub URL', type: 'url' }
  ];

  // ---------- form building ----------
  function fieldHtml(f, value) {
    if (f.sub) return '<p class="eyebrow subhead">' + esc(f.sub) + '</p>';
    var req = f.required ? ' required' : '';
    var help = f.help ? ' <span class="help">' + esc(f.help) + '</span>' : '';
    var wide = f.wide ? ' wide' : '';
    if (f.type === 'textarea') return '<label class="' + wide + '">' + esc(f.label) + help + '<textarea name="' + f.name + '" rows="3"' + req + '>' + esc(value) + '</textarea></label>';
    if (f.type === 'select') return '<label class="' + wide + '">' + esc(f.label) + '<select name="' + f.name + '">' + f.options.map(function (o) { return '<option' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>';
    if (f.type === 'bool') return '<label class="check' + wide + '"><input type="checkbox" name="' + f.name + '"' + (value ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
    if (f.type === 'strand') return '<div class="' + wide + '"><p class="eyebrow" style="margin-bottom:6px">' + esc(f.label) + '</p><div class="strand-pick">' + Object.keys(STRANDS).map(function (k) {
      return '<label><input type="radio" name="' + f.name + '" value="' + k + '"' + ((value || 'navy') === k ? ' checked' : '') + '><span class="swatch" style="background:' + STRANDS[k] + '"></span>' + k + '</label>';
    }).join('') + '</div></div>';
    if (f.type === 'image') return '<label class="' + wide + '">' + esc(f.label) + help + '<span class="img-field"><img src="' + esc(value || '/assets/placeholder.svg') + '" alt="" referrerpolicy="no-referrer" onerror="this.src=\'/assets/placeholder.svg\'"><input type="text" name="' + f.name + '" value="' + esc(value) + '" placeholder="/uploads/… or https://…"><button type="button" class="btn btn-ghost btn-sm" data-upload>Upload</button><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></span></label>';
    if (f.type === 'list') return '<div class="list-field' + wide + '" data-list="' + f.name + '"><p class="eyebrow">' + esc(f.label) + '</p>' +
      (value || []).map(function (v) { return listRow(v); }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-add-row style="justify-self:start">+ Add line</button></div>';
    var type = f.type === 'number' ? 'number" step="0.01' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : f.type === 'month' ? 'month' : 'text';
    return '<label class="' + wide + '">' + esc(f.label) + help + '<input type="' + type + '" name="' + f.name + '" value="' + esc(value == null ? '' : value) + '"' + req + '></label>';
  }
  function listRow(v) {
    return '<div class="list-row"><input type="text" value="' + esc(v) + '" aria-label="Line"><button type="button" class="mini danger" data-del-row aria-label="Remove line">×</button></div>';
  }
  function uploadFile(file) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return Promise.reject(new Error('Use a PNG, JPEG, WebP or GIF image'));
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('Images must be 5 MB or less'));
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { api('/api/admin/upload', { method: 'POST', body: { dataUrl: reader.result } }).then(resolve, reject); };
      reader.onerror = function () { reject(new Error('Could not read the file')); };
      reader.readAsDataURL(file);
    });
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
        var box = e.target.closest('.img-field');
        toast('Uploading…');
        uploadFile(e.target.files[0]).then(function (r) {
          box.querySelector('input[type=text]').value = r.url;
          box.querySelector('img').src = r.url;
          toast('Image uploaded. Save to use it.');
        }).catch(function (err) { toast(err.message); });
      }
    });
    root.addEventListener('input', function (e) {
      if (e.target.matches('.img-field input[type=text]')) e.target.closest('.img-field').querySelector('img').src = e.target.value || '/assets/placeholder.svg';
    });
  }
  function readForm(root, fields, base) {
    var out = Object.assign({}, base || {});
    fields.forEach(function (f) {
      if (f.sub) return;
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
      state.content.updatedAt = new Date().toISOString();
      return r.value;
    });
  }
  function loadEnquiries() {
    return api('/api/admin/enquiries').then(function (r) { state.enquiries = r.enquiries; renderSide(currentRoute()); return r.enquiries; });
  }
  function loadOrders() {
    return api('/api/admin/orders').then(function (r) { state.orders = r.orders; return r.orders; });
  }

  // ---------- sidebar ----------
  var I = {
    overview: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z',
    enquiries: 'M4 6h16v12H4zM4 7l8 6 8-6',
    orders: 'M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0',
    projects: 'M4 5h16v11H4zM9 20h6M12 16v4',
    products: 'M12 3 4 7l8 4 8-4zM4 12l8 4 8-4M4 17l8 4 8-4',
    team: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6',
    pricing: 'M20 12 12 20 4 12V4h8zM8.5 8.5h.01',
    services: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z',
    faq: 'M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2V14M12 18h.01',
    blog: 'M5 4h10l4 4v12H5zM9 12h6M9 16h6M9 8h3',
    site: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18',
    uploads: 'M4 16v4h16v-4M12 4v12M7 9l5-5 5 5',
    account: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3'
  };
  var NAV = [
    ['Business', [['overview', 'Overview'], ['enquiries', 'Enquiries'], ['orders', 'Orders']]],
    ['Site content', [['projects', 'Portfolio'], ['products', 'Products'], ['team', 'Team'], ['pricing', 'Pricing'], ['services', 'Services'], ['faq', 'FAQ'], ['blog', 'Blog'], ['site', 'Site & contact'], ['uploads', 'Uploads']]],
    ['You', [['account', 'Account']]]
  ];
  var TITLES = {};
  NAV.forEach(function (g) { g[1].forEach(function (i) { TITLES[i[0]] = i[1]; }); });
  function icon(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + I[k] + '"/></svg>'; }
  function renderSide(active) {
    var newCount = (state.enquiries || []).filter(function (e) { return e.status === 'new'; }).length;
    $('#sideNav').innerHTML = NAV.map(function (g) {
      return '<p class="eyebrow">' + g[0] + '</p>' + g[1].map(function (i) {
        return '<a class="s-link' + (i[0] === active ? ' active' : '') + '" href="#' + i[0] + '"' + (i[0] === active ? ' aria-current="page"' : '') + '>' + icon(i[0]) + esc(i[1]) +
          (i[0] === 'enquiries' && newCount ? '<span class="count">' + newCount + '</span>' : '') + '</a>';
      }).join('');
    }).join('');
    $('#who').textContent = state.me || '';
    $('#crumb').textContent = 'Dashboard / ' + (TITLES[active] || '');
  }
  function closeMenu() { $('#side').classList.remove('open'); $('#scrim').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }

  // ---------- overview ----------
  function overview() {
    return Promise.all([api('/api/admin/overview'), loadEnquiries(), loadOrders(), loadContent(true)]).then(function (r) {
      var o = r[0], enq = r[1], ord = r[2], c = r[3];
      var DAY = 86400000, now = Date.now();
      var week = enq.filter(function (e) { return now - Date.parse(e.createdAt) < 7 * DAY; }).length;
      var prevWeek = enq.filter(function (e) { var a = now - Date.parse(e.createdAt); return a >= 7 * DAY && a < 14 * DAY; }).length;
      var days = [];
      for (var i = 13; i >= 0; i--) {
        var start = new Date(); start.setHours(0, 0, 0, 0); start = start.getTime() - i * DAY;
        days.push(enq.filter(function (e) { var t = Date.parse(e.createdAt); return t >= start && t < start + DAY; }).length);
      }
      var max = Math.max.apply(null, days.concat([1]));
      var spark = '<div class="spark" aria-label="Enquiries per day, last 14 days">' + days.map(function (n, i) {
        return '<i class="' + (i === 13 ? 'today' : '') + '" style="height:' + Math.max(6, (n / max) * 100) + '%" title="' + n + '"></i>';
      }).join('') + '</div>';
      var hour = new Date().getHours();
      var updates = [
        ['Site content saved', c.updatedAt, '#site'],
        ['Latest enquiry', enq[0] && enq[0].createdAt, '#enquiries'],
        ['Latest order', ord[0] && ord[0].createdAt, '#orders']
      ];
      view.innerHTML = head('Overview', 'Good ' + (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening') + '.', 'What is happening on iraady.com.', '<a class="btn btn-ghost btn-sm" href="#enquiries">Open enquiries</a>') +
        '<div class="kpis">' +
          kpi('Enquiries this week', week, (week - prevWeek >= 0 ? '+' : '') + (week - prevWeek) + ' vs the week before', 'sky', spark) +
          kpi('Waiting for a reply', o.enquiries.new, 'status “new”', 'yellow') +
          kpi('Orders', o.orders.total, money(o.orders.revenue) + ' reported · ' + o.orders.last30 + ' in 30 days', 'green') +
          kpi('Portfolio', o.content.projects, o.content.shop + ' for sale · ' + o.content.team + ' team members', 'navy') +
        '</div>' +
        '<div class="grid2"><section class="panel"><div class="panel-head"><h2>Latest enquiries</h2><a class="btn btn-ghost btn-sm" href="#enquiries">All</a></div>' +
          (o.recent.length ? '<ul class="feed">' + o.recent.map(function (e) {
            return '<li data-enq="' + esc(e.id) + '" tabindex="0"><div><strong>' + esc(e.name) + (e.company ? ' · ' + esc(e.company) : '') + '</strong><span>' + esc((e.message || '').slice(0, 90)) + '</span></div><div class="r"><span class="status st-' + esc(e.status) + '">' + esc(e.status) + '</span><br><span>' + when(e.createdAt) + '</span></div></li>';
          }).join('') + '</ul>' : '<div class="empty"><h3>No enquiries yet</h3><p>Messages from the contact form land here.</p></div>') +
        '</section><div><section class="panel"><div class="panel-head"><h2>Last updates</h2></div><div class="quick">' +
          updates.map(function (u) { return '<a href="' + u[2] + '">' + esc(u[0]) + ' <span class="mono">' + when(u[1]) + '</span></a>'; }).join('') +
        '</div></section><section class="panel"><div class="panel-head"><h2>On the site</h2></div><div class="quick">' +
          '<a href="#projects">Portfolio projects <span class="mono">' + o.content.projects + '</span></a>' +
          '<a href="#projects">For sale as source code <span class="mono">' + o.content.shop + '</span></a>' +
          '<a href="#products">Products (v1 hero) <span class="mono">' + o.content.products + '</span></a>' +
          '<a href="#team">Team members <span class="mono">' + o.content.team + '</span></a>' +
        '</div></section></div></div>';
      $$('[data-enq]').forEach(function (li) {
        li.addEventListener('click', function () { openEnquiry(li.dataset.enq); });
        li.addEventListener('keydown', function (e) { if (e.key === 'Enter') openEnquiry(li.dataset.enq); });
      });
    });
  }
  function kpi(label, value, sub, strand, extra) {
    return '<div class="kpi" style="--c:' + STRANDS[strand] + '"><p class="eyebrow">' + esc(label) + '</p><p class="kpi-v">' + esc(value) + '</p><p class="kpi-s">' + esc(sub) + '</p>' + (extra || '') + '</div>';
  }

  // ---------- enquiries ----------
  var enqFilter = 'open';
  var enqMode = store('v3-enq-mode') || 'board';
  var BOARD = [['new', 'New'], ['contacted', 'Contacted'], ['proposal', 'Proposal'], ['won', 'Won'], ['lost', 'Lost']];
  var OPEN = ['new', 'contacted', 'proposal'];
  function enquiries() {
    return loadEnquiries().then(function (list) {
      var counts = { open: 0, all: list.length };
      list.forEach(function (e) { counts[e.status] = (counts[e.status] || 0) + 1; if (OPEN.indexOf(e.status) >= 0) counts.open++; });
      if (enqMode === 'board') return enquiryBoard(list);
      view.innerHTML = head('Enquiries', 'People who want to work with you', 'Every message from the contact form on v1, v2 and v3. Each one is also emailed to the contact address.', modeSwitch()) +
        '<section class="panel"><div class="panel-head"><div class="chips">' +
          [['open', 'Open'], ['new', 'New'], ['contacted', 'Contacted'], ['proposal', 'Proposal'], ['won', 'Won'], ['lost', 'Lost'], ['spam', 'Spam'], ['all', 'All']].map(function (f) {
            return '<button class="chip' + (enqFilter === f[0] ? ' active' : '') + '" data-f="' + f[0] + '" aria-pressed="' + (enqFilter === f[0]) + '">' + f[1] + '<span class="n">' + (counts[f[0]] || 0) + '</span></button>';
          }).join('') +
        '</div><div class="tools"><input type="search" id="enqSearch" placeholder="Search name, email, company" aria-label="Search enquiries"></div></div><div id="enqTable"></div></section>';
      function draw() {
        var q = ($('#enqSearch').value || '').toLowerCase();
        var rows = list.filter(function (e) {
          var okF = enqFilter === 'all' || (enqFilter === 'open' ? OPEN.indexOf(e.status) >= 0 : e.status === enqFilter);
          return okF && (!q || [e.name, e.email, e.company, e.message].join(' ').toLowerCase().indexOf(q) >= 0);
        });
        $('#enqTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>From</th><th>Budget</th><th>Source</th><th>Status</th><th>Received</th></tr></thead><tbody>' +
          rows.map(function (e) {
            return '<tr class="clickable" data-id="' + esc(e.id) + '" tabindex="0"><td class="main"><strong>' + esc(e.name) + (e.company ? ' · ' + esc(e.company) : '') + '</strong><span>' + esc(e.message) + '</span></td>' +
              '<td class="num">' + esc(e.budget || '—') + '</td><td class="num">' + esc(e.source || '—') + '</td><td><span class="status st-' + esc(e.status) + '">' + esc(e.status) + '</span></td><td class="num">' + when(e.createdAt) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty"><h3>Nothing here</h3><p>' + (list.length ? 'No enquiries match this filter.' : 'Messages from the contact form will appear here.') + '</p></div>';
        $$('#enqTable tr[data-id]').forEach(function (tr) {
          tr.addEventListener('click', function () { openEnquiry(tr.dataset.id); });
          tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') openEnquiry(tr.dataset.id); });
        });
      }
      $$('.chip[data-f]').forEach(function (b) { b.addEventListener('click', function () { enqFilter = b.dataset.f; enquiries(); }); });
      wireModeSwitch();
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
      '<dt>Budget</dt><dd>' + esc(e.budget || '—') + '</dd><dt>Timeline</dt><dd>' + esc(e.timeline || '—') + '</dd><dt>Source</dt><dd class="mono">' + esc(e.source || '—') + '</dd><dt>Received</dt><dd>' + new Date(e.createdAt).toLocaleString('en-GB') + '</dd></dl>' +
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
  }

  // ---------- orders ----------
  var ordFilter = 'all';
  function orders() {
    return loadOrders().then(function (list) {
      var total = list.reduce(function (s, o) { return s + (Number(o.amount) || 0); }, 0);
      view.innerHTML = head('Orders', 'Source-code sales', 'Recorded when Flutterwave reports a successful payment in the buyer’s browser. Confirm each one in Flutterwave before delivering.') +
        '<section class="panel"><div class="panel-head"><div class="chips">' + ['all', 'reported', 'verified', 'delivered', 'refunded'].map(function (s) {
          var n = s === 'all' ? list.length : list.filter(function (o) { return o.status === s; }).length;
          return '<button class="chip' + (ordFilter === s ? ' active' : '') + '" data-of="' + s + '">' + s[0].toUpperCase() + s.slice(1) + '<span class="n">' + n + '</span></button>';
        }).join('') + '</div><div class="tools"><span class="mono muted">' + money(total) + ' reported</span><input type="search" id="ordSearch" placeholder="Search buyer or product" aria-label="Search orders"></div></div><div id="ordTable"></div></section>';
      function draw() {
        var q = ($('#ordSearch').value || '').toLowerCase();
        var rows = list.filter(function (o) { return (ordFilter === 'all' || o.status === ordFilter) && (!q || [o.projectName, o.name, o.email, o.transactionId].join(' ').toLowerCase().indexOf(q) >= 0); });
        $('#ordTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>Product</th><th>Buyer</th><th>Amount</th><th>Transaction</th><th>Status</th><th>When</th></tr></thead><tbody>' +
          rows.map(function (o) {
            return '<tr class="clickable" data-id="' + esc(o.id) + '" tabindex="0"><td class="main"><strong>' + esc(o.projectName) + '</strong></td><td class="main"><strong>' + esc(o.name) + '</strong><span>' + esc(o.email) + '</span></td>' +
              '<td class="num">' + money(o.amount) + '</td><td class="num">' + esc(o.transactionId || '—') + '</td><td><span class="status st-' + esc(o.status) + '">' + esc(o.status) + '</span></td><td class="num">' + when(o.createdAt) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty"><h3>No orders' + (list.length ? ' match' : ' yet') + '</h3><p>Purchases of source code from iraady.com appear here.</p></div>';
        $$('#ordTable tr[data-id]').forEach(function (tr) { tr.addEventListener('click', function () { openOrder(tr.dataset.id); }); });
      }
      $$('.chip[data-of]').forEach(function (b) { b.addEventListener('click', function () { ordFilter = b.dataset.of; orders(); }); });
      $('#ordSearch').addEventListener('input', draw);
      draw();
    });
  }
  function openOrder(id) {
    var o = state.orders.find(function (x) { return x.id === id; });
    if (!o) return;
    var d = drawer(o.projectName,
      '<dl class="kv"><dt>Buyer</dt><dd>' + esc(o.name) + '</dd><dt>Email</dt><dd><a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a></dd><dt>Phone</dt><dd>' + esc(o.phone || '—') + '</dd>' +
      '<dt>Amount</dt><dd>' + money(o.amount) + ' ' + esc(o.currency) + '</dd><dt>Transaction</dt><dd class="mono">' + esc(o.transactionId || '—') + '</dd><dt>Reference</dt><dd class="mono">' + esc(o.txRef || '—') + '</dd><dt>When</dt><dd>' + new Date(o.createdAt).toLocaleString('en-GB') + '</dd></dl>' +
      '<label>Status<select id="oStatus">' + ['reported', 'verified', 'delivered', 'refunded'].map(function (s) { return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
      '<label>Note<textarea id="oNote" rows="3">' + esc(o.note || '') + '</textarea></label>',
      '<a class="btn btn-ghost" href="mailto:' + esc(o.email) + '?subject=' + encodeURIComponent('Your ' + o.projectName + ' source code') + '">Email buyer</a><button class="btn btn-primary" data-save>Save</button>');
    d.querySelector('[data-save]').addEventListener('click', function () {
      api('/api/admin/orders/' + encodeURIComponent(id), { method: 'PATCH', body: { status: $('#oStatus', d).value, note: $('#oNote', d).value } })
        .then(function () { toast('Order updated'); d.close(); route(); }).catch(function (err) { toast(err.message); });
    });
  }

  // ---------- generic list editor ----------
  function listEditor(key, opts) {
    opts = opts || {};
    return loadContent().then(function (c) {
      var schema = SECTIONS[key];
      var items = (c[key] || []).slice();
      var target = opts.into || view;
      var holder = document.createElement('div');
      target.innerHTML = '';
      target.appendChild(holder);
      var filterVal = 'All';
      holder.innerHTML = (opts.into ? '' : head('Site content', schema.title, schema.hint)) +
        '<section class="panel"><div class="panel-head"><h2>' + (opts.into ? esc(schema.title) : '<span data-n>' + items.length + '</span> ' + esc(schema.item) + 's') + '</h2><div class="tools">' +
        (schema.filter ? '<select data-filter aria-label="Filter">' + ['All'].concat(schema.filter.options).map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select>' : '') +
        (schema.search ? '<input type="search" data-search placeholder="Search" aria-label="Search">' : '') +
        '<button class="btn btn-primary btn-sm" data-add>+ Add ' + esc(schema.item) + '</button></div></div><div data-table></div></section>' +
        (opts.into && schema.hint ? '<p class="muted" style="margin-top:8px;font-size:13px">' + esc(schema.hint) + '</p>' : '');
      var tableBox = holder.querySelector('[data-table]');
      var mode = key === 'projects' ? (store('v3-portfolio-mode') || 'grid') : 'table';
      if (key === 'projects') {
        holder.querySelector('.tools').insertAdjacentHTML('afterbegin', '<div class="seg" role="group" aria-label="View"><button type="button" data-mode="grid" aria-pressed="' + (mode === 'grid') + '">Gallery</button><button type="button" data-mode="table" aria-pressed="' + (mode === 'table') + '">Table</button></div>');
        holder.addEventListener('click', function (e) {
          var m = e.target.closest('[data-mode]'); if (!m) return;
          mode = m.dataset.mode; store('v3-portfolio-mode', mode);
          $$('[data-mode]', holder).forEach(function (b) { b.setAttribute('aria-pressed', String(b === m)); });
          draw();
        });
      }
      function draw() {
        var q = holder.querySelector('[data-search]') ? holder.querySelector('[data-search]').value.toLowerCase() : '';
        var filtering = !!q || filterVal !== 'All';
        var rows = items.map(function (it, i) { return { it: it, i: i }; }).filter(function (r) {
          return (filterVal === 'All' || r.it[schema.filter.field] === filterVal) && (!q || schema.search(r.it).toLowerCase().indexOf(q) >= 0);
        });
        var n = holder.querySelector('[data-n]'); if (n) n.textContent = items.length;
        if (mode === 'grid' && rows.length) {
          tableBox.innerHTML = '<div class="pgrid">' + rows.map(function (r) {
            var p = r.it;
            return '<article class="pcard" data-i="' + r.i + '"><button type="button" class="pcard-img" data-edit aria-label="Edit ' + esc(p.name) + '"><img src="' + esc(p.image || '/assets/placeholder.svg') + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'/assets/placeholder.svg\'"></button>' +
              '<div class="pcard-b"><span class="tag">' + esc(p.group) + '</span><strong>' + esc(String(p.name || '').split(/\s+[–—-]\s+/)[0]) + '</strong><span class="muted">' + esc(String(p.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</span></div>' +
              '<div class="pcard-f"><span class="mono">' + (typeof p.price === 'number' ? money(p.price) : 'Not for sale') + '</span><span class="acts">' +
              '<button class="mini" data-up aria-label="Move earlier"' + (filtering || r.i === 0 ? ' disabled' : '') + '>←</button>' +
              '<button class="mini" data-down aria-label="Move later"' + (filtering || r.i === items.length - 1 ? ' disabled' : '') + '>→</button>' +
              '<button class="mini danger" data-del aria-label="Delete">×</button></span></div></article>';
          }).join('') + '</div>';
          return;
        }
        tableBox.innerHTML = rows.length ? '<div class="table-wrap"><table class="t"><thead><tr>' + schema.head + '<th></th></tr></thead><tbody>' + rows.map(function (r) {
          return '<tr data-i="' + r.i + '">' + schema.columns(r.it) + '<td class="acts">' +
            '<button class="mini" data-up title="Move up" aria-label="Move up"' + (filtering || r.i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="mini" data-down title="Move down" aria-label="Move down"' + (filtering || r.i === items.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button class="btn btn-ghost btn-sm" data-edit>Edit</button><button class="mini danger" data-del title="Delete" aria-label="Delete">×</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty"><h3>Nothing ' + (filtering ? 'matches' : 'yet') + '</h3><p>' + (filtering ? 'Try another search.' : 'Add the first ' + esc(schema.item) + '.') + '</p></div>';
      }
      function persist(next, msg) {
        return saveSection(key, next).then(function (v) { items = v.slice(); draw(); toast(msg); });
      }
      function edit(index) {
        var isNew = index == null;
        var item = isNew ? {} : items[index];
        var d = drawer((isNew ? 'Add ' : 'Edit ') + schema.item,
          '<form class="form-grid" novalidate>' + schema.fields.map(function (f) { return fieldHtml(f, item[f.name]); }).join('') + '</form>',
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
          persist(next, isNew ? 'Added, live on the site' : 'Saved, live on the site').then(function () { d.close(); }).catch(function (err) { toast(err.message); });
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
        var tr = e.target.closest('[data-i]');
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
    view.innerHTML = head('Site content', 'Services', 'What you offer, and the steps of a project.') + '<div id="svc"></div><div style="height:14px"></div><div id="proc"></div>';
    return listEditor('services', { into: $('#svc') }).then(function () { return listEditor('process', { into: $('#proc') }); });
  }

  function sitePage() {
    return loadContent().then(function (c) {
      var s = c.site || {};
      view.innerHTML = head('Site content', 'Site & contact', 'Hero text, contact details and offices. Saved changes are live at once.') +
        '<section class="panel"><div class="panel-head"><h2>Text and contact details</h2></div><form class="panel-body form-grid" id="siteForm" novalidate>' +
        SITE_FIELDS.map(function (f) { return fieldHtml(f, s[f.name]); }).join('') +
        '</form><div class="savebar"><span class="dirty hidden" id="dirty">Unsaved changes</span><button class="btn btn-primary" id="saveSite">Save</button></div></section>' +
        '<div style="height:14px"></div><div id="off"></div><div style="height:14px"></div><div id="met"></div>';
      var form = $('#siteForm');
      wireForm(form);
      form.addEventListener('input', function () { $('#dirty').classList.remove('hidden'); });
      $('#saveSite').addEventListener('click', function () {
        if (!form.querySelector('[name="heroTitle"]').value.trim()) return toast('The v1 hero headline is required');
        saveSection('site', readForm(form, SITE_FIELDS, s)).then(function (v) { s = v; $('#dirty').classList.add('hidden'); toast('Saved, live on the site'); }).catch(function (err) { toast(err.message); });
      });
      return listEditor('offices', { into: $('#off') }).then(function () { return listEditor('metrics', { into: $('#met') }); });
    });
  }

  // ---------- uploads ----------
  function uploadsPage() {
    return loadContent().then(function (c) {
      var used = [];
      (c.projects || []).forEach(function (p) { if (p.image) used.push({ url: p.image, name: p.name, where: 'Portfolio' }); });
      (c.team || []).forEach(function (p) { if (p.photo) used.push({ url: p.photo, name: p.name, where: 'Team' }); });
      view.innerHTML = head('Site content', 'Uploads', 'Upload an image, copy its address, and paste it into any image field. Images up to 5 MB: PNG, JPEG, WebP or GIF.') +
        '<section class="panel"><div class="panel-body"><div class="drop" id="drop"><p><strong>Drop an image here</strong> or</p><button class="btn btn-primary btn-sm" id="pick" type="button">Choose a file</button><input type="file" id="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>' +
        '<div class="url-out hidden" id="out"><input type="text" id="outUrl" readonly aria-label="Uploaded image address"><button class="btn btn-ghost btn-sm" id="copy" type="button">Copy</button></div></div></div></section>' +
        '<section class="panel"><div class="panel-head"><h2>Images on the site <span class="mono muted">' + used.length + '</span></h2><div class="tools"><input type="search" id="gSearch" placeholder="Search" aria-label="Search images"></div></div><div class="panel-body"><div class="gallery" id="gallery"></div></div></section>';
      function draw() {
        var q = ($('#gSearch').value || '').toLowerCase();
        $('#gallery').innerHTML = used.filter(function (u) { return !q || (u.name + ' ' + u.url + ' ' + u.where).toLowerCase().indexOf(q) >= 0; }).map(function (u) {
          return '<a class="g-item" href="' + esc(u.url) + '" target="_blank" rel="noopener"><img src="' + esc(u.url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'/assets/placeholder.svg\'"><div><strong>' + esc(u.name) + '</strong><span>' + esc(u.where) + ' · ' + esc(u.url) + '</span></div></a>';
        }).join('') || '<div class="empty"><h3>No images match</h3></div>';
      }
      function send(file) {
        toast('Uploading…');
        uploadFile(file).then(function (r) {
          $('#out').classList.remove('hidden'); $('#outUrl').value = r.url; $('#outUrl').select();
          toast('Uploaded');
        }).catch(function (err) { toast(err.message); });
      }
      $('#pick').addEventListener('click', function () { $('#file').click(); });
      $('#file').addEventListener('change', function (e) { if (e.target.files[0]) send(e.target.files[0]); });
      var drop = $('#drop');
      drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
      drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) send(e.dataTransfer.files[0]); });
      $('#copy').addEventListener('click', function () {
        var v = $('#outUrl').value;
        (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast('Copied'); }, function () { $('#outUrl').select(); toast('Press Ctrl+C to copy'); });
      });
      $('#gSearch').addEventListener('input', draw);
      draw();
    });
  }

  // ---------- account ----------
  function accountPage() {
    view.innerHTML = head('Account', 'Account', 'Signed in as ' + (state.me || '') + '. The same account signs in to /admin, /v2/admin and /v3/admin.') +
      '<section class="panel" style="max-width:520px"><div class="panel-head"><h2>Change password</h2></div><form class="panel-body form" id="pwForm">' +
      '<label>Current password<input type="password" name="current" autocomplete="current-password" required></label>' +
      '<label>New password <span class="help">At least 12 characters.</span><input type="password" name="next" autocomplete="new-password" minlength="12" required></label>' +
      '<label>Repeat new password<input type="password" name="again" autocomplete="new-password" required></label>' +
      '<button class="btn btn-primary" type="submit" style="justify-self:start">Change password</button></form></section>';
    $('#pwForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (f.next.value !== f.again.value) return toast('The new passwords do not match');
      api('/api/admin/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } })
        .then(function () { f.reset(); toast('Password changed'); }).catch(function (err) { toast(err.message); });
    });
  }

  // ---------- v3 additions ----------
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function modeSwitch() {
    return '<div class="seg" role="group" aria-label="View"><button type="button" data-emode="board" aria-pressed="' + (enqMode === 'board') + '">Board</button><button type="button" data-emode="list" aria-pressed="' + (enqMode === 'list') + '">List</button></div>';
  }
  function wireModeSwitch() {
    $$('[data-emode]').forEach(function (b) {
      b.addEventListener('click', function () { enqMode = b.dataset.emode; store('v3-enq-mode', enqMode); enquiries(); });
    });
  }
  function enquiryBoard(list) {
    var other = list.filter(function (e) { return e.status === 'spam'; }).length;
    view.innerHTML = head('Enquiries', 'Your pipeline', 'Drag a card to move it to the next stage, or focus it and use the arrow keys. Open it for the full message, notes and reply buttons.', modeSwitch()) +
      '<div class="board-tools"><input type="search" id="bSearch" placeholder="Filter cards by name, company or message" aria-label="Filter enquiries">' +
      (other ? '<span class="mono muted">' + other + ' marked as spam (see List)</span>' : '') + '</div>' +
      '<div class="kanban" id="kanban">' + BOARD.map(function (col) {
        return '<section class="kcol" data-col="' + col[0] + '" aria-label="' + col[1] + '"><header><span class="kdot k-' + col[0] + '"></span>' + col[1] + '<span class="mono n" data-cn="' + col[0] + '"></span></header><div class="kcards" data-drop="' + col[0] + '"></div></section>';
      }).join('') + '</div>';
    function draw() {
      var q = ($('#bSearch').value || '').toLowerCase();
      BOARD.forEach(function (col) {
        var items = list.filter(function (e) { return e.status === col[0] && (!q || [e.name, e.company, e.email, e.message].join(' ').toLowerCase().indexOf(q) >= 0); });
        $('[data-cn="' + col[0] + '"]').textContent = items.length;
        $('[data-drop="' + col[0] + '"]').innerHTML = items.map(function (e) {
          return '<article class="kcard" draggable="true" tabindex="0" data-id="' + esc(e.id) + '"><strong>' + esc(e.name) + '</strong>' + (e.company ? '<span class="co">' + esc(e.company) + '</span>' : '') +
            '<p>' + esc((e.message || '').slice(0, 120)) + '</p><footer><span class="mono">' + esc(e.budget || '—') + '</span><span class="mono">' + when(e.createdAt) + '</span></footer></article>';
        }).join('') || '<p class="kempty">Nothing here</p>';
      });
    }
    function move(id, status) {
      var e = list.find(function (x) { return x.id === id; });
      if (!e || e.status === status) return;
      var prev = e.status; e.status = status; draw();
      api('/api/admin/enquiries/' + encodeURIComponent(id), { method: 'PATCH', body: { status: status } })
        .then(function () { toast('Moved to ' + status); loadEnquiries(); var c = $('[data-id="' + id + '"]'); if (c) c.focus(); })
        .catch(function (err) { e.status = prev; draw(); toast(err.message); });
    }
    var kan = $('#kanban');
    kan.addEventListener('dragstart', function (ev) { var c = ev.target.closest('.kcard'); if (!c) return; ev.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); });
    kan.addEventListener('dragend', function (ev) { var c = ev.target.closest('.kcard'); if (c) c.classList.remove('dragging'); $$('.kcol').forEach(function (k) { k.classList.remove('over'); }); });
    kan.addEventListener('dragover', function (ev) { var col = ev.target.closest('.kcol'); if (!col) return; ev.preventDefault(); $$('.kcol').forEach(function (k) { k.classList.toggle('over', k === col); }); });
    kan.addEventListener('drop', function (ev) { var col = ev.target.closest('.kcol'); if (!col) return; ev.preventDefault(); move(ev.dataTransfer.getData('text/plain'), col.dataset.col); });
    kan.addEventListener('click', function (ev) { var c = ev.target.closest('.kcard'); if (c) openEnquiry(c.dataset.id); });
    kan.addEventListener('keydown', function (ev) {
      var c = ev.target.closest('.kcard'); if (!c) return;
      if (ev.key === 'Enter') return openEnquiry(c.dataset.id);
      var e = list.find(function (x) { return x.id === c.dataset.id; });
      var i = BOARD.findIndex(function (b) { return b[0] === e.status; });
      if (ev.key === 'ArrowRight' && i < BOARD.length - 1) { ev.preventDefault(); move(e.id, BOARD[i + 1][0]); }
      if (ev.key === 'ArrowLeft' && i > 0) { ev.preventDefault(); move(e.id, BOARD[i - 1][0]); }
    });
    $('#bSearch').addEventListener('input', draw);
    wireModeSwitch();
    draw();
  }

  // command palette (Ctrl/Cmd K)
  function palette() {
    if ($('.cmdk')) return;
    var items = [];
    NAV.forEach(function (g) { g[1].forEach(function (i) { items.push({ label: i[1], hint: g[0], go: '#' + i[0] }); }); });
    items.push({ label: 'View the v3 site', hint: 'Open', href: '/v3' }, { label: 'View the current site', hint: 'Open', href: '/' }, { label: 'Switch light / dark', hint: 'Theme', run: toggleTheme });
    var c = state.content || {};
    (c.projects || []).forEach(function (p, idx) { items.push({ label: p.name, hint: 'Portfolio', go: '#projects', edit: idx }); });
    (state.enquiries || []).slice(0, 60).forEach(function (e) { items.push({ label: e.name + (e.company ? ' · ' + e.company : ''), hint: 'Enquiry · ' + e.status, enq: e.id }); });
    var o = document.createElement('div');
    o.className = 'overlay center cmdk-wrap';
    o.innerHTML = '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette"><input type="text" placeholder="Jump to a page, project or enquiry…" aria-label="Search"><ul role="listbox"></ul><p class="cmdk-foot mono">↑ ↓ to move · Enter to open · Esc to close</p></div>';
    document.body.appendChild(o);
    var input = $('input', o), ul = $('ul', o), sel = 0, shown = [];
    function draw() {
      var q = input.value.toLowerCase().trim();
      shown = items.filter(function (i) { return !q || (i.label + ' ' + i.hint).toLowerCase().indexOf(q) >= 0; }).slice(0, 40);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      ul.innerHTML = shown.map(function (i, k) { return '<li role="option" data-k="' + k + '" aria-selected="' + (k === sel) + '"><span>' + esc(i.label) + '</span><span class="mono">' + esc(i.hint) + '</span></li>'; }).join('') || '<li class="none">No matches</li>';
      var a = $('[aria-selected="true"]', ul); if (a) a.scrollIntoView({ block: 'nearest' });
    }
    function close() { o.remove(); document.removeEventListener('keydown', key, true); }
    function run(i) {
      if (!i) return; close();
      if (i.href) return window.open(i.href, '_blank', 'noopener');
      if (i.run) return i.run();
      if (i.enq) { location.hash = '#enquiries'; setTimeout(function () { openEnquiry(i.enq); }, 350); return; }
      if (location.hash !== i.go) location.hash = i.go; else route();
      if (i.edit != null) setTimeout(function () { var b = $('[data-i="' + i.edit + '"] [data-edit]'); if (b) b.click(); }, 450);
    }
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(shown[sel]); }
    }
    document.addEventListener('keydown', key, true);
    input.addEventListener('input', function () { sel = 0; draw(); });
    ul.addEventListener('click', function (e) { var li = e.target.closest('[data-k]'); if (li) run(shown[Number(li.dataset.k)]); });
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    draw(); input.focus();
  }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !$('#app').classList.contains('hidden')) { e.preventDefault(); palette(); }
  });
  var cmdBtn = $('#cmdBtn'); if (cmdBtn) cmdBtn.addEventListener('click', palette);

  // theme (dark by default, own key) and collapsible sidebar
  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store('iraady-v3-admin-theme', next);
  }
  $$('[data-v3-theme]').forEach(function (b) { b.addEventListener('click', toggleTheme); });
  if (store('iraady-v3-side') === 'mini') document.body.classList.add('side-mini');
  var colBtn = $('#collapseBtn');
  if (colBtn) colBtn.addEventListener('click', function () {
    var mini = document.body.classList.toggle('side-mini');
    store('iraady-v3-side', mini ? 'mini' : 'full');
    colBtn.setAttribute('aria-pressed', String(mini));
  });

  // ---------- router ----------
  function currentRoute() { return (location.hash || '#overview').slice(1).split('/')[0] || 'overview'; }
  function route() {
    var r = currentRoute();
    renderSide(r);
    closeMenu();
    view.innerHTML = '<p class="muted">Loading…</p>';
    var p;
    if (r === 'overview') p = overview();
    else if (r === 'enquiries') p = enquiries();
    else if (r === 'orders') p = orders();
    else if (r === 'services') p = servicesPage();
    else if (r === 'site') p = sitePage();
    else if (r === 'uploads') p = uploadsPage();
    else if (r === 'account') p = Promise.resolve(accountPage());
    else if (SECTIONS[r]) p = listEditor(r);
    else { location.hash = '#overview'; return; }
    Promise.resolve(p).catch(function (err) { view.innerHTML = '<div class="empty"><h3>Could not load this page</h3><p>' + esc(err.message) + '</p></div>'; });
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
  $('#logout').addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST' }).finally(function () { location.hash = ''; state = { content: null, enquiries: null, orders: null, me: null }; showLogin(); });
  });
  $('#menuBtn').addEventListener('click', function () {
    var open = !$('#side').classList.contains('open');
    $('#side').classList.toggle('open', open); $('#scrim').classList.toggle('open', open);
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  });
  $('#scrim').addEventListener('click', closeMenu);
  window.addEventListener('hashchange', function () { if (!$('#app').classList.contains('hidden')) route(); });

  api('/api/admin/me').then(function (r) { showApp(r.email); }).catch(showLogin);
})();
