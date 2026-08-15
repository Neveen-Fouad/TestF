import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("home");
document.querySelectorAll("[data-plan-destination]").forEach(button => button.addEventListener("click", () => {
  location.assign(`/pages/planner.html?destination=${encodeURIComponent(button.dataset.planDestination)}`);
}));
const target = document.querySelector("#home-trips");
const imageMap = {
  "Istanbul, Turkey": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=600&q=80",
  "Lisbon, Portugal": "https://images.unsplash.com/photo-1585215161044-64b58479ecce?auto=format&fit=crop&w=600&q=80",
  "Barcelona, Spain": "https://images.unsplash.com/photo-1583422409516-1595177bda52?auto=format&fit=crop&w=600&q=80",
  "Athens, Greece": "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=600&q=80"
};

try {
  const trips = rows(await api.trips.preMade());
  target.innerHTML = trips.length ? trips.slice(0, 3).map((trip, index) => {
    const defaultImage = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80";
    const imageUrl = imageMap[trip.destination] || defaultImage;
    return `<article class="journey-card"><img src="${imageUrl}" alt="${escapeHtml(trip.destination)}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 12px; margin-bottom: -10px;"><div class="journey-number">0${index + 1}</div><div><p class="eyebrow">${escapeHtml(trip.destination || trip.country || "JOURNEY")}</p><h3>${escapeHtml(trip.style || trip.title || "A journey to make your own")}</h3><p>${escapeHtml(trip.number_of_days ? `${trip.number_of_days} days` : trip.description || "A thoughtfully paced escape, ready for your personal touch.")}</p></div><a class="text-action" href="/pages/trip-details?id=${trip.id}">View journey <span>→</span></a></article>`;
  }).join("") : '<div class="empty">New journeys will appear here soon.</div>';
} catch { target.innerHTML = '<div class="empty">Journeys are unavailable right now. You can still start a plan of your own.</div>'; }
