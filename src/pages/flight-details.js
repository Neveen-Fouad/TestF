import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("flights");
const target = document.querySelector("#details");
const parameters = new URLSearchParams(location.search);
const requestedId = parameters.get("id");
let flight = JSON.parse(sessionStorage.getItem("journovo_selected_flight") || "null");

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
  const carrierObj = leg.carriers?.[0] || leg.carriers?.marketing?.[0] || {};
  const carrierName = carrierObj.name || flight.airline || flight.name || "Airline";
  const carrierLogo = carrierObj.logoUrl || "";

  const originCode = flight.origin?.id || flight.origin?.displayCode || leg.origin?.id || leg.origin?.displayCode || "DEP";
  const originCity = flight.origin?.city || flight.origin?.name || leg.origin?.city || leg.origin?.name || originCode;

  const destCode = flight.destination?.id || flight.destination?.displayCode || lastLeg.destination?.id || lastLeg.destination?.displayCode || "ARR";
  const destCity = flight.destination?.city || flight.destination?.name || lastLeg.destination?.city || lastLeg.destination?.name || destCode;

  const depTime = formatFlightTime(flight.departure || leg.departure);
  const arrTime = formatFlightTime(flight.arrival || lastLeg.arrival);
  const durationText = formatDuration(flight.durationInMinutes || leg.durationInMinutes);
  const priceText = flight.price?.formatted || (flight.price?.amount ? `$${flight.price.amount}` : "Price on request");
  const id = flight.id || requestedId;
  const segments = leg.segments || [];

  target.innerHTML = `
    <p class="eyebrow">FLIGHT DETAILS</p>
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin: 10px 0 20px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        ${carrierLogo ? `<img src="${escapeHtml(carrierLogo)}" alt="${escapeHtml(carrierName)}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 10px; background: #fff; padding: 4px; border: 1px solid var(--line);">` : ""}
        <div>
          <h1 style="margin: 0; font-size: 28px;">${escapeHtml(carrierName)}</h1>
          <p class="muted" style="margin: 2px 0 0;">${escapeHtml(originCity)} (${escapeHtml(originCode)}) → ${escapeHtml(destCity)} (${escapeHtml(destCode)})</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="muted" style="font-size: 13px; display: block;">Total fare</span>
        <b style="font-size: 28px; color: var(--navy); font-family: Georgia, serif;">${escapeHtml(priceText)}</b>
      </div>
    </div>

    <div class="panel" style="margin: 20px 0; padding: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 16px; margin-bottom: 18px;">
        <div>
          <span class="muted" style="font-size: 12px; font-weight: 700; text-transform: uppercase;">Departure</span>
          <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: var(--navy);">${escapeHtml(depTime)}</p>
          <p style="margin: 2px 0 0; color: #536c8a; font-size: 13px;">${escapeHtml(originCity)} (${escapeHtml(originCode)})</p>
        </div>
        <div style="text-align: center;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; background: #f0f6fc; color: #0e6ed9; font-size: 12px; font-weight: 700;">⏱️ ${escapeHtml(durationText || "Scheduled")}</span>
        </div>
        <div style="text-align: right;">
          <span class="muted" style="font-size: 12px; font-weight: 700; text-transform: uppercase;">Arrival</span>
          <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: var(--navy);">${escapeHtml(arrTime)}</p>
          <p style="margin: 2px 0 0; color: #536c8a; font-size: 13px;">${escapeHtml(destCity)} (${escapeHtml(destCode)})</p>
        </div>
      </div>

      ${segments.length ? `
        <div>
          <h3 style="margin: 0 0 14px; font-size: 16px; color: var(--navy);">Flight Segments & Layovers</h3>
          <div style="display: grid; gap: 12px;">
            ${segments.map((s, idx) => `
              <div style="padding: 14px; border-radius: 12px; background: #f8fbfe; border: 1px solid #e1eef8;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <b>Segment ${idx + 1}: ${escapeHtml(s.carrier || carrierName)} ${s.flightNumber ? `#${escapeHtml(s.flightNumber)}` : ""}</b>
                  <span class="muted" style="font-size: 12px;">${formatFlightTime(s.departure)} - ${formatFlightTime(s.arrival)}</span>
                </div>
                <p style="margin: 0; font-size: 13px; color: #536c8a;">
                  🛫 ${escapeHtml(s.origin || s.originCode)} (${escapeHtml(s.originCode)}) → 🛬 ${escapeHtml(s.destination || s.destinationCode)} (${escapeHtml(s.destinationCode)})
                </p>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    </div>

    <div class="detail-actions">
      <a class="button" href="/pages/flight-booking.html">Book this flight</a>
      <a class="button subtle" href="/pages/flights.html">Back to search</a>
      ${favouriteControl(id, "flight")}
    </div>
  `;
  bindFavouriteControls(target);
}
