import { api, rows, session } from "../shared/api.js";
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

async function searchRestaurants() {
  target.innerHTML = '<div class="empty">Finding restaurants…</div>';
  const values = Object.fromEntries(new FormData(form));
  values.page = currentPage;
  sessionStorage.setItem("journovo_restaurant_search", JSON.stringify(values));
  try {
    const payload = await api.restaurants.list(values.city, currentPage, values.min_rating);
    const items = rows(payload);
    const nextPageUrl = payload?.next_page_url || payload?.data?.next_page_url;
    const isLastPage = nextPageUrl ? false : (Boolean(payload?.last_page && currentPage >= Number(payload.last_page)) || items.length < 10);
    const controls = `<div class="pagination-controls"><button class="button subtle" type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>← Previous</button><span>Page ${currentPage}</span><button class="button subtle" type="button" data-page="next" ${isLastPage ? "disabled" : ""}>Next →</button></div>`;
    target.innerHTML = items.length ? `${items.map(item => {
      const restaurant = item.restaurant || item;
      const name = restaurant.name || restaurant.title || "Restaurant";
      const id = restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId;
      const detailsLink = id ? ` <a class="button subtle" href="/pages/restaurant-details.html?id=${encodeURIComponent(id)}">View details</a>` : "";
      const reviewLink = session.isLoggedIn() && id ? ` <a class="button subtle" href="/pages/reviews.html?type=restaurant&id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}">Write a review</a>` : "";
      return `<article class="result-card"><p class="eyebrow">Restaurant</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(restaurant.address || restaurant.location?.name || restaurant.location || "")}</p><p>★ ${escapeHtml(restaurant.rating || restaurant.averageRating || "—")}${restaurant.cuisine ? ` · ${escapeHtml(restaurant.cuisine)}` : ""}</p>${detailsLink}${reviewLink}${favouriteControl(id, "restaurant")}</article>`;
    }).join("")}<p class="results-summary" role="status">${items.length} restaurant${items.length === 1 ? "" : "s"} found in ${escapeHtml(values.city)}.</p>${controls}` : `<div class="empty">No restaurants matched those details. Try a nearby city or a lower rating.</div>${currentPage > 1 ? controls : ""}`;
    focusResults();
    bindFavouriteControls(target);
    target.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => { currentPage += button.dataset.page === "prev" ? -1 : 1; searchRestaurants(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }));
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
