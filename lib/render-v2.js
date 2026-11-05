'use strict';
/*
 * iraady.com/v2: the redesigned, international-first company site. Rendered
 * from the SAME content store as v1 (one source of truth). Optional v2-only
 * copy lives in content.site.v2* fields (edited in /v2/admin → Site & contact);
 * when empty, the defaults below are used.
 *
 * Checkout and contact reuse v1's front-end script (/js/site.js) and its
 * element ids, so Flutterwave and the enquiry endpoint behave exactly as on /.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUB = path.join(__dirname, '..', 'public');
const ASSET_V = crypto.createHash('sha1')
  .update(['v2/v2.css', 'v2/v2.js', 'js/site.js', 'js/theme.js'].map((f) => fs.readFileSync(path.join(PUB, f))).join(''))
  .digest('hex').slice(0, 10);

const STRANDS = { navy: '#2E3192', sky: '#29ABE2', yellow: '#F2C811', green: '#1E9E4A' };
const BUYABLE_GROUPS = new Set(['Personal', 'Mobile Apps']); // same rule as v1

/* Industry for each product in the suite (project id → industry). Projects not
   listed here and not client work stay in the portfolio only. */
const INDUSTRY = {
  schooliraady: 'Education', eduplatform: 'Education',
  clinicsiraady: 'Healthcare', pharmacyiraady: 'Healthcare',
  propertyiraady: 'Property & hospitality', hoteliraady: 'Property & hospitality',
  ngoiraady: 'Non-profits & co-ops', ngoplus: 'Non-profits & co-ops', coopiraady: 'Non-profits & co-ops',
  kimuse: 'Business operations', bizpro: 'Business operations', vaultiraady: 'Business operations', whatsappbot: 'Business operations',
  loansiraady: 'Finance & lending',
  marketingai: 'Sales & marketing', scrapeiraady: 'Sales & marketing', cviraady: 'Sales & marketing',
  apiiraady: 'AI & developers',
  transferiraady: 'Everyday tools', compresspro: 'Everyday tools', convertpro: 'Everyday tools',
  openradio: 'Media & audio', softradio: 'Media & audio', ikinamico: 'Media & audio',
  fitio: 'Health & fitness apps', 'fitio-mobile': 'Health & fitness apps', speedify: 'Health & fitness apps'
};
// highest-value first: business solutions, then the industry systems, then the most-used tools
const INDUSTRY_ORDER = ['Business operations', 'Finance & lending', 'Education', 'Healthcare', 'Property & hospitality', 'Non-profits & co-ops',
  'Sales & marketing', 'Everyday tools', 'AI & developers', 'Media & audio', 'Health & fitness apps'];
const GROUP_LABEL = { Personal: 'Our products', 'Mobile Apps': 'Mobile apps', Client: 'Client work' };

const DEFAULTS = {
  v2Eyebrow: 'Software & AI studio · London and Kigali',
  v2HeroTitle: 'Software that runs the business, from a team that runs its own.',
  v2HeroSub: 'Iraady Ltd builds and operates B2B software for schools, clinics, property managers, hotels, non-profits and growing companies. Use one of our products, buy its source code, or have us build exactly what you need.',
  v2ContactTitle: 'Tell us what you need to run better.',
  v2EastAfrica: 'Our Kigali team builds for East Africa too: RWF pricing, MTN MoMo and Airtel Money payment recording, and local tax settings, on the same products.'
};

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
function host(u) {
  return String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}
/** "Iraady School – School Management System" → ["Iraady School", "School Management System"] */
function splitName(n) {
  const parts = String(n || '').split(/\s+[–—-]\s+/);
  return [parts[0], parts.slice(1).join(' – ')];
}
function firstSentence(t) {
  const s = String(t || '').trim();
  const m = /^(.{20,200}?[.!?])(\s|$)/.exec(s);
  return m ? m[1] : s.slice(0, 180);
}
function v(site, key) {
  return String(site[key] || '').trim() || DEFAULTS[key];
}

function mark(size) {
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M4 22c8-6 14 0 20 8 4 6 10 8 16 9" stroke="${STRANDS.navy}"/>
    <path d="M12 6c4 10 12 22 28 33" stroke="${STRANDS.sky}"/>
    <path d="M24 9c2 10 6 20 16 30" stroke="${STRANDS.yellow}"/>
    <path d="M33 14c1 9 3 17 7 25" stroke="${STRANDS.green}"/>
  </svg>`;
}

function shot(p, cls, eager) {
  const src = safeUrl(p.image) || '/assets/placeholder.svg';
  return `<img class="${cls || ''}" src="${esc(src)}" alt="${esc(splitName(p.name)[0])} screenshot" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/assets/placeholder.svg'">`;
}

const ICON = {
  sun: '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  arrow: '<svg class="arr" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'
};

function home(c, opts) {
  const root = !!(opts && opts.root);
  const self = root ? '/' : '/v2';
  const s = c.site || {};
  const email = s.contactEmail || 'info@iraady.com';
  const projects = c.projects || [];
  const suite = projects.filter((p) => INDUSTRY[p.id]);
  const industries = INDUSTRY_ORDER.filter((i) => suite.some((p) => INDUSTRY[p.id] === i));
  const shop = projects.filter((p) => typeof p.price === 'number' && BUYABLE_GROUPS.has(p.group));
  const prices = shop.map((p) => p.price);
  const groups = ['All', ...Array.from(new Set(projects.map((p) => p.group)))];
  const heroShots = ['schooliraady', 'propertyiraady', 'ngoiraady']
    .map((id) => projects.find((p) => p.id === id)).filter(Boolean);
  while (heroShots.length < 3 && suite[heroShots.length]) heroShots.push(suite[heroShots.length]);
  const offices = c.offices || [];

  const nav = [['#products', 'Products'], ['#build', 'Custom builds'], ['#work', 'Work'], ['#pricing', 'Pricing'], ['#company', 'Company'], ['#contact', 'Contact']];

  const productCards = suite.map((p) => {
    const [name, tagline] = splitName(p.name);
    const buy = typeof p.price === 'number' && BUYABLE_GROUPS.has(p.group);
    return `<article class="prod reveal" data-industry="${esc(INDUSTRY[p.id])}">
      <a class="prod-shot" href="${esc(safeUrl(p.url) || '#contact')}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${shot(p)}</a>
      <div class="prod-body">
        <p class="eyebrow mono">${esc(INDUSTRY[p.id])}</p>
        <h3>${esc(name)}</h3>
        ${tagline ? `<p class="prod-tag">${esc(tagline)}</p>` : ''}
        <p class="prod-desc">${esc(firstSentence(p.description))}</p>
        <div class="prod-actions">
          ${safeUrl(p.url) ? `<a class="btn btn-sm btn-primary" href="${esc(p.url)}" target="_blank" rel="noopener">Live demo ${ICON.arrow}</a>` : ''}
          ${buy ? `<button type="button" class="btn btn-sm btn-ghost" data-buy="${esc(p.id)}">Buy source · $${price(p.price)}</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');

  const workCards = projects.map((p) => {
    const [name, tagline] = splitName(p.name);
    const buy = typeof p.price === 'number' && BUYABLE_GROUPS.has(p.group);
    return `<article class="work-card" data-group="${esc(p.group)}">
      <div class="work-shot">${shot(p)}</div>
      <div class="work-body">
        <div class="work-top"><h3>${esc(name)}</h3><span class="pill">${esc(GROUP_LABEL[p.group] || p.group)}</span></div>
        <p class="work-desc">${esc(tagline || firstSentence(p.description))}</p>
        <div class="work-actions">
          ${safeUrl(p.url) ? `<a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(host(p.url).split('/')[0])} ${ICON.arrow}</a>` : ''}
          ${buy ? `<button type="button" class="btn btn-sm btn-ghost" data-buy="${esc(p.id)}">Buy · $${price(p.price)}</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');

  const worldwide = [
    ['Any currency', 'Price, invoice and report in USD by default, or EUR, GBP, RWF and other currencies.'],
    ['Your tax rules', 'Name and set your own VAT or sales-tax rates instead of a fixed national scheme.'],
    ['Your time zone', 'Dates, schedules and reminders follow the time zone you set for your organisation.'],
    ['Roles for each team', 'Owners, managers and staff each see the screens their job needs.'],
    ['Record every payment', 'Record card, bank transfer, cash and mobile money payments against each invoice.'],
    ['Hosted or yours', 'Use our hosted product, or buy the source code and run it on your own servers.']
  ];

  const body = `
<body class="v2">
<a class="skip" href="#main">Skip to content</a>
<header class="hdr" id="top">
  <div class="wrap hdr-row">
    <a class="brand" href="${self}" aria-label="Iraady home">${mark(28)}<span class="brand-name">Iraady</span></a>
    <nav class="nav" id="nav" aria-label="Main">
      ${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}
    </nav>
    <div class="hdr-actions">
      <button type="button" class="icon-btn theme-toggle" data-theme-toggle aria-label="Switch light or dark theme">${ICON.moon}${ICON.sun}</button>
      <a class="btn btn-primary btn-sm hide-sm" href="#contact">Book a demo</a>
      <button type="button" class="icon-btn nav-toggle" aria-expanded="false" aria-controls="nav" aria-label="Menu">${ICON.menu}</button>
    </div>
  </div>
</header>

<main id="main">
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow mono reveal">${esc(v(s, 'v2Eyebrow'))}</p>
      <h1 class="reveal">${esc(v(s, 'v2HeroTitle'))}</h1>
      <p class="lede reveal">${esc(v(s, 'v2HeroSub'))}</p>
      <div class="hero-cta reveal">
        <a class="btn btn-primary btn-lg" href="#products">Explore the products</a>
        <a class="btn btn-ghost btn-lg" href="#contact">Start a custom build</a>
      </div>
      <ul class="facts mono reveal" aria-label="Company facts">
        <li><b>${suite.length}</b> products</li>
        <li><b>${projects.length}</b> projects shipped</li>
        <li><b>USD</b> pricing</li>
        <li>UK company <b>${esc(s.companyNumber || '')}</b></li>
      </ul>
    </div>
    <div class="hero-art" aria-hidden="true">
      ${heroShots.map((p, i) => `<figure class="frame f${i}"><div class="frame-bar"><i></i><i></i><i></i><span class="mono">${esc(host(p.url))}</span></div>${shot(p, '', i === 0)}</figure>`).join('')}
      <svg class="hero-strands" viewBox="0 0 400 400"><path d="M380 390C300 360 200 320 140 250S60 140 30 110" stroke="${STRANDS.navy}"/><path d="M380 390C330 330 260 260 220 170S180 60 170 20" stroke="${STRANDS.sky}"/><path d="M380 390C360 320 320 240 300 160S290 70 290 40" stroke="${STRANDS.yellow}"/><path d="M380 390C380 320 370 250 360 190S355 120 355 100" stroke="${STRANDS.green}"/></svg>
    </div>
  </div>
</section>

<section class="sec" id="products">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow mono">Product suite</p>
      <h2>Ready-to-run software for the work your team does every day.</h2>
      <p>Each product is live. Open the demo, try it with sample data, then subscribe or buy the source code.</p>
    </div>
    <div class="chips" role="group" aria-label="Filter products by industry">
      <button type="button" class="chip active" data-industry-filter="All" aria-pressed="true">All <span class="mono">${suite.length}</span></button>
      ${industries.map((i) => `<button type="button" class="chip" data-industry-filter="${esc(i)}" aria-pressed="false">${esc(i)} <span class="mono">${suite.filter((p) => INDUSTRY[p.id] === i).length}</span></button>`).join('')}
    </div>
    <div class="prod-grid">${productCards}</div>
  </div>
</section>

<section class="sec sec-alt" id="worldwide">
  <div class="wrap split">
    <div class="sec-head">
      <p class="eyebrow mono">Works the way you do</p>
      <h2>Set up for your country, your currency and your team.</h2>
      <p>Our products are built to be configured, so the same software fits a clinic in Leeds, a school in Ohio or a co-op in Kigali.</p>
    </div>
    <ul class="ww">
      ${worldwide.map(([t, d], i) => `<li class="reveal"><span class="ww-n mono" style="--c:${Object.values(STRANDS)[i % 4]}">0${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join('')}
    </ul>
  </div>
</section>

<section class="sec" id="build">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow mono">Custom development</p>
      <h2>Need something we have not built yet? We build it with you.</h2>
      <p>The same team that runs our products designs, builds and runs yours.</p>
    </div>
    <div class="svc-grid">
      ${(c.services || []).map((x, i) => `<article class="svc reveal"><span class="mono svc-n">0${i + 1}</span><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></article>`).join('')}
    </div>
    <div class="how" id="how">
      <h3 class="how-title">How we work</h3>
      <ol class="steps">
        ${(c.process || []).map((x, i) => `<li class="reveal" style="--c:${Object.values(STRANDS)[i % 4]}"><span class="step-dot"></span><span class="mono step-n">Step ${i + 1}</span><strong>${esc(x.title)}</strong><span>${esc(x.summary)}</span></li>`).join('')}
      </ol>
    </div>
  </div>
</section>

<section class="sec sec-alt" id="work">
  <div class="wrap">
    <div class="sec-head row">
      <div><p class="eyebrow mono">Portfolio</p><h2>${projects.length} projects shipped.</h2></div>
      <p>Our own products, mobile apps and client websites. <span class="mono" data-work-count>${projects.length}</span> shown.</p>
    </div>
    <div class="chips" role="group" aria-label="Filter projects">
      ${groups.map((g, i) => `<button type="button" class="chip filter${i === 0 ? ' active' : ''}" data-filter="${esc(g)}" aria-pressed="${i === 0}">${esc(g === 'All' ? 'All' : GROUP_LABEL[g] || g)}</button>`).join('')}
    </div>
    <div class="work-grid">${workCards}</div>
  </div>
</section>

<section class="sec" id="pricing">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow mono">Ways to work with us</p>
      <h2>Three ways in. Clear prices in USD.</h2>
      <p>Use a product, own its code, or commission a build. Final quotes follow a free discovery call.</p>
    </div>
    <div class="ways">
      <article class="way reveal"><p class="eyebrow mono">Use a product</p><h3>Hosted subscription</h3><p>We host and update the product. You get a setup call and your own account for your team.</p><a class="btn btn-ghost" href="#contact" data-plan="hosted subscription">Request a setup</a></article>
      <article class="way reveal"><p class="eyebrow mono">Own the code</p><h3>Source-code licence</h3><p class="way-price">${prices.length ? `$${price(Math.min(...prices))} – $${price(Math.max(...prices))}` : 'On request'}</p><p>${shop.length} products. Full source, commercial licence for your organisation, one payment through Flutterwave.</p><a class="btn btn-ghost" href="#work">See what is for sale</a></article>
      <article class="way reveal"><p class="eyebrow mono">Build with us</p><h3>Custom project</h3><p>Fixed-scope engagements, from a quick MVP to a full platform. See the starting prices below.</p><a class="btn btn-ghost" href="#contact" data-plan="custom">Discuss a project</a></article>
    </div>
    <div class="plans">
      ${(c.pricing || []).map((t) => `<article class="plan reveal${t.popular ? ' plan-pop' : ''}">
        <div class="plan-top"><h3>${esc(t.name)}</h3>${t.popular ? '<span class="pill pill-dark mono">Most chosen</span>' : ''}</div>
        <p class="plan-price">from <strong>${esc(t.price)}</strong></p>
        <p class="plan-best">${esc(t.best)}</p>
        <ul>${(t.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <a class="btn ${t.popular ? 'btn-primary' : 'btn-ghost'}" href="#contact" data-plan="${esc(t.name)}">Discuss a ${esc(t.name)} project</a>
      </article>`).join('')}
    </div>
  </div>
</section>

<section class="sec sec-alt" id="company">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow mono">Company</p>
      <h2>A small team that ships, with offices in ${offices.map((o) => esc(o.name)).join(' and ') || 'London and Kigali'}.</h2>
      <p>${esc(s.aboutTitle || '')}</p>
    </div>
    <div class="team">
      ${(c.team || []).map((m) => `<article class="person reveal">
        ${safeUrl(m.photo) ? `<img src="${esc(m.photo)}" alt="" loading="lazy" decoding="async">` : `<span class="person-ph mono">${esc(String(m.name || '?').split(' ').map((x) => x[0]).slice(0, 2).join(''))}</span>`}
        <div><h3>${esc(m.name)}</h3><p class="role">${esc(m.role)}${m.location ? ` · ${esc(m.location)}` : ''}</p></div>
      </article>`).join('')}
    </div>
    <div class="offices" id="offices">
      ${offices.map((o) => `<article class="office reveal">
        <p class="eyebrow mono">${esc(o.tag)}</p><h3>${esc(o.name)}</h3>
        <p>${(o.lines || []).map(esc).join('<br>')}</p>
        <p class="mono"><a href="tel:${esc(String(o.phone || '').replace(/\s/g, ''))}">${esc(o.phone)}</a></p>
        <p class="muted">${esc(o.hours)}</p>
        ${safeUrl(o.map) ? `<a class="link" href="${esc(o.map)}" target="_blank" rel="noopener">Open map ${ICON.arrow}</a>` : ''}
      </article>`).join('')}
    </div>
  </div>
</section>

<section class="sec sec-tight" id="east-africa">
  <div class="wrap ea">
    <p class="eyebrow mono">Also built for East Africa</p>
    <p>${esc(v(s, 'v2EastAfrica'))}</p>
  </div>
</section>

<section class="sec sec-alt" id="faq">
  <div class="wrap split">
    <div class="sec-head"><p class="eyebrow mono">FAQ</p><h2>Questions buyers ask first.</h2></div>
    <div class="faq">
      ${(c.faq || []).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </div>
  </div>
</section>

<section class="sec" id="contact">
  <div class="wrap contact-grid">
    <div>
      <p class="eyebrow mono">Contact</p>
      <h2>${esc(v(s, 'v2ContactTitle'))}</h2>
      <p class="lede">Book a demo of a product or describe a custom build. Iraady Ltd replies within one working day from London or Kigali.</p>
      <p><a class="btn btn-ghost" href="mailto:${esc(email)}?subject=${encodeURIComponent('Book a demo')}">Email ${esc(email)}</a></p>
    </div>
    <form class="contact card" id="contact-form" method="POST" novalidate>
      <input type="hidden" name="source" value="v2-contact-form">
      <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="row2">
        <label>Name<input name="name" required autocomplete="name"></label>
        <label>Work email<input name="email" type="email" required autocomplete="email"></label>
      </div>
      <div class="row2">
        <label>Phone <span class="muted">(with country code)</span><input name="phone" type="tel" autocomplete="tel" placeholder="+1 555 010 0000"></label>
        <label>Company<input name="company" autocomplete="organization"></label>
      </div>
      <div class="row2">
        <label>Budget (USD)<select name="budget"><option>$1K–$5K</option><option>$5K–$15K</option><option>$15K–$30K</option><option>$30K–$80K</option><option>$80K+</option><option>Not sure yet</option></select></label>
        <label>Timeline<select name="timeline"><option>ASAP</option><option>2–4 weeks</option><option>1–2 months</option><option>2–3 months</option><option>3+ months</option></select></label>
      </div>
      <label>What do you need?<textarea name="message" rows="5" required placeholder="A demo of Iraady Property for 300 units, or a custom portal for…"></textarea></label>
      <button class="btn btn-primary btn-lg" type="submit">Send enquiry</button>
      <p class="form-note">We use your details only to reply. <a href="/privacy.html">Privacy policy</a></p>
    </form>
  </div>
</section>
</main>

<footer class="ftr">
  <div class="wrap ftr-grid">
    <div>
      <a class="brand" href="${self}">${mark(26)}<span class="brand-name">Iraady</span></a>
      <p class="muted">Software and AI products, and the team that builds them.</p>
      <p class="mono muted">London, UK · Kigali, Rwanda</p>
    </div>
    <div class="ftr-col"><p class="eyebrow mono">Products</p>
      ${suite.slice(0, 7).map((p) => `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(splitName(p.name)[0])}</a>`).join('')}</div>
    <div class="ftr-col"><p class="eyebrow mono">Company</p>
      <a href="#build">Custom builds</a><a href="#work">Portfolio</a><a href="#pricing">Pricing</a><a href="#company">Team &amp; offices</a></div>
    <div class="ftr-col"><p class="eyebrow mono">Contact &amp; legal</p>
      <a href="mailto:${esc(email)}">${esc(email)}</a><a href="/privacy.html">Privacy policy</a><a href="/terms.html">Terms</a></div>
  </div>
  <div class="wrap ftr-bottom mono">
    <span>© ${new Date().getFullYear()} Iraady Ltd · Registered in England &amp; Wales, No. ${esc(s.companyNumber || '')}</span>
    <a href="/">Current site</a>
  </div>
</footer>

<div class="modal" id="checkout" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <button type="button" class="icon-btn modal-x" data-close aria-label="Close">×</button>
    <p class="eyebrow mono">Secure checkout · Flutterwave</p>
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
<script id="projects-data" type="application/json">${JSON.stringify(projects.map((p) => ({ id: p.id, name: p.name, price: p.price, group: p.group }))).replace(/</g, '\\u003c')}</script>
<script src="https://checkout.flutterwave.com/v3.js" defer></script>
<script src="/js/site.js?v=${ASSET_V}" defer></script>
<script src="/v2/v2.js?v=${ASSET_V}" defer></script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "0d6bab85f31c439b84964dfa6a7d2fe4"}'></script>
</body>
</html>`;

  const title = 'Iraady Ltd: B2B software and custom development, London & Kigali';
  const description = 'Ready-to-run software for schools, clinics, property, hotels, non-profits and growing businesses, plus custom software and AI builds. USD pricing, worldwide delivery.';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${root ? '' : '<meta name="robots" content="noindex, follow">'}
<link rel="canonical" href="https://iraady.com${root ? '/' : '/v2'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://iraady.com${root ? '/' : '/v2'}">
<meta property="og:site_name" content="Iraady Ltd">
<meta property="og:image" content="https://iraady.com${esc(safeUrl((heroShots[0] || {}).image) || '/logo.jpg')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F5F4EF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D0E11" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.jpg">
<script src="/js/theme.js?v=${ASSET_V}"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/v2/v2.css?v=${ASSET_V}">
</head>` + body;
}

module.exports = { home, INDUSTRY };
