import { api, rows } from "../shared/api.js";
import { constrainFutureDate } from "../shared/forms.js";
import { escapeHtml, mountNavigation, notify, showRecoverableState } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("flights");
const target = document.querySelector("#flights");
const form = document.querySelector("#flight-search");
const PAGE_SIZE = 9;
let flights = [];
let currentPage = 1;
constrainFutureDate(form.elements.date);

function focusResults() {
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

function formatFlightTime(dateString) {
  if (!dateString) return "--:--";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return dateString.includes("T") ? dateString.split("T")[1].slice(0, 5) : dateString;
    }
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return dateString;
  }
}

function formatDuration(minutes) {
  if (!minutes || isNaN(minutes)) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m < 10 ? "0" : ""}${m}m`;
}

function extractFlightData(flight) {
  const leg = flight.legs?.[0] || flight;
  const lastLeg = flight.legs?.at(-1) || leg;
  const carrierObj = leg.carriers?.[0] || leg.carriers?.marketing?.[0] || {};
  const carrierName = carrierObj.name || flight.airline || flight.name || "Airline";
  const carrierLogo = carrierObj.logoUrl || "";
  const flightNumber = leg.segments?.[0]?.flightNumber ? `${carrierObj.code || ""} ${leg.segments[0].flightNumber}`.trim() : "";

  const originCode = flight.origin?.id || flight.origin?.displayCode || leg.origin?.id || leg.origin?.displayCode || "DEP";
  const originCity = flight.origin?.city || flight.origin?.name || leg.origin?.city || leg.origin?.name || originCode;

  const destCode = flight.destination?.id || flight.destination?.displayCode || lastLeg.destination?.id || lastLeg.destination?.displayCode || "ARR";
  const destCity = flight.destination?.city || flight.destination?.name || lastLeg.destination?.city || lastLeg.destination?.name || destCode;

  const depTime = formatFlightTime(flight.departure || leg.departure);
  const arrTime = formatFlightTime(flight.arrival || lastLeg.arrival);
  const durationText = formatDuration(flight.durationInMinutes || leg.durationInMinutes);

  const stopCount = typeof flight.stopCount === "number" ? flight.stopCount : (typeof leg.stopCount === "number" ? leg.stopCount : (leg.segments?.length ? leg.segments.length - 1 : 0));

  let stopsText = "Direct";
  let stopInfo = "";
  if (stopCount === 1) {
    const viaCity = leg.segments?.[0]?.destination || leg.segments?.[0]?.destinationCode || "";
    stopsText = viaCity ? `1 stop (${viaCity})` : "1 stop";
    stopInfo = viaCity ? `Stopover in ${viaCity}` : "1 stop";
  } else if (stopCount > 1) {
    stopsText = `${stopCount} stops`;
    stopInfo = `${stopCount} stops`;
  }

  const priceText = flight.price?.formatted || (flight.price?.amount ? `$${flight.price.amount}` : (flight.price?.raw ? `$${flight.price.raw}` : (typeof flight.price === "string" ? flight.price : "Price on request")));

  let dealTag = "";
  if (Array.isArray(flight.tags)) {
    if (flight.tags.includes("cheapest")) dealTag = "🏷️ Cheapest";
    else if (flight.tags.includes("second_cheapest")) dealTag = "🏷️ Great Deal";
    else if (flight.tags.includes("fastest")) dealTag = "⚡ Fastest";
    else if (flight.tags.includes("best")) dealTag = "⭐ Best";
  }

  const segments = leg.segments || [];

  return {
    carrierName,
    carrierLogo,
    flightNumber,
    originCode,
    originCity,
    destCode,
    destCity,
    depTime,
    arrTime,
    durationText,
    stopCount,
    stopsText,
    stopInfo,
    priceText,
    dealTag,
    segments
  };
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
  target.innerHTML = '<div class="empty">Finding available flights…</div>';
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
    flights = rows(await api.flights.search(values));
    currentPage = 1;
    renderFlights(values);
  } catch (error) {
    showRecoverableState(target, error.message, { action: searchFlights });
    notify(error.message, true);
  }
}

function renderFlights(values) {
  const pages = Math.ceil(flights.length / PAGE_SIZE);
  currentPage = Math.min(currentPage, pages || 1);
  const start = (currentPage - 1) * PAGE_SIZE;
  const items = flights.slice(start, start + PAGE_SIZE);
  const pagination = flights.length > PAGE_SIZE ? `
    <div class="pagination-controls">
      <button class="button subtle" type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>← Previous</button>
      <span>Page ${currentPage} of ${pages}</span>
      <button class="button subtle" type="button" data-page="next" ${currentPage === pages ? "disabled" : ""}>Next →</button>
    </div>` : "";

  target.innerHTML = flights.length ? `
    ${items.map((item, index) => {
      const data = extractFlightData(item);
      const id = String(item.id || start + index);
      const linkParameters = new URLSearchParams({ id, ...values });
      const flightHref = `/pages/flight-details.html?${escapeHtml(linkParameters.toString())}`;

      return `
        <article class="result-card flight-card clickable-card" tabindex="0" role="link" aria-label="${escapeHtml(data.carrierName)} flight from ${escapeHtml(data.originCode)} to ${escapeHtml(data.destCode)}" data-card-href="${flightHref}">
          <div class="flight-header">
            <div class="flight-carrier-info">
              ${data.carrierLogo ? `<img class="flight-carrier-logo" src="${escapeHtml(data.carrierLogo)}" alt="${escapeHtml(data.carrierName)}" loading="lazy">` : `<span class="flight-carrier-icon">✈️</span>`}
              <div>
                <h3 class="flight-carrier-name">${escapeHtml(data.carrierName)}</h3>
                ${data.flightNumber ? `<span class="flight-number">${escapeHtml(data.flightNumber)}</span>` : ""}
              </div>
            </div>
            ${data.dealTag ? `<span class="flight-deal-tag">${escapeHtml(data.dealTag)}</span>` : ""}
          </div>

          <div class="flight-route-visual">
            <div class="flight-time-point">
              <b class="flight-time">${escapeHtml(data.depTime)}</b>
              <span class="flight-airport-code">${escapeHtml(data.originCode)}</span>
              <span class="flight-city-name">${escapeHtml(data.originCity)}</span>
            </div>

            <div class="flight-path-divider">
              ${data.durationText ? `<span class="flight-duration">${escapeHtml(data.durationText)}</span>` : ""}
              <div class="flight-path-line ${data.stopCount === 0 ? "is-direct" : "has-stops"}">
                <span class="path-dot start"></span>
                <span class="path-plane">✈</span>
                ${data.stopCount > 0 ? `<span class="path-stop-dot" title="${escapeHtml(data.stopInfo)}"></span>` : ""}
                <span class="path-dot end"></span>
              </div>
              <span class="flight-stops-text ${data.stopCount === 0 ? "is-direct" : ""}">${escapeHtml(data.stopsText)}</span>
            </div>

            <div class="flight-time-point text-right">
              <b class="flight-time">${escapeHtml(data.arrTime)}</b>
              <span class="flight-airport-code">${escapeHtml(data.destCode)}</span>
              <span class="flight-city-name">${escapeHtml(data.destCity)}</span>
            </div>
          </div>

          <div class="flight-footer">
            <div class="flight-price-wrap">
              <span class="flight-price-label">Price per passenger</span>
              <b class="flight-price-amount">${escapeHtml(data.priceText)}</b>
            </div>
            <div class="flight-actions">
              <a class="button subtle" data-details="${start + index}" href="${flightHref}">View details</a>
              ${favouriteControl(id, "flight")}
            </div>
          </div>
        </article>
      `;
    }).join("")}
    <p class="results-summary" role="status">${flights.length} flight option${flights.length === 1 ? "" : "s"} found.</p>
    ${pagination}
  ` : '<div class="empty">No flights matched that route and date. Try a different day or nearby airport.</div>';

  target.querySelectorAll("[data-details]").forEach(link => link.addEventListener("click", () => {
    sessionStorage.setItem("journovo_selected_flight", JSON.stringify({ ...flights[Number(link.dataset.details)], search: values }));
  }));
  target.querySelectorAll(".flight-card.clickable-card").forEach(card => {
    const href = card.dataset.cardHref;
    if (!href) return;
    card.addEventListener("click", event => {
      if (event.target.closest("a, button")) return;
      location.assign(href);
    });
    card.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("a, button")) {
        event.preventDefault();
        location.assign(href);
      }
    });
  });
  bindFavouriteControls(target);
  focusResults();
  target.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
    currentPage += button.dataset.page === "prev" ? -1 : 1;
    renderFlights(values);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
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
