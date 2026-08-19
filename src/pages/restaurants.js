import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, showRecoverableState } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("restaurants");
const target = document.querySelector("#restaurants");
const form = document.querySelector("#restaurant-search");
let currentPage = 1;

function focusResults() {
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

function extractAddress(restaurant) {
  const addr = restaurant.address;
  if (!addr) {
    if (restaurant.parent_location) {
      return typeof restaurant.parent_location === "object" ? (restaurant.parent_location.name || "") : String(restaurant.parent_location);
    }
    return typeof restaurant.location === "object" ? (restaurant.location.name || "") : String(restaurant.location || "");
  }
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    if (addr.address) return addr.address;
    const parts = [addr.street || addr.street1, addr.city, addr.country].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return addr.name || addr.country || "";
  }
  return "";
}

function extractCuisines(restaurant) {
  if (Array.isArray(restaurant.cuisines) && restaurant.cuisines.length) {
    return restaurant.cuisines.map(c => typeof c === "object" ? (c.name || c.tag_name || "") : String(c)).filter(Boolean).join(" · ");
  }
  if (typeof restaurant.cuisine === "string" && restaurant.cuisine.trim()) return restaurant.cuisine.trim();
  if (Array.isArray(restaurant.establishment_types) && restaurant.establishment_types.length) {
    return restaurant.establishment_types.map(t => typeof t === "object" ? (t.name || "") : String(t)).filter(Boolean).join(" · ");
  }
  return "";
}

function extractPrice(restaurant) {
  const candidates = [
    restaurant.price_range,
    restaurant.price,
    restaurant.price_tag,
    restaurant.prices,
    restaurant.price_level
  ];

  for (const val of candidates) {
    if (!val || (typeof val !== "string" && typeof val !== "number")) continue;
    const str = String(val).trim();
    if (!str) continue;

    // Only return if it contains actual numeric price info (e.g. "$15 - $40", "150 EGP", "£25")
    if (/\d/.test(str)) {
      return str;
    }
  }

  // Omit generic symbols like "$$ - $$$" when no actual price is available
  return "";
}

function extractAward(award) {
  if (!award) return "";
  if (typeof award === "string") return award;
  if (typeof award === "object") {
    return `${award.award_name || "Award"} ${award.year || ""}`.trim();
  }
  return "";
}

async function searchRestaurants() {
  target.innerHTML = '<div class="empty">Finding restaurants…</div>';
  const values = Object.fromEntries(new FormData(form));
  values.page = currentPage;
  sessionStorage.setItem("journovo_restaurant_search", JSON.stringify(values));
  try {
    const payload = await api.restaurants.list(values.city, currentPage, values.min_rating);
    const items = rows(payload);
    const totalPages = payload?.total_pages || payload?.data?.total_pages || payload?.last_page || 1;
    const hasNext = payload?.next || (payload?.next_page_url || payload?.data?.next_page_url) || (currentPage < totalPages && items.length >= 10);
    const isLastPage = !hasNext || (currentPage >= totalPages);

    const controls = `<div class="pagination-controls">
      <button class="button subtle" type="button" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>← Previous</button>
      <span>Page ${currentPage}${totalPages > 1 ? ` of ${totalPages}` : ""}</span>
      <button class="button subtle" type="button" data-page="next" ${isLastPage ? "disabled" : ""}>Next →</button>
    </div>`;

    target.innerHTML = items.length ? `
      ${items.map(item => {
        const restaurant = item.restaurant || item;
        const name = restaurant.name || restaurant.title || "Restaurant";
        const id = restaurant.tripadvisor_entity_id || restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId;
        const address = extractAddress(restaurant);
        const cuisines = extractCuisines(restaurant);
        const rating = restaurant.rating || restaurant.averageRating || restaurant.score || null;
        const reviewCount = restaurant.reviews || restaurant.review_count || restaurant.num_reviews || null;
        const priceRange = extractPrice(restaurant);
        const image = restaurant.featured_image || restaurant.photo?.images?.large?.url || restaurant.photo?.images?.medium?.url || restaurant.image || "";
        const statusText = restaurant.status_text || (restaurant.is_open_now === true ? "Open now" : restaurant.is_open_now === false ? "Closed" : "");
        const isOpen = restaurant.is_open_now ?? (statusText ? statusText.toLowerCase().includes("open") : null);
        const phone = restaurant.phone || restaurant.telephone || "";
        const menuLink = restaurant.menu_link || "";
        const tripadvisorLink = restaurant.link || restaurant.web_url || "";
        const award = extractAward(restaurant.award);
        const snippet = restaurant.review_snippets?.[0]?.snippet_text?.replaceAll("\ufff9", "")?.replaceAll("\ufffb", "") || "";

        return `
          <article class="result-card restaurant-card">
            ${image ? `
              <div class="restaurant-image-wrap">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">
                ${award ? `<span class="restaurant-award-badge">🏆 ${escapeHtml(award)}</span>` : ""}
              </div>
            ` : ""}
            <div class="restaurant-content">
              <div class="restaurant-eyebrow-row">
                <span class="eyebrow">${escapeHtml(values.city || "RESTAURANT")}</span>
                ${statusText ? `<span class="status-pill ${isOpen ? "is-open" : "is-closed"}">${escapeHtml(statusText)}</span>` : ""}
              </div>
              <h3 class="restaurant-name">${escapeHtml(name)}</h3>
              ${address ? `<p class="restaurant-address">${escapeHtml(address)}</p>` : ""}
              <div class="restaurant-meta-row">
                ${rating ? `<span class="restaurant-rating">★ ${escapeHtml(String(rating))}</span>` : ""}
                ${reviewCount ? `<span class="restaurant-reviews">(${escapeHtml(String(reviewCount))} reviews)</span>` : ""}
                ${priceRange ? `<span class="restaurant-price">· ${escapeHtml(priceRange)}</span>` : ""}
              </div>
              ${cuisines ? `<p class="restaurant-cuisines">🍽️ ${escapeHtml(cuisines)}</p>` : ""}
              ${phone ? `<p class="restaurant-phone">📞 ${escapeHtml(phone)}</p>` : ""}
              ${snippet ? `<blockquote class="restaurant-snippet">“${escapeHtml(snippet)}”</blockquote>` : ""}
              <div class="restaurant-actions">
                ${menuLink ? `<a class="button subtle" href="${escapeHtml(menuLink)}" target="_blank" rel="noopener noreferrer">Menu ↗</a>` : ""}
                ${tripadvisorLink ? `<a class="button subtle" href="${escapeHtml(tripadvisorLink)}" target="_blank" rel="noopener noreferrer">Tripadvisor ↗</a>` : ""}
                ${favouriteControl(id, "restaurant")}
              </div>
            </div>
          </article>
        `;
      }).join("")}
      <p class="results-summary" role="status">${items.length} restaurant${items.length === 1 ? "" : "s"} found in ${escapeHtml(values.city)}.</p>
      ${controls}
    ` : `<div class="empty">No restaurants matched those details. Try a nearby city or a lower rating.</div>${currentPage > 1 ? controls : ""}`;

    focusResults();
    bindFavouriteControls(target);
    target.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
      currentPage += button.dataset.page === "prev" ? -1 : 1;
      searchRestaurants();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  } catch (error) {
    showRecoverableState(target, error.message, { action: searchRestaurants });
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  currentPage = 1;
  searchRestaurants();
});

try {
  const savedSearch = JSON.parse(sessionStorage.getItem("journovo_restaurant_search") || "null");
  if (savedSearch) Object.entries(savedSearch).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value;
  });
} catch {}
