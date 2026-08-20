import { api, rows, session } from "../shared/api.js";
import { getHotelId } from "../shared/hotels.js";
import { escapeHtml, mountNavigation, notify, showRecoverableState } from "../shared/navigation.js";
import { constrainDateRange } from "../shared/forms.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("hotels");
const target = document.querySelector("#hotels");
const form = document.querySelector("#search");
const count = document.querySelector("#compare-count");
const PAGE_SIZE = 9;
let hotels = [];
let currentPage = 1;
const selected = () => JSON.parse(sessionStorage.getItem("journovo_compare_hotels") || "[]");
const hotelKey = hotel => getHotelId(hotel) || String(hotel.name || hotel.hotel_name || "");
const save = hotels => {
  sessionStorage.setItem("journovo_compare_hotels", JSON.stringify(hotels));
  if (count) count.textContent = String(hotels.length);
};

save(selected());
constrainDateRange(form, "check_in", "check_out");

function focusResults() {
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

function extractHotelData(hotel) {
  const name = hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
  const id = getHotelId(hotel);
  const media = hotel.mediaSection?.media || hotel.images || [];
  const image = media[0]?.url || hotel.propertyImage?.image?.url || hotel.image || hotel.thumbnail || "";
  const rating = hotel.guestRating?.rating || hotel.rating || hotel.review_score || hotel.property?.reviewScore || null;
  const totalReviews = hotel.guestRating?.totalReviews || hotel.reviews_count || hotel.total_reviews || null;
  const starRating = hotel.guestRating?.starRating || null;

  const priceObj = typeof hotel.price === "object" ? hotel.price : null;
  const displayPrice = priceObj?.priceSummary?.definition?.displayPrice ||
    priceObj?.priceSummary?.displayPrices?.find(p => p.role === "LEAD")?.price?.formatted ||
    (typeof hotel.price === "string" ? hotel.price : null) ||
    hotel.price_per_night ||
    hotel.priceBreakdown?.grossPrice?.value ||
    "Price on request";

  const strikeOut = priceObj?.priceSummary?.definition?.strikeOut ||
    priceObj?.priceSummary?.displayPrices?.find(p => p.role === "STRIKEOUT")?.price?.formatted ||
    "";

  const discountBadge = priceObj?.badge?.text || priceObj?.standardBadge?.text || "";
  const nightlyRate = priceObj?.priceSummary?.displayPrices?.find(p => p.value?.includes("night"))?.value || "";
  const periodText = priceObj?.priceSummary?.displayPrices?.find(p => p.value?.includes("for ") || p.value?.includes("nights"))?.value || "";

  const messages = Array.isArray(hotel.messages) ? hotel.messages : [];
  const location = hotel.address || hotel.city || hotel.property?.address || (messages.length ? messages[messages.length - 1] : "");
  const roomType = messages.length > 1 ? messages[0] : "";
  const capacity = messages.length > 2 ? messages[1] : "";
  const amenities = Array.isArray(hotel.short_amenities) ? hotel.short_amenities : (Array.isArray(hotel.amenities) ? hotel.amenities : []);

  return {
    name,
    id,
    image,
    rating,
    totalReviews,
    starRating,
    displayPrice,
    strikeOut,
    discountBadge,
    nightlyRate,
    periodText,
    location,
    roomType,
    capacity,
    amenities
  };
}

function bindHotelActions(hotels) {
  target.querySelectorAll("[data-details]").forEach(link => link.addEventListener("click", () => {
    const hotel = hotels[Number(link.dataset.details)];
    const hotelId = getHotelId(hotel);
    sessionStorage.setItem("journovo_selected_hotel", JSON.stringify(hotel));
    if (hotelId) sessionStorage.setItem("journovo_selected_hotel_id", hotelId);
  }));

  target.querySelectorAll(".hotel-card.clickable-card").forEach(card => {
    const href = card.dataset.cardHref;
    if (!href) return;
    card.addEventListener("click", event => {
      if (event.target.closest("a, button, label")) return;
      location.assign(href);
    });
    card.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("a, button, label")) {
        event.preventDefault();
        location.assign(href);
      }
    });
  });

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
  target.innerHTML = '<div class="empty">Finding available hotels…</div>';
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
  const pagination = hotels.length > PAGE_SIZE ? `
    <div class="pagination-controls">
      <button class="button subtle" type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>← Previous</button>
      <span>Page ${currentPage} of ${pages}</span>
      <button class="button subtle" type="button" data-page="next" ${currentPage === pages ? "disabled" : ""}>Next →</button>
    </div>` : "";

  target.innerHTML = hotels.length ? `
    ${pageHotels.map((hotel, index) => {
      const data = extractHotelData(hotel);
      const hotelHref = data.id ? `./hotel-details.html?id=${encodeURIComponent(data.id)}` : "";
      const detailsAction = data.id
        ? `<a class="button subtle" data-details="${start + index}" href="${hotelHref}">View details</a>`
        : '<span class="muted">Details unavailable</span>';

      return `
        <article class="result-card hotel-card${hotelHref ? ' clickable-card' : ''}"${hotelHref ? ` tabindex="0" role="link" aria-label="View details for ${escapeHtml(data.name)}" data-card-href="${escapeHtml(hotelHref)}"` : ""}>
          ${data.image ? `
            <div class="hotel-image-wrap">
              <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.name)}" loading="lazy">
              ${data.discountBadge ? `<span class="hotel-discount-badge">${escapeHtml(data.discountBadge)}</span>` : ""}
              ${data.starRating ? `<span class="hotel-star-badge">${escapeHtml(String(data.starRating))}★</span>` : ""}
            </div>
          ` : ""}
          <div class="hotel-content">
            <div class="hotel-eyebrow-row">
              <span class="eyebrow">${escapeHtml(data.location || filters.destination || "STAY")}</span>
              ${data.rating ? `<span class="hotel-rating-pill">★ ${escapeHtml(String(data.rating))}${data.totalReviews ? ` <small>(${escapeHtml(String(data.totalReviews))})</small>` : ""}</span>` : ""}
            </div>
            <h3 class="hotel-name">${escapeHtml(data.name)}</h3>
            ${data.roomType || data.capacity ? `<p class="hotel-room-info">${[data.roomType, data.capacity].filter(Boolean).map(escapeHtml).join(" · ")}</p>` : ""}
            ${data.amenities.length ? `
              <div class="hotel-amenities-row">
                ${data.amenities.slice(0, 2).map(a => `<span class="hotel-amenity-pill">✓ ${escapeHtml(a)}</span>`).join("")}
              </div>
            ` : ""}
            <div class="hotel-price-row">
              <div class="hotel-price-wrap">
                ${data.strikeOut ? `<span class="hotel-strike-price">${escapeHtml(data.strikeOut)}</span>` : ""}
                <b class="hotel-lead-price">${escapeHtml(data.displayPrice)}</b>
                ${data.nightlyRate ? `<span class="hotel-nightly-rate">· ${escapeHtml(data.nightlyRate)}</span>` : ""}
              </div>
              ${data.periodText ? `<span class="hotel-period-text">${escapeHtml(data.periodText)}</span>` : ""}
            </div>
            <div class="hotel-actions">
              <label class="hotel-compare-label"><input type="checkbox" data-compare="${start + index}" ${selectedKeys.has(hotelKey(hotel)) ? "checked" : ""}> Compare</label>
              ${detailsAction}
              ${favouriteControl(data.id, "hotel")}
            </div>
          </div>
        </article>
      `;
    }).join("")}
    <p class="results-summary" role="status">${hotels.length} stay${hotels.length === 1 ? "" : "s"} found for ${escapeHtml(filters.destination || "your search")}.</p>
    ${pagination}
  ` : '<div class="empty">No hotels matched those details. Try changing your dates, budget, or destination.</div>';

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
