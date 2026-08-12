import { api } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("explore");

const form = document.querySelector("#explore-form");
const mapDiv = document.querySelector("#map");
const attractionsList = document.querySelector("#attractions");
const statusEl = document.querySelector("#explore-status");

let leafletMap = null;

form.addEventListener("submit", async event => {
  event.preventDefault();
  const city = new FormData(form).get("city")?.trim();
  if (!city) return;

  statusEl.textContent = `Loading attractions for ${city}…`;
  mapDiv.style.display = "none";
  attractionsList.innerHTML = "";

  try {
    // GET /destination-data?city=... returns { weather, attractions: [...] }
    const response = await api.explore.destination(city);
    const attractions = response?.attractions || [];

    if (!attractions.length) {
      statusEl.textContent = "No attractions found for this destination.";
      return;
    }

    statusEl.textContent = `Showing ${attractions.length} attraction(s) in ${city}.`;

    // Find a valid coordinate to center the map
    const first = attractions.find(a => a.latitude != null && a.longitude != null) || attractions[0];
    const centerLat = first?.latitude || first?.lat || 30;
    const centerLng = first?.longitude || first?.lng || 31;

    mapDiv.style.display = "block";

    // Init or reset Leaflet map
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
    leafletMap = L.map("map").setView([centerLat, centerLng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(leafletMap);

    // Add marker for each attraction
    attractions.forEach(attraction => {
      const lat = attraction.latitude || attraction.lat;
      const lng = attraction.longitude || attraction.lng;
      if (lat == null || lng == null) return;
      const name = attraction.name || "Attraction";
      const rating = attraction.rating ? `★ ${attraction.rating}` : "";
      L.marker([lat, lng])
        .addTo(leafletMap)
        .bindPopup(`<strong>${name}</strong>${rating ? `<br>${rating}` : ""}${attraction.description ? `<br><small>${String(attraction.description).slice(0, 100)}</small>` : ""}`);
    });

    // Render list below map
    attractionsList.innerHTML = attractions.map(attraction => {
      const name = attraction.name || "Attraction";
      const rating = attraction.rating || "—";
      const desc = attraction.description ? String(attraction.description).slice(0, 140) : "";
      return `<article class="result-card">
        <p class="eyebrow">ATTRACTION</p>
        <h3>${escapeHtml(name)}</h3>
        <p>★ ${escapeHtml(String(rating))}</p>
        ${desc ? `<p>${escapeHtml(desc)}…</p>` : ""}
      </article>`;
    }).join("");

  } catch (error) {
    statusEl.textContent = error.message;
    mapDiv.style.display = "none";
    attractionsList.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
});
