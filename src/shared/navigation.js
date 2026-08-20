import { api, session } from "./api.js";

const links = [
  ["Home", "/"],
  ["Explore", "/pages/countries.html"],
  ["Hotels", "/pages/hotels.html"],
  ["Restaurants", "/pages/restaurants.html"],
  ["Flights", "/pages/flights.html"],
  ["Trips", "/pages/premade-trips.html"],
  ["About", "/pages/about.html"],
  ["Contact", "/pages/contact.html"]
];
const key = label => label.toLowerCase().replaceAll(" ", "-");
let accessibilityObserver;
let experienceReady = false;
let submittedForm;
let submittedAt = 0;
const defaultSiteSettings = Object.freeze({ name: "Journovo", slogan: "Make every journey yours." });
let siteSettings = { ...defaultSiteSettings };
let siteSettingsRequest;

function normalizeSiteSettings(payload) {
  let value = payload?.data ?? payload;
  if (Array.isArray(value)) value = value[0];
  if (Array.isArray(value?.data)) value = value.data[0];
  return value && typeof value === "object" ? value : {};
}

function safeWebUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function resolveAssetUrl(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) return trimmed;

  const defaultApiUrl = `http://${location.hostname}:8000/api`;
  const apiBase = (window.JOURNOVO_CONFIG?.API_BASE_URL || defaultApiUrl).replace(/\/$/, "");
  const backendOrigin = apiBase.replace(/\/api\/?$/i, "");
  const cleanPath = trimmed.replace(/^\/?storage\//i, "").replace(/^\//, "");
  return `${backendOrigin}/storage/${cleanPath}`;
}

function currentSiteName() {
  return String(siteSettings.name || defaultSiteSettings.name).trim() || defaultSiteSettings.name;
}

function siteBrandMarkup(admin = false) {
  const name = escapeHtml(currentSiteName());
  const rawLogo = siteSettings.logo_url || siteSettings.logoUrl || siteSettings.logo;
  const logo = resolveAssetUrl(rawLogo);
  const initial = escapeHtml(currentSiteName().charAt(0).toUpperCase() || "J");
  const mark = logo
    ? `<span class="brand-mark-wrap"><img class="brand-logo" src="${escapeHtml(logo)}" alt="${name} logo" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='grid';"><span class="brand-mark" style="display: none;" aria-hidden="true">${initial}</span></span>`
    : `<span class="brand-mark" aria-hidden="true">${initial}</span>`;
  return `${mark}<span>${name}</span>${admin ? " <span>Admin</span>" : ""}`;
}

function replaceDefaultBrand(root) {
  if (!root || currentSiteName() === defaultSiteSettings.name) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent && !["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => { node.nodeValue = node.nodeValue.replace(/\bJournovo\b/gi, currentSiteName()); });
}

function mountSiteFooter() {
  if (document.body.dataset.adminPage) return;
  let footer = document.querySelector("[data-site-settings-footer]");
  if (!footer) {
    footer = document.querySelector("footer.footer") || document.createElement("footer");
    footer.classList.add("footer", "site-settings-footer");
    footer.dataset.siteSettingsFooter = "";
    if (!footer.isConnected) document.body.append(footer);
  }
  const phone = String(siteSettings.phone || "").trim();
  const facebook = safeWebUrl(siteSettings.facebook);
  const instagram = safeWebUrl(siteSettings.instagram);
  const slogan = escapeHtml(siteSettings.slogan || defaultSiteSettings.slogan || "Thoughtful travel planning, curated stays, and unforgettable memories.");

  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-brand-col">
        <a class="brand footer-brand" data-site-brand href="/" aria-label="${escapeHtml(currentSiteName())} home">
          ${siteBrandMarkup()}
        </a>
        <p class="footer-slogan">${slogan}</p>
        <div class="footer-social-row">
          ${facebook ? `
            <a class="footer-social-btn" href="${escapeHtml(facebook)}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
          ` : ""}
          ${instagram ? `
            <a class="footer-social-btn" href="${escapeHtml(instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
          ` : ""}
        </div>
      </div>

      <div class="footer-nav-col">
        <h4 class="footer-col-title">Discover & Plan</h4>
        <ul class="footer-links-list">
          <li><a href="/pages/countries.html">Explore destinations</a></li>
          <li><a href="/pages/planner.html">Plan my trip</a></li>
          <li><a href="/pages/hotels.html">Find hotels</a></li>
          <li><a href="/pages/restaurants.html">Restaurants & dining</a></li>
          <li><a href="/pages/flights.html">Flight search</a></li>
          <li><a href="/pages/joy.html">✦ Joy AI Assistant</a></li>
        </ul>
      </div>

      <div class="footer-nav-col">
        <h4 class="footer-col-title">Your Travel Space</h4>
        <ul class="footer-links-list">
          <li><a href="/pages/dashboard.html">Dashboard</a></li>
          <li><a href="/pages/trips.html">My trips & itineraries</a></li>
          <li><a href="/pages/album.html">Trip album & memories</a></li>
          <li><a href="/pages/favourites.html">Saved favorites</a></li>
          <li><a href="/pages/compare.html">Compare stays</a></li>
          <li><a href="/pages/bookings.html">Manage bookings</a></li>
        </ul>
      </div>

      <div class="footer-nav-col">
        <h4 class="footer-col-title">Company & Support</h4>
        <ul class="footer-links-list">
          <li><a href="/pages/about.html">About Journovo</a></li>
          <li><a href="/pages/contact.html">Contact & support</a></li>
          <li><a href="/pages/reviews.html">Community reviews</a></li>
          <li><a href="/pages/notifications.html">Notifications</a></li>
          ${phone ? `<li><a href="tel:${encodeURIComponent(phone)}" class="footer-phone-text">📞 ${escapeHtml(phone)}</a></li>` : ""}
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="footer-bottom-container">
        <p class="footer-copyright">© ${new Date().getFullYear()} ${escapeHtml(currentSiteName())}. All rights reserved.</p>
        <div class="footer-bottom-links">
          <a href="/pages/about.html">Privacy</a>
          <span aria-hidden="true">·</span>
          <a href="/pages/about.html">Terms</a>
          <span aria-hidden="true">·</span>
          <a href="#top" class="footer-back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'});return false;">Back to top ↑</a>
        </div>
      </div>
    </div>
  `;
}

function applySiteSettings() {
  document.documentElement.dataset.siteName = currentSiteName();
  document.querySelectorAll("[data-site-brand]").forEach(brand => {
    brand.innerHTML = siteBrandMarkup(brand.dataset.siteBrand === "admin");
    brand.setAttribute("aria-label", `${currentSiteName()} home`);
  });
  document.querySelectorAll("title, meta[name='description']").forEach(element => {
    if (element.tagName === "TITLE") element.textContent = element.textContent.replace(/\bJournovo\b/gi, currentSiteName());
    else element.content = element.content.replace(/\bJournovo\b/gi, currentSiteName());
  });
  replaceDefaultBrand(document.body);
  mountSiteFooter();
}

export async function loadSiteSettings({ refresh = false } = {}) {
  if (!refresh && siteSettingsRequest) return siteSettingsRequest;
  siteSettingsRequest = api.site.settings().then(payload => {
    siteSettings = { ...defaultSiteSettings, ...normalizeSiteSettings(payload) };
    applySiteSettings();
    return siteSettings;
  }).catch(() => siteSettings).finally(() => { siteSettingsRequest = undefined; });
  return siteSettingsRequest;
}

export function updateSiteSettings(payload) {
  siteSettings = { ...defaultSiteSettings, ...normalizeSiteSettings(payload) };
  applySiteSettings();
}

function enhanceFormLabels(root = document) {
  root.querySelectorAll(".field > label:not([for])").forEach((label, index) => {
    const control = label.parentElement?.querySelector("input:not([type=hidden]), select, textarea");
    if (!control) return;
    if (!control.id) {
      const formName = control.form?.id || "field";
      const controlName = control.name || `control-${index + 1}`;
      const base = `${formName}-${controlName}`.replace(/[^a-zA-Z0-9_-]/g, "-");
      let candidate = base;
      let suffix = 2;
      while (document.getElementById(candidate)) candidate = `${base}-${suffix++}`;
      control.id = candidate;
    }
    label.htmlFor = control.id;
    if (control.required && !label.querySelector(".required-star")) {
      const star = document.createElement("span");
      star.className = "required-star";
      star.textContent = " *";
      star.setAttribute("aria-hidden", "true");
      star.style.color = "#dc3545";
      label.appendChild(star);
    }
  });

  root.querySelectorAll('input[type="password"]:not([autocomplete])').forEach(input => {
    const currentPassword = input.name === "current_password" || input.form?.id === "login-form";
    input.autocomplete = currentPassword ? "current-password" : "new-password";
  });
}

function enhanceFeedbackStates(root = document) {
  const states = root.matches?.(".empty") ? [root] : root.querySelectorAll?.(".empty") || [];
  states.forEach(state => {
    const text = state.textContent.trim();
    state.classList.toggle("is-loading", /loading|finding|opening|preparing|refreshing/i.test(text));
    state.classList.toggle("is-error", /unable to|failed|could not|error/i.test(text));
    state.setAttribute("role", state.classList.contains("is-error") ? "alert" : "status");
    state.setAttribute("aria-live", state.classList.contains("is-error") ? "assertive" : "polite");
  });
}

function ensureBootstrap() {
  if (!document.querySelector('link[href*="bootstrap"]')) {
    const linkGrid = document.createElement("link");
    linkGrid.rel = "stylesheet";
    linkGrid.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap-grid.min.css";
    linkGrid.crossOrigin = "anonymous";
    document.head.prepend(linkGrid);

    const linkUtils = document.createElement("link");
    linkUtils.rel = "stylesheet";
    linkUtils.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap-utilities.min.css";
    linkUtils.crossOrigin = "anonymous";
    document.head.prepend(linkUtils);
  }
  if (!document.querySelector('script[src*="bootstrap"]')) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
    script.crossOrigin = "anonymous";
    script.defer = true;
    document.body.append(script);
  }
}

export function initTheme() {
  const saved = localStorage.getItem("journovo-theme");
  const theme = saved === "dark" ? "dark" : "light";
  applyTheme(theme, false);
}

export function applyTheme(theme, save = true) {
  document.documentElement.dataset.theme = theme;
  if (save) {
    try { localStorage.setItem("journovo-theme", theme); } catch {}
  }
  updateThemeButtons(theme);
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(current, true);
}

function updateThemeButtons(theme) {
  const isDark = theme === "dark";
  document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
    btn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    btn.setAttribute("title", isDark ? "Switch to light theme" : "Switch to dark theme");
    const mobileLabel = btn.querySelector(".theme-mobile-label");
    const mobileIcon = btn.querySelector(".theme-mobile-icon");
    if (mobileLabel) mobileLabel.textContent = isDark ? "Light mode" : "Dark mode";
    if (mobileIcon) mobileIcon.textContent = isDark ? "☀️" : "🌙";
  });
}

function enableAccessibilityEnhancements() {
  initTheme();
  ensureBootstrap();
  enhanceFormLabels();
  enhanceFeedbackStates();
  document.documentElement.style.setProperty("--app-ready", "1");

  if (!window._themeListenerAttached) {
    window._themeListenerAttached = true;
    document.addEventListener("click", event => {
      const btn = event.target.closest("[data-theme-toggle]");
      if (btn) {
        event.preventDefault();
        toggleTheme();
      }
    });
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = "#082b61";
    document.head.append(theme);
  }
  if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.href = "/public/favicon.svg";
    document.head.append(favicon);
  }

  if (accessibilityObserver) return;
  accessibilityObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      replaceDefaultBrand(node.parentElement);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    enhanceFormLabels(node.matches?.(".field") ? node.parentElement : node);
    enhanceFeedbackStates(node);
    replaceDefaultBrand(node);
  })));
  accessibilityObserver.observe(document.body, { childList: true, subtree: true });
}

function fieldMessage(control, message = "") {
  const field = control.closest(".field") || control.parentElement;
  if (!field) return;
  field.classList.toggle("has-error", Boolean(message));
  control.toggleAttribute("aria-invalid", Boolean(message));
  let target = field.querySelector(".field-error");
  if (message && !target) {
    target = document.createElement("small");
    target.className = "field-error";
    target.id = `${control.id || "field"}-error`;
    target.setAttribute("role", "alert");
    field.append(target);
  }
  if (target) {
    target.textContent = message;
    if (!message) target.remove();
  }
  if (message && target) {
    const describedBy = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (!describedBy.includes(target.id)) {
      describedBy.push(target.id);
      control.setAttribute("aria-describedby", describedBy.join(" "));
    }
  } else {
    control.removeAttribute("aria-describedby");
  }
}

function formMessage(form, message = "", error = false) {
  let target = form.querySelector(".form-message");
  if (message && !target) {
    target = document.createElement("div");
    target.className = "form-message";
    target.setAttribute("aria-live", "polite");
    form.prepend(target);
  }
  if (!target) return;
  target.classList.toggle("error", error);
  target.textContent = message;
  if (!message) target.remove();
}

function showFormErrors(form, error) {
  const entries = Object.entries(error?.errors || {});
  if (!entries.length) return;
  let first;
  entries.forEach(([name, messages]) => {
    const control = form.elements.namedItem(name);
    if (!control || control instanceof RadioNodeList) return;
    const message = Array.isArray(messages) ? messages[0] : String(messages);
    fieldMessage(control, message);
    first ||= control;
  });
  formMessage(form, "Please correct the highlighted fields and try again.", true);
  first?.focus();
}

function setFormBusy(form, busy) {
  const submit = form.querySelector('button[type="submit"], button:not([type])');
  if (!submit) return;
  if (busy) {
    if (!submit.dataset.label) submit.dataset.label = submit.textContent.trim();
    submit.disabled = true;
    submit.classList.add("is-loading");
    submit.setAttribute("aria-busy", "true");
    submit.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>Working…</span>';
  } else {
    submit.disabled = false;
    submit.classList.remove("is-loading");
    submit.removeAttribute("aria-busy");
    if (submit.dataset.label) submit.textContent = submit.dataset.label;
  }
}

function mountConnectionStatus() {
  let banner = document.querySelector(".connection-status");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "connection-status";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    document.body.append(banner);
  }
  const render = () => {
    const offline = !navigator.onLine;
    banner.classList.toggle("visible", offline);
    banner.textContent = offline ? "You’re offline. Some travel features will be unavailable until you reconnect." : "";
  };
  window.addEventListener("offline", render);
  window.addEventListener("online", () => {
    banner.classList.remove("visible");
    notify("You’re back online. You can continue where you left off.");
  });
  render();
}

function enableExperienceEnhancements() {
  if (experienceReady) return;
  experienceReady = true;
  mountConnectionStatus();
  document.querySelectorAll(".skip-link").forEach(el => el.remove());

  document.addEventListener("invalid", event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
      fieldMessage(event.target, event.target.validationMessage);
    }
  }, true);

  document.addEventListener("input", event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
      if (event.target.validity.valid) fieldMessage(event.target);
    }
  });

  document.addEventListener("blur", event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    if (target.validity.valid) {
      fieldMessage(target);
    } else if (target.value) {
      fieldMessage(target, target.validationMessage);
    }
  }, true);

  document.addEventListener("click", event => {
    const btn = event.target.closest("[data-password-toggle]");
    if (!btn) return;
    const input = btn.parentElement?.querySelector("input");
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    btn.innerHTML = isPassword
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }, true);

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    form.querySelectorAll("[aria-invalid='true']").forEach(control => fieldMessage(control));
    formMessage(form);
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      const first = form.querySelector(":invalid");
      setTimeout(() => first?.focus(), 0);
      return;
    }
    submittedForm = form;
    submittedAt = Date.now();
  }, true);

  window.addEventListener("journovo:request-state", event => {
    const { state, ok, error } = event.detail || {};
    const matchesSubmission = submittedForm && Date.now() - submittedAt < 3000;
    if (state === "start" && matchesSubmission) {
      const count = Number(submittedForm.dataset.pendingRequests || 0) + 1;
      submittedForm.dataset.pendingRequests = String(count);
      setFormBusy(submittedForm, true);
      return;
    }
    if (state !== "end" || !submittedForm) return;
    const count = Math.max(Number(submittedForm.dataset.pendingRequests || 1) - 1, 0);
    submittedForm.dataset.pendingRequests = String(count);
    if (!count) {
      setFormBusy(submittedForm, false);
      if (!ok) showFormErrors(submittedForm, error);
      submittedForm = undefined;
    }
  });
}

function mountCollapsibleSidebar(host, content, label, id) {
  host.innerHTML = `<button class="sidebar-toggle button subtle" type="button" aria-controls="${id}" aria-expanded="false">${label}</button>${content.replace("<aside", `<aside id="${id}"`)}`;
  const toggle = host.querySelector(".sidebar-toggle");
  const sidebar = host.querySelector(".sidebar");
  const close = () => {
    sidebar.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  sidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", close));
  host.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      close();
      toggle.focus();
    }
  });
}

export function mountNavigation(active = "") {
  enableAccessibilityEnhancements();
  enableExperienceEnhancements();
  const host = document.querySelector("[data-navigation]");
  if (!host) return;
  void loadSiteSettings();

  const loggedIn = session.isLoggedIn();
  const user = session.user();
  const rawProfileName = user?.first_name || user?.name || "Profile";
  const profileName = escapeHtml(rawProfileName);
  const profileInitial = escapeHtml(String(rawProfileName).trim().charAt(0).toUpperCase() || "T");
  const isMemberSpace = Boolean(document.querySelector("[data-sidebar]"));

  if (isMemberSpace) {
    host.innerHTML = `<header class="topbar member-topbar">
      <a class="brand" data-site-brand href="/" aria-label="${escapeHtml(currentSiteName())} home">${siteBrandMarkup()}</a>
      <div class="nav-actions member-nav-actions">
        <button class="theme-toggle-btn" type="button" aria-label="Toggle dark mode" title="Toggle dark mode" data-theme-toggle>
          <span class="theme-icon-sun" aria-hidden="true">☀️</span>
          <span class="theme-icon-moon" aria-hidden="true">🌙</span>
        </button>
        ${loggedIn ? `
          <a class="nav-pill-link ${active === 'notifications' ? 'active' : ''}" href="/pages/notifications.html" aria-label="Notifications">
            <span class="nav-pill-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span>
            <span>Notifications</span>
            <span class="nav-badge" data-nav-unread hidden></span>
          </a>
          <a class="nav-pill-link ${active === 'profile' ? 'active' : ''}" href="/pages/profile.html">
            <span class="nav-pill-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
            <span>${profileName}</span>
          </a>
          <button class="nav-pill-btn" type="button" data-logout>
            <span class="nav-pill-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span>
            <span>Log out</span>
          </button>
        ` : `
          <a class="button subtle" href="/pages/login.html">Sign in</a>
          <a class="button" href="/pages/register.html">Create account</a>
        `}
      </div>
    </header>`;
  } else {
    const navigationLinks = session.isAdmin()
      ? [...links, ["Admin", "/pages/admin.html"], ["Create trip", "/pages/admin-create-trip.html"]]
      : links;
    const themeMobileAction = `<button class="mobile-nav-action theme-mobile-toggle" type="button" data-theme-toggle><span class="theme-mobile-icon">🌙</span> <span class="theme-mobile-label">Dark mode</span></button>`;
    const mobileActions = loggedIn
      ? `<a class="mobile-nav-action" href="/pages/notifications.html">Notifications</a><a class="mobile-nav-action" href="/pages/profile.html">${profileName}</a><button class="mobile-nav-action" type="button" data-logout>Log out</button>${themeMobileAction}`
      : `<a class="mobile-nav-action" href="/pages/login.html">Sign in</a><a class="mobile-nav-action" href="/pages/register.html">Create account</a>${themeMobileAction}`;

    host.innerHTML = `<header class="topbar">
      <a class="brand" data-site-brand href="/" aria-label="${escapeHtml(currentSiteName())} home">${siteBrandMarkup()}</a>
      <button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-controls="primary-navigation" aria-expanded="false"><span></span></button>
      <nav id="primary-navigation" aria-label="Primary navigation">
        ${navigationLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}
        ${loggedIn ? '<a href="/pages/joy.html" aria-label="Chat with Joy">&#10022; Joy</a>' : ""}
        ${mobileActions}
      </nav>
      <div class="nav-actions">
        <button class="theme-toggle-btn" type="button" aria-label="Toggle dark mode" title="Toggle dark mode" data-theme-toggle>
          <span class="theme-icon-sun" aria-hidden="true">☀️</span>
          <span class="theme-icon-moon" aria-hidden="true">🌙</span>
        </button>
        ${loggedIn ? `
          <a class="nav-pill-link ${active === 'notifications' ? 'active' : ''}" href="/pages/notifications.html" aria-label="Notifications">
            <span class="nav-pill-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span>
            <span>Notifications</span>
            <span class="nav-badge" data-nav-unread hidden></span>
          </a>
          <a class="nav-pill-link ${active === 'profile' ? 'active' : ''}" href="/pages/profile.html">
            <span class="nav-pill-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
            <span>${profileName}</span>
          </a>
          <button class="nav-pill-btn" type="button" data-logout>
            <span class="nav-pill-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span>
            <span>Log out</span>
          </button>
        ` : `
          <a class="button subtle" href="/pages/login.html">Sign in</a>
          <a class="button" href="/pages/register.html">Create account</a>
        `}
      </div>
    </header>`;

    const nav = host.querySelector("nav");
    const menuToggle = host.querySelector(".menu-toggle");
    if (nav && menuToggle) {
      const closeMenu = () => {
        nav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      };
      menuToggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(open));
      });
      nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
      host.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          closeMenu();
          menuToggle.focus();
        }
      });
    }
  }

  host.querySelectorAll("[data-logout]").forEach(button => button.addEventListener("click", async () => {
    try { await api.auth.logout(); } catch {}
    session.clear();
    location.assign("/");
  }));

  const clientId = session.clientId();
  if (loggedIn && clientId) api.notifications.unreadCount(clientId).then(payload => {
    const count = Number(payload?.unread_count || payload?.data?.unread_count || 0);
    const badge = host.querySelector("[data-nav-unread]");
    if (!badge || !count) return;
    badge.hidden = false;
    badge.textContent = count > 99 ? "99+" : String(count);
    const bellLink = badge.closest("a");
    if (bellLink) bellLink.setAttribute("aria-label", `Notifications, ${count} unread`);
  }).catch(() => {});
}

export function requireLogin() {
  if (!session.isLoggedIn()) {
    location.assign(`/pages/login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  }
  return true;
}

export function safeLocalPath(value, origin = location.origin) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  try {
    const destination = new URL(value, origin);
    return destination.origin === origin ? `${destination.pathname}${destination.search}${destination.hash}` : null;
  } catch {
    return null;
  }
}

export function mountSidebar(active = "") {
  enableAccessibilityEnhancements();
  const host = document.querySelector("[data-sidebar]");
  if (!host) return;

  const sidebarCategories = [
    {
      title: "YOUR TRAVEL SPACE",
      items: [
        ["Home", "/", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`],
        ["Dashboard", "/pages/dashboard.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`],
        ["My trips", "/pages/trips.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`],
        ["Trip album", "/pages/album.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`],
        ["Favorites", "/pages/favourites.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`],
        ["Compare", "/pages/compare.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`],
        ["Bookings", "/pages/bookings.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`],
        ["Payments", "/pages/payments.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`],
        ["My reviews", "/pages/reviews.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`]
      ]
    },
    {
      title: "PREFERENCES",
      items: [
        ["Interests", "/pages/interests.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`],
        ["Settings", "/pages/settings.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`],
        ["Profile", "/pages/profile.html", `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`]
      ]
    }
  ];

  const content = `<aside class="sidebar member-sidebar">
    ${sidebarCategories.map(group => `
      <p class="sidebar-category-title">${group.title}</p>
      ${group.items.map(([label, url, icon]) => {
        const itemKey = key(label);
        const isActive = active === itemKey || (itemKey === "my-reviews" && active === "reviews");
        return `
        <a class="${isActive ? "active" : ""}" ${isActive ? 'aria-current="page"' : ""} href="${url}">
          <span class="sidebar-icon" aria-hidden="true">${icon}</span>
          <span>${label}</span>
        </a>`;
      }).join("")}
    `).join("")}
  </aside>`;

  mountCollapsibleSidebar(host, content, "Travel space menu", "account-sidebar");
}

export function requireAdmin() {
  if (!requireLogin()) return false;
  if (!session.isAdmin()) {
    location.assign("/pages/dashboard.html");
    return false;
  }
  return true;
}

export function mountAdminSidebar(active = "") {
  enableAccessibilityEnhancements();
  const host = document.querySelector("[data-admin-sidebar]");
  if (!host) return;
  void loadSiteSettings();
  const isDark = document.documentElement.dataset.theme === "dark";
  const sidebarLinks = [
    ["Dashboard", "/pages/admin.html"],
    ["Live inventory", "/pages/admin-inventory.html"],
    ["Users", "/pages/admin-users.html"],
    ["Bookings", "/pages/admin-bookings.html"],
    ["Trips", "/pages/admin-trips.html"],
    ["Create trip", "/pages/admin-create-trip.html"],
    ["Interests", "/pages/admin-interests.html"],
    ["Complaints", "/pages/admin-complaints.html"],
    ["Reviews", "/pages/admin-reviews.html"],
    ["Site settings", "/pages/admin-settings.html"]
  ];
  const content = `<aside class="sidebar admin-sidebar">
    <div class="admin-sidebar-header">
      <a class="admin-brand" data-site-brand="admin" href="/pages/admin.html">${siteBrandMarkup(true)}</a>
      <button class="theme-toggle-btn admin-theme-toggle" type="button" data-theme-toggle aria-label="${isDark ? "Switch to light theme" : "Switch to dark theme"}" title="${isDark ? "Switch to light theme" : "Switch to dark theme"}">
        <span class="theme-icon-sun" aria-hidden="true">☀️</span>
        <span class="theme-icon-moon" aria-hidden="true">🌙</span>
      </button>
    </div>
    <p>ADMINISTRATION</p>
    ${sidebarLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}
    <button class="admin-logout" type="button" data-admin-logout>Log out</button>
  </aside>`;
  mountCollapsibleSidebar(host, content, "Administration menu", "admin-sidebar");
  host.querySelector("[data-admin-logout]").addEventListener("click", async () => {
    try { await api.auth.logout(); } catch {}
    session.clear();
    location.assign("/pages/login.html");
  });
}

function toastStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("aria-label", "Notifications");
    document.body.append(stack);
  }
  return stack;
}

export function notify(message, error = false) {
  const duration = error ? 6500 : 5000;
  const connectionIssue = error && /unable to reach|network|cors|failed to fetch/i.test(String(message));
  const el = document.createElement("div");
  el.className = `toast ${error ? "error" : "success"}`;
  el.setAttribute("role", error ? "alert" : "status");
  el.setAttribute("aria-live", error ? "assertive" : "polite");
  el.setAttribute("aria-atomic", "true");
  el.style.setProperty("--toast-duration", `${duration}ms`);
  el.innerHTML = `<span class="toast-icon" aria-hidden="true">${error ? "!" : "&#10003;"}</span><div class="toast-copy"><strong class="toast-title">${connectionIssue ? "Connection issue" : error ? "Something needs attention" : "All set"}</strong><p class="toast-message"></p></div><button class="toast-close" type="button" aria-label="Dismiss notification">&times;</button>`;
  el.querySelector(".toast-message").textContent = String(message);

  const remove = () => {
    if (!el.isConnected || el.classList.contains("leaving")) return;
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector(".toast-close").addEventListener("click", remove);

  const stack = toastStack();
  stack.append(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(remove, duration);
}

export function showRecoverableState(target, message, { actionLabel = "Try again", action } = {}) {
  if (!target) return;
  target.innerHTML = `<div class="empty is-error"><div><strong>We couldn’t complete that just now.</strong><p>${escapeHtml(message)}</p>${action ? `<button class="button subtle" type="button" data-retry>${escapeHtml(actionLabel)}</button>` : ""}</div></div>`;
  target.querySelector("[data-retry]")?.addEventListener("click", action);
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

export const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;"
})[char]);

export function confirmModal(message, options = {}) {
  return new Promise(resolve => {
    const isDanger = options.danger ?? /delete|remove|reject|deactivate|cancel/i.test(message);
    const title = options.title || (isDanger ? "Confirm Action" : "Please Confirm");
    const confirmText = options.confirmText || (isDanger ? (options.actionText || "Confirm") : "Confirm");
    const cancelText = options.cancelText || "Cancel";

    const overlay = document.createElement("div");
    overlay.className = "confirm-dialog-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    overlay.innerHTML = `
      <div class="confirm-dialog-card">
        <div class="confirm-dialog-header">
          <div class="confirm-dialog-icon ${isDanger ? "is-danger" : "is-primary"}">
            ${isDanger ? "⚠️" : "✦"}
          </div>
          <div>
            <h3 class="confirm-dialog-title">${escapeHtml(title)}</h3>
            <p class="confirm-dialog-message">${escapeHtml(message)}</p>
          </div>
        </div>
        <div class="confirm-dialog-actions">
          <button class="button subtle confirm-dialog-btn-cancel" type="button">${escapeHtml(cancelText)}</button>
          <button class="button ${isDanger ? "confirm-dialog-btn-danger" : ""} confirm-dialog-btn-ok" type="button">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let resolved = false;
    const cleanup = (result) => {
      if (resolved) return;
      resolved = true;
      overlay.classList.add("closing");
      setTimeout(() => overlay.remove(), 160);
      window.removeEventListener("keydown", handleKeyDown);
      resolve(result);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") cleanup(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    overlay.querySelector(".confirm-dialog-btn-cancel").addEventListener("click", () => cleanup(false));
    overlay.querySelector(".confirm-dialog-btn-ok").addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });

    setTimeout(() => {
      overlay.querySelector(".confirm-dialog-btn-ok")?.focus();
    }, 50);
  });
}

window.confirmModal = confirmModal;

window.addEventListener("journovo:unauthorized", () => {
  const returnTo = encodeURIComponent(location.pathname + location.search);
  if (!location.pathname.endsWith("/login.html")) location.assign(`/pages/login.html?returnTo=${returnTo}`);
});
