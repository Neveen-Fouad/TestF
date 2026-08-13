import { api, session } from "./api.js";

const links = [
  ["Home", "/"],
  ["Explore", "/pages/countries.html"],
  ["Hotels", "/pages/hotels.html"],
  ["Restaurants", "/pages/restaurants.html"],
  ["Flights", "/pages/flights.html"]
];
const key = label => label.toLowerCase().replaceAll(" ", "-");
let accessibilityObserver;

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

function enableAccessibilityEnhancements() {
  enhanceFormLabels();
  enhanceFeedbackStates();
  document.documentElement.style.setProperty("--app-ready", "1");

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
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    enhanceFormLabels(node.matches?.(".field") ? node.parentElement : node);
    enhanceFeedbackStates(node);
  })));
  accessibilityObserver.observe(document.body, { childList: true, subtree: true });
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
  const host = document.querySelector("[data-navigation]");
  if (!host) return;

  const loggedIn = session.isLoggedIn();
  const user = session.user();
  const navigationLinks = session.isAdmin()
    ? [...links, ["Admin", "/pages/admin.html"], ["Create trip", "/pages/admin-create-trip.html"]]
    : links;
  const rawProfileName = user?.first_name || user?.name || "Profile";
  const profileName = escapeHtml(rawProfileName);
  const profileInitial = escapeHtml(String(rawProfileName).trim().charAt(0).toUpperCase() || "T");
  const mobileActions = loggedIn
    ? `<a class="mobile-nav-action" href="/pages/profile.html">${profileName}</a><button class="mobile-nav-action" type="button" data-logout>Log out</button>`
    : '<a class="mobile-nav-action" href="/pages/login.html">Sign in</a><a class="mobile-nav-action" href="/pages/register.html">Create account</a>';

  host.innerHTML = `<header class="topbar">
    <a class="brand" href="/" aria-label="Journovo home"><span class="brand-mark" aria-hidden="true">J</span><span>Journovo</span></a>
    <button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-controls="primary-navigation" aria-expanded="false"><span></span></button>
    <nav id="primary-navigation" aria-label="Primary navigation">
      ${navigationLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}
      ${loggedIn ? '<a href="/pages/joy.html" aria-label="Chat with Joy">&#10022; Joy</a><a class="notification-link" href="/pages/notifications.html" aria-label="Notifications">Notifications <span class="nav-badge" data-nav-unread hidden></span></a>' : ""}
      ${mobileActions}
    </nav>
    <div class="nav-actions">
      ${loggedIn
        ? `<a class="profile-link" href="/pages/profile.html"><span class="profile-avatar" aria-hidden="true">${profileInitial}</span>${profileName}</a><button class="button subtle" type="button" data-logout>Log out</button>`
        : '<a class="button subtle" href="/pages/login.html">Sign in</a><a class="button" href="/pages/register.html">Create account</a>'}
    </div>
  </header>`;

  const nav = host.querySelector("nav");
  const menuToggle = host.querySelector(".menu-toggle");
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
    badge.closest("a").setAttribute("aria-label", `Notifications, ${count} unread`);
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
  const sidebarLinks = [
    ["Dashboard", "/pages/dashboard.html"],
    ["My trips", "/pages/trips.html"],
    ["Trip album", "/pages/album.html"],
    ["Favorites", "/pages/favourites.html"],
    ["Compare", "/pages/compare.html"],
    ["Bookings", "/pages/bookings.html"],
    ["Notifications", "/pages/notifications.html"],
    ["Interests", "/pages/interests.html"],
    ["Settings", "/pages/settings.html"],
    ["Profile", "/pages/profile.html"]
  ];
  const content = `<aside class="sidebar"><p>YOUR TRAVEL SPACE</p>${sidebarLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}</aside>`;
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
  const sidebarLinks = [
    ["Dashboard", "/pages/admin.html"],
    ["Users", "/pages/admin-users.html"],
    ["Trips", "/pages/admin-trips.html"],
    ["Create trip", "/pages/admin-create-trip.html"],
    ["Interests", "/pages/admin-interests.html"],
    ["Complaints", "/pages/admin-complaints.html"],
    ["Reviews", "/pages/admin-reviews.html"],
    ["Revenue", "/pages/admin-revenue.html"],
    ["Site settings", "/pages/admin-settings.html"]
  ];
  const content = `<aside class="sidebar admin-sidebar"><a class="admin-brand" href="/pages/admin.html">Journovo <span>Admin</span></a><p>ADMINISTRATION</p>${sidebarLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}<button class="admin-logout" type="button" data-admin-logout>Log out</button></aside>`;
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

export const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;"
})[char]);

window.addEventListener("journovo:unauthorized", () => {
  const returnTo = encodeURIComponent(location.pathname + location.search);
  if (!location.pathname.endsWith("/login.html")) location.assign(`/pages/login.html?returnTo=${returnTo}`);
});
