import { api, session } from "./api.js";

const links = [["Home", "/"], ["Explore", "/pages/trips.html"], ["Hotels", "/pages/hotels.html"], ["Flights", "/pages/flights.html"], ["Plan a trip", "/pages/planner.html"]];
const key = label => label.toLowerCase().replaceAll(" ", "-");

export function mountNavigation(active = "") {
  const host = document.querySelector("[data-navigation]");
  if (!host) return;
  const loggedIn = session.isLoggedIn(); const user = session.user();
  host.innerHTML = `<header class="topbar"><a class="brand" href="/">Journovo</a><button class="menu-toggle" aria-label="Toggle navigation">☰</button><nav>${links.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" href="${url}">${label}</a>`).join("")}${loggedIn ? '<a href="/pages/notifications.html" aria-label="Notifications">Updates</a>' : ""}</nav><div class="nav-actions">${loggedIn ? `<a class="profile-link" href="/pages/profile.html">${user?.first_name || user?.name || "Profile"}</a><button class="button subtle" data-logout>Log out</button>` : '<a class="button subtle" href="/pages/login.html">Sign in</a><a class="button" href="/pages/register.html">Create account</a>'}</div></header>`;
  host.querySelector(".menu-toggle").addEventListener("click", () => host.querySelector("nav").classList.toggle("open"));
  host.querySelector("[data-logout]")?.addEventListener("click", async () => { try { await api.auth.logout(); } catch {} session.clear(); location.assign("/"); });
}

export function requireLogin() { if (!session.isLoggedIn()) { location.assign(`/pages/login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`); return false; } return true; }
export function mountSidebar(active = "") {
  const host = document.querySelector("[data-sidebar]"); if (!host) return;
  const links = [["Dashboard", "/pages/dashboard.html"], ["My trips", "/pages/trips.html"], ["Trip album", "/pages/album.html"], ["Favorites", "/pages/favourites.html"], ["Compare", "/pages/compare.html"], ["Bookings", "/pages/bookings.html"], ["Notifications", "/pages/notifications.html"], ["Interests", "/pages/interests.html"], ["Settings", "/pages/settings.html"], ["Profile", "/pages/profile.html"]];
  host.innerHTML = `<aside class="sidebar"><p>YOUR TRAVEL SPACE</p>${links.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" href="${url}">${label}</a>`).join("")}</aside>`;
}
export function requireAdmin() { if (!requireLogin()) return false; if (!session.isAdmin()) { location.assign("/pages/dashboard.html"); return false; } return true; }
export function mountAdminSidebar(active = "") {
  const host = document.querySelector("[data-admin-sidebar]"); if (!host) return;
  const links = [["Dashboard", "/pages/admin.html"], ["Users", "/pages/admin-users.html"], ["Create trip", "/pages/admin-create-trip.html"], ["Interests", "/pages/admin-interests.html"], ["Complaints", "/pages/admin-complaints.html"], ["Reviews", "/pages/admin-reviews.html"], ["Revenue", "/pages/admin-revenue.html"], ["Site settings", "/pages/admin-settings.html"]];
  host.innerHTML = `<aside class="sidebar"><p>ADMINISTRATION</p>${links.map(([label, url]) => `<a class="${active === key(label) ? "active" : ""}" href="${url}">${label}</a>`).join("")}</aside>`;
}
export function notify(message, error = false) { const el = document.createElement("div"); el.className = `toast ${error ? "error" : ""}`; el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 3500); }
export const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
