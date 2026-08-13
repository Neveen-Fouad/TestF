import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation("explore");
const id = new URLSearchParams(location.search).get("id");
const tripTarget = document.querySelector("#trip");
const daysTarget = document.querySelector("#days");
const form = document.querySelector("#trip-form");
let trip;

if (!id) {
  tripTarget.innerHTML = 'Select a trip from the <a class="text-action" href="/pages/trips.html">trips page</a>.';
  daysTarget.innerHTML = "";
} else if (requireLogin()) {
  document.querySelector("#album-link").href = `/pages/album.html?trip_id=${encodeURIComponent(id)}`;
  try {
    const [tripPayload, daysResult] = await Promise.all([api.trips.show(id), api.trips.days(id).catch(() => null)]);
    trip = tripPayload?.data || tripPayload;
    renderTrip();
    renderDays(daysResult || trip.details || []);
  } catch (error) {
    tripTarget.textContent = error.message;
    daysTarget.innerHTML = "";
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const values = Object.fromEntries(new FormData(form));
    for (const key of ["number_of_travels", "budget", "estimated_expenses", "number_of_days"]) values[key] = Number(values[key]);
    values.is_fav = form.elements.is_fav.checked;
    button.disabled = true;
    try {
      const payload = await api.trips.update(id, values);
      trip = payload?.data || payload;
      form.hidden = true;
      renderTrip();
      renderDays(await api.trips.days(id).catch(() => trip.details || []));
      notify("Trip updated.");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });
  document.querySelector("[data-cancel-edit]").addEventListener("click", () => { form.hidden = true; tripTarget.hidden = false; });
}

function renderDays(daysPayload) {
  const days = rows(daysPayload);
  daysTarget.innerHTML = days.length ? days.map((day, index) => `<article class="card"><div class="eyebrow">DAY ${escapeHtml(day.day || index + 1)}</div><h3>${escapeHtml(day.title || "Day plan")}</h3><p>${escapeHtml(day.plan || "No activities have been added yet.")}</p>${day.expenses != null ? `<p>Estimated: ${escapeHtml(day.expenses)}</p>` : ""}</article>`).join("") : '<div class="empty">No daily itinerary has been added to this trip.</div>';
}

function renderTrip() {
  tripTarget.hidden = false;
  const destination = trip.destination || "Trip itinerary";
  tripTarget.innerHTML = `<div class="panel-heading"><div><div class="eyebrow">YOUR JOURNEY</div><h1>${escapeHtml(destination)}</h1></div><div class="detail-actions"><a class="button subtle" href="/pages/reviews.html?type=trip&id=${encodeURIComponent(id)}&name=${encodeURIComponent(destination)}">Write a review</a><button class="button subtle" type="button" data-edit>Edit</button><button class="button subtle" type="button" data-delete>Delete</button></div></div><p>${escapeHtml(trip.style || "Your live itinerary from Journovo.")} · ${escapeHtml(trip.number_of_days || "—")} days · ${escapeHtml(trip.number_of_travels || "—")} travellers</p>`;
  tripTarget.querySelector("[data-edit]").addEventListener("click", () => {
    for (const key of ["destination", "classes", "number_of_travels", "budget", "estimated_expenses", "number_of_days", "start_date", "style"]) form.elements[key].value = key === "start_date" ? String(trip[key] || "").slice(0, 10) : trip[key] ?? "";
    form.elements.is_fav.checked = Boolean(trip.is_fav);
    tripTarget.hidden = true;
    form.hidden = false;
  });
  tripTarget.querySelector("[data-delete]").addEventListener("click", async () => {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    try { await api.trips.remove(id); location.assign("/pages/dashboard.html"); }
    catch (error) { notify(error.message, true); }
  });
}
