import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation("explore");
const id = new URLSearchParams(location.search).get("id");
const tripTarget = document.querySelector("#trip");
const daysTarget = document.querySelector("#days");
const itineraryMeta = document.querySelector("#itinerary-meta");
const form = document.querySelector("#trip-form");
let trip;

if (!id) {
  tripTarget.innerHTML = 'Select a trip from the <a class="text-action" href="/pages/trips.html">trips page</a>.';
  itineraryMeta.textContent = "Choose a trip to view its itinerary";
  daysTarget.innerHTML = "";
} else if (requireLogin()) {
  document.querySelector("#album-link").href = `/pages/album.html?trip_id=${encodeURIComponent(id)}`;
  loadTrip();
  form.addEventListener("submit", updateTrip);
  document.querySelector("[data-cancel-edit]").addEventListener("click", () => { form.hidden = true; tripTarget.hidden = false; });
}

async function loadTrip() {
  try {
    const tripPayload = await api.trips.show(id);
    trip = tripPayload?.data || tripPayload;
    renderTrip();
    await loadItinerary();
  } catch (error) {
    tripTarget.innerHTML = `<div class="empty is-error">${escapeHtml(error.message)}</div>`;
    daysTarget.innerHTML = "";
  }
}

async function loadItinerary() {
  daysTarget.innerHTML = '<div class="empty">Loading your day-by-day itinerary…</div>';
  try {
    const payload = await api.trips.days(id);
    renderDays(payload);
  } catch (error) {
    itineraryMeta.textContent = "Itinerary unavailable";
    daysTarget.innerHTML = `<div class="empty is-error">${escapeHtml(error.message)}<br>We could not load this trip’s daily itinerary.</div>`;
  }
}

function renderDays(payload) {
  const days = rows(payload).slice().sort((left, right) => Number(left.day || 0) - Number(right.day || 0));
  itineraryMeta.textContent = days.length ? `${days.length} planned ${days.length === 1 ? "day" : "days"}` : "No daily plans yet";
  daysTarget.innerHTML = days.length ? days.map((day, index) => renderDay(day, index)).join("") : '<div class="empty">No daily itinerary has been added to this trip yet.</div>';
}

function renderDay(day, index) {
  const dayNumber = Number(day.day) || index + 1;
  const plan = normalizePlan(day.plan);
  const moments = itineraryMoments(plan);
  const notes = itineraryNotes(plan);
  const date = dateForDay(dayNumber);
  const cost = day.expenses != null && day.expenses !== "" ? `$${Number(day.expenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Flexible spend";
  const timeline = moments.length
    ? `<div class="itinerary-moments">${moments.map(({ label, value, icon }) => `<section class="itinerary-moment"><span class="moment-icon" aria-hidden="true">${icon}</span><div><p>${escapeHtml(label)}</p><div>${formatPlanValue(value)}</div></div></section>`).join("")}</div>`
    : `<div class="itinerary-free"><span aria-hidden="true">✦</span><p>${escapeHtml(planText(plan) || "A flexible day to explore at your own pace.")}</p></div>`;
  return `<article class="itinerary-day">
    <header class="itinerary-day-header">
      <div class="itinerary-day-number"><span>Day</span><strong>${dayNumber}</strong></div>
      <div class="itinerary-day-title"><p class="eyebrow">${escapeHtml(date || "Your journey")}</p><h3>${escapeHtml(day.title || plan.day_title || `A day in ${trip?.destination || "your destination"}`)}</h3></div>
      <p class="itinerary-cost"><span>Estimated</span><strong>${escapeHtml(cost)}</strong></p>
    </header>
    ${timeline}
    ${notes.length ? `<footer class="itinerary-notes"><span aria-hidden="true">⌁</span><p>${notes.map(escapeHtml).join("<br>")}</p></footer>` : ""}
  </article>`;
}

function normalizePlan(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return { summary: value }; }
}

function itineraryMoments(plan) {
  const definitions = [
    ["morning", "Morning", "☀"], ["breakfast", "Breakfast", "☕"], ["lunch", "Lunch", "◐"],
    ["afternoon", "Afternoon", "◒"], ["evening", "Evening", "◑"], ["dinner", "Dinner", "☾"], ["night", "Night", "✦"],
    ["activities", "Highlights", "✦"], ["plan", "Plan", "✦"]
  ];
  const listed = definitions.map(([key, label, icon]) => ({ label, icon, value: plan[key] })).filter(item => meaningful(item.value));
  if (listed.length) return listed;
  return Object.entries(plan)
    .filter(([key, value]) => !["day", "day_title", "title", "hotel", "weather_note", "route_notes", "summary"].includes(key) && meaningful(value))
    .map(([key, value]) => ({ label: key.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()), value, icon: "✦" }));
}

function itineraryNotes(plan) {
  return [plan.hotel && `Stay: ${plan.hotel}`, plan.weather_note, plan.route_notes, plan.summary]
    .filter(meaningful)
    .map(value => typeof value === "string" ? value : JSON.stringify(value));
}

function meaningful(value) {
  if (value == null || value === "" || value === "N/A") return false;
  return !Array.isArray(value) || value.length > 0;
}

function formatPlanValue(value) {
  if (Array.isArray(value)) return `<ul>${value.map(item => `<li>${escapeHtml(planText(item))}</li>`).join("")}</ul>`;
  return `<p>${escapeHtml(planText(value))}</p>`;
}

function planText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(planText).join(", ");
  if (value && typeof value === "object") return value.name || value.title || value.description || Object.values(value).filter(item => typeof item === "string").join(" · ");
  return "";
}

function dateForDay(dayNumber) {
  if (!trip?.start_date) return "";
  const date = new Date(`${String(trip.start_date).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.valueOf())) return "";
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

async function updateTrip(event) {
  event.preventDefault();
  const button = event.submitter;
  const values = Object.fromEntries(new FormData(form));
  for (const key of ["number_of_travels", "budget", "estimated_expenses", "number_of_days"]) values[key] = Number(values[key]);
  button.disabled = true;
  try {
    const payload = await api.trips.update(id, values);
    trip = payload?.data || payload;
    form.hidden = true;
    renderTrip();
    await loadItinerary();
    notify("Trip updated.");
  } catch (error) { notify(error.message, true); }
  finally { button.disabled = false; }
}

function renderTrip() {
  tripTarget.hidden = false;
  const destination = trip.destination || "Trip itinerary";
  const actions = trip.is_ai_generated
    ? `<a class="button subtle" href="/pages/reviews.html?type=trip&id=${encodeURIComponent(id)}&name=${encodeURIComponent(destination)}">Write a review</a><button class="button subtle" type="button" data-delete>Delete</button>`
    : `<a class="button subtle" href="/pages/reviews.html?type=trip&id=${encodeURIComponent(id)}&name=${encodeURIComponent(destination)}">Write a review</a><button class="button subtle" type="button" data-edit>Edit</button><button class="button subtle" type="button" data-delete>Delete</button>`;
  tripTarget.innerHTML = `<div class="panel-heading"><div><div class="eyebrow">YOUR JOURNEY</div><h1>${escapeHtml(destination)}</h1><p class="trip-overview">${escapeHtml(trip.style || "Your live itinerary from Journovo.")} · ${escapeHtml(trip.number_of_days || "—")} days · ${escapeHtml(trip.number_of_travels || "—")} travellers · $${escapeHtml(trip.estimated_expenses || trip.budget || "—")} estimated cost</p></div><div class="detail-actions">${actions}</div></div>`;
  tripTarget.querySelector("[data-edit]")?.addEventListener("click", () => {
    for (const key of ["destination", "classes", "number_of_travels", "budget", "estimated_expenses", "number_of_days", "start_date", "style"]) form.elements[key].value = key === "start_date" ? String(trip[key] || "").slice(0, 10) : trip[key] ?? "";
    tripTarget.hidden = true;
    form.hidden = false;
  });
  tripTarget.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    try { await api.trips.remove(id); location.assign("/pages/dashboard.html"); }
    catch (error) { notify(error.message, true); }
  });
}
