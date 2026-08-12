import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation();

document.querySelector("#restaurant-search").addEventListener("submit", async event => {
  event.preventDefault();
  const target = document.querySelector("#restaurants");
  target.innerHTML = '<div class="empty">Loading restaurants…</div>';
  const values = Object.fromEntries(new FormData(event.currentTarget));
  // min_rating must be integer or omitted
  if (!values.min_rating) delete values.min_rating;
  else values.min_rating = Number(values.min_rating);
  try {
    const restaurants = rows(await api.restaurants.list(values.city, values.min_rating));
    target.innerHTML = restaurants.length
      ? restaurants.map(item => {
          const name = item.restaurant?.name || item.name || item.title || "Restaurant";
          const address = item.restaurant?.address || item.location?.name || item.location || item.address || "";
          const rating = item.rating || item.restaurant?.rating || "";
          const cuisine = item.cuisine?.[0]?.name || item.cuisine || "";
          return `<article class="result-card">
            <p class="eyebrow">RESTAURANT</p>
            <h3>${escapeHtml(name)}</h3>
            ${address ? `<p>${escapeHtml(address)}</p>` : ""}
            <p>★ ${escapeHtml(String(rating))}${cuisine ? ` · ${escapeHtml(cuisine)}` : ""}</p>
          </article>`;
        }).join("")
      : '<div class="empty">No restaurants matched that city.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
});
