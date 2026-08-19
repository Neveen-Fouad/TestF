import { api, rows } from "../shared/api.js";
import { escapeHtml, mountAdminSidebar, requireAdmin } from "../shared/navigation.js";

const PAGE_SIZE = 6;
const cities = ["Cairo", "Alexandria", "Istanbul", "Dubai", "Paris"];
const routes = [
  ["Cairo", "Istanbul"],
  ["Cairo", "Dubai"],
  ["Cairo", "Paris"],
  ["Cairo", "London"]
];

const categoryMeta = {
  hotels: {
    title: "Hotels",
    subtitle: "Cairo, Alexandria, Istanbul, Dubai, and Paris · next available stay"
  },
  restaurants: {
    title: "Restaurants",
    subtitle: "Cairo, Alexandria, Istanbul, Dubai, and Paris"
  },
  flights: {
    title: "Flights",
    subtitle: "Cairo to Istanbul, Dubai, Paris, and London · next available departure"
  }
};

const cache = {
  hotels: null,
  restaurants: null,
  flights: null
};

const parameters = new URLSearchParams(location.search);
let activeCategory = ["hotels", "restaurants", "flights"].includes(parameters.get("category"))
  ? parameters.get("category")
  : "hotels";
let currentPage = Math.max(1, parseInt(parameters.get("page"), 10) || 1);

if (requireAdmin()) {
  mountAdminSidebar("live-inventory");
  initCategoryTabs();
  document.querySelector("#refresh-inventory").addEventListener("click", () => {
    cache[activeCategory] = null;
    loadCategory(activeCategory, true);
  });
  loadCategory(activeCategory);
}

function initCategoryTabs() {
  document.querySelectorAll("[data-tab]").forEach(button => {
    const tab = button.dataset.tab;
    button.classList.toggle("active", tab === activeCategory);
    button.addEventListener("click", () => {
      if (activeCategory === tab) return;
      activeCategory = tab;
      currentPage = 1;
      document.querySelectorAll("[data-tab]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === activeCategory);
      });
      updateUrl();
      loadCategory(activeCategory);
    });
  });
}

function updateUrl() {
  const url = new URL(location);
  url.searchParams.set("category", activeCategory);
  if (currentPage > 1) {
    url.searchParams.set("page", currentPage);
  } else {
    url.searchParams.delete("page");
  }
  history.replaceState(null, "", url.toString());
}

async function loadCategory(category, forceRefresh = false) {
  const refreshBtn = document.querySelector("#refresh-inventory");
  const warning = document.querySelector("#inventory-warning");
  const titleEl = document.querySelector("#category-title");
  const subtitleEl = document.querySelector("#category-subtitle");
  const countEl = document.querySelector("#inventory-count");
  const target = document.querySelector("#inventory-results");
  const paginationEl = document.querySelector("#pagination-controls");

  titleEl.textContent = categoryMeta[category].title;
  subtitleEl.textContent = categoryMeta[category].subtitle;
  warning.hidden = true;
  paginationEl.innerHTML = "";

  if (cache[category] && !forceRefresh) {
    renderPage(cache[category]);
    return;
  }

  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading…";
  target.innerHTML = `<div class="empty">Loading live ${category}…</div>`;
  countEl.textContent = "…";

  try {
    let items = [];
    if (category === "hotels") {
      items = await fetchHotels();
    } else if (category === "restaurants") {
      items = await fetchRestaurants();
    } else if (category === "flights") {
      items = await fetchFlights();
    }

    cache[category] = items;
    renderPage(items);
  } catch (error) {
    target.innerHTML = `<div class="empty is-error">${escapeHtml(error.message || `Failed to load ${category}.`)}</div>`;
    countEl.textContent = "0";
    warning.textContent = `${categoryMeta[category].title} provider could not be reached right now.`;
    warning.hidden = false;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh category";
  }
}

function renderPage(items) {
  const countEl = document.querySelector("#inventory-count");
  const target = document.querySelector("#inventory-results");
  const paginationEl = document.querySelector("#pagination-controls");

  countEl.textContent = String(items.length);

  if (!items.length) {
    target.innerHTML = `<div class="empty">No live ${activeCategory} returned by the external provider.</div>`;
    paginationEl.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(startIndex, startIndex + PAGE_SIZE);

  if (activeCategory === "hotels") {
    target.innerHTML = pageItems.map((hotel, index) => renderHotelCard(hotel, startIndex + index)).join("");
  } else if (activeCategory === "restaurants") {
    target.innerHTML = pageItems.map(restaurant => renderRestaurantCard(restaurant)).join("");
  } else if (activeCategory === "flights") {
    target.innerHTML = pageItems.map((flight, index) => renderFlightCard(flight, startIndex + index)).join("");
  }

  // Render pagination
  if (totalPages > 1) {
    paginationEl.innerHTML = `
      <button class="button subtle" type="button" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>← Previous</button>
      <span>Page ${currentPage} of ${totalPages} (${items.length} items)</span>
      <button class="button subtle" type="button" data-page="next" ${currentPage >= totalPages ? "disabled" : ""}>Next →</button>
    `;
    paginationEl.querySelectorAll("[data-page]").forEach(btn => {
      btn.addEventListener("click", () => {
        currentPage += btn.dataset.page === "prev" ? -1 : 1;
        updateUrl();
        renderPage(items);
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  } else {
    paginationEl.innerHTML = "";
  }
}

function renderHotelCard(hotel, index) {
  const name = hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
  const id = hotel.id || hotel.hotel_id || hotel.property?.id || index;
  const price = (typeof hotel.price === "object" ? hotel.price?.priceSummary?.definition?.displayPrice : hotel.price) || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "Price on request";
  const rating = hotel.guestRating?.rating || hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—";
  const address = hotel.address || hotel.property?.address || hotel.inventoryCity || "";
  return `<article class="result-card">
    <p class="eyebrow">${escapeHtml(hotel.inventoryCity || "DESTINATION")} · LIVE HOTEL</p>
    <h3>${escapeHtml(name)}</h3>
    <p>${escapeHtml(address)}</p>
    <p style="color: var(--primary); font-weight: 700;">★ ${escapeHtml(String(rating))} · <span style="color: var(--navy); font-weight: 600;">${escapeHtml(price)}</span></p>
    <a class="button subtle" href="/pages/hotel-details.html?id=${encodeURIComponent(id)}">View details</a>
  </article>`;
}

function renderRestaurantCard(restaurant) {
  const name = restaurant.name || restaurant.title || "Restaurant";
  const id = restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId;
  return `<article class="result-card">
    <p class="eyebrow">${escapeHtml(restaurant.inventoryCity || "DESTINATION")} · LIVE RESTAURANT</p>
    <h3>${escapeHtml(name)}</h3>
    <p>${escapeHtml(restaurant.address || restaurant.location?.name || restaurant.location || restaurant.inventoryCity)}</p>
    <p style="color: var(--primary); font-weight: 700;">★ ${escapeHtml(String(restaurant.rating || restaurant.averageRating || "—"))}${restaurant.cuisine ? ` · <span style="color: var(--muted); font-weight: 400;">${escapeHtml(restaurant.cuisine)}</span>` : ""}</p>
    ${id ? `<a class="button subtle" href="/pages/restaurant-details.html?id=${encodeURIComponent(id)}">View details</a>` : ""}
  </article>`;
}

function renderFlightCard(flight, index) {
  const leg = flight.legs?.[0] || flight;
  const carrier = leg.carriers?.marketing?.[0]?.name || leg.carriers?.[0]?.name || flight.airline || flight.name || "Flight option";
  const route = flight.legs?.map(part => `${part.origin?.displayCode || part.origin?.name || ""} → ${part.destination?.displayCode || part.destination?.name || ""}`).join(" · ") || flight.inventoryRoute;
  const price = flight.price?.formatted || flight.price?.amount || flight.price?.raw || flight.price || "Price on request";
  const id = String(flight.id || index);
  return `<article class="result-card">
    <p class="eyebrow">${escapeHtml(flight.inventoryRoute || "ROUTE")} · LIVE FLIGHT</p>
    <h3>${escapeHtml(carrier)}</h3>
    <p>${escapeHtml(route)}</p>
    <p style="font-weight: 700; color: var(--navy);">${escapeHtml(price)}</p>
    <span class="button subtle" aria-label="External flight ${escapeHtml(id)}">Available</span>
  </article>`;
}

async function fetchHotels() {
  const { checkIn, checkOut } = inventoryDates();
  const searches = await Promise.allSettled(cities.map(city => api.hotels.search({
    destination: city,
    check_in: checkIn,
    check_out: checkOut,
    guests: 2,
    budget: 10000,
    sort_by: "review"
  })));
  return unique(searches.flatMap((result, index) => result.status === "fulfilled"
    ? rows(result.value).map(hotel => ({ ...hotel, inventoryCity: cities[index] }))
    : []), hotel => hotel.id || hotel.hotel_id || hotel.property?.id || `${hotel.inventoryCity}:${hotel.name || hotel.hotel_name}`);
}

async function fetchRestaurants() {
  const searches = await Promise.allSettled(cities.map(city => api.restaurants.list(city, 1, "")));
  return unique(searches.flatMap((result, index) => result.status === "fulfilled"
    ? rows(result.value).map(item => ({ ...(item.restaurant || item), inventoryCity: cities[index] }))
    : []), restaurant => restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId || `${restaurant.inventoryCity}:${restaurant.name}`);
}

async function fetchFlights() {
  const airportNames = [...new Set(routes.flat())];
  const airportResults = await Promise.allSettled(airportNames.map(resolveAirport));
  const airports = new Map();
  airportResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) airports.set(airportNames[index], result.value);
  });
  const date = inventoryDates().flightDate;
  const validRoutes = routes.filter(([origin, destination]) => airports.has(origin) && airports.has(destination));
  const searches = await Promise.allSettled(validRoutes.map(([origin, destination]) => {
    const from = airports.get(origin);
    const to = airports.get(destination);
    return api.flights.search({
      originSkyId: from.skyId,
      destinationSkyId: to.skyId,
      originEntityId: from.entityId,
      destinationEntityId: to.entityId,
      date,
      adults: 1,
      cabinClass: "economy",
      sortBy: "best",
      currency: "USD"
    });
  }));
  return unique(searches.flatMap((result, index) => result.status === "fulfilled"
    ? rows(result.value).map(flight => ({ ...flight, inventoryRoute: validRoutes[index].join(" → ") }))
    : []), flight => flight.id || `${flight.inventoryRoute}:${flight.departure}:${flight.price?.amount || flight.price}`);
}

async function resolveAirport(query) {
  const airport = rows(await api.flights.airports(query))[0];
  if (!airport) return null;
  const skyId = airport.skyId || airport.sky_id || airport.navigation?.relevantFlightParams?.skyId;
  const entityId = airport.entityId || airport.entity_id || airport.navigation?.entityId || airport.navigation?.relevantFlightParams?.entityId;
  return skyId && entityId ? { skyId, entityId } : null;
}

function inventoryDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  const flight = new Date();
  flight.setDate(flight.getDate() + 7);
  const format = date => date.toISOString().slice(0, 10);
  return { checkIn: format(checkIn), checkOut: format(checkOut), flightDate: format(flight) };
}

function unique(items, key) {
  const seen = new Set();
  return items.filter(item => {
    const value = String(key(item) ?? "");
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
