import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("restaurants");
const target = document.querySelector("#restaurants");

document.querySelector("#restaurant-search").addEventListener("submit", async event => {
  event.preventDefault();
  target.innerHTML = '<div class="empty">Finding restaurants…</div>';
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const items = rows(await api.restaurants.list(values.city, values.page));
    target.innerHTML = items.length ? items.map(item => {
      const restaurant = item.restaurant || item;
      const name = restaurant.name || restaurant.title || "Restaurant";
      const id = restaurant.id || restaurant.location_id || restaurant.locationId || restaurant.documentId;
      const reviewLink = session.isLoggedIn() && id ? ` <a class="button subtle" href="/pages/reviews.html?type=restaurant&id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}">Write a review</a>` : "";
      return `<article class="result-card"><p class="eyebrow">RESTAURANT</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(restaurant.address || restaurant.location?.name || restaurant.location || "")}</p><p>★ ${escapeHtml(restaurant.rating || restaurant.averageRating || "—")}${restaurant.cuisine ? ` · ${escapeHtml(restaurant.cuisine)}` : ""}</p>${reviewLink}</article>`;
    }).join("") : '<div class="empty">No restaurants matched that city.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
});
