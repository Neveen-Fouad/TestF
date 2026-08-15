import { api } from "../shared/api.js";
import { mountNavigation, notify, requireLogin, escapeHtml } from "../shared/navigation.js";

mountNavigation("explore");
if (requireLogin()) {
  const form = document.querySelector("#booking-form");
  const tripId = new URLSearchParams(location.search).get("id") || "";
  form.elements.trip_id.value = tripId;
  const summaryTarget = document.querySelector("#trip-summary");

  if (tripId) {
    api.trips.show(tripId).then(result => {
      const trip = result?.data || result;
      summaryTarget.innerHTML = `
        <div class="field"><label>Destination</label><div>${escapeHtml(trip.destination)}</div></div>
        <div class="field"><label>Start Date</label><div>${escapeHtml(String(trip.start_date).slice(0, 10))}</div></div>
        <div class="field"><label>Duration</label><div>${escapeHtml(trip.number_of_days)} days</div></div>
        <div class="field"><label>Travelers</label><div>${escapeHtml(trip.number_of_travels)}</div></div>
        <div class="field"><label>Total Estimated Cost</label><div>$${escapeHtml(trip.estimated_expenses || trip.budget)}</div></div>
      `;
    }).catch(error => {
      summaryTarget.innerHTML = `<div class="empty is-error">${escapeHtml(error.message)}</div>`;
    });
  } else {
    summaryTarget.innerHTML = `<div class="empty is-error">No trip specified.</div>`;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const result = await api.trips.book(tripId);
      const booking = result?.data || result;
      location.assign(`/pages/payments?booking_id=${encodeURIComponent(booking.id || booking.booking_id || "")}`);
    } catch (error) {
      notify(error.message, true);
      button.disabled = false;
    }
  });
}
