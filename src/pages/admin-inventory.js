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
  const media = hotel.mediaSection?.media || hotel.images || [];
  const image = media[0]?.url || hotel.propertyImage?.image?.url || hotel.image || hotel.thumbnail || "";
  const priceObj = typeof hotel.price === "object" ? hotel.price : null;
  const price = priceObj?.priceSummary?.definition?.displayPrice ||
    priceObj?.priceSummary?.displayPrices?.find(p => p.role === "LEAD")?.price?.formatted ||
    (typeof hotel.price === "string" ? hotel.price : null) ||
    hotel.price_per_night ||
    hotel.priceBreakdown?.grossPrice?.value ||
    "Price on request";
  const strikeOut = priceObj?.priceSummary?.definition?.strikeOut || "";
  const rating = hotel.guestRating?.rating || hotel.rating || hotel.review_score || hotel.property?.reviewScore || null;
  const address = hotel.address || hotel.property?.address || hotel.inventoryCity || "";
  const starRating = hotel.star_rating || hotel.starRating || null;
  const discountBadge = hotel.badge || hotel.discountBadge || (strikeOut ? "Special rate" : "");

  return `<article class="result-card hotel-card">
    ${image ? `<div class="hotel-image-wrap">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">
      ${discountBadge ? `<span class="hotel-discount-badge">${escapeHtml(discountBadge)}</span>` : ""}
      ${starRating ? `<span class="hotel-star-badge">${escapeHtml(String(starRating))}★</span>` : ""}
    </div>` : ""}
    <div class="hotel-content">
      <div class="hotel-eyebrow-row">
        <span class="eyebrow">${escapeHtml(hotel.inventoryCity || "DESTINATION")} · LIVE HOTEL</span>
        ${rating ? `<span class="hotel-rating-pill">★ ${escapeHtml(String(rating))}</span>` : ""}
      </div>
      <h3 class="hotel-name">${escapeHtml(name)}</h3>
      ${address ? `<p class="hotel-room-info">${escapeHtml(address)}</p>` : ""}
      <div class="hotel-price-row">
        <div class="hotel-price-wrap">
          ${strikeOut ? `<span class="hotel-strike-price">${escapeHtml(strikeOut)}</span>` : ""}
          <b class="hotel-lead-price">${escapeHtml(price)}</b>
          <span class="hotel-nightly-rate">/ night</span>
        </div>
      </div>
      <div class="hotel-actions">
        <a class="button subtle" href="/pages/hotel-details.html?id=${encodeURIComponent(id)}">View details</a>
      </div>
    </div>
  </article>`;
}

function extractAddress(restaurant) {
  const addr = restaurant.address;
  if (!addr) {
    if (restaurant.parent_location) {
      return typeof restaurant.parent_location === "object" ? (restaurant.parent_location.name || "") : String(restaurant.parent_location);
    }
    return typeof restaurant.location === "object" ? (restaurant.location.name || "") : String(restaurant.location || "");
  }
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    if (addr.address) return addr.address;
    const parts = [addr.street || addr.street1, addr.city, addr.country].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return addr.name || addr.country || "";
  }
  return "";
}

function extractCuisines(restaurant) {
  if (Array.isArray(restaurant.cuisines) && restaurant.cuisines.length) {
    return restaurant.cuisines.map(c => typeof c === "object" ? (c.name || c.tag_name || "") : String(c)).filter(Boolean).join(" · ");
  }
  if (typeof restaurant.cuisine === "string" && restaurant.cuisine.trim()) return restaurant.cuisine.trim();
  if (Array.isArray(restaurant.establishment_types) && restaurant.establishment_types.length) {
    return restaurant.establishment_types.map(t => typeof t === "object" ? (t.name || "") : String(t)).filter(Boolean).join(" · ");
  }
  return "";
}

function extractAward(award) {
  if (!award) return "";
  if (typeof award === "string") return award;
  if (typeof award === "object") {
    return `${award.award_name || "Award"} ${award.year || ""}`.trim();
  }
  return "";
}

function extractPrice(restaurant) {
  const candidates = [
    restaurant.price_range,
    restaurant.price,
    restaurant.price_tag,
    restaurant.prices,
    restaurant.price_level
  ];

  for (const val of candidates) {
    if (!val || (typeof val !== "string" && typeof val !== "number")) continue;
    const str = String(val).trim();
    if (!str) continue;

    // Only return if it contains actual numeric price info (e.g. "$15 - $40", "150 EGP", "£25")
    if (/\d/.test(str)) {
      return str;
    }
  }

  // Omit generic symbols like "$$ - $$$" when no actual price is available
  return "";
}

function renderRestaurantCard(restaurant) {
  const name = restaurant.name || restaurant.title || "Restaurant";
  const id = restaurant.tripadvisor_entity_id || restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId;
  const address = extractAddress(restaurant);
  const cuisines = extractCuisines(restaurant);
  const rating = restaurant.rating || restaurant.averageRating || restaurant.score || null;
  const reviewCount = restaurant.reviews || restaurant.review_count || restaurant.num_reviews || null;
  const priceRange = extractPrice(restaurant);
  const image = restaurant.featured_image || restaurant.photo?.images?.large?.url || restaurant.photo?.images?.medium?.url || restaurant.image || "";
  const statusText = restaurant.status_text || (restaurant.is_open_now === true ? "Open now" : restaurant.is_open_now === false ? "Closed" : "");
  const isOpen = restaurant.is_open_now ?? (statusText ? statusText.toLowerCase().includes("open") : null);
  const phone = restaurant.phone || restaurant.telephone || "";
  const menuLink = restaurant.menu_link || "";
  const tripadvisorLink = restaurant.link || restaurant.web_url || "";
  const award = extractAward(restaurant.award);
  const snippet = restaurant.review_snippets?.[0]?.snippet_text?.replaceAll("\ufff9", "")?.replaceAll("\ufffb", "") || "";

  return `
    <article class="result-card restaurant-card">
      ${image ? `
        <div class="restaurant-image-wrap">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">
          ${award ? `<span class="restaurant-award-badge">🏆 ${escapeHtml(award)}</span>` : ""}
        </div>
      ` : ""}
      <div class="restaurant-content">
        <div class="restaurant-eyebrow-row">
          <span class="eyebrow">${escapeHtml(restaurant.inventoryCity || "RESTAURANT")} · LIVE RESTAURANT</span>
          ${statusText ? `<span class="status-pill ${isOpen ? "is-open" : "is-closed"}">${escapeHtml(statusText)}</span>` : ""}
        </div>
        <h3 class="restaurant-name">${escapeHtml(name)}</h3>
        ${address ? `<p class="restaurant-address">${escapeHtml(address)}</p>` : ""}
        <div class="restaurant-meta-row">
          ${rating ? `<span class="restaurant-rating">★ ${escapeHtml(String(rating))}</span>` : ""}
          ${reviewCount ? `<span class="restaurant-reviews">(${escapeHtml(String(reviewCount))} reviews)</span>` : ""}
          ${priceRange ? `<span class="restaurant-price">· ${escapeHtml(priceRange)}</span>` : ""}
        </div>
        ${cuisines ? `<p class="restaurant-cuisines">🍽️ ${escapeHtml(cuisines)}</p>` : ""}
        ${phone ? `<p class="restaurant-phone">📞 ${escapeHtml(phone)}</p>` : ""}
        ${snippet ? `<blockquote class="restaurant-snippet">“${escapeHtml(snippet)}”</blockquote>` : ""}
        <div class="restaurant-actions">
          ${menuLink ? `<a class="button subtle" href="${escapeHtml(menuLink)}" target="_blank" rel="noopener noreferrer">Menu ↗</a>` : ""}
          ${tripadvisorLink ? `<a class="button subtle" href="${escapeHtml(tripadvisorLink)}" target="_blank" rel="noopener noreferrer">Tripadvisor ↗</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function formatFlightTime(dateString) {
  if (!dateString) return "--:--";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString.includes("T") ? dateString.split("T")[1].slice(0, 5) : dateString;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return dateString;
  }
}

function renderFlightCard(flight, index) {
  const leg = flight.legs?.[0] || flight;
  const lastLeg = flight.legs?.at(-1) || leg;
  const carrierObj = leg.carriers?.[0] || leg.carriers?.marketing?.[0] || {};
  const carrier = carrierObj.name || flight.airline || flight.name || "Flight option";
  const carrierLogo = carrierObj.logoUrl || "";
  const origin = leg.origin?.displayCode || leg.origin?.name || flight.inventoryRoute?.split(" → ")[0] || "DEP";
  const destination = lastLeg.destination?.displayCode || lastLeg.destination?.name || flight.inventoryRoute?.split(" → ")[1] || "ARR";
  const depTime = formatFlightTime(flight.departure || leg.departure);
  const arrTime = formatFlightTime(flight.arrival || lastLeg.arrival);
  const price = flight.price?.formatted || (flight.price?.amount ? `$${flight.price.amount}` : "Price on request");
  const id = String(flight.id || index);

  return `<article class="result-card flight-card">
    <div class="flight-header">
      <div class="flight-carrier-info">
        ${carrierLogo ? `<img class="flight-carrier-logo" src="${escapeHtml(carrierLogo)}" alt="${escapeHtml(carrier)}" loading="lazy">` : `<span class="flight-carrier-icon">✈️</span>`}
        <div>
          <h3 class="flight-carrier-name">${escapeHtml(carrier)}</h3>
          <span class="flight-number">${escapeHtml(origin)} → ${escapeHtml(destination)}</span>
        </div>
      </div>
    </div>
    <div class="flight-route-visual" style="margin: 12px 0 10px;">
      <div class="flight-time-point">
        <b class="flight-time">${escapeHtml(depTime)}</b>
        <span class="flight-airport-code">${escapeHtml(origin)}</span>
      </div>
      <div class="flight-path-divider">
        <div class="flight-path-line is-direct">
          <span class="path-dot start"></span>
          <span class="path-plane">✈</span>
          <span class="path-dot end"></span>
        </div>
      </div>
      <div class="flight-time-point text-right">
        <b class="flight-time">${escapeHtml(arrTime)}</b>
        <span class="flight-airport-code">${escapeHtml(destination)}</span>
      </div>
    </div>
    <div class="flight-footer">
      <div class="flight-price-wrap">
        <span class="flight-price-label">Fare</span>
        <b class="flight-price-amount">${escapeHtml(price)}</b>
      </div>
      <div class="flight-actions">
        <a class="button subtle" href="/pages/flight-details.html?id=${encodeURIComponent(id)}">View details</a>
      </div>
    </div>
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
