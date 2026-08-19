import { api, rows, session } from "../shared/api.js";
import { getHotelId } from "../shared/hotels.js";
import { escapeHtml, mountNavigation, notify, showRecoverableState } from "../shared/navigation.js";
import { constrainDateRange } from "../shared/forms.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("hotels");
const target = document.querySelector("#hotels");
const form = document.querySelector("#search");
const count = document.querySelector("#compare-count");
const PAGE_SIZE = 10;
let hotels = [];
let currentPage = 1;
const selected = () => JSON.parse(sessionStorage.getItem("journovo_compare_hotels") || "[]");
const hotelKey = hotel => getHotelId(hotel) || String(hotel.name || hotel.hotel_name || "");
const save = hotels => {
  sessionStorage.setItem("journovo_compare_hotels", JSON.stringify(hotels));
  count.textContent = String(hotels.length);
};

save(selected());
constrainDateRange(form, "check_in", "check_out");

function focusResults() {
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

function bindHotelActions(hotels) {
  target.querySelectorAll("[data-details]").forEach(link => link.addEventListener("click", () => {
    const hotel = hotels[Number(link.dataset.details)];
    const hotelId = getHotelId(hotel);
    sessionStorage.setItem("journovo_selected_hotel", JSON.stringify(hotel));
    if (hotelId) sessionStorage.setItem("journovo_selected_hotel_id", hotelId);
  }));

  target.querySelectorAll("[data-compare]").forEach(input => input.addEventListener("change", () => {
    const item = hotels[Number(input.dataset.compare)];
    let values = selected().filter(value => hotelKey(value) !== hotelKey(item));
    if (input.checked) values.push(item);
    if (values.length > 3) {
      input.checked = false;
      notify("Compare up to three hotels at once.", true);
      return;
    }
    save(values);
  }));

  bindFavouriteControls(target);
}

async function runSearch() {
  target.innerHTML = '<div class="empty">Loading hotels…</div>';
  const filters = Object.fromEntries(new FormData(form));
  sessionStorage.setItem("journovo_hotel_search", JSON.stringify(filters));
  try {
    hotels = rows(await api.hotels.search(filters));
    currentPage = 1;
    renderHotels(filters);
  } catch (error) {
    showRecoverableState(target, error.message, { action: runSearch });
  }
}

function renderHotels(filters) {
    const pages = Math.ceil(hotels.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, pages || 1);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageHotels = hotels.slice(start, start + PAGE_SIZE);
    const selectedKeys = new Set(selected().map(hotelKey));
    const pagination = hotels.length > PAGE_SIZE ? `<div class="pagination-controls"><button class="button subtle" type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>← Previous</button><span>Page ${currentPage} of ${pages}</span><button class="button subtle" type="button" data-page="next" ${currentPage === pages ? "disabled" : ""}>Next →</button></div>` : "";
    target.innerHTML = hotels.length ? `${pageHotels.map((hotel, index) => {
      const name = hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
      const id = getHotelId(hotel);
      const price = (typeof hotel.price === "object" ? hotel.price?.priceSummary?.definition?.displayPrice : hotel.price) || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "Price on request";
      const rating = hotel.guestRating?.rating || hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—";
      const address = hotel.address || hotel.city || hotel.property?.address || (hotel.messages?.length ? hotel.messages[hotel.messages.length - 1] : "");
      const detailsAction = id
        ? `<a class="button subtle" data-details="${start + index}" href="./hotel-details.html?id=${encodeURIComponent(id)}">View details</a>`
        : '<span class="muted">Hotel details are unavailable.</span>';
      const favouriteAction = session.isLoggedIn() && id
        ? ` <button class="button subtle" type="button" data-favorite="${escapeHtml(id)}">Save</button>`
        : "";
      return `<article class="result-card"><p class="eyebrow">Hotel</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(address)}</p><p>★ ${escapeHtml(rating)} · ${escapeHtml(price)}</p><label><input type="checkbox" data-compare="${start + index}" ${selectedKeys.has(hotelKey(hotel)) ? "checked" : ""}> Compare</label> ${detailsAction}${favouriteAction}</article>`;
    }).join("")}<p class="results-summary" role="status">${hotels.length} stay${hotels.length === 1 ? "" : "s"} found for ${escapeHtml(filters.destination)}.</p>${pagination}` : '<div class="empty">No hotels matched those details. Try changing your dates, budget, or destination.</div>';
    bindHotelActions(hotels);
    focusResults();
    target.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
      currentPage += button.dataset.page === "prev" ? -1 : 1;
      renderHotels(filters);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
}

form.addEventListener("submit", event => {
  event.preventDefault();
  runSearch();
});

try {
  const savedFilters = JSON.parse(sessionStorage.getItem("journovo_hotel_search") || "null");
  if (savedFilters) Object.entries(savedFilters).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value;
  });
} catch {}
