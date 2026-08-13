import { api, session } from "./api.js";

const links = [["Home", "/"], ["Explore", "/pages/countries.html"], ["Hotels", "/pages/hotels.html"], ["Restaurants", "/pages/restaurants.html"], ["Flights", "/pages/flights.html"]];
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

function enableAccessibilityEnhancements() {
  enhanceFormLabels();
  if (accessibilityObserver) return;
  accessibilityObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    enhanceFormLabels(node.matches?.(".field") ? node.parentElement : node);
  })));
  accessibilityObserver.observe(document.body, { childList: true, subtree: true });
}

function mountCollapsibleSidebar(host, content, label, id) {
  host.innerHTML = `<button class="sidebar-toggle button subtle" type="button" aria-controls="${id}" aria-expanded="false">${label}</button>${content.replace("<aside", `<aside id="${id}"`)}`;
  const toggle = host.querySelector(".sidebar-toggle");
  const sidebar = host.querySelector(".sidebar");
  const close = () => { sidebar.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  sidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", close));
  host.addEventListener("keydown", event => { if (event.key === "Escape") { close(); toggle.focus(); } });
}

export function mountNavigation(active = "") {
  enableAccessibilityEnhancements();
  const host = document.querySelector("[data-navigation]");
  if (!host) return;
  const loggedIn = session.isLoggedIn();
  const user = session.user();
  const navigationLinks = session.isAdmin() ? [...links, ["Admin", "/pages/admin.html"], ["Create trip", "/pages/admin-create-trip.html"]] : links;
  const profileName = escapeHtml(user?.first_name || user?.name || "Profile");
  const mobileActions = loggedIn
    ? `<a class="mobile-nav-action" href="/pages/profile.html">${profileName}</a><button class="mobile-nav-action" type="button" data-logout>Log out</button>`
    : '<a class="mobile-nav-action" href="/pages/login.html">Sign in</a><a class="mobile-nav-action" href="/pages/register.html">Create account</a>';
  host.innerHTML = `<header class="topbar"><a class="brand" href="/">Journovo</a><button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-controls="primary-navigation" aria-expanded="false">☰</button><nav id="primary-navigation">${navigationLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}${loggedIn ? '<a href="/pages/joy.html" aria-label="Chat with Joy">✦ Joy</a><a class="notification-link" href="/pages/notifications.html" aria-label="Notifications">🔔 Notifications <span class="nav-badge" data-nav-unread hidden></span></a>' : ""}${mobileActions}</nav><div class="nav-actions">${loggedIn ? `<a class="profile-link" href="/pages/profile.html">${profileName}</a><button class="button subtle" type="button" data-logout>Log out</button>` : '<a class="button subtle" href="/pages/login.html">Sign in</a><a class="button" href="/pages/register.html">Create account</a>'}</div></header>`;
  const nav = host.querySelector("nav");
  const menuToggle = host.querySelector(".menu-toggle");
  const closeMenu = () => { nav.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); };
  menuToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  host.addEventListener("keydown", event => { if (event.key === "Escape") { closeMenu(); menuToggle.focus(); } });
  host.querySelectorAll("[data-logout]").forEach(button => button.addEventListener("click", async () => { try { await api.auth.logout(); } catch {} session.clear(); location.assign("/"); }));
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
  } catch { return null; }
}

export function mountSidebar(active = "") {
  enableAccessibilityEnhancements();
  const host = document.querySelector("[data-sidebar]");
  if (!host) return;
  const sidebarLinks = [["Dashboard", "/pages/dashboard.html"], ["My trips", "/pages/trips.html"], ["Trip album", "/pages/album.html"], ["Favorites", "/pages/favourites.html"], ["Compare", "/pages/compare.html"], ["Bookings", "/pages/bookings.html"], ["Notifications", "/pages/notifications.html"], ["Interests", "/pages/interests.html"], ["Settings", "/pages/settings.html"], ["Profile", "/pages/profile.html"]];
  const content = `<aside class="sidebar"><p>YOUR TRAVEL SPACE</p>${sidebarLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}</aside>`;
  mountCollapsibleSidebar(host, content, "Travel space menu", "account-sidebar");
}

export function requireAdmin() {
  if (!requireLogin()) return false;
  if (!session.isAdmin()) { location.assign("/pages/dashboard.html"); return false; }
  return true;
}

export function mountAdminSidebar(active = "") {
  enableAccessibilityEnhancements();
  const host = document.querySelector("[data-admin-sidebar]");
  if (!host) return;
  const sidebarLinks = [["Dashboard", "/pages/admin.html"], ["Users", "/pages/admin-users.html"], ["Trips", "/pages/admin-trips.html"], ["Create trip", "/pages/admin-create-trip.html"], ["Interests", "/pages/admin-interests.html"], ["Complaints", "/pages/admin-complaints.html"], ["Reviews", "/pages/admin-reviews.html"], ["Revenue", "/pages/admin-revenue.html"], ["Site settings", "/pages/admin-settings.html"]];
  const content = `<aside class="sidebar admin-sidebar"><a class="admin-brand" href="/pages/admin.html">Journovo <span>Admin</span></a><p>ADMINISTRATION</p>${sidebarLinks.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" ${active === key(label) ? 'aria-current="page"' : ""} href="${url}">${label}</a>`).join("")}<button class="admin-logout" type="button" data-admin-logout>Log out</button></aside>`;
  mountCollapsibleSidebar(host, content, "Administration menu", "admin-sidebar");
  host.querySelector("[data-admin-logout]").addEventListener("click", async () => { try { await api.auth.logout(); } catch {} session.clear(); location.assign("/pages/login.html"); });
}

export function notify(message, error = false) {
  const el = document.createElement("div");
  el.className = `toast ${error ? "error" : ""}`;
  el.setAttribute("role", error ? "alert" : "status");
  el.setAttribute("aria-live", error ? "assertive" : "polite");
  el.setAttribute("aria-atomic", "true");
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

export const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

window.addEventListener("journovo:unauthorized", () => {
  const returnTo = encodeURIComponent(location.pathname + location.search);
  if (!location.pathname.endsWith("/login.html")) location.assign(`/pages/login.html?returnTo=${returnTo}`);
});
