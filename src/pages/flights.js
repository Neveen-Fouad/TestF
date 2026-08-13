import { api, rows } from "../shared/api.js";
import { constrainFutureDate } from "../shared/forms.js";
import { escapeHtml, mountNavigation, notify, showRecoverableState } from "../shared/navigation.js";

mountNavigation("flights");
const target = document.querySelector("#flights");
const form = document.querySelector("#flight-search");
constrainFutureDate(form.elements.date);

function focusResults() {
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

async function resolveAirport(kind) {
  const input = form.elements[`${kind}_query`];
  const status = document.querySelector(`[data-airport-status="${kind}"]`);
  form.elements[`${kind}SkyId`].value = "";
  form.elements[`${kind}EntityId`].value = "";
  if (input.value.trim().length < 2) return false;
  status.textContent = "Finding airport…";
  try {
    const airports = rows(await api.flights.airports(input.value.trim()));
    const airport = airports[0];
    if (!airport) throw new Error("No airport found");
    const skyId = airport.skyId || airport.sky_id || airport.navigation?.relevantFlightParams?.skyId;
    const entityId = airport.entityId || airport.entity_id || airport.navigation?.entityId || airport.navigation?.relevantFlightParams?.entityId;
    if (!skyId || !entityId) throw new Error("Airport identifiers are unavailable");
    form.elements[`${kind}SkyId`].value = skyId;
    form.elements[`${kind}EntityId`].value = entityId;
    status.textContent = airport.presentation?.suggestionTitle || airport.presentation?.title || airport.name || skyId;
    return true;
  } catch (error) {
    status.textContent = error.message;
    return false;
  }
}

form.elements.origin_query.addEventListener("change", () => resolveAirport("origin"));
form.elements.destination_query.addEventListener("change", () => resolveAirport("destination"));

async function searchFlights() {
  target.innerHTML = '<div class="empty">Finding flights…</div>';
  const resolved = await Promise.all([
    form.elements.originSkyId.value || resolveAirport("origin"),
    form.elements.destinationSkyId.value || resolveAirport("destination")
  ]);
  if (resolved.some(value => !value)) {
    target.innerHTML = '<div class="empty is-error">Choose valid origin and destination airports, then search again.</div>';
    form.elements.origin_query.focus();
    return;
  }

  try {
    const values = Object.fromEntries(new FormData(form));
    delete values.origin_query;
    delete values.destination_query;
    if (values.originSkyId === values.destinationSkyId || values.originEntityId === values.destinationEntityId) {
      target.innerHTML = '<div class="empty is-error">Your departure and arrival airports need to be different.</div>';
      form.elements.destination_query.focus();
      return;
    }
    sessionStorage.setItem("journovo_flight_search", JSON.stringify({ ...values, origin_query: form.elements.origin_query.value, destination_query: form.elements.destination_query.value }));
    const items = rows(await api.flights.search(values));
    target.innerHTML = items.length ? `${items.map((item, index) => {
      const leg = item.legs?.[0] || item;
      const carrier = leg.carriers?.marketing?.[0]?.name || leg.carriers?.[0]?.name || item.airline || item.name || "Flight option";
      const route = item.legs?.map(part => `${part.origin?.displayCode || part.origin?.name || ""} → ${part.destination?.displayCode || part.destination?.name || ""}`).join(" · ") || `${item.departure || ""} → ${item.arrival || ""}`;
      const price = item.price?.formatted || item.price?.amount || item.price?.raw || item.price || "Price on request";
      const id = String(item.id || index);
      const linkParameters = new URLSearchParams({ id, ...values });
      return `<article class="result-card"><p class="eyebrow">Flight</p><h3>${escapeHtml(carrier)}</h3><p>${escapeHtml(route)}</p><p>${escapeHtml(price)}</p><a class="button subtle" data-details="${index}" href="/pages/flight-details.html?${escapeHtml(linkParameters.toString())}">View details</a></article>`;
    }).join("")}<p class="results-summary" role="status">${items.length} flight option${items.length === 1 ? "" : "s"} found.</p>` : '<div class="empty">No flights matched that route and date. Try a different day or nearby airport.</div>';
    target.querySelectorAll("[data-details]").forEach(link => link.addEventListener("click", () => {
      sessionStorage.setItem("journovo_selected_flight", JSON.stringify({ ...items[Number(link.dataset.details)], search: values }));
    }));
    focusResults();
  } catch (error) {
    showRecoverableState(target, error.message, { action: searchFlights });
    notify(error.message, true);
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  searchFlights();
});

try {
  const savedSearch = JSON.parse(sessionStorage.getItem("journovo_flight_search") || "null");
  if (savedSearch) Object.entries(savedSearch).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value;
  });
} catch {}
