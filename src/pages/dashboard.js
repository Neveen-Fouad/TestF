import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();

if (requireLogin()) {
  mountSidebar("dashboard");
  document.querySelector("#member-name").textContent = session.user()?.first_name || session.user()?.name || "traveller";

  const [statsResult, tripsResult] = await Promise.allSettled([api.dashboard.statistics(), api.dashboard.savedTrips()]);
  const statsTarget = document.querySelector("#stats");

  const statIcons = {
    total_trips: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`,
    favorite_trips: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    total_bookings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    total_favourites: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
  };

  if (statsResult.status === "fulfilled") {
    const data = statsResult.value?.data?.statistics || statsResult.value?.data || statsResult.value || {};
    const entries = Object.entries(data).filter(([, value]) => typeof value !== "object").slice(0, 4);
    statsTarget.innerHTML = entries.length ? entries.map(([key, value]) => `
      <article class="stat-card">
        <div class="stat-icon-wrap" aria-hidden="true">${statIcons[key] || statIcons.total_trips}</div>
        <span>${escapeHtml(key.replaceAll("_", " "))}</span>
        <b>${escapeHtml(value)}</b>
      </article>
    `).join("") : '<div class="empty">Your travel summary will appear here once you start planning.</div>';
  } else {
    statsTarget.innerHTML = '<div class="empty">Your summary is not available yet.</div>';
  }

  const tripsTarget = document.querySelector("#dashboard-trips");
  if (tripsResult.status === "fulfilled") {
    const trips = rows(tripsResult.value).slice(0, 3);
    tripsTarget.innerHTML = trips.length ? trips.map(trip => `
      <a class="dashboard-trip" href="/pages/trip-details?id=${encodeURIComponent(trip.id)}">
        <span class="trip-dot">✦</span>
        <span>
          <b>${escapeHtml(trip.destination || trip.name || "Your journey")}</b>
          <small>${escapeHtml(trip.start_date || trip.end_date || trip.style || "Open itinerary")} · $${escapeHtml(trip.estimated_expenses || trip.budget || "—")}</small>
        </span>
        <i>→</i>
      </a>
    `).join("") : `
      <div class="dashboard-empty-card">
        <div class="empty-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>
        <div>
          <p class="muted" style="margin: 0 0 4px;">No journeys yet. Your first plan starts with a destination.</p>
          <a class="text-action" href="/pages/countries.html" style="font-weight: 700;">Explore where to go →</a>
        </div>
      </div>
    `;
  } else {
    tripsTarget.innerHTML = '<p class="muted">Your trips are unavailable right now.</p>';
  }
}
