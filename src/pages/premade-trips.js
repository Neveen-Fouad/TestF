import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation();

const target = document.querySelector("#premade-trips");

const cityImages = {
  "cairo": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=800&q=80",
  "egypt": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=800&q=80",
  "giza": "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80",
  "alexandria": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=800&q=80",
  "luxor": "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80",
  "aswan": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80",
  "tokyo": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
  "japan": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
  "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
  "france": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
  "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
  "italy": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
  "istanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
  "turkey": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
  "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
  "uae": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
  "barcelona": "https://images.unsplash.com/photo-1583422409516-1595177bda52?auto=format&fit=crop&w=800&q=80",
  "spain": "https://images.unsplash.com/photo-1583422409516-1595177bda52?auto=format&fit=crop&w=800&q=80",
  "athens": "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=800&q=80",
  "greece": "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=800&q=80",
  "lisbon": "https://images.unsplash.com/photo-1585215161044-64b58479ecce?auto=format&fit=crop&w=800&q=80",
  "portugal": "https://images.unsplash.com/photo-1585215161044-64b58479ecce?auto=format&fit=crop&w=800&q=80",
  "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
  "uk": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80"
};

function getTripImage(destination) {
  if (!destination) return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
  const lower = String(destination).toLowerCase();
  for (const [key, url] of Object.entries(cityImages)) {
    if (lower.includes(key)) return url;
  }
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
}

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
  const imageUrl = getTripImage(destination);
  if (!id) return `<article class="journey-card"><img src="${imageUrl}" alt="${escapeHtml(destination)}"><div class="journey-number">${String(index + 1).padStart(2, "0")}</div><div><p class="eyebrow">${escapeHtml(destination)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div></article>`;
  return `<article class="journey-card premade-trip-card"><img src="${imageUrl}" alt="${escapeHtml(destination)}"><div class="journey-number">${String(index + 1).padStart(2, "0")}</div><div><p class="eyebrow">${escapeHtml(destination)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div><a class="text-action" href="/pages/trip-details?id=${trip.id}">View journey <span aria-hidden="true">→</span></a></article>`;
}