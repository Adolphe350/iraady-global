'use strict';
/*
 * iraady.com/v3: "the software that runs your ___". The hero is an interactive
 * sentence: pick a kind of organisation and the product and screenshot change
 * with it. Visual language of Iraady School: Fraunces + Nunito Sans (self-hosted),
 * ivory paper, ink navy, school-blue buttons and colour blocks, chalk-yellow
 * highlighter marks.
 *
 * Same content store as v1/v2. Checkout and the contact form reuse /js/site.js
 * and its element ids (#contact-form, #checkout, #checkout-form, #projects-data,
 * [data-buy], [data-plan]), so Flutterwave and /api/enquiries work as on /.
 * Figures are computed from content, never typed in.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUB = path.join(__dirname, '..', 'public');
const ASSET_V = crypto.createHash('sha1')
  .update(['v3/v3.css', 'v3/v3.js', 'js/site.js'].map((f) => fs.readFileSync(path.join(PUB, f))).join(''))
  .digest('hex').slice(0, 10);

const STRANDS = { navy: '#2E3192', sky: '#29ABE2', sun: '#F2C811', leaf: '#1E9E4A' }; // logo strands
const BUYABLE_GROUPS = new Set(['Personal', 'Mobile Apps']);
const FOUNDED = 2021;

/* The hero sentence: "The software that runs your ___". */
const PICKS = [
  ['bizpro', 'business', 'stone', 'Point of sale, stock, invoicing and accounts for growing businesses.'],
  ['kimuse', 'HR team', 'sky', 'Employee records, leave, attendance and payroll with payslips, for one company or many.'],
  ['schooliraady', 'school', 'sun', 'Admissions, attendance, report cards and tuition billing, with a portal for parents.'],
  ['clinicsiraady', 'clinic', 'sky', 'Patient records, the waiting-room queue, lab results and insurer billing.'],
  ['pharmacyiraady', 'pharmacy', 'leaf', 'A fast till, batches and expiry dates, insurance claims and branch stock.'],
  ['propertyiraady', 'letting agency', 'stone', 'Leases, rent invoices, arrears, maintenance and statements for owners.'],
  ['hoteliraady', 'hotel', 'sun', 'Reservations, guest folios, the restaurant till and the night audit.'],
  ['ngoiraady', 'non-profit', 'sky', 'Grants, budgets against spending, results tracking and donor reports.'],
  ['coopiraady', 'cooperative', 'leaf', 'Members, deliveries by grade, payment runs and member statements.']
];

const INDUSTRY = {
  kimuse: 'Business solutions', bizpro: 'Business solutions', vaultiraady: 'Business solutions', whatsappbot: 'Business solutions',
  schooliraady: 'Schools and universities', eduplatform: 'Schools and universities',
  clinicsiraady: 'Healthcare', pharmacyiraady: 'Healthcare',
  propertyiraady: 'Property and hotels', hoteliraady: 'Property and hotels',
  ngoiraady: 'Non-profits and co-ops', ngoplus: 'Non-profits and co-ops', coopiraady: 'Non-profits and co-ops',
  marketingai: 'Sales and marketing', scrapeiraady: 'Sales and marketing', cviraady: 'Sales and marketing',
  convertpro: 'Everyday tools', compresspro: 'Everyday tools', transferiraady: 'Everyday tools',
  apiiraady: 'For developers',
  openradio: 'Media and audio', softradio: 'Media and audio', ikinamico: 'Media and audio',
  fitio: 'Consumer apps', 'fitio-mobile': 'Consumer apps', speedify: 'Consumer apps'
};
/* Highest-value sections first: business solutions, then the industry systems, then the most-used tools. */
const INDUSTRY_ORDER = ['Business solutions', 'Schools and universities', 'Healthcare', 'Property and hotels', 'Non-profits and co-ops',
  'Sales and marketing', 'Everyday tools', 'For developers', 'Media and audio', 'Consumer apps'];
const INDUSTRY_LINE = {
  'Business solutions': 'HR and payroll, business management, company documents and customer messaging.',
  'Schools and universities': 'Running a school, and helping students apply to universities.',
  Healthcare: 'Private clinics and pharmacies, from the front desk to insurance claims.',
  'Property and hotels': 'Letting agencies, landlords, hotels, lodges and guesthouses.',
  'Non-profits and co-ops': 'Grants and donor reporting, NGO operations and producer cooperatives.',
  'Sales and marketing': 'Finding customers, reaching them and applying for the right jobs.',
  'Everyday tools': 'Our most-used tools: convert, compress and send files in the browser.',
  'For developers': 'One API for many AI models, with keys, usage and logs.',
  'Media and audio': 'Internet radio for stations and listeners, and an audio archive.',
  'Consumer apps': 'Fitness and tracking apps on the web and on Android.'
};
const ITEM_ORDER = ['kimuse', 'bizpro', 'vaultiraady', 'whatsappbot', 'convertpro', 'compresspro', 'transferiraady'];
const TONE_OF = {};

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
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0';
}
function host(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
function splitName(n) {
  const parts = String(n || '').split(/\s+[–—-]\s+/);
  return [parts[0], parts.slice(1).join(' – ')];
}
function firstSentence(t) {
  const s = String(t || '').trim();
  const m = /^(.{20,200}?[.!?])(\s|$)/.exec(s);
  return m ? m[1] : s.slice(0, 160);
}
function buyable(p) { return typeof p.price === 'number' && BUYABLE_GROUPS.has(p.group); }
function img(p, cls, loading) {
  const src = safeUrl(p.image) || '/assets/placeholder.svg';
  return `<img class="${cls || ''}" src="${esc(src)}" alt="${esc(splitName(p.name)[0])}, home page" ${loading || 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/assets/placeholder.svg'">`;
}
function mark(size) {
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M4 22c8-6 14 0 20 8 4 6 10 8 16 9" stroke="${STRANDS.navy}"/>
    <path d="M12 6c4 10 12 22 28 33" stroke="${STRANDS.sky}"/>
    <path d="M24 9c2 10 6 20 16 30" stroke="${STRANDS.sun}"/>
    <path d="M33 14c1 9 3 17 7 25" stroke="${STRANDS.leaf}"/>
  </svg>`;
}

function home(c) {
  const s = c.site || {};
  const email = s.contactEmail || 'info@iraady.com';
  const projects = c.projects || [];
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const suite = projects.filter((p) => INDUSTRY[p.id]);
  const industries = INDUSTRY_ORDER.filter((i) => suite.some((p) => INDUSTRY[p.id] === i));
  const shop = projects.filter(buyable);
  const prices = shop.map((p) => p.price);
  const offices = c.offices || [];
  const clientWork = projects.filter((p) => p.group === 'Client' && safeUrl(p.image));
  const years = new Date().getFullYear() - FOUNDED;

  const picks = PICKS.filter(([id]) => byId[id]).map(([id, word, tone, line]) => {
    const p = byId[id];
    return { id, word, tone, line, name: splitName(p.name)[0], url: safeUrl(p.url), image: safeUrl(p.image) || '/assets/placeholder.svg', host: host(p.url), buy: buyable(p) ? price(p.price) : null };
  });
  const first = picks[0];

  // Directory: every product, grouped by who it is for.
  const rank = (p) => { const i = ITEM_ORDER.indexOf(p.id); return i < 0 ? 99 : i; };
  const directory = industries.map((ind) => {
    const items = suite.filter((p) => INDUSTRY[p.id] === ind).sort((a, b) => rank(a) - rank(b));
    return `<section class="dir-group" aria-labelledby="ind-${esc(ind.replace(/\W+/g, '-'))}">
      <div class="dir-head">
        <h3 class="dir-ind" id="ind-${esc(ind.replace(/\W+/g, '-'))}">${esc(ind)}</h3>
        <p class="dir-sub">${esc(INDUSTRY_LINE[ind] || '')}</p>
        <span class="dir-count">${items.length} ${items.length === 1 ? 'product' : 'products'}</span>
      </div>
      <ul class="dir-list">
        ${items.map((p) => {
          const [name, tag] = splitName(p.name);
          return `<li class="dir-row">
            <a class="dir-thumb" href="${esc(safeUrl(p.url) || '#contact')}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${img(p)}</a>
            <div class="dir-text"><a class="dir-name" href="${esc(safeUrl(p.url) || '#contact')}" target="_blank" rel="noopener">${esc(name)}</a><p>${esc(firstSentence(p.description) || tag)}</p></div>
            <div class="dir-acts">
              ${safeUrl(p.url) ? `<a class="txt-link" href="${esc(p.url)}" target="_blank" rel="noopener">Try the demo</a>` : ''}
              ${buyable(p) ? `<button type="button" class="txt-link" data-buy="${esc(p.id)}">Buy the code, $${price(p.price)}</button>` : ''}
            </div>
          </li>`;
        }).join('')}
      </ul>
    </section>`;
  }).join('');

  const nav = [['#systems', 'Products'], ['#build', 'Custom software'], ['#work', 'Client work'], ['#pricing', 'Pricing'], ['#contact', 'Contact']];

  const body = `
<body class="v3">
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <div class="wrap hdr-row">
    <a class="brand" href="/v3" aria-label="Iraady, home">${mark(28)}<span>Iraady</span></a>
    <nav class="nav" id="nav" aria-label="Main">
      ${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}
    </nav>
    <a class="btn btn-ink hide-sm" href="#contact">Book a demo</a>
    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="nav" aria-label="Menu"><span></span><span></span></button>
  </div>
</header>

<main id="main">
<section class="hero" id="hero" data-tone="${first.tone}">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="kicker">Ready-to-run software, from London and Kigali</p>
      <h1 class="hero-h"><span class="hero-lead">The software that runs your</span>
        <span class="hero-word" id="heroWord" aria-live="polite"><span class="mk" id="heroMk">${esc(first.word)}</span>.</span></h1>
      <div class="picker" role="group" aria-label="Choose your kind of organisation">
        ${picks.map((p, i) => `<button type="button" class="pick" data-pick="${i}" aria-pressed="${i === 0}">${esc(p.word)}</button>`).join('')}
      </div>
      <div class="auto" id="heroAuto">
        <div class="auto-bar" aria-hidden="true"><i id="heroBar"></i></div>
        <button type="button" class="auto-btn" id="heroPause" aria-pressed="false">Pause</button>
      </div>
      <p class="hero-line" id="heroLine">${esc(first.line)}</p>
      <div class="hero-cta">
        <a class="btn btn-ink btn-lg" id="heroDemo" href="${esc(first.url)}" target="_blank" rel="noopener">Try ${esc(first.name)}</a>
        <a class="btn btn-line btn-lg" href="#contact" data-plan="hosted subscription">Book a demo</a>
      </div>
    </div>
    <figure class="hero-shot">
      <div class="card-back" aria-hidden="true"></div>
      <div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span id="heroHost">${esc(first.host)}</span></div>
        <a id="heroLink" href="${esc(first.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(first.name)}"><img id="heroImg" src="${esc(first.image)}" alt="${esc(first.name)}, home page" fetchpriority="high" decoding="async" referrerpolicy="no-referrer"></a></div>
      <figcaption id="heroCap">${esc(first.name)}, a live demo with sample data</figcaption>
    </figure>
  </div>
</section>

<section class="intro">
  <div class="wrap intro-grid">
    <p class="intro-text">Iraady Ltd is a software company in London and Kigali. We build and run ${suite.length} ready-to-use systems for growing businesses, HR teams, schools, clinics, letting agencies, hotels and non-profits, and we build custom software when nothing off the shelf fits.</p>
    <dl class="facts">
      <div><dt>Products you can try today</dt><dd>${suite.length}</dd></div>
      <div><dt>Projects shipped</dt><dd>${projects.length}</dd></div>
      <div><dt>Years building software</dt><dd>${years}</dd></div>
    </dl>
  </div>
</section>

<section class="sec" id="systems">
  <div class="wrap">
    <div class="sec-head">
      <p class="kicker">Products</p>
      <h2>Every system we run</h2>
      <p>Each one is live with sample data. Open a demo in one click, subscribe and we host it, or buy the full source code and run it yourself.</p>
    </div>
    <div class="directory">${directory}</div>
  </div>
</section>

<section class="sec build board" id="build">
  <div class="wrap build-grid">
    <div class="build-head">
      <p class="kicker">Custom software</p>
      <h2>When nothing off the shelf fits, we build it</h2>
      <p>The team that designs and runs our own products builds yours: a portal for your customers, an internal tool, a mobile app or a full platform.</p>
      <a class="btn btn-ink btn-lg" href="#contact" data-plan="custom">Describe your project</a>
    </div>
    <div class="build-body">
      <h3 class="build-sub">How a project runs</h3>
      <ol class="steps">
        ${(c.process || []).map((x) => `<li><strong>${esc(x.title)}</strong><span>${esc(x.summary)}</span></li>`).join('')}
      </ol>
      <h3 class="build-sub">What we build</h3>
      <ul class="svc">
        ${(c.services || []).map((x) => `<li><strong>${esc(x.title)}</strong><span>${esc(x.summary)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</section>

${clientWork.length ? `<section class="sec work" id="work">
  <div class="wrap"><div class="sec-head">
    <p class="kicker">Client work</p>
    <h2>Websites and platforms we built for others</h2>
    <p>For organisations in health, education, tourism, manufacturing and the non-profit sector.</p>
  </div></div>
  <div class="wrap"><div class="work-grid">
    ${clientWork.map((p) => `<a class="work-item" href="${esc(safeUrl(p.url) || '#contact')}" target="_blank" rel="noopener">
      <div class="work-img">${img(p)}</div>
      <strong>${esc(splitName(p.name)[0])}</strong>
      ${p.niche ? `<span class="work-niche">${esc(String(p.niche).replace(/^[^A-Za-z]+/, ''))}</span>` : ''}
      <span class="work-host">${esc(host(p.url))}</span>
    </a>`).join('')}
  </div></div>
</section>` : ''}

<section class="sec" id="pricing">
  <div class="wrap">
    <div class="sec-head">
      <p class="kicker">Pricing</p>
      <h2>Three ways to work with us</h2>
      <p>Prices in US dollars. A custom quote follows a free call about what you need.</p>
    </div>
    <div class="ways">
      <div class="way"><h3>Use one of our products</h3><p>We host it, update it and support your team. Setup starts with a call.</p><a class="txt-link" href="#contact" data-plan="hosted subscription">Request a setup</a></div>
      <div class="way"><h3>Own the source code</h3><p class="way-price">${prices.length ? `$${price(Math.min(...prices))} to $${price(Math.max(...prices))}` : 'On request'}</p><p>${shop.length} products for sale, each with a commercial licence for your organisation and one payment.</p><a class="txt-link" href="#systems">See what is for sale</a></div>
      <div class="way"><h3>Have us build it</h3><p>Fixed-scope projects, from a two-week first version to a full platform.</p><a class="txt-link" href="#contact" data-plan="custom">Discuss a project</a></div>
    </div>
    <div class="plans-wrap">
      <table class="plans">
        <caption>Custom projects, starting prices</caption>
        <thead><tr><th scope="col"></th>${(c.pricing || []).map((t) => `<th scope="col">${esc(t.name)}${t.popular ? '<span class="pop">Most chosen</span>' : ''}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">From</th>${(c.pricing || []).map((t) => `<td class="plan-price">${esc(t.price)}</td>`).join('')}</tr>
          <tr><th scope="row">Best for</th>${(c.pricing || []).map((t) => `<td>${esc(t.best)}</td>`).join('')}</tr>
          <tr><th scope="row">Included</th>${(c.pricing || []).map((t) => `<td><ul>${(t.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></td>`).join('')}</tr>
          <tr><th scope="row"></th>${(c.pricing || []).map((t) => `<td><a class="btn ${t.popular ? 'btn-ink' : 'btn-line'}" href="#contact" data-plan="${esc(t.name)}">Start a ${esc(t.name)} project</a></td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="sec faq-sec" id="faq">
  <div class="wrap faq-grid">
    <div><p class="kicker">Questions</p>
    <h2>What people ask before they call</h2></div>
    <div class="faq">
      ${(c.faq || []).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
      <details><summary>Do you work in East Africa too?</summary><p>Yes. Our Kigali team supports organisations across the region with prices in Rwandan francs, MTN MoMo and Airtel Money payment recording and local tax settings, on the same products.</p></details>
    </div>
  </div>
</section>

<section class="contact" id="contact">
  <div class="wrap contact-grid">
    <div class="contact-head">
      <p class="kicker">Contact</p>
      <h2>Tell us what you need to run</h2>
      <p>Ask for a demo of a product or describe a custom project. We reply within one working day.</p>
      <p class="contact-mail"><a href="mailto:${esc(email)}?subject=${encodeURIComponent('Book a demo')}">${esc(email)}</a></p>
      <div class="offices">
        ${offices.map((o) => `<div class="office"><h3>${esc(o.name)}</h3><p>${(o.lines || []).map(esc).join('<br>')}</p><p><a href="tel:${esc(String(o.phone || '').replace(/\s/g, ''))}">${esc(o.phone)}</a></p></div>`).join('')}
      </div>
    </div>
    <form class="form" id="contact-form" action="https://formsubmit.co/${esc(email)}" method="POST">
      <input type="hidden" name="_subject" value="New enquiry from iraady.com">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_next" value="https://iraady.com/thank-you.html">
      <input type="hidden" name="_captcha" value="false">
      <input type="hidden" name="source" value="v3-contact-form">
      <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="f2">
        <label>Your name<input name="name" required autocomplete="name"></label>
        <label>Work email<input name="email" type="email" required autocomplete="email"></label>
      </div>
      <div class="f2">
        <label>Phone, with country code<input name="phone" type="tel" autocomplete="tel" placeholder="+44 20 7946 0000"></label>
        <label>Organisation<input name="company" autocomplete="organization"></label>
      </div>
      <div class="f2">
        <label>Budget in US dollars<select name="budget"><option>$1K–$5K</option><option>$5K–$15K</option><option>$15K–$30K</option><option>$30K–$80K</option><option>$80K+</option><option>Not sure yet</option></select></label>
        <label>When you need it<select name="timeline"><option>As soon as possible</option><option>2–4 weeks</option><option>1–2 months</option><option>2–3 months</option><option>3+ months</option></select></label>
      </div>
      <label>What do you need?<textarea name="message" rows="5" required placeholder="For example: a demo of Iraady Property for 300 units"></textarea></label>
      <button class="btn btn-ink btn-lg" type="submit">Send your enquiry</button>
      <p class="form-note">We use your details only to reply to you. <a href="/privacy.html">Privacy policy</a></p>
    </form>
  </div>
</section>
</main>

<footer class="ftr">
  <div class="wrap ftr-grid">
    <div class="ftr-brand"><a class="brand" href="/v3">${mark(28)}<span>Iraady</span></a><p>Software that runs the organisations that use it.</p></div>
    <nav aria-label="Products"><h3>Products</h3>${suite.slice(0, 7).map((p) => `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(splitName(p.name)[0])}</a>`).join('')}</nav>
    <nav aria-label="Company"><h3>Company</h3><a href="#build">Custom software</a><a href="#work">Client work</a><a href="#pricing">Pricing</a><a href="#faq">Questions</a></nav>
    <nav aria-label="Legal"><h3>Legal</h3><a href="/privacy.html">Privacy policy</a><a href="/terms.html">Terms</a><a href="/">Previous site</a></nav>
  </div>
  <div class="wrap ftr-base"><span>© ${new Date().getFullYear()} Iraady Ltd. Registered in England and Wales, company number ${esc(s.companyNumber || '')}.</span><span>London and Kigali</span></div>
</footer>

<div class="modal" id="checkout" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <button type="button" class="modal-x" data-close aria-label="Close">×</button>
    <p class="modal-kicker">Secure checkout by Flutterwave</p>
    <h2 id="checkout-title">Buy the source code</h2>
    <p class="modal-sub" id="checkout-sub"></p>
    <form id="checkout-form">
      <label>Full name<input name="name" required autocomplete="name"></label>
      <label>Email<input name="email" type="email" required autocomplete="email"></label>
      <label>Phone<input name="phone" type="tel" required autocomplete="tel"></label>
      <button class="btn btn-ink btn-lg" type="submit" id="checkout-submit">Continue to payment</button>
      <p class="form-note">Full source code and a commercial licence, sent to your email within 24 hours.</p>
    </form>
  </div>
</div>
<script id="projects-data" type="application/json">${JSON.stringify(projects.map((p) => ({ id: p.id, name: p.name, price: p.price, group: p.group }))).replace(/</g, '\\u003c')}</script>
<script id="picks-data" type="application/json">${JSON.stringify(picks).replace(/</g, '\\u003c')}</script>
<script src="https://checkout.flutterwave.com/v3.js" defer></script>
<script src="/js/site.js?v=${ASSET_V}" defer></script>
<script src="/v3/v3.js?v=${ASSET_V}" defer></script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "0d6bab85f31c439b84964dfa6a7d2fe4"}'></script>
</body>
</html>`;

  const title = 'Iraady: software that runs schools, clinics, hotels and growing businesses';
  const description = `${suite.length} ready-to-use systems for schools, clinics, pharmacies, letting agencies, hotels and non-profits, and custom software built by our team in London and Kigali. Prices in US dollars.`;
  const ogImg = first.image;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://iraady.com/v3">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://iraady.com/v3">
<meta property="og:site_name" content="Iraady Ltd">
<meta property="og:image" content="${esc(/^https?:/.test(ogImg) ? ogImg : 'https://iraady.com' + ogImg)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FBF8F1">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.jpg">
<link rel="preload" href="/v3/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/v3/fonts/nunito-sans-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/v3/v3.css?v=${ASSET_V}">
</head>` + body;
}

module.exports = { home };
