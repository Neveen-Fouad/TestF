import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("explore");
const form = document.querySelector("#explore-form");
const countrySelect = document.querySelector("#country-select");
const cityInput = document.querySelector("#explore-city");
const target = document.querySelector("#attractions");
const weatherPanel = document.querySelector("#weather");
document.querySelector("#attraction-map").setAttribute("role", "region");
const map = window.L.map("attraction-map").setView([30.0444, 31.2357], 4);
const markers = window.L.layerGroup().addTo(map);
window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

const PAGE_SIZE = 10;
let attractions = [];
let mappedCount = 0;
let currentPage = 1;

const countryName = (country) =>
  country.name || country.country || country.title || "";
const countryCode = (country) =>
  country.code2 ||
  country.code ||
  country.country_code ||
  country.iso2 ||
  country.iso_code ||
  "";
const cityName = (city) =>
  typeof city === "string"
    ? city
    : city?.name || city?.city || city?.title || "";
const coordinates = (attraction) => {
  const location =
    attraction.location ||
    attraction.coordinates ||
    attraction.geometry?.location ||
    {};
  const rawLatitude =
    attraction.latitude ?? attraction.lat ?? location.latitude ?? location.lat;
  const rawLongitude =
    attraction.longitude ??
    attraction.lng ??
    attraction.lon ??
    location.longitude ??
    location.lng ??
    location.lon;
  if (
    rawLatitude == null ||
    rawLongitude == null ||
    rawLatitude === "" ||
    rawLongitude === ""
  )
    return null;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null;
};
const attractionRows = (payload) => {
  const data = payload?.data || payload || {};
  for (const key of [
    "attractions",
    "tourist_attractions",
    "places",
    "points_of_interest",
    "results",
  ]) {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Array.isArray(data) ? data : [];
};

function renderWeather(weather) {
  const current = weather?.current;
  if (!weatherPanel || !current) {
    if (weatherPanel) weatherPanel.hidden = true;
    return;
  }
  const condition = current.condition?.text || "";
  const icon = current.condition?.icon;
  weatherPanel.hidden = false;
  weatherPanel.innerHTML = `
    <div class="weather-now">
      <div>
        <p class="eyebrow">WEATHER</p>
        <h2>${escapeHtml(weather.location?.name || cityInput.value.trim())}${weather.location?.country ? `, ${escapeHtml(weather.location.country)}` : ""}</h2>
      </div>
      <div class="weather-current">
        ${icon ? `<img src="${icon.startsWith("//") ? "https:" + icon : icon}" alt="" width="48" height="48">` : ""}
        <strong>${escapeHtml(current.temp_c)}°C</strong>
        <span>${escapeHtml(condition)}</span>
      </div>
    </div>
    <div class="weather-meta">
      <span>Feels like ${escapeHtml(current.feelslike_c)}°C</span>
      <span>Humidity ${escapeHtml(current.humidity)}%</span>
      <span>Wind ${escapeHtml(current.wind_kph)} km/h</span>
      ${current.last_updated ? `<span>Updated ${escapeHtml(current.last_updated)}</span>` : ""}
    </div>`;
}

function renderMarkers(items) {
  markers.clearLayers();
  mappedCount = 0;
  const located = [];
  items.forEach((attraction) => {
    const point = coordinates(attraction);
    if (!point) return;
    mappedCount += 1;
    located.push(point);
    const name =
      attraction.name ||
      attraction.title ||
      attraction.place_name ||
      "Attraction";
    window.L.marker(point)
      .bindPopup(
        `<strong>${escapeHtml(name)}</strong>${attraction.rating ? `<br>Rating: ${escapeHtml(attraction.rating)}` : ""}`,
      )
      .addTo(markers);
  });
  if (located.length)
    map.fitBounds(located, { padding: [30, 30], maxZoom: 14 });
}

function renderAttractionList() {
  const total = attractions.length;
  if (!total) {
    target.innerHTML =
      '<div class="empty">No attractions were returned for this city.</div>';
    return;
  }
  const pages = Math.ceil(total / PAGE_SIZE);
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = attractions.slice(start, start + PAGE_SIZE);
  const cards = slice
    .map((attraction) => {
      const name =
        attraction.name ||
        attraction.title ||
        attraction.place_name ||
        "Attraction";
      return `<article class="result-card"><p class="eyebrow">ATTRACTION</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(attraction.address || attraction.vicinity || attraction.description || "")}</p></article>`;
    })
    .join("");
  const noCoordsNote =
    mappedCount === 0
      ? '<div class="empty">The API returned no mappable attraction coordinates.</div>'
      : "";
  const pagination =
    total > PAGE_SIZE
      ? `<div class="pagination">
        <button class="button subtle" type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>← Previous</button>
        <span>Page ${currentPage} of ${pages} · ${total} attractions</span>
        <button class="button subtle" type="button" data-page="next" ${currentPage === pages ? "disabled" : ""}>Next →</button>
      </div>`
      : "";
  target.innerHTML = noCoordsNote + cards + pagination;
  target.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage += button.dataset.page === "prev" ? -1 : 1;
      renderAttractionList();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

async function loadAttractions() {
  const option = countrySelect.selectedOptions[0];
  if (!option?.value || !cityInput.value.trim()) return;
  target.innerHTML =
    '<div class="empty is-loading">Loading attraction locations…</div>';
  markers.clearLayers();
  currentPage = 1;
  try {
    const payload = await api.explore.destination(
      cityInput.value.trim(),
      option.dataset.code || "",
    );
    renderWeather(payload?.weather);
    attractions = attractionRows(payload);
    renderMarkers(attractions);
    renderAttractionList();
  } catch (error) {
    renderWeather(null);
    target.innerHTML = `<div class="empty is-error">${escapeHtml(error.message)}</div>`;
  }
}

countrySelect.addEventListener("change", async () => {
  const option = countrySelect.selectedOptions[0];
  if (!option?.value) return;
  cityInput.value = option.dataset.city || "";
  try {
    const detailPayload = await api.explore.country(option.value);
    const detail = detailPayload?.data || detailPayload || {};
    const cities = detail.cities || detail.country?.cities || [];
    cityInput.value =
      cityName(cities[0]) || detail.capital || detail.city || cityInput.value;
  } catch {}
  if (cityInput.value) loadAttractions();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAttractions();
});

try {
  const payload = await api.explore.countries();
  const countries =
    payload?.countries || payload?.data?.countries || rows(payload);
  countrySelect.innerHTML =
    '<option value="">Select a country</option>' +
    countries
      .map(
        (country) =>
          `<option value="${escapeHtml(countryName(country))}" data-code="${escapeHtml(countryCode(country))}" data-city="${escapeHtml(country.capital || cityName(country.cities?.[0]))}">${escapeHtml(countryName(country))}</option>`,
      )
      .join("");
  if (!countries.length)
    target.innerHTML = '<div class="empty">No countries are available.</div>';
} catch (error) {
  countrySelect.innerHTML = '<option value="">Countries unavailable</option>';
  target.innerHTML = `<div class="empty is-error">${escapeHtml(error.message)}</div>`;
}
