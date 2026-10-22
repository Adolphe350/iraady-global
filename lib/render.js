'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Asset version = hash of the files, so a deploy is picked up at once and
// versioned URLs can be cached for a year.
const ASSET_V = crypto.createHash('sha1')
  .update(['css/site.css', 'js/site.js', 'js/theme.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'public', f))).join(''))
  .digest('hex').slice(0, 10);
/*
 * Server-rendered pages for iraady.com. Everything editable comes from the
 * content store (see seed/content.json), so the dashboard changes the page and
 * search engines still get full HTML.
 *
 * Visual identity: the logo's four strands (navy, sky, yellow, green) fanning
 * from one root — one studio, many products. The strands are the motif; each
 * product carries one strand colour.
 */

const STRANDS = { navy: '#2E3192', sky: '#29ABE2', yellow: '#F2C811', green: '#1E9E4A', lime: '#B5E61D' };
const BUYABLE_GROUPS = new Set(['Personal', 'Mobile Apps']);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeUrl(u) {
  const s = String(u || '').trim();
  return /^(https?:|mailto:|tel:|\/|#)/i.test(s) ? s : '';
}
function price(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2).replace(/\.00$/, '') : '0';
}
function strandColor(name) {
  return STRANDS[name] || STRANDS.navy;
}
function monthLabel(ym) {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym || ''));
  if (!m) return esc(ym);
  return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** The logo's strand fan, as the brand mark (small) or the hero figure (large). */
function strandMark(size) {
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M4 22c8-6 14 0 20 8 4 6 10 8 16 9" stroke="${STRANDS.navy}" />
    <path d="M12 6c4 10 12 22 28 33" stroke="${STRANDS.sky}" />
    <path d="M24 9c2 10 6 20 16 30" stroke="${STRANDS.yellow}" />
    <path d="M33 14c1 9 3 17 7 25" stroke="${STRANDS.green}" />
  </svg>`;
}

function heroFigure(products) {
  // Four strands from one root (bottom right), curving like the logo, each
  // ending at a product and drawn in that product's strand colour.
  const ends = [
    { x: 30, y: 210, d: 'M470 470 C 380 440, 230 400, 150 320 S 60 250, 30 210' },
    { x: 110, y: 92, d: 'M470 470 C 400 410, 280 330, 210 230 S 140 120, 110 92' },
    { x: 250, y: 40, d: 'M470 470 C 430 390, 340 300, 300 190 S 260 80, 250 40' },
    { x: 392, y: 128, d: 'M470 470 C 460 380, 430 290, 410 220 S 395 150, 392 128' }
  ];
  const shown = products.slice(0, 4);
  const chips = shown.map((p, i) => {
    const e = ends[i];
    return `<a class="fig-chip" href="${esc(safeUrl(p.url) || '#products')}" style="left:${(e.x / 500) * 100}%;top:${(e.y / 500) * 100}%;--c:${strandColor(p.strand)}" ${p.url ? 'target="_blank" rel="noopener"' : ''}>
      <span class="fig-dot"></span><span class="fig-name">${esc(p.name)}</span><span class="fig-kind mono">${esc(p.kind || '')}</span></a>`;
  }).join('');
  return `<div class="hero-figure" aria-label="Iraady products">
    <svg viewBox="0 0 500 500" class="strands" aria-hidden="true">
      ${shown.map((p, i) => `<path class="strand s${i}" d="${ends[i].d}" stroke="${strandColor(p.strand)}" />`).join('')}
      <circle cx="470" cy="470" r="7" class="root" />
    </svg>
    ${chips}
  </div>`;
}

/** The headline with a marker stroke under its last two words. */
function markHeadline(title) {
  const words = String(title || '').trim().split(/\s+/);
  if (words.length < 3) return esc(title);
  const tail = words.splice(-2).join(' ');
  return `${esc(words.join(' '))} <span class="hl">${esc(tail)}</span>`;
}

function header(active) {
  const nav = [
    ['/#products', 'Products'], ['/#work', 'Work'], ['/#services', 'Services'],
    ['/#pricing', 'Pricing'], ['/#team', 'Team'], ['/#contact', 'Contact']
  ];
  return `<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="/" aria-label="Iraady home">${strandMark(30)}<span class="brand-name">Iraady</span><span class="brand-ltd mono">Ltd</span></a>
    <nav class="nav" id="nav" aria-label="Main">
      ${nav.map(([h, l]) => `<a href="${h}"${active === l ? ' aria-current="page"' : ''}>${l}</a>`).join('')}
    </nav>
    <div class="header-actions">
      <button type="button" class="icon-btn theme-toggle" data-theme-toggle aria-label="Switch light or dark theme">
        <svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>
        <svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
      <a class="btn btn-primary hide-sm" href="/#contact">Start a project</a>
      <button type="button" class="icon-btn nav-toggle" aria-expanded="false" aria-controls="nav" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </div>
</header>`;
}

function footer(c) {
  const s = c.site || {};
  const social = [['LinkedIn', s.linkedin], ['X / Twitter', s.twitter], ['GitHub', s.github]].filter(([, u]) => safeUrl(u));
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <a class="brand" href="/">${strandMark(28)}<span class="brand-name">Iraady</span><span class="brand-ltd mono">Ltd</span></a>
      <p class="foot-tag">Software, AI and products built for operators.</p>
      <p class="foot-meta mono">London, UK · Kigali, Rwanda</p>
    </div>
    <div class="foot-col"><p class="tag">Company</p>
      <a href="/#products">Products</a><a href="/#work">Work</a><a href="/#team">Team</a><a href="/#pricing">Pricing</a></div>
    <div class="foot-col"><p class="tag">Products</p>
      ${(c.products || []).slice(0, 7).map((p) => `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(p.name)}</a>`).join('')}</div>
    <div class="foot-col"><p class="tag">Legal &amp; contact</p>
      <a href="/privacy.html">Privacy policy</a><a href="/terms.html">Terms</a>
      <a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a>
      ${social.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>
  </div>
  <div class="wrap foot-bottom">
    <p>© ${new Date().getFullYear()} Iraady Ltd · UK Company No. ${esc(s.companyNumber)}</p>
    <p class="mono">Built and run by Iraady</p>
  </div>
</footer>`;
}

function head({ title, description, canonical, extra = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="Iraady Ltd">
<meta property="og:image" content="https://iraady.com/logo.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F4F3EE" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E0F14" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/jpeg" href="/favicon.jpg">
<link rel="apple-touch-icon" href="/apple-touch-icon.jpg">
<script src="/js/theme.js?v=${ASSET_V}"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Schibsted+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_V}">
${extra}
</head>`;
}

function jsonLd(c, shopCount, lo, hi) {
  const s = c.site || {};
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'SoftwareCompany'], '@id': 'https://iraady.com/#organization',
        name: 'Iraady Ltd', url: 'https://iraady.com/', logo: 'https://iraady.com/logo.jpg', foundingDate: '2021',
        email: s.contactEmail, areaServed: 'global',
        address: (c.offices || []).map((o) => ({ '@type': 'PostalAddress', streetAddress: (o.lines || [])[0], addressLocality: o.name })),
        telephone: (c.offices || []).map((o) => o.phone)
      },
      { '@type': 'WebSite', '@id': 'https://iraady.com/#website', url: 'https://iraady.com/', name: 'Iraady Ltd', publisher: { '@id': 'https://iraady.com/#organization' } },
      shopCount ? {
        '@type': 'Product', name: 'Iraady Source Code Projects', description: 'Production-tested project source code with commercial licenses.',
        brand: { '@id': 'https://iraady.com/#organization' },
        offers: { '@type': 'AggregateOffer', priceCurrency: 'USD', offerCount: shopCount, lowPrice: lo, highPrice: hi, url: 'https://iraady.com/#shop' }
      } : null
    ].filter(Boolean)
  }).replace(/</g, '\\u003c')}</script>`;
}

function home(c) {
  const s = c.site || {};
  const products = c.products || [];
  const flagship = products.filter((p) => p.kind !== 'Tool');
  const tools = products.filter((p) => p.kind === 'Tool');
  const projects = c.projects || [];
  const clients = projects.filter((p) => p.group === 'Client');
  const shop = projects.filter((p) => typeof p.price === 'number' && BUYABLE_GROUPS.has(p.group));
  const prices = shop.map((p) => p.price);
  const blog = (c.blog || []).filter((b) => b.title);
  const groups = ['All', ...Array.from(new Set(projects.map((p) => p.group)))];

  const metricCells = (c.metrics || []).filter((m) => m.value).map((m) => `
    <div class="metric"><dd>${esc(m.value)}</dd><dt class="tag">${esc(m.label)}</dt></div>`).join('');

  const workCards = projects.map((p) => {
    const buy = typeof p.price === 'number' && BUYABLE_GROUPS.has(p.group);
    return `<article class="work-card" data-group="${esc(p.group)}">
      <div class="work-shot"><img src="${esc(safeUrl(p.image) || '/assets/placeholder.svg')}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/assets/placeholder.svg'"></div>
      <div class="work-body">
        <div class="work-top"><h3>${esc(p.name)}</h3><span class="pill">${esc(p.group)}</span></div>
        ${p.niche ? `<p class="work-niche mono">${esc(p.niche)}</p>` : ''}
        <p class="work-desc">${esc(p.description || '')}</p>
        <div class="work-actions">
          ${safeUrl(p.url) ? `<a class="btn btn-ghost btn-sm" href="${esc(p.url)}" target="_blank" rel="noopener">View project</a>` : ''}
          ${buy ? `<button type="button" class="btn btn-primary btn-sm" data-buy="${esc(p.id)}">Buy source · $${price(p.price)}</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');

  const body = `
<body class="home">
<a class="skip" href="#main">Skip to content</a>
${header()}
<main id="main">

<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy rise">
      <p class="tag"><span class="live"></span>${esc(s.eyebrow)}</p>
      <h1>${markHeadline(s.heroTitle)}</h1>
      <p class="lede">${esc(s.heroSub)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="#contact">Book a discovery call</a>
        <a class="btn btn-ghost btn-lg" href="#work">See our work</a>
      </div>
      <p class="trust mono">${esc(s.trustLine)}</p>
    </div>
    <div class="rise rise-2">
      <div class="hero-panel">
        <div class="hero-panel-top"><span>One studio · many products</span><b>${products.filter((p) => (p.status || 'Live') === 'Live').length} live</b></div>
        ${heroFigure(products)}
        <div class="hero-panel-foot">${products.slice(0, 4).map((p) => `<span style="--c:${strandColor(p.strand)}">${esc(p.name)}</span>`).join('')}</div>
      </div>
    </div>
  </div>
</section>

${metricCells ? `<section class="metrics" aria-label="Iraady in numbers"><dl class="wrap metric-grid">${metricCells}</dl></section>` : ''}

<section class="section" id="products">
  <div class="wrap">
    <div class="sec-head"><p class="tag">Products</p><h2>One studio. Many strands.</h2>
      <p>We build and operate our own software, so every decision we make for clients has already met real users.</p></div>
    <div class="flagship">
      ${flagship.map((p) => `<a class="prod-card" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener" style="--c:${strandColor(p.strand)}">
        <span class="prod-bar"></span>
        <span class="prod-top"><span class="prod-name">${esc(p.name)}</span><span class="pill pill-live">${esc(p.status || 'Live')}</span></span>
        <span class="prod-sum">${esc(p.summary)}</span>
        <span class="prod-url mono">${esc(String(p.url || '').replace(/^https?:\/\//, ''))} →</span>
      </a>`).join('')}
    </div>
    ${tools.length ? `<div class="tools">
      <p class="tag">Everyday tools by Iraady</p>
      <div class="tool-grid">
        ${tools.map((p) => `<a class="tool" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener" style="--c:${strandColor(p.strand)}">
          <span class="tool-dot"></span><span><strong>${esc(p.name)}</strong><span>${esc(p.summary)}</span></span></a>`).join('')}
      </div></div>` : ''}
  </div>
</section>

<section class="section section-alt" id="services">
  <div class="wrap">
    <div class="sec-head"><p class="tag">Services</p><h2>Engineering, AI, mobile and design from one product-led team.</h2></div>
    <ol class="services">
      ${(c.services || []).map((x, i) => `<li><span class="n mono">0${i + 1}</span><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></li>`).join('')}
    </ol>
    <ol class="process" aria-label="How we work">
      ${(c.process || []).map((x, i) => `<li style="--c:${Object.values(STRANDS)[i % 4]}"><span class="step mono">Step ${i + 1}</span><strong>${esc(x.title)}</strong><span>${esc(x.summary)}</span></li>`).join('')}
    </ol>
  </div>
</section>

<section class="section" id="work">
  <div class="wrap">
    <div class="sec-head sec-head-row"><div><p class="tag">Portfolio</p><h2>${projects.length} projects shipped.</h2></div>
      <p>Our own SaaS, mobile apps and client work. <span class="mono" data-work-count>${projects.length}</span> shown.</p></div>
    <div class="filters" role="group" aria-label="Filter projects">
      ${groups.map((g, i) => `<button type="button" class="filter${i === 0 ? ' active' : ''}" data-filter="${esc(g)}" aria-pressed="${i === 0}">${esc(g)}</button>`).join('')}
    </div>
    <div class="work-grid">${workCards}</div>
  </div>
</section>

${clients.length ? `<section class="section section-tight" id="clients">
  <div class="wrap">
    <div class="sec-head"><p class="tag">Clients</p><h2>Trusted by teams across ${esc(String(s.markets || '').split('·').length)}+ markets.</h2></div>
    <ul class="client-list">
      ${clients.map((p) => `<li><a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener"><strong>${esc(p.name)}</strong>${p.niche ? `<span class="mono">${esc(p.niche)}</span>` : ''}</a></li>`).join('')}
    </ul>
    ${s.markets ? `<p class="markets mono">${esc(s.markets)}</p>` : ''}
  </div>
</section>` : ''}

<section class="section quote-sec">
  <div class="wrap quote-grid">
    <div><p class="tag">Proof</p><h2>BizPro and NgoPlus are not demos. They run real organisations every day.</h2></div>
    <blockquote><p>“${esc(s.quote)}”</p><cite>${esc(s.quoteBy)}</cite></blockquote>
  </div>
</section>

<section class="section" id="pricing">
  <div class="wrap">
    <div class="sec-head"><p class="tag">Work with us</p><h2>Clear pricing. No surprises.</h2><p>Every project is different, but this is where most of our work lands.</p></div>
    <div class="pricing">
      ${(c.pricing || []).map((t) => `<article class="plan${t.popular ? ' plan-pop' : ''}">
        ${t.popular ? '<span class="pop mono">Most chosen</span>' : ''}
        <h3>${esc(t.name)}</h3>
        <p class="plan-price">From <strong>${esc(t.price)}</strong></p>
        <p class="plan-best">${esc(t.best)}</p>
        <ul>${(t.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <a class="btn ${t.popular ? 'btn-primary' : 'btn-ghost'}" href="#contact" data-plan="${esc(t.name)}">Discuss a ${esc(t.name)} project</a>
      </article>`).join('')}
    </div>
  </div>
</section>

${shop.length ? `<section class="section section-alt" id="shop">
  <div class="wrap">
    <div class="sec-head sec-head-row"><div><p class="tag">Ready-made source code</p><h2>Buy what we have already built.</h2></div>
      <p>${shop.length} production-tested products. Full source, commercial licence, one payment.</p></div>
    <ul class="shop">
      ${shop.map((p) => `<li><div><strong>${esc(p.name)}</strong><span>${esc(String(p.description || '').split('.')[0])}</span></div>
        <span class="shop-price mono">$${price(p.price)}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-buy="${esc(p.id)}">Buy</button></li>`).join('')}
    </ul>
  </div>
</section>` : ''}

<section class="section" id="team">
  <div class="wrap">
    <div class="sec-head"><p class="tag">Team</p><h2>A small team that ships.</h2></div>
    <div class="team">
      ${(c.team || []).map((m) => `<article class="person">
        ${safeUrl(m.photo) ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy">` : `<span class="person-ph mono">${esc(String(m.name || '?').split(' ').map((x) => x[0]).slice(0, 2).join(''))}</span>`}
        <h3>${esc(m.name)}</h3><p class="role">${esc(m.role)}${m.location ? ` · ${esc(m.location)}` : ''}</p><p>${esc(m.bio)}</p>
      </article>`).join('')}
      <article class="person person-join"><h3>Join the team</h3><p>We are always glad to meet people who love shipping.</p><a href="mailto:${esc(s.contactEmail)}?subject=Joining%20Iraady">${esc(s.contactEmail)}</a></article>
    </div>
  </div>
</section>

${blog.length ? `<section class="section section-tight" id="blog">
  <div class="wrap">
    <div class="sec-head"><p class="tag">Writing</p><h2>Notes from the workshop.</h2></div>
    <div class="posts">
      ${blog.map((b) => {
        const inner = `<p class="mono post-date">${monthLabel(b.date)}</p><h3>${esc(b.title)}</h3><p>${esc(b.summary)}</p>${safeUrl(b.url) ? '<span class="post-more">Read →</span>' : '<span class="post-soon mono">Coming soon</span>'}`;
        return safeUrl(b.url) ? `<a class="post" href="${esc(b.url)}" target="_blank" rel="noopener">${inner}</a>` : `<article class="post">${inner}</article>`;
      }).join('')}
    </div>
  </div>
</section>` : ''}

<section class="section section-alt" id="faq">
  <div class="wrap faq-grid">
    <div class="sec-head"><p class="tag">FAQ</p><h2>Answers before we start.</h2></div>
    <div class="faq">
      ${(c.faq || []).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </div>
  </div>
</section>

<section class="section" id="contact">
  <div class="wrap contact-grid">
    <div>
      <p class="tag">Contact</p>
      <h2>Start a project with Iraady.</h2>
      <p class="lede">Tell us what you are building. We reply within one working day.</p>
      <div class="offices">
        ${(c.offices || []).map((o) => `<div class="office">
          <p class="tag">${esc(o.tag)}</p><h3>${esc(o.name)}</h3>
          <p>${(o.lines || []).map(esc).join('<br>')}</p>
          <p class="mono"><a href="tel:${esc(String(o.phone || '').replace(/\s/g, ''))}">${esc(o.phone)}</a></p>
          <p class="office-hours">${esc(o.hours)}</p>
          ${safeUrl(o.map) ? `<a class="map-link" href="${esc(o.map)}" target="_blank" rel="noopener">Map →</a>` : ''}
        </div>`).join('')}
      </div>
    </div>
    <form class="contact card" id="contact-form" action="https://formsubmit.co/${esc(s.contactEmail)}" method="POST">
      <input type="hidden" name="_subject" value="New enquiry from iraady.com">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_next" value="https://iraady.com/thank-you.html">
      <input type="hidden" name="_captcha" value="false">
      <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="row2">
        <label>Name<input name="name" required autocomplete="name"></label>
        <label>Email<input name="email" type="email" required autocomplete="email"></label>
      </div>
      <div class="row2">
        <label>Phone<input name="phone" type="tel" autocomplete="tel"></label>
        <label>Company<input name="company" autocomplete="organization"></label>
      </div>
      <div class="row2">
        <label>Budget<select name="budget"><option>$1K–$5K</option><option>$5K–$15K</option><option>$15K–$30K</option><option>$30K–$80K</option><option>$80K+</option><option>Not sure yet</option></select></label>
        <label>Timeline<select name="timeline"><option>ASAP</option><option>2–4 weeks</option><option>1–2 months</option><option>2–3 months</option><option>3+ months</option></select></label>
      </div>
      <label>What are you building?<textarea name="message" rows="5" required></textarea></label>
      <button class="btn btn-primary btn-lg" type="submit">Send enquiry</button>
      <p class="form-note">Or write to <a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a>${s.whatsapp ? ` · <a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</p>
    </form>
  </div>
</section>

<section class="section section-tight about">
  <div class="wrap about-grid">
    <h2>${esc(s.aboutTitle)}</h2>
    <p>${esc(s.about)} <span class="mono">UK Company No. ${esc(s.companyNumber)}</span></p>
  </div>
</section>
</main>
${footer(c)}

<div class="modal" id="checkout" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <button type="button" class="icon-btn modal-x" data-close aria-label="Close">×</button>
    <p class="tag">Secure checkout · Flutterwave</p>
    <h2 id="checkout-title">Buy source code</h2>
    <p class="modal-sub" id="checkout-sub"></p>
    <form id="checkout-form">
      <label>Full name<input name="name" required autocomplete="name"></label>
      <label>Email<input name="email" type="email" required autocomplete="email"></label>
      <label>Phone<input name="phone" type="tel" required autocomplete="tel"></label>
      <button class="btn btn-primary btn-lg" type="submit" id="checkout-submit">Continue to payment</button>
      <p class="form-note">Full source code · commercial licence · delivered to your email within 24 hours.</p>
    </form>
  </div>
</div>
${s.whatsapp ? `<a class="wa" href="https://wa.me/${esc(s.whatsapp)}?text=${encodeURIComponent('Hi Iraady, I would like to talk about a project.')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor"><path d="M16 .4C7.2.4 0 7.6 0 16.4c0 2.9.8 5.6 2.2 7.9L0 31.6l7.4-2.1a16 16 0 0 0 8.6 2.9c8.8 0 16-7.2 16-16S24.8.4 16 .4zm0 29.3a13.3 13.3 0 0 1-6.8-1.8l-.5-.3-4.4 1.3 1.2-4.3-.3-.5A13.3 13.3 0 1 1 16 29.7zm7.3-9.9c-.4-.2-2.4-1.2-2.7-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.6-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.3-2.8-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7l-1.2-3c-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.3s1.4 3.9 1.6 4.1c.2.3 2.8 4.3 6.9 6.1 1 .4 1.7.7 2.3.9 1 .3 1.8.3 2.5.2.8-.1 2.4-1 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.4-.3-.8-.5z"/></svg></a>` : ''}
<script id="projects-data" type="application/json">${JSON.stringify(projects.map((p) => ({ id: p.id, name: p.name, price: p.price, group: p.group }))).replace(/</g, '\\u003c')}</script>
<script src="https://checkout.flutterwave.com/v3.js" defer></script>
<script src="/js/site.js?v=${ASSET_V}" defer></script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "0d6bab85f31c439b84964dfa6a7d2fe4"}'></script>
</body>
</html>`;

  return head({
    title: 'Iraady Ltd — Software, AI and products from London & Kigali',
    description: s.heroSub,
    canonical: 'https://iraady.com/',
    extra: jsonLd(c, shop.length, prices.length ? Math.min(...prices) : 0, prices.length ? Math.max(...prices) : 0)
  }) + body;
}

/** Legal and thank-you pages: their own <main> content inside the new frame. */
function page(c, { title, description, canonical, main }) {
  return head({ title, description, canonical }) + `
<body class="doc-page">
${header()}
<main id="main" class="wrap doc">${main}</main>
${footer(c)}
<script src="/js/site.js?v=${ASSET_V}" defer></script>
</body></html>`;
}

module.exports = { home, page, esc };
