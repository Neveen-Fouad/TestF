import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation();

const target = document.querySelector("#premade-trips");
const imageMap = {
  "Istanbul, Turkey": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=600&q=80",
  "Lisbon, Portugal": "https://images.unsplash.com/photo-1585215161044-64b58479ecce?auto=format&fit=crop&w=600&q=80",
  "Barcelona, Spain": "https://images.unsplash.com/photo-1583422409516-1595177bda52?auto=format&fit=crop&w=600&q=80",
  "Athens, Greece": "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=600&q=80"
};
const defaultImage = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80";

try {
  const trips = rows(await api.trips.preMade());
  target.innerHTML = trips.length ? trips.map((trip, index) => renderTripCard(trip, index)).join("") : '<div class="empty">No premade trips are available right now.</div>';
} catch {
  target.innerHTML = '<div class="empty">Journeys are unavailable right now. Please try again shortly.</div>';
}

function renderTripCard(trip, index) {
  const id = trip.id;
  const destination = trip.destination || trip.country || "JOURNEY";
  const title = trip.style || trip.title || trip.name || "A journey to make your own";
  const description = trip.number_of_days ? `${trip.number_of_days} days` : trip.description || "A thoughtfully paced escape, ready for your personal touch.";
  const imageUrl = imageMap[trip.destination] || defaultImage;
  if (!id) return `<article class="journey-card"><img src="${imageUrl}" alt="${escapeHtml(destination)}"><div class="journey-number">${String(index + 1).padStart(2, "0")}</div><div><p class="eyebrow">${escapeHtml(destination)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div></article>`;
  return `<article class="journey-card premade-trip-card"><img src="${imageUrl}" alt="${escapeHtml(destination)}"><div class="journey-number">${String(index + 1).padStart(2, "0")}</div><div><p class="eyebrow">${escapeHtml(destination)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div><a class="text-action" href="/pages/trip-details?id=${trip.id}">View journey <span aria-hidden="true">→</span></a></article>`;
}