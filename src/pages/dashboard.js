import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("dashboard");
  document.querySelector("#member-name").textContent = session.user()?.first_name || session.user()?.name || "traveller";
  const [statsResult, tripsResult] = await Promise.allSettled([api.dashboard.statistics(), api.dashboard.savedTrips()]);
  const statsTarget = document.querySelector("#stats");
  if (statsResult.status === "fulfilled") {
    const data = statsResult.value?.data?.statistics || statsResult.value?.data || statsResult.value || {};
    const entries = Object.entries(data).filter(([, value]) => typeof value !== "object").slice(0, 4);
    statsTarget.innerHTML = entries.length ? entries.map(([label, value]) => `<article class="stat-card"><span>${escapeHtml(label.replaceAll("_", " "))}</span><b>${escapeHtml(value)}</b></article>`).join("") : '<div class="empty">Your travel summary will appear here once you start planning.</div>';
  } else statsTarget.innerHTML = '<div class="empty">Your summary is not available yet.</div>';
  const tripsTarget = document.querySelector("#dashboard-trips");
  if (tripsResult.status === "fulfilled") {
    const trips = rows(tripsResult.value).slice(0, 3);
    tripsTarget.innerHTML = trips.length ? trips.map(trip => `<a class="dashboard-trip" href="/pages/trip-details?id=${encodeURIComponent(trip.id)}"><span class="trip-dot">✦</span><span><b>${escapeHtml(trip.destination || trip.name || "Your journey")}</b><small>${escapeHtml(trip.start_date || trip.end_date || trip.style || "Open itinerary")} · $${escapeHtml(trip.estimated_expenses || trip.budget || "—")}</small></span><i>→</i></a>`).join("") : '<p class="muted">No journeys yet. Your first plan starts with a destination.</p>';
  } else tripsTarget.innerHTML = '<p class="muted">Your trips are unavailable right now.</p>';
}
