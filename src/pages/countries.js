import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("explore");
const form = document.querySelector("#explore-form");
const countrySelect = document.querySelector("#country-select");
const cityInput = document.querySelector("#explore-city");
const target = document.querySelector("#attractions");
const map = window.L.map("attraction-map").setView([30.0444, 31.2357], 4);
const markers = window.L.layerGroup().addTo(map);
window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);

const countryName = country => country.name || country.country || country.title || "";
const countryCode = country => country.code || country.country_code || country.iso2 || country.iso_code || "";
const cityName = city => typeof city === "string" ? city : city?.name || city?.city || city?.title || "";
const coordinates = attraction => {
  const location = attraction.location || attraction.coordinates || attraction.geometry?.location || {};
  const latitude = Number(attraction.latitude ?? attraction.lat ?? location.latitude ?? location.lat);
  const longitude = Number(attraction.longitude ?? attraction.lng ?? attraction.lon ?? location.longitude ?? location.lng ?? location.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
};
const attractionRows = payload => {
  const data = payload?.data || payload || {};
  for (const key of ["attractions", "tourist_attractions", "places", "points_of_interest", "results"]) {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Array.isArray(data) ? data : [];
};

async function loadAttractions() {
  const option = countrySelect.selectedOptions[0];
  if (!option?.value || !cityInput.value.trim()) return;
  target.innerHTML = '<div class="empty">Loading attraction locations…</div>';
  markers.clearLayers();
  try {
    const payload = await api.explore.destination(cityInput.value.trim(), option.dataset.code || "");
    const attractions = attractionRows(payload);
    const located = [];
    target.innerHTML = attractions.length ? attractions.map(attraction => {
      const name = attraction.name || attraction.title || attraction.place_name || "Attraction";
      const point = coordinates(attraction);
      if (point) {
        located.push(point);
        window.L.marker(point).bindPopup(escapeHtml(name)).addTo(markers);
      }
      return `<article class="result-card"><p class="eyebrow">ATTRACTION</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(attraction.address || attraction.vicinity || attraction.description || "")}</p></article>`;
    }).join("") : '<div class="empty">No attractions were returned for this city.</div>';
    if (located.length) map.fitBounds(located, { padding: [30, 30], maxZoom: 14 });
    else target.insertAdjacentHTML("afterbegin", '<div class="empty">The API returned no mappable attraction coordinates.</div>');
  } catch (error) { target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
}

countrySelect.addEventListener("change", async () => {
  const option = countrySelect.selectedOptions[0];
  if (!option?.value) return;
  cityInput.value = option.dataset.city || "";
  try {
    const detailPayload = await api.explore.country(option.value);
    const detail = detailPayload?.data || detailPayload || {};
    const cities = detail.cities || detail.country?.cities || [];
    cityInput.value = cityName(cities[0]) || detail.capital || detail.city || cityInput.value;
  } catch {}
  if (cityInput.value) loadAttractions();
});
form.addEventListener("submit", event => { event.preventDefault(); loadAttractions(); });

try {
  const countries = rows(await api.explore.countries());
  countrySelect.innerHTML = '<option value="">Select a country</option>' + countries.map(country => `<option value="${escapeHtml(countryName(country))}" data-code="${escapeHtml(countryCode(country))}" data-city="${escapeHtml(country.capital || cityName(country.cities?.[0]))}">${escapeHtml(countryName(country))}</option>`).join("");
  if (!countries.length) target.innerHTML = '<div class="empty">No countries are available.</div>';
} catch (error) {
  countrySelect.innerHTML = '<option value="">Countries unavailable</option>';
  target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
}
