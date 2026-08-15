import { api } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("restaurants");
const id = new URLSearchParams(location.search).get("id");
const target = document.querySelector("#details");

if (!id) {
  target.innerHTML = '<div class="empty">Choose a restaurant from the <a class="text-action" href="/pages/restaurants.html">restaurant search</a>.</div>';
} else {
  try {
    const payload = await api.restaurants.details(id);
    const restaurant = payload?.data || payload?.restaurant || payload || {};
    const name = restaurant.name || restaurant.title || "Restaurant";
    const address = restaurant.address || restaurant.location?.name || restaurant.location || "Address unavailable";
    const rating = restaurant.rating || restaurant.averageRating || "—";
    const cuisine = restaurant.cuisine || restaurant.category || restaurant.categories?.map?.(item => item.name || item).filter(Boolean).join(", ");
    const description = restaurant.description || restaurant.about || restaurant.summary || address;
    target.innerHTML = `<p class="eyebrow">RESTAURANT DETAILS</p><h1>${escapeHtml(name)}</h1><p class="lead">${escapeHtml(description)}</p><p>${escapeHtml(address)}</p><p>Rating: ${escapeHtml(rating)}${cuisine ? ` · ${escapeHtml(cuisine)}` : ""}</p><div class="detail-actions"><a class="button subtle" href="/pages/reviews.html?type=restaurant&id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}">Write a review</a><a class="button subtle" href="/pages/restaurants.html">Back to search</a>${favouriteControl(id, "restaurant")}</div>`;
    bindFavouriteControls(target);
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)} <a class="text-action" href="/pages/restaurants.html">Search again</a></div>`;
  }
}
