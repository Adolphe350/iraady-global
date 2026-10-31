'use strict';
/*
 * iraady.com/v3: a new, dark-first editorial design (Instrument Serif + Inter Tight
 * + Geist Mono), rendered from the SAME content store as v1 and v2.
 *
 * Checkout and the contact form reuse v1's /js/site.js and its element ids
 * (#contact-form, #checkout, #checkout-form, #projects-data, [data-buy],
 * [data-filter] + .work-card), so Flutterwave and /api/enquiries behave exactly
 * as on /. Numbers shown are computed from content, never typed in.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUB = path.join(__dirname, '..', 'public');
const ASSET_V = crypto.createHash('sha1')
  .update(['v3/v3.css', 'v3/v3.js', 'js/site.js'].map((f) => fs.readFileSync(path.join(PUB, f))).join(''))
  .digest('hex').slice(0, 10);

const STRANDS = { navy: '#2E3192', sky: '#29ABE2', yellow: '#F2C811', green: '#1E9E4A' };
const BUYABLE_GROUPS = new Set(['Personal', 'Mobile Apps']); // same rule as v1/v2
const FOUNDED = 2021;

/* project id → industry (the product suite). */
const INDUSTRY = {
  schooliraady: 'Education', eduplatform: 'Education',
  clinicsiraady: 'Healthcare', pharmacyiraady: 'Healthcare',
  propertyiraady: 'Property & hospitality', hoteliraady: 'Property & hospitality',
  ngoiraady: 'Non-profits', ngoplus: 'Non-profits', coopiraady: 'Non-profits',
  bizpro: 'Operations', vaultiraady: 'Operations', whatsappbot: 'Operations',
  marketingai: 'Growth', scrapeiraady: 'Growth', cviraady: 'Growth',
  kimuse: 'AI & developers', apiiraady: 'AI & developers',
  transferiraady: 'Everyday tools', compresspro: 'Everyday tools', convertpro: 'Everyday tools',
  openradio: 'Media', softradio: 'Media', ikinamico: 'Media',
  fitio: 'Consumer apps', 'fitio-mobile': 'Consumer apps', speedify: 'Consumer apps'
};
const INDUSTRY_ORDER = ['Education', 'Healthcare', 'Property & hospitality', 'Non-profits', 'Operations',
  'Growth', 'AI & developers', 'Media', 'Everyday tools', 'Consumer apps'];
const INDUSTRY_LINE = {
  Education: 'Admissions, grades, fees and parent portals for independent and international schools.',
  Healthcare: 'Patient records, queues, billing and stock for private clinics and pharmacies.',
  'Property & hospitality': 'Leases, rent and owner statements; reservations, folios and night audit.',
  'Non-profits': 'Grants, budgets, M&E and donor reporting; cooperatives and member payouts.',
  Operations: 'Point of sale, documents and customer messaging for growing companies.',
  Growth: 'Prospect lists, outreach and marketing content that gets sent, not shelved.',
  'AI & developers': 'One API for many AI models, with keys, usage and logs.',
  Media: 'Internet radio for stations and listeners, and an audio archive.',
  'Everyday tools': 'Fast file transfer, compression and conversion in the browser.',
  'Consumer apps': 'Fitness and tracking apps on the web and on Android.'
};
const STRAND_OF = Object.fromEntries(INDUSTRY_ORDER.map((n, i) => [n, Object.values(STRANDS)[i % 4]]));
const GROUP_LABEL = { Personal: 'Our products', 'Mobile Apps': 'Mobile apps', Client: 'Client work' };
const FEATURED = ['schooliraady', 'clinicsiraady', 'propertyiraady', 'hoteliraady', 'ngoiraady', 'pharmacyiraady'];

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
  return String(u || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}
function splitName(n) {
  const parts = String(n || '').split(/\s+[–—-]\s+/);
  return [parts[0], parts.slice(1).join(' – ')];
}
function firstSentence(t) {
  const s = String(t || '').trim();
  const m = /^(.{20,200}?[.!?])(\s|$)/.exec(s);
  return m ? m[1] : s.slice(0, 170);
}
function buyable(p) { return typeof p.price === 'number' && BUYABLE_GROUPS.has(p.group); }

function mark(size) {
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M4 22c8-6 14 0 20 8 4 6 10 8 16 9" stroke="${STRANDS.navy}"/>
    <path d="M12 6c4 10 12 22 28 33" stroke="${STRANDS.sky}"/>
    <path d="M24 9c2 10 6 20 16 30" stroke="${STRANDS.yellow}"/>
    <path d="M33 14c1 9 3 17 7 25" stroke="${STRANDS.green}"/>
  </svg>`;
}
function img(p, cls, eager) {
  const src = safeUrl(p.image) || '/assets/placeholder.svg';
  return `<img class="${cls || ''}" src="${esc(src)}" alt="${esc(splitName(p.name)[0])}" ${eager === true ? 'fetchpriority="high"' : eager === 'eager' ? 'loading="eager"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/assets/placeholder.svg'">`;
}
const ARROW = '<svg class="arr" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

function home(c) {
  const s = c.site || {};
  const email = s.contactEmail || 'info@iraady.com';
  const projects = c.projects || [];
  const suite = projects.filter((p) => INDUSTRY[p.id]);
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const industries = INDUSTRY_ORDER.filter((i) => suite.some((p) => INDUSTRY[p.id] === i));
  const shop = projects.filter(buyable);
  const prices = shop.map((p) => p.price);
  const offices = c.offices || [];
  const years = new Date().getFullYear() - FOUNDED;
  const groups = ['All', ...Array.from(new Set(projects.map((p) => p.group)))];

  // Hero product wall: three columns of real screenshots (duplicated for a seamless loop).
  const wallPool = suite.filter((p) => safeUrl(p.image));
  const cols = [[], [], []];
  wallPool.forEach((p, i) => cols[i % 3].push(p));
  const wall = cols.map((col, ci) => `<div class="wall-col wc${ci}">${[...col, ...col].map((p, i) =>
    `<figure class="wall-shot"${i >= col.length ? ' aria-hidden="true"' : ''}>${img(p, '', ci === 1 && i === 0 ? true : 'eager')}<figcaption class="mono">${esc(host(p.url))}</figcaption></figure>`).join('')}</div>`).join('');

  // Bento: featured products.
  const featured = FEATURED.map((id) => byId[id]).filter(Boolean);
  const bento = featured.map((p, i) => {
    const [name, tag] = splitName(p.name);
    return `<a class="bento-tile b${i} reveal" href="${esc(safeUrl(p.url) || '#contact')}" target="_blank" rel="noopener" style="--strand:${STRAND_OF[INDUSTRY[p.id]]}">
      <div class="bento-media">${img(p)}</div>
      <div class="bento-meta">
        <span class="mono bento-ind">${esc(INDUSTRY[p.id])}</span>
        <h3>${esc(name)}</h3>
        <p>${esc(tag || firstSentence(p.description))}</p>
        <span class="bento-cta">Open the live demo ${ARROW}</span>
      </div>
    </a>`;
  }).join('') + `<a class="bento-tile bento-more reveal" href="#suite">
      <span class="bento-big serif">${suite.length}</span>
      <p>products across ${industries.length} industries, every one live with a demo.</p>
      <span class="bento-cta">Browse the suite ${ARROW}</span>
    </a>`;

  // Product switcher (tabs by industry).
  const tabs = industries.map((ind, i) =>
    `<button type="button" class="tab${i === 0 ? ' on' : ''}" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" style="--strand:${STRAND_OF[ind]}">${esc(ind)}<span class="mono">${suite.filter((p) => INDUSTRY[p.id] === ind).length}</span></button>`).join('');
  const panels = industries.map((ind, i) => {
    const items = suite.filter((p) => INDUSTRY[p.id] === ind);
    const lead = items[0];
    return `<div class="panel" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i === 0 ? '' : ' hidden'}>
      <figure class="browser">
        <div class="browser-bar"><i></i><i></i><i></i><span class="mono">${esc(host(lead.url))}</span></div>
        ${img(lead)}
      </figure>
      <div class="panel-side">
        <p class="panel-line">${esc(INDUSTRY_LINE[ind] || '')}</p>
        <ul class="panel-list">
          ${items.map((p) => {
            const [name, tag] = splitName(p.name);
            return `<li>
              <div><strong>${esc(name)}</strong><span>${esc(tag || firstSentence(p.description))}</span></div>
              <div class="panel-acts">
                ${safeUrl(p.url) ? `<a class="btn btn-sm btn-line" href="${esc(p.url)}" target="_blank" rel="noopener">Demo ${ARROW}</a>` : ''}
                ${buyable(p) ? `<button type="button" class="btn btn-sm btn-solid" data-buy="${esc(p.id)}">Own it · $${price(p.price)}</button>` : ''}
              </div>
            </li>`;
          }).join('')}
        </ul>
      </div>
    </div>`;
  }).join('');

  // Selected work: horizontal rail (keeps v1 filter hooks: [data-filter], .work-card[data-group], [data-work-count]).
  const work = projects.map((p) => {
    const [name, tag] = splitName(p.name);
    return `<article class="work-card" data-group="${esc(p.group)}">
      <a class="work-media" href="${esc(safeUrl(p.url) || '#contact')}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${img(p)}</a>
      <div class="work-body">
        <span class="mono work-kind">${esc(GROUP_LABEL[p.group] || p.group)}${p.niche ? ' · ' + esc(String(p.niche).replace(/^\W+\s*/, '')) : ''}</span>
        <h3>${esc(name)}</h3>
        <p>${esc(tag || firstSentence(p.description))}</p>
        <div class="work-acts">
          ${safeUrl(p.url) ? `<a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(host(p.url))} ${ARROW}</a>` : ''}
          ${buyable(p) ? `<button type="button" class="btn btn-sm btn-line" data-buy="${esc(p.id)}">$${price(p.price)}</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');

  const numbers = [
    [suite.length, 'live products'],
    [projects.length, 'projects shipped'],
    [industries.length, 'industries served'],
    [years, 'years shipping since ' + FOUNDED],
    [offices.length || 2, 'offices: London and Kigali']
  ];

  const nav = [['#suite', 'Products'], ['#build', 'Custom builds'], ['#work', 'Work'], ['#pricing', 'Pricing'], ['#contact', 'Contact']];

  const body = `
<body class="v3">
<a class="skip" href="#main">Skip to content</a>
<header class="hdr" id="hdr">
  <div class="wrap hdr-row">
    <a class="brand" href="/v3" aria-label="Iraady, home">${mark(26)}<span>Iraady</span></a>
    <nav class="nav" id="nav" aria-label="Main">
      ${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}
      <a class="nav-cta-sm" href="#contact">Book a call</a>
    </nav>
    <div class="hdr-acts">
      <button type="button" class="icon-btn" id="themeBtn" aria-label="Switch to light theme">
        <svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>
      </button>
      <a class="btn btn-solid btn-sm hide-sm" href="#contact">Book a call</a>
      <button type="button" class="icon-btn nav-toggle" aria-expanded="false" aria-controls="nav" aria-label="Open menu"><span></span><span></span></button>
    </div>
  </div>
</header>

<main id="main">
<section class="hero">
  <div class="hero-wall" aria-hidden="true"><div class="wall">${wall}</div></div>
  <div class="wrap hero-in">
    <p class="mono kicker reveal">Software &amp; AI studio <span class="dot"></span> London · Kigali</p>
    <h1 class="serif reveal">Software that <em>runs</em> the business. Built by a team that runs its&nbsp;own.</h1>
    <p class="hero-sub reveal">Iraady Ltd builds and operates B2B software for schools, clinics, property managers, hotels and non-profits. Start on one of our ${suite.length} live products, own its source code, or have us build exactly what you need.</p>
    <div class="hero-cta reveal">
      <a class="btn btn-solid btn-lg" href="#suite">Explore the products ${ARROW}</a>
      <a class="btn btn-line btn-lg" href="#contact">Start a custom build</a>
    </div>
    <p class="mono hero-foot reveal">UK company No. ${esc(s.companyNumber || '')} <span class="dot"></span> Prices in USD <span class="dot"></span> Delivered worldwide</p>
  </div>
</section>

<div class="marquee" aria-label="Industries we serve">
  <div class="marquee-track">
    ${[0, 1].map((k) => `<div class="marquee-row"${k ? ' aria-hidden="true"' : ''}>${industries.map((i) => `<span>${esc(i)}</span><i style="--strand:${STRAND_OF[i]}"></i>`).join('')}</div>`).join('')}
  </div>
</div>

<section class="sec" id="suite">
  <div class="wrap">
    <div class="sec-head reveal">
      <p class="mono kicker">The product suite</p>
      <h2 class="serif">Ready-to-run software, <em>live today</em>.</h2>
      <p>Open any demo with one click and sample data. Subscribe, or buy the full source code and run it yourself.</p>
    </div>
    <div class="bento">${bento}</div>
  </div>
</section>

<section class="sec sec-switch" id="switch">
  <div class="wrap">
    <div class="sec-head reveal">
      <p class="mono kicker">By industry</p>
      <h2 class="serif">Find the one built for <em>your</em> work.</h2>
    </div>
    <div class="switcher reveal">
      <div class="tabs" role="tablist" aria-label="Industries">${tabs}</div>
      <div class="panels">${panels}</div>
    </div>
  </div>
</section>

<section class="sec sec-light" id="build">
  <div class="wrap build">
    <div class="build-head">
      <p class="mono kicker">Custom development</p>
      <h2 class="serif">Have something specific in mind? <em>We will build it.</em></h2>
      <p>The same team that designs, ships and runs our own products builds yours, from a two-week MVP to a full platform with mobile apps.</p>
      <a class="btn btn-ink btn-lg" href="#contact" data-plan="custom">Discuss a project ${ARROW}</a>
    </div>
    <div class="build-body">
      <ol class="steps">
        ${(c.process || []).map((x, i) => `<li class="reveal" style="--strand:${Object.values(STRANDS)[i % 4]}"><span class="mono step-n">0${i + 1}</span><div><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></div></li>`).join('')}
      </ol>
      <div class="svc">
        ${(c.services || []).map((x) => `<div class="svc-item reveal"><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></div>`).join('')}
      </div>
    </div>
  </div>
</section>

<section class="numbers" aria-label="Iraady in numbers">
  <div class="wrap nums">
    ${numbers.map(([n, l]) => `<div class="num reveal"><span class="mono num-v" data-count="${Number(n) || 0}">${esc(n)}</span><span class="num-l">${esc(l)}</span></div>`).join('')}
  </div>
</section>

<section class="sec" id="work">
  <div class="wrap">
    <div class="sec-head row reveal">
      <div>
        <p class="mono kicker">Selected work</p>
        <h2 class="serif"><span data-work-count>${projects.length}</span> projects, <em>shipped</em>.</h2>
      </div>
      <div class="rail-ctl">
        <button type="button" class="icon-btn" data-rail="-1" aria-label="Scroll back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button>
        <button type="button" class="icon-btn" data-rail="1" aria-label="Scroll forward"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>
    </div>
    <div class="chips" role="group" aria-label="Filter projects">
      ${groups.map((g, i) => `<button type="button" class="chip${i === 0 ? ' active' : ''}" data-filter="${esc(g)}" aria-pressed="${i === 0}">${esc(g === 'All' ? 'All work' : GROUP_LABEL[g] || g)}</button>`).join('')}
    </div>
  </div>
  <div class="rail" id="rail" tabindex="0" aria-label="Projects">${work}</div>
</section>

<section class="sec" id="pricing">
  <div class="wrap">
    <div class="sec-head reveal">
      <p class="mono kicker">Ways to work with us</p>
      <h2 class="serif">Use it, own it, or <em>commission</em> it.</h2>
      <p>Clear starting prices in USD. Final quotes follow a free discovery call.</p>
    </div>
    <div class="ways">
      <article class="way reveal"><span class="mono">01</span><h3>Hosted product</h3><p>We host, update and support the product. You get a setup call and accounts for your team.</p><a class="link" href="#contact" data-plan="hosted subscription">Request a setup ${ARROW}</a></article>
      <article class="way reveal"><span class="mono">02</span><h3>Source-code licence</h3><p class="way-price serif">${prices.length ? `$${price(Math.min(...prices))}<span> to </span>$${price(Math.max(...prices))}` : 'On request'}</p><p>${shop.length} products. Full source, a commercial licence for your organisation, one payment.</p><a class="link" href="#work">See what is for sale ${ARROW}</a></article>
      <article class="way reveal"><span class="mono">03</span><h3>Custom build</h3><p>Fixed-scope engagements, from a quick MVP to a full platform.</p><a class="link" href="#contact" data-plan="custom">Discuss a project ${ARROW}</a></article>
    </div>
    <div class="plans">
      ${(c.pricing || []).map((t) => `<article class="plan reveal${t.popular ? ' plan-pop' : ''}">
        <div class="plan-top"><h3>${esc(t.name)}</h3>${t.popular ? '<span class="mono tag">Most chosen</span>' : ''}</div>
        <p class="plan-price"><span class="mono">from</span> <strong class="serif">${esc(t.price)}</strong></p>
        <p class="plan-best">${esc(t.best)}</p>
        <ul>${(t.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <a class="btn ${t.popular ? 'btn-solid' : 'btn-line'}" href="#contact" data-plan="${esc(t.name)}">Start a ${esc(t.name)} project</a>
      </article>`).join('')}
    </div>
  </div>
</section>

<section class="sec sec-faq" id="faq">
  <div class="wrap faq-grid">
    <div class="sec-head reveal">
      <p class="mono kicker">Questions</p>
      <h2 class="serif">Asked <em>first</em>.</h2>
      <p>Also built for East Africa: RWF pricing, MTN MoMo and Airtel Money payment recording and local tax settings, on the same products.</p>
    </div>
    <div class="faq">
      ${(c.faq || []).map((f) => `<details class="reveal"><summary><span>${esc(f.q)}</span>${PLUS}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </div>
  </div>
</section>

<section class="sec sec-contact" id="contact">
  <div class="wrap contact">
    <div class="contact-head">
      <p class="mono kicker">Contact</p>
      <h2 class="serif">Let's build <em>something</em> that runs.</h2>
      <p>Book a demo of a product or describe a custom build. We reply within one working day, from London or Kigali.</p>
      <a class="link big-link" href="mailto:${esc(email)}?subject=${encodeURIComponent('Book a call')}">${esc(email)} ${ARROW}</a>
      <div class="offices">
        ${offices.map((o) => `<div class="office"><span class="mono">${esc(o.tag)}</span><h3>${esc(o.name)}</h3><p>${(o.lines || []).map(esc).join('<br>')}</p><p class="mono"><a href="tel:${esc(String(o.phone || '').replace(/\s/g, ''))}">${esc(o.phone)}</a></p></div>`).join('')}
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
        <label><span>Name</span><input name="name" required autocomplete="name"></label>
        <label><span>Work email</span><input name="email" type="email" required autocomplete="email"></label>
      </div>
      <div class="f2">
        <label><span>Phone, with country code</span><input name="phone" type="tel" autocomplete="tel" placeholder="+1 555 010 0000"></label>
        <label><span>Company</span><input name="company" autocomplete="organization"></label>
      </div>
      <div class="f2">
        <label><span>Budget (USD)</span><select name="budget"><option>$1K–$5K</option><option>$5K–$15K</option><option>$15K–$30K</option><option>$30K–$80K</option><option>$80K+</option><option>Not sure yet</option></select></label>
        <label><span>Timeline</span><select name="timeline"><option>ASAP</option><option>2–4 weeks</option><option>1–2 months</option><option>2–3 months</option><option>3+ months</option></select></label>
      </div>
      <label><span>What do you need?</span><textarea name="message" rows="5" required placeholder="A demo of Iraady Property for 300 units, or a custom portal for…"></textarea></label>
      <button class="btn btn-solid btn-lg" type="submit">Send enquiry ${ARROW}</button>
      <p class="form-note">We only use your details to reply. <a href="/privacy.html">Privacy policy</a></p>
    </form>
  </div>
</section>
</main>

<footer class="ftr">
  <div class="wrap ftr-cols">
    <div><p class="mono kicker">Products</p>${suite.slice(0, 8).map((p) => `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(splitName(p.name)[0])}</a>`).join('')}</div>
    <div><p class="mono kicker">Studio</p><a href="#build">Custom builds</a><a href="#work">Work</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
    <div><p class="mono kicker">Contact</p><a href="mailto:${esc(email)}">${esc(email)}</a>${offices.map((o) => `<a href="tel:${esc(String(o.phone || '').replace(/\s/g, ''))}">${esc(o.name)} ${esc(o.phone)}</a>`).join('')}</div>
    <div><p class="mono kicker">Legal</p><a href="/privacy.html">Privacy policy</a><a href="/terms.html">Terms</a><a href="/">Current site</a></div>
  </div>
  <div class="wordmark serif" aria-hidden="true">Iraady</div>
  <div class="wrap ftr-base mono">
    <span>© ${new Date().getFullYear()} Iraady Ltd · Registered in England &amp; Wales No. ${esc(s.companyNumber || '')}</span>
    <span>London · Kigali</span>
  </div>
</footer>

<div class="modal" id="checkout" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <button type="button" class="icon-btn modal-x" data-close aria-label="Close">×</button>
    <p class="mono kicker">Secure checkout · Flutterwave</p>
    <h2 id="checkout-title" class="serif">Buy source code</h2>
    <p class="modal-sub" id="checkout-sub"></p>
    <form id="checkout-form">
      <label><span>Full name</span><input name="name" required autocomplete="name"></label>
      <label><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
      <label><span>Phone</span><input name="phone" type="tel" required autocomplete="tel"></label>
      <button class="btn btn-solid btn-lg" type="submit" id="checkout-submit">Continue to payment</button>
      <p class="form-note">Full source code · commercial licence · delivered to your email within 24 hours.</p>
    </form>
  </div>
</div>
<script id="projects-data" type="application/json">${JSON.stringify(projects.map((p) => ({ id: p.id, name: p.name, price: p.price, group: p.group }))).replace(/</g, '\\u003c')}</script>
<script src="https://checkout.flutterwave.com/v3.js" defer></script>
<script src="/js/site.js?v=${ASSET_V}" defer></script>
<script src="/v3/v3.js?v=${ASSET_V}" defer></script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "0d6bab85f31c439b84964dfa6a7d2fe4"}'></script>
</body>
</html>`;

  const title = 'Iraady: B2B software products and custom builds · London & Kigali';
  const description = `${suite.length} live B2B software products for schools, clinics, property, hotels and non-profits, plus custom software and AI builds. USD pricing, delivered worldwide.`;
  const ogImg = safeUrl((byId.schooliraady || suite[0] || {}).image) || '/logo.jpg';
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
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
<meta name="theme-color" content="#0A0B0D">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.jpg">
<script>try{var t=localStorage.getItem('iraady-v3-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}</script>
<link rel="preload" href="/v3/fonts/instrument-serif-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/v3/fonts/inter-tight-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/v3/v3.css?v=${ASSET_V}">
</head>` + body;
}

module.exports = { home };
