import { api, rows, session } from "../shared/api.js";
import { confirmModal, escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

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
  const albumLink = document.querySelector("#album-link");
  if (albumLink) albumLink.hidden = true;
  loadTrip();
  form.addEventListener("submit", updateTrip);
  document.querySelector("[data-cancel-edit]").addEventListener("click", () => { form.hidden = true; tripTarget.hidden = false; });
}

async function loadTrip() {
  try {
    const tripPayload = await api.trips.show(id);
    trip = tripPayload?.data || tripPayload;
    const embeddedDays = rows(trip?.details);
    renderTrip();
    if (embeddedDays.length) renderDays(embeddedDays);
    await loadItinerary(embeddedDays);
    await checkTripAlbumAccess();
    await loadTripReviews();
  } catch (error) {
    tripTarget.innerHTML = `<div class="empty is-error">${escapeHtml(error.message)}</div>`;
    daysTarget.innerHTML = "";
  }
}

async function checkTripAlbumAccess() {
  const albumLink = document.querySelector("#album-link");
  if (!albumLink) return;
  albumLink.style.display = "none";
  albumLink.hidden = true;

  if (!id) return;

  try {
    let isBooked = false;

    // 1. Check user's my-trips list (which is populated via whereHas('clients', ...))
    try {
      const myTrips = rows(await api.trips.list());
      if (myTrips.some(t => String(t.id) === String(id) || String(t.trip_id) === String(id) || String(t.template_trip_id) === String(id))) {
        isBooked = true;
      }
    } catch {}

    // 2. Check bookings
    if (!isBooked) {
      try {
        const bookings = rows(await api.dashboard.bookings());
        if (bookings.some(b => 
          (b.type === "trip" || String(b.type).toLowerCase() === "trip") &&
          (String(b.external_reference_id) === String(id) || String(b.details?.trip_id) === String(id) || String(b.trip_id) === String(id))
        )) {
          isBooked = true;
        }
      } catch {}
    }

    // 3. Fallback check memories endpoint
    if (!isBooked) {
      try {
        const capsule = await api.memories.list(id);
        if (capsule && !capsule.message && (capsule.unlocked !== undefined || Array.isArray(capsule) || Array.isArray(capsule.your_memories))) {
          isBooked = true;
        }
      } catch {}
    }

    if (isBooked) {
      albumLink.href = `/pages/album.html?trip_id=${encodeURIComponent(id)}`;
      albumLink.style.display = "";
      albumLink.hidden = false;
    } else {
      albumLink.style.display = "none";
      albumLink.hidden = true;
    }
  } catch {
    albumLink.style.display = "none";
    albumLink.hidden = true;
  }
}

async function loadItinerary(fallbackDays = []) {
  if (!fallbackDays.length) daysTarget.innerHTML = '<div class="empty">Loading your day-by-day itinerary…</div>';
  try {
    const itineraryId = trip?.trip_id || trip?.trip?.id || trip?.template_trip_id || id;
    const payload = await api.trips.days(itineraryId);
    const days = rows(payload);
    if (days.length || !fallbackDays.length) renderDays(days);
  } catch (error) {
    if (fallbackDays.length) return;
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
  const facts = itineraryFacts(plan);
  const notes = itineraryNotes(plan);
  const date = dateForDay(dayNumber);
  const cost = day.expenses != null && day.expenses !== "" ? `$${Number(day.expenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Flexible spend";
  const timeline = moments.length
    ? `<ol class="itinerary-timeline">${moments.map(({ label, value, icon }) => `<li class="itinerary-moment"><span class="moment-icon" aria-hidden="true">${icon}</span><div><p>${escapeHtml(label)}</p><div>${formatPlanValue(value)}</div></div></li>`).join("")}</ol>`
    : `<div class="itinerary-free"><span aria-hidden="true">✦</span><p>${escapeHtml(planText(plan) || "A flexible day to explore at your own pace.")}</p></div>`;
  return `<article class="itinerary-day">
    <header class="itinerary-day-header">
      <div class="itinerary-day-number"><span>Day</span><strong>${dayNumber}</strong></div>
      <div class="itinerary-day-title"><p class="eyebrow">${escapeHtml(date || "Your journey")}</p><h3>${escapeHtml(day.title || plan.day_title || `A day in ${trip?.destination || "your destination"}`)}</h3></div>
      <p class="itinerary-cost"><span>Estimated</span><strong>${escapeHtml(cost)}</strong></p>
    </header>
    ${facts.length ? `<dl class="itinerary-facts">${facts.map(({ label, value }) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
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
  return definitions.map(([key, label, icon]) => ({ label, icon, value: plan[key] })).filter(item => meaningful(item.value));
}

function itineraryFacts(plan) {
  const hotel = plan.hotel_name || plan.hotel;
  return [
    ["Weather", plan.weather_temperature],
    ["Hotel", hotel],
    ["Hotel per night", formatCurrency(plan.hotel_per_night)],
    ["Activities & meals / person", formatCurrency(plan.activities_and_meals_cost_per_person)],
    ["Daily estimate", formatCurrency(plan.daily_cost)]
  ].map(([label, value]) => ({ label, value })).filter(item => meaningful(item.value));
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

function formatText(value) {
  return escapeHtml(planText(value))
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function formatPlanValue(value) {
  if (Array.isArray(value)) return `<ul>${value.map(item => `<li>${formatText(item)}</li>`).join("")}</ul>`;
  return `<p>${formatText(value)}</p>`;
}

function formatCurrency(value) {
  if (value == null || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : planText(value);
}

function planText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(planText).join("\n");
  if (value && typeof value === "object") {
    const name = value.name || value.title;
    const desc = value.description || value.details || value.note;
    if (name && desc) return `**${name}**\n${desc}`;
    return name || desc || Object.values(value).filter(item => typeof item === "string").join(" · ");
  }
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
  if (!confirm("Save changes to this trip?")) return;
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

function canManageTrip(candidate) {
  if (candidate.is_pre_made || candidate.is_premade || candidate.is_system || candidate.is_default) return false;
  const user = session.user() || {};
  const viewerIds = [user.id, user.user_id, user.client_id, user.user?.id, user.client?.id].filter(value => value != null).map(String);
  const ownerIds = [candidate.user_id, candidate.client_id, candidate.owner_id, candidate.user?.id, candidate.client?.id, candidate.owner?.id].filter(value => value != null).map(String);
  return viewerIds.length > 0 && ownerIds.some(value => viewerIds.includes(value));
}
function renderTrip() {
  tripTarget.hidden = false;
  const destination = trip.destination || "Trip itinerary";
  const isAiTrip = Boolean(trip.is_ai_generated || trip.is_ai || trip.ai_generated);
  const standardActions = `<a class="button" href="/pages/trip-booking?id=${encodeURIComponent(id)}">Book this trip</a>`;
  const reviewAction = isAiTrip ? ` <a class="button subtle" href="/pages/reviews.html?type=trip&id=${encodeURIComponent(id)}&name=${encodeURIComponent(destination)}">Write a review</a>` : "";
  const managementActions = canManageTrip(trip) ? ` <button class="button subtle" type="button" data-edit>Edit</button><button class="button subtle" type="button" data-delete>Delete</button>` : "";
  const actions = `${standardActions}${reviewAction}${managementActions}`;
  tripTarget.innerHTML = `<div class="panel-heading"><div><div class="eyebrow">${isAiTrip ? "AI GENERATED JOURNEY" : "YOUR JOURNEY"}</div><h1>${escapeHtml(destination)}</h1><p class="trip-overview">${escapeHtml(trip.style || "Your live itinerary from Journovo.")} · ${escapeHtml(trip.number_of_days || "—")} days · ${escapeHtml(trip.number_of_travels || "—")} travellers · $${escapeHtml(trip.estimated_expenses || trip.budget || "—")} estimated cost</p></div><div class="detail-actions">${actions}</div></div>`;
  tripTarget.querySelector("[data-edit]")?.addEventListener("click", () => {
    for (const key of ["destination", "classes", "number_of_travels", "budget", "estimated_expenses", "number_of_days", "start_date", "style"]) form.elements[key].value = key === "start_date" ? String(trip[key] || "").slice(0, 10) : trip[key] ?? "";
    tripTarget.hidden = true;
    form.hidden = false;
  });
  tripTarget.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!await confirmModal("Delete this trip? This action cannot be undone.", {
      title: "Delete Trip",
      confirmText: "Delete",
      danger: true
    })) return;
    try { await api.trips.remove(id); location.assign("/pages/dashboard.html"); }
    catch (error) { notify(error.message, true); }
  });
}

async function loadTripReviews() {
  const reviewsTarget = document.querySelector("#trip-reviews");
  if (!reviewsTarget || !id) return;
  reviewsTarget.innerHTML = '<div class="empty">Loading reviews…</div>';
  try {
    const payload = await api.reviews.list(1, { type: "trip", reviewable_id: id });
    const reviews = rows(payload);
    if (reviews.length > 0) {
      reviewsTarget.innerHTML = `<h3>Traveler Reviews</h3><div class="reviews-list" style="margin-top: 1rem; display: grid; gap: 1rem;">` +
        reviews.map(r => {
          const reviewerName = r.client?.name || r.client?.first_name || "Traveler";
          const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : "";
          return `<article style="padding-bottom: 1rem; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem;">
            <p><strong>${escapeHtml(reviewerName)}</strong> ${date ? `<span class="muted" style="margin-left: 0.5rem;">${date}</span>` : ""}</p>
            <p style="color: var(--primary); font-weight: 700;">★ ${escapeHtml(String(r.rating || 5))}/5</p>
            <p style="margin-top: 0.5rem;">${escapeHtml(r.description || r.comment || "")}</p>
          </article>`;
        }).join("") + `</div>`;
    } else {
      reviewsTarget.innerHTML = '<div class="empty">No reviews yet for this trip. Be the first to write one!</div>';
    }
  } catch (e) {
    reviewsTarget.innerHTML = '<div class="empty is-error">Could not load reviews at this time.</div>';
  }
}
