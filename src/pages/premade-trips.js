import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("trips");

const target = document.querySelector("#premade-trips");

function navigateTo(href) {
  location.assign(href);
}

function cardKeyboardActivate(handler) {
  return event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  };
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";

const cityImages = {
  "cairo": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=800&q=80",
  "egypt": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=800&q=80",
  "giza": "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80",
  "alexandria": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=800&q=80",
  "luxor": "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80",
  "aswan": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80",
  "tokyo": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
  "japan": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
  "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
  "france": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
  "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
  "italy": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
  "istanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
  "turkey": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
  "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
  "uae": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
  "barcelona": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=800&q=80",
  "spain": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80",
  "athens": "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=800&q=80",
  "greece": "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=800&q=80",
  "lisbon": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=800&q=80",
  "portugal": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=800&q=80",
  "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
  "uk": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80"
};

function getTripImage(destination) {
  if (!destination) return DEFAULT_IMAGE;
  const lower = String(destination).toLowerCase();
  for (const [key, url] of Object.entries(cityImages)) {
    if (lower.includes(key)) return url;
  }
  return DEFAULT_IMAGE;
}

const PAGE_SIZE = 6;
let currentPage = 1;
let allTrips = [];
const paginationTarget = document.querySelector("#premade-trips-pagination");

loadPremadeTrips();

async function loadPremadeTrips() {
  try {
    allTrips = rows(await api.trips.preMade());
    currentPage = 1;
    renderTrips();
  } catch {
    target.innerHTML = '<div class="empty">Journeys are unavailable right now. Please try again shortly.</div>';
    if (paginationTarget) paginationTarget.innerHTML = "";
  }
}

function renderTrips() {
  if (!allTrips.length) {
    target.innerHTML = '<div class="empty">No premade trips are available right now.</div>';
    if (paginationTarget) paginationTarget.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(allTrips.length / PAGE_SIZE);
  currentPage = Math.min(Math.max(1, currentPage), totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allTrips.slice(start, start + PAGE_SIZE);

  target.innerHTML = pageItems.map((trip, index) => renderTripCard(trip, start + index)).join("");
  bindFavouriteControls(target);

  target.querySelectorAll(".journey-card[data-trip-href]").forEach(card => {
    const href = card.dataset.tripHref;
    card.addEventListener("click", event => {
      if (event.target.closest("a, button")) return;
      navigateTo(href);
    });
    card.addEventListener("keydown", cardKeyboardActivate(() => navigateTo(href)));
  });

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
          document.querySelector("#premade-trips-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    } else {
      paginationTarget.innerHTML = "";
    }
  }
}

function renderTripCard(trip, index) {
  const id = trip.id;
  const destination = trip.destination || trip.country || "JOURNEY";
  const title = trip.style || trip.title || trip.name || "A journey to make your own";
  const description = trip.number_of_days ? `${trip.number_of_days} days` : trip.description || "A thoughtfully paced escape, ready for your personal touch.";
  const imageUrl = getTripImage(destination);
  if (!id) {
    return `
      <article class="journey-card">
        <img src="${imageUrl}" alt="${escapeHtml(destination)}" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE}'">
        <div class="journey-number">${String(index + 1).padStart(2, "0")}</div>
        <div>
          <p class="eyebrow">${escapeHtml(destination)}</p>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
      </article>
    `;
  }
  const href = `/pages/trip-details?id=${trip.id}`;
  return `
    <article class="journey-card premade-trip-card clickable-card" tabindex="0" role="link" aria-label="${escapeHtml(title)}" data-trip-href="${href}">
      <img src="${imageUrl}" alt="${escapeHtml(destination)}" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE}'">
      <div class="journey-number">${String(index + 1).padStart(2, "0")}</div>
      <div>
        <p class="eyebrow">${escapeHtml(destination)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
        <a class="text-action" href="${href}" onclick="event.stopPropagation()">View journey <span aria-hidden="true">→</span></a>
        ${favouriteControl(id, "trip")}
      </div>
    </article>
  `;
}