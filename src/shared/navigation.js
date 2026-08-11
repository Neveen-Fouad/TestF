import { api, session } from "./api.js";

const links = [["Home", "/"], ["Explore", "/pages/trips.html"], ["Hotels", "/pages/hotels.html"], ["Flights", "/pages/flights.html"], ["Plan a trip", "/pages/planner.html"], ["Joy", "/pages/joy.html"]];
export function mountNavigation(active = "") {
  const host = document.querySelector("[data-navigation]");
  if (!host) return;
  const loggedIn = session.isLoggedIn();
  const user = session.user();
  host.innerHTML = `<header class="topbar"><a class="brand" href="/">Journovo</a><button class="menu-toggle" aria-label="Toggle navigation">☰</button><nav>${links.map(([label, url]) => `<a class="${active === label.toLowerCase().replaceAll(" ", "-") ? "active" : ""}" href="${url}">${label}</a>`).join("")}${loggedIn ? '<a href="/pages/favourites.html">Favorites</a>' : ""}</nav><div class="nav-actions">${loggedIn ? `<a class="profile-link" href="/pages/profile.html">${user?.first_name || user?.name || "Profile"}</a><button class="button subtle" data-logout>Log out</button>` : '<a class="button subtle" href="/pages/login.html">Sign in</a><a class="button" href="/pages/register.html">Create account</a>'}</div></header>`;
  host.querySelector(".menu-toggle").addEventListener("click", () => host.querySelector("nav").classList.toggle("open"));
  host.querySelector("[data-logout]")?.addEventListener("click", async () => { try { await api.auth.logout(); } catch {} session.clear(); location.assign("/"); });
}

export function requireLogin() { if (!session.isLoggedIn()) { location.assign("/pages/login.html?returnTo=" + encodeURIComponent(location.pathname + location.search)); return false; } return true; }
export function mountSidebar(active = "") {
  const host = document.querySelector("[data-sidebar]"); if (!host) return;
  const protectedLinks = session.isLoggedIn() ? [["My trips", "/pages/trips.html"], ["Favorites", "/pages/favourites.html"], ["Bookings", "/pages/bookings.html"]] : [];
  host.innerHTML = `<aside class="sidebar"><p>TRAVEL SPACE</p>${[["Dashboard", "/pages/dashboard.html"], ["Explore", "/pages/trips.html"], ["Compare", "/pages/compare.html"], ...protectedLinks].map(([label, url]) => `<a class="${active === label.toLowerCase().replaceAll(" ", "-") ? "active" : ""}" href="${url}">${label}</a>`).join("")}</aside>`;
}

export function notify(message, error = false) { const el = document.createElement("div"); el.className = `toast ${error ? "error" : ""}`; el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 3500); }
