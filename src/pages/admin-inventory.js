import { api, rows } from "../shared/api.js";
import { escapeHtml, mountAdminSidebar, requireAdmin } from "../shared/navigation.js";

const cities = ["Cairo", "Alexandria", "Istanbul", "Dubai", "Paris"];
const routes = [
  ["Cairo", "Istanbul"],
  ["Cairo", "Dubai"],
  ["Cairo", "Paris"],
  ["Cairo", "London"]
];

if (requireAdmin()) {
  mountAdminSidebar("live-inventory");
  document.querySelector("#refresh-inventory").addEventListener("click", loadInventory);
  loadInventory();
}

async function loadInventory() {
  const button = document.querySelector("#refresh-inventory");
  const warning = document.querySelector("#inventory-warning");
  button.disabled = true;
  button.textContent = "Refreshing…";
  warning.hidden = true;
  setLoading("hotels", "hotels");
  setLoading("restaurants", "restaurants");
  setLoading("flights", "flights");

  const results = await Promise.allSettled([loadHotels(), loadRestaurants(), loadFlights()]);
  const failed = ["Hotels", "Restaurants", "Flights"].filter((_, index) => results[index].status === "rejected");
  if (failed.length) {
    warning.textContent = `${failed.join(", ")} could not be fully loaded. The other live provider results are still available.`;
    warning.hidden = false;
  }
  button.disabled = false;
  button.textContent = "Refresh all";
}

async function loadHotels() {
  const target = document.querySelector("#admin-hotels");
  const { checkIn, checkOut } = inventoryDates();
  const searches = await Promise.allSettled(cities.map(city => api.hotels.search({
    destination: city,
    check_in: checkIn,
    check_out: checkOut,
    guests: 2,
    budget: 10000,
    sort_by: "review"
  })));
  const failures = searches.filter(result => result.status === "rejected");
  const hotels = unique(searches.flatMap((result, index) => result.status === "fulfilled"
    ? rows(result.value).map(hotel => ({ ...hotel, inventoryCity: cities[index] }))
    : []), hotel => hotel.id || hotel.hotel_id || hotel.property?.id || `${hotel.inventoryCity}:${hotel.name || hotel.hotel_name}`);

  document.querySelector("#hotel-count").textContent = String(hotels.length);
  target.innerHTML = hotels.length ? hotels.map((hotel, index) => {
    const name = hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
    const id = hotel.id || hotel.hotel_id || hotel.property?.id || index;
    const price = (typeof hotel.price === "object" ? hotel.price?.priceSummary?.definition?.displayPrice : hotel.price) || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "Price on request";
    const rating = hotel.guestRating?.rating || hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—";
    const address = hotel.address || hotel.property?.address || hotel.inventoryCity || "";
    return `<article class="result-card"><p class="eyebrow">${escapeHtml(hotel.inventoryCity)} · LIVE HOTEL</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(address)}</p><p>★ ${escapeHtml(rating)} · ${escapeHtml(price)}</p><a class="button subtle" href="/pages/hotel-details.html?id=${encodeURIComponent(id)}">View details</a></article>`;
  }).join("") : emptyProvider("hotels", failures);
  if (failures.length && hotels.length) appendPartial(target, failures.length, cities.length);
  if (!hotels.length && failures.length === searches.length) throw new Error("Hotel provider unavailable");
}

async function loadRestaurants() {
  const target = document.querySelector("#admin-restaurants");
  const searches = await Promise.allSettled(cities.map(city => api.restaurants.list(city, 1, "")));
  const failures = searches.filter(result => result.status === "rejected");
  const restaurants = unique(searches.flatMap((result, index) => result.status === "fulfilled"
    ? rows(result.value).map(item => ({ ...(item.restaurant || item), inventoryCity: cities[index] }))
    : []), restaurant => restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId || `${restaurant.inventoryCity}:${restaurant.name}`);

  document.querySelector("#restaurant-count").textContent = String(restaurants.length);
  target.innerHTML = restaurants.length ? restaurants.map(restaurant => {
    const name = restaurant.name || restaurant.title || "Restaurant";
    const id = restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId;
    return `<article class="result-card"><p class="eyebrow">${escapeHtml(restaurant.inventoryCity)} · LIVE RESTAURANT</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(restaurant.address || restaurant.location?.name || restaurant.location || restaurant.inventoryCity)}</p><p>★ ${escapeHtml(restaurant.rating || restaurant.averageRating || "—")}${restaurant.cuisine ? ` · ${escapeHtml(restaurant.cuisine)}` : ""}</p>${id ? `<a class="button subtle" href="/pages/restaurant-details.html?id=${encodeURIComponent(id)}">View details</a>` : ""}</article>`;
  }).join("") : emptyProvider("restaurants", failures);
  if (failures.length && restaurants.length) appendPartial(target, failures.length, cities.length);
  if (!restaurants.length && failures.length === searches.length) throw new Error("Restaurant provider unavailable");
}

async function loadFlights() {
  const target = document.querySelector("#admin-flights");
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
  const failures = searches.filter(result => result.status === "rejected");
  const flights = unique(searches.flatMap((result, index) => result.status === "fulfilled"
    ? rows(result.value).map(flight => ({ ...flight, inventoryRoute: validRoutes[index].join(" → ") }))
    : []), flight => flight.id || `${flight.inventoryRoute}:${flight.departure}:${flight.price?.amount || flight.price}`);

  document.querySelector("#flight-count").textContent = String(flights.length);
  target.innerHTML = flights.length ? flights.map((flight, index) => {
    const leg = flight.legs?.[0] || flight;
    const carrier = leg.carriers?.marketing?.[0]?.name || leg.carriers?.[0]?.name || flight.airline || flight.name || "Flight option";
    const route = flight.legs?.map(part => `${part.origin?.displayCode || part.origin?.name || ""} → ${part.destination?.displayCode || part.destination?.name || ""}`).join(" · ") || flight.inventoryRoute;
    const price = flight.price?.formatted || flight.price?.amount || flight.price?.raw || flight.price || "Price on request";
    const id = String(flight.id || index);
    return `<article class="result-card"><p class="eyebrow">${escapeHtml(flight.inventoryRoute)} · LIVE FLIGHT</p><h3>${escapeHtml(carrier)}</h3><p>${escapeHtml(route)}</p><p>${escapeHtml(price)}</p><span class="button subtle" aria-label="External flight ${escapeHtml(id)}">Available</span></article>`;
  }).join("") : emptyProvider("flights", failures.length ? failures : airportResults.filter(result => result.status === "rejected"));
  if ((failures.length || validRoutes.length < routes.length) && flights.length) appendPartial(target, failures.length + routes.length - validRoutes.length, routes.length);
  if (!flights.length && (!validRoutes.length || failures.length === searches.length)) throw new Error("Flight provider unavailable");
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

function setLoading(id, label) {
  document.querySelector(`#admin-${id}`).innerHTML = `<div class="empty">Loading available ${label}…</div>`;
  document.querySelector(`#${id.slice(0, -1)}-count`).textContent = "0";
}

function emptyProvider(label, failures) {
  return `<div class="empty${failures.length ? " is-error" : ""}">${failures.length ? `The ${escapeHtml(label)} provider could not return results.` : `No available ${escapeHtml(label)} were returned.`}</div>`;
}

function appendPartial(target, failed, total) {
  target.insertAdjacentHTML("beforeend", `<p class="admin-warning">Partial results: ${failed} of ${total} configured searches failed.</p>`);
}
