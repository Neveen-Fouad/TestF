import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("flights");
const target = document.querySelector("#details");
const parameters = new URLSearchParams(location.search);
const requestedId = parameters.get("id");
let flight = JSON.parse(sessionStorage.getItem("journovo_selected_flight") || "null");

if (requestedId && String(flight?.id) !== requestedId) flight = null;

if (!flight) {
  const searchKeys = ["originSkyId", "destinationSkyId", "originEntityId", "destinationEntityId", "date", "cabinClass", "adults", "sortBy", "currency"];
  const filters = Object.fromEntries(searchKeys.map(key => [key, parameters.get(key)]).filter(([, value]) => value));
  const hasRequiredSearch = ["originSkyId", "destinationSkyId", "originEntityId", "destinationEntityId", "date"].every(key => filters[key]);
  if (requestedId && hasRequiredSearch) {
    target.innerHTML = '<div class="empty">Refreshing flight details…</div>';
    try {
      const items = rows(await api.flights.search(filters));
      flight = items.find(item => String(item.id) === requestedId) || null;
      if (flight) {
        flight.search = filters;
        sessionStorage.setItem("journovo_selected_flight", JSON.stringify(flight));
      }
    } catch {}
  }
}

if (!flight) {
  target.innerHTML = '<div class="empty">This flight is no longer available. <a class="text-action" href="/pages/flights.html">Search flights again</a></div>';
} else {
  const leg = flight.legs?.[0] || flight;
  const lastLeg = flight.legs?.at(-1) || leg;
  const carrier = leg.carriers?.marketing?.[0]?.name || leg.carriers?.[0]?.name || flight.airline || flight.name || "Flight";
  const origin = leg.origin?.name || leg.origin?.displayCode || flight.origin || "Origin";
  const destination = lastLeg.destination?.name || lastLeg.destination?.displayCode || flight.destination || "Destination";
  const id = flight.id || requestedId;
  target.innerHTML = `<p class="eyebrow">FLIGHT DETAILS</p><h1>${escapeHtml(carrier)}</h1><p class="lead">${escapeHtml(origin)} → ${escapeHtml(destination)}</p><p>${escapeHtml(flight.departure || leg.departure || "")} → ${escapeHtml(flight.arrival || lastLeg.arrival || "")}</p><p>${escapeHtml(flight.price?.formatted || flight.price?.amount || flight.price?.raw || "Price on request")}</p><div class="detail-actions"><a class="button" href="/pages/flight-booking.html">Book this flight</a>${id ? ` <a class="button subtle" href="/pages/reviews.html?type=flight&id=${encodeURIComponent(id)}&name=${encodeURIComponent(carrier)}">Write a review</a>` : ""}${favouriteControl(id, "flight")}</div>`;
  bindFavouriteControls(target);
}
