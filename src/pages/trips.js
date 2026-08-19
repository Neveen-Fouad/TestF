import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

const catalogView = new URLSearchParams(location.search).get("catalog") === "1";
const memberView = session.isLoggedIn() && !catalogView;

if (memberView) {
  mountSidebar("my-trips");
  mountNavigation();
  document.querySelector("#trips-eyebrow").textContent = "YOUR TRAVEL SPACE";
  document.querySelector("#trips-title").textContent = "My trips";
  document.querySelector("#trips-intro").textContent = "Open a journey to view its daily plans, memories, and booking details.";
} else {
  const sidebarHost = document.querySelector("[data-sidebar]");
  if (sidebarHost) sidebarHost.remove();
  document.querySelector("main")?.classList.remove("split");
  mountNavigation();
  document.querySelector("#trips-eyebrow").textContent = "DISCOVER";
  document.querySelector("#trips-title").textContent = "Ready-made journeys";
  document.querySelector("#trips-intro").textContent = "Choose a curated itinerary and add it to your travel plans.";
}

const target = document.querySelector("#trips");
const paginationTarget = document.querySelector("#trips-pagination");

const PAGE_SIZE = 6;
let currentPage = 1;
let allTrips = [];

function formatTripTitle(trip) {
  const rawName = trip.name || trip.title || "";
  if (rawName && !/^untitled/i.test(rawName)) return rawName;

  if (trip.style) {
    const styleStr = String(trip.style).trim();
    const capitalized = styleStr.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return capitalized.toLowerCase().includes("trip") || capitalized.toLowerCase().includes("journey") || capitalized.toLowerCase().includes("escape")
      ? capitalized
      : `${capitalized} Experience`;
  }

  return trip.destination ? `${trip.destination} Journey` : "Custom Journey";
}

function formatTripMeta(trip) {
  const parts = [];

  if (trip.start_date) {
    try {
      const d = new Date(trip.start_date);
      if (!isNaN(d.getTime())) {
        const formattedDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        parts.push(`Starts ${formattedDate}`);
      } else {
        parts.push(`Starts ${String(trip.start_date).slice(0, 10)}`);
      }
    } catch {
      parts.push(`Starts ${trip.start_date}`);
    }
  }

  if (trip.number_of_days) {
    parts.push(`${trip.number_of_days} days`);
  }

  const cost = trip.estimated_expenses || trip.budget;
  if (cost) {
    parts.push(`$${cost} estimated`);
  }

  return parts.length ? parts.join(" · ") : "View live daily itinerary";
}

loadTrips();

async function loadTrips() {
  try {
    allTrips = rows(await (memberView ? api.trips.list() : api.trips.preMade()));
    currentPage = 1;
    renderTrips();
  } catch (error) {
    target.innerHTML = '<div class="empty">Unable to load journeys right now.</div>';
    if (paginationTarget) paginationTarget.innerHTML = "";
  }
}

function renderTrips() {
  if (!allTrips.length) {
    target.innerHTML = '<div class="empty">No trips are available.</div>';
    if (paginationTarget) paginationTarget.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(allTrips.length / PAGE_SIZE);
  currentPage = Math.min(Math.max(1, currentPage), totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allTrips.slice(start, start + PAGE_SIZE);

  target.innerHTML = pageItems.map(trip => {
    const id = trip.trip_id || trip.trip?.id || trip.template_trip_id || trip.id;
    const title = formatTripTitle(trip);
    const meta = formatTripMeta(trip);
    const isAiTrip = Boolean(trip.is_ai_generated || trip.is_ai || trip.ai_generated);
    const itineraryLink = catalogView && id ? ' <a class="button subtle" href="/pages/trip-details?id=' + id + '">View itinerary</a>' : "";
    const reviewBtn = (memberView && id && isAiTrip)
      ? ` <a class="button subtle" href="/pages/reviews.html?type=trip&id=${encodeURIComponent(id)}&name=${encodeURIComponent(title)}">Write a review</a>`
      : "";
    const action = memberView
      ? id
        ? `<a class="button subtle" href="/pages/trip-details?id=${id}">View itinerary</a>${reviewBtn}`
        : '<span class="muted">This trip is missing its itinerary reference.</span>'
      : session.isLoggedIn() && id
        ? `<button class="button" type="button" data-book-trip="${escapeHtml(id)}">Add to my trips</button>${itineraryLink}`
        : `<a class="button subtle" href="/pages/login.html?returnTo=%2Fpages%2Ftrips.html%3Fcatalog%3D1">Sign in to add this trip</a>${itineraryLink}`;

    return `<article class="result-card">
      <div class="eyebrow">${escapeHtml(trip.destination || trip.country || "JOURNEY")}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(meta)}</p>
      ${action}
      ${!memberView ? favouriteControl(id, "trip") : ""}
    </article>`;
  }).join("");

  bindFavouriteControls(target);

  target.querySelectorAll("[data-book-trip]").forEach(button => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await api.trips.book(button.dataset.bookTrip);
      notify("Trip added to your travel plans.");
      location.assign("/pages/trips.html");
    } catch (error) {
      button.disabled = false;
      notify(error.message, true);
    }
  }));

  if (paginationTarget) {
    if (totalPages > 1) {
      paginationTarget.innerHTML = `
        <button class="button subtle" type="button" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>← Previous</button>
        <span>Page ${currentPage} of ${totalPages} (${allTrips.length} journeys)</span>
        <button class="button subtle" type="button" data-page="next" ${currentPage >= totalPages ? "disabled" : ""}>Next →</button>
      `;
      paginationTarget.querySelectorAll("[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
          currentPage += btn.dataset.page === "prev" ? -1 : 1;
          renderTrips();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    } else {
      paginationTarget.innerHTML = "";
    }
  }
}
