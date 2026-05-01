const FILTERS = ["All", "Personal", "Mobile Apps", "Client"];
const BUYABLE_GROUPS = new Set(["Personal", "Mobile Apps"]);
const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E1E2A"/><stop offset="1" stop-color="#0F0F16"/></linearGradient></defs><rect width="1280" height="800" fill="url(#g)"/><rect x="30" y="30" width="1220" height="740" rx="24" fill="none" stroke="#3f3f46" stroke-width="4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#A1A1AA" font-family="Inter,Arial,sans-serif" font-size="44">Project preview unavailable</text></svg>'
  );

const state = {
  activeFilter: "All",
  projects: [],
  selectedProject: null,
};

const tabsHost = document.querySelector("[data-filter-tabs]");
const gridHost = document.querySelector("[data-project-grid]");
const projectCount = document.querySelector("[data-project-count]");
const clientsHost = document.querySelector("[data-clients-grid]");
const shopHost = document.querySelector("[data-shop-grid]");

const modal = document.getElementById("checkout-modal");
const modalTitle = document.getElementById("checkout-title");
const modalProject = document.getElementById("checkout-project");
const checkoutForm = document.getElementById("checkout-form");
const checkoutSubmit = document.getElementById("checkout-submit");

function formatPrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  const formatted = numeric.toFixed(2);
  return formatted.replace(/\.00$/, "");
}

function isBuyable(project) {
  return BUYABLE_GROUPS.has(project.group) && typeof project.price === "number";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFilteredProjects() {
  if (state.activeFilter === "All") {
    return state.projects;
  }
  return state.projects.filter((project) => project.group === state.activeFilter);
}

function getClientProjects() {
  return state.projects.filter((project) => project.group === "Client");
}

function getShopProjects() {
  return state.projects.filter((project) => typeof project.price === "number");
}

function renderTabs() {
  tabsHost.innerHTML = "";

  FILTERS.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-tab";
    button.textContent = filter;
    button.dataset.filter = filter;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-pressed", String(state.activeFilter === filter));
    tabsHost.appendChild(button);
  });
}

function buildTechChips(techs) {
  if (!Array.isArray(techs) || techs.length === 0) {
    return '<div class="project-techs" aria-label="Tech stack"></div>';
  }

  const chips = techs
    .map((tech) => `<span class="tech-chip">${escapeHtml(tech)}</span>`)
    .join("");

  return `<div class="project-techs" aria-label="Tech stack">${chips}</div>`;
}

function buildCard(project) {
  const showBuy = isBuyable(project);
  const nicheMarkup = project.niche
    ? `<span class="niche-pill" title="Project niche">${escapeHtml(project.niche)}</span>`
    : "";

  const buyButton = showBuy
    ? `<button class="btn-mini btn-buy" type="button" data-buy-id="${escapeHtml(
        project.id
      )}">Buy Now — $${formatPrice(project.price)}</button>`
    : "";

  return `
    <article class="work-card">
      <div class="work-image-wrap">
        <img
          class="work-image"
          src="${escapeHtml(project.image || FALLBACK_IMAGE)}"
          alt="Screenshot preview of ${escapeHtml(project.name)}"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';"
        />
      </div>
      <div class="work-body">
        <div class="work-top">
          <h3 class="work-name">${escapeHtml(project.name)}</h3>
          <span class="group-pill">${escapeHtml(project.group)}</span>
        </div>
        ${nicheMarkup}
        <p class="work-desc">${escapeHtml(project.description || "")}</p>
        ${buildTechChips(project.techs)}
        <div class="work-actions">
          <a class="btn-mini" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">View Project</a>
          ${buyButton}
        </div>
      </div>
    </article>
  `;
}

function renderProjects() {
  const filtered = getFilteredProjects();

  projectCount.textContent = String(filtered.length);

  if (!filtered.length) {
    gridHost.innerHTML = '<div class="empty-state">No projects found for this filter.</div>';
    return;
  }

  gridHost.innerHTML = filtered.map((project) => buildCard(project)).join("");
}

function buildClientCard(project) {
  const niche = project.niche ? project.niche : "Client project";
  return `
    <a class="client-card" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">
      <h3 class="client-name">${escapeHtml(project.name)}</h3>
      <span class="client-niche">${escapeHtml(niche)}</span>
    </a>
  `;
}

function renderClients() {
  if (!clientsHost) {
    return;
  }

  const clients = getClientProjects();
  if (!clients.length) {
    clientsHost.innerHTML = '<div class="empty-state">No client projects available yet.</div>';
    return;
  }

  clientsHost.innerHTML = clients.map((project) => buildClientCard(project)).join("");
}

function buildShopCard(project) {
  const shortDescription = (project.description || "").split(".")[0] || project.description || "";
  return `
    <article class="shop-card">
      <h3 class="shop-name">${escapeHtml(project.name)}</h3>
      <p class="shop-desc">${escapeHtml(shortDescription)}</p>
      <div class="shop-meta">
        <span class="shop-price">$${formatPrice(project.price)}</span>
        <button class="btn-mini btn-buy" type="button" data-buy-id="${escapeHtml(
          project.id
        )}">Buy Now</button>
      </div>
    </article>
  `;
}

function renderShop() {
  if (!shopHost) {
    return;
  }

  const shopItems = getShopProjects();
  if (!shopItems.length) {
    shopHost.innerHTML = '<div class="empty-state">No buyable projects available yet.</div>';
    return;
  }

  shopHost.innerHTML = shopItems.map((project) => buildShopCard(project)).join("");
}

function openModal(project) {
  state.selectedProject = project;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  modalTitle.textContent = `Buy ${project.name}`;
  modalProject.textContent = `Buy Now — $${formatPrice(
    project.price
  )} • Full Source Code • Commercial License`;
  checkoutSubmit.textContent = `Continue to Payment - $${formatPrice(project.price)}`;
  document.body.style.overflow = "hidden";

  const firstField = checkoutForm.querySelector("input");
  if (firstField) {
    firstField.focus();
  }
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  checkoutForm.reset();
  state.selectedProject = null;
}

async function loadProjects() {
  try {
    const response = await fetch("projects.json", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (error) {
    // Fallback to inline data when running on file:// where fetch can be blocked.
  }

  const inline = document.getElementById("projects-data");
  if (inline && inline.textContent.trim()) {
    try {
      const data = JSON.parse(inline.textContent);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (error) {
      // Ignore parse failures and continue to empty fallback.
    }
  }

  return [];
}

function setupContactMailto() {
  const form = document.getElementById("contact-form");
  if (!form || !form.action.toLowerCase().startsWith("mailto:")) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get("name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const company = (formData.get("company") || "").toString().trim();
    const budget = (formData.get("budget") || "").toString().trim();
    const timeline = (formData.get("timeline") || "").toString().trim();
    const message = (formData.get("message") || "").toString().trim();

    const subject = encodeURIComponent(`Project inquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "N/A"}\nCompany: ${company || "N/A"}\nBudget: ${
        budget || "N/A"
      }\nTimeline: ${timeline || "N/A"}\n\nMessage:\n${message}`
    );
    window.location.href = `mailto:hello@iraady.com?subject=${subject}&body=${body}`;
  });
}

function setupCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  const acknowledge = document.getElementById("cookie-ack");
  if (!banner || !acknowledge) {
    return;
  }

  let isAcknowledged = false;
  try {
    isAcknowledged = window.localStorage.getItem("iraady_cookie_ack") === "1";
  } catch (error) {
    isAcknowledged = false;
  }

  if (isAcknowledged) {
    return;
  }

  banner.hidden = false;
  acknowledge.addEventListener("click", () => {
    try {
      window.localStorage.setItem("iraady_cookie_ack", "1");
    } catch (error) {
      // Ignore storage write failures and keep banner dismiss behavior.
    }
    banner.hidden = true;
  });
}

function setupNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("nav-links");
  if (!toggle || !links) {
    return;
  }

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    links.classList.toggle("open", !expanded);
  });

  links.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      toggle.setAttribute("aria-expanded", "false");
      links.classList.remove("open");
    }
  });
}

function setupEvents() {
  tabsHost.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) {
      return;
    }

    state.activeFilter = button.dataset.filter || "All";
    renderTabs();
    renderProjects();
  });

  gridHost.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-buy-id]");
    if (!button) {
      return;
    }

    const project = state.projects.find((item) => item.id === button.dataset.buyId);
    if (!project || !isBuyable(project)) {
      return;
    }

    openModal(project);
  });

  if (shopHost) {
    shopHost.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-buy-id]");
      if (!button) {
        return;
      }

      const project = state.projects.find((item) => item.id === button.dataset.buyId);
      if (!project || !isBuyable(project)) {
        return;
      }

      openModal(project);
    });
  }

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const project = state.selectedProject;
    if (!project || !isBuyable(project)) {
      return;
    }

    const formData = new FormData(checkoutForm);
    const name = (formData.get("name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();

    if (!name || !email || !phone) {
      return;
    }

    if (typeof window.FlutterwaveCheckout !== "function") {
      alert("Payment service is not available right now. Please refresh and try again.");
      return;
    }

    const projectId = project.id;
    const projectName = project.name;
    const price = Number(project.price);
    const amount = price;

    closeModal();

    FlutterwaveCheckout({
      public_key: "FLWPUBK-1be4df0b721ba2090406cacf32555e93-X",
      tx_ref: "TX-" + projectId + "-" + Date.now(),
      amount: price,
      currency: "USD",
      payment_options: "card, mobilemoney, ussd",
      customer: { email, name, phone_number: phone },
      meta: { project_id: projectId, project_name: projectName, seller_email: "info@iraady.com" },
      customizations: {
        title: "Buy " + projectName,
        description: "Full Source Code • Commercial License",
        logo: "https://iraady.com/logo.svg",
      },
      callback: function (response) {
        if (response.status === "successful") {
          fetch("https://zcw4cgscs0kk8ckgokcsgk0k.app.kimuse.rw/api/webhook/payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "charge.completed",
              data: {
                customer: { name, email, phone_number: phone },
                amount,
                currency: "USD",
                tx_ref: response.transaction_id,
                meta: { project_name: projectName, seller_email: "info@iraady.com" },
              },
            }),
          }).catch(() => {});

          alert(
            "Payment successful! Transaction ID: " +
              response.transaction_id +
              "\n\nWe'll email the source code to " +
              email +
              " within 24 hours."
          );
        }
      },
      onclose: function () {},
    });
  });
}

function setYear() {
  const yearEl = document.getElementById("current-year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

async function init() {
  setupNavToggle();
  setupContactMailto();
  setupCookieBanner();
  setupEvents();
  setYear();

  state.projects = await loadProjects();
  renderTabs();
  renderProjects();
  renderClients();
  renderShop();
}

init();
