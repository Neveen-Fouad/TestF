import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("home");
const target = document.querySelector("#home-trips");
try {
  const trips = rows(await api.trips.preMade());
  target.innerHTML = trips.length ? trips.slice(0, 3).map((trip, index) => `<article class="journey-card"><div class="journey-number">0${index + 1}</div><div><p class="eyebrow">${escapeHtml(trip.destination || trip.country || "JOURNEY")}</p><h3>${escapeHtml(trip.name || trip.title || "A journey to make your own")}</h3><p>${escapeHtml(trip.description || trip.duration || "A thoughtfully paced escape, ready for your personal touch.")}</p></div><a class="text-action" href="/pages/trips.html">Browse journeys <span>→</span></a></article>`).join("") : '<div class="empty">New journeys will appear here soon.</div>';
} catch { target.innerHTML = '<div class="empty">Journeys are unavailable right now. You can still start a plan of your own.</div>'; }
