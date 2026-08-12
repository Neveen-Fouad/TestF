import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify } from "../shared/navigation.js";

mountNavigation("hotels");
const target = document.querySelector("#hotels");
const count = document.querySelector("#compare-count");
const selected = () => JSON.parse(sessionStorage.getItem("journovo_compare_hotels") || "[]");
const hotelKey = hotel => String(hotel.id || hotel.hotel_id || hotel.property?.id || hotel.name || hotel.hotel_name || "");
const save = hotels => { sessionStorage.setItem("journovo_compare_hotels", JSON.stringify(hotels)); count.textContent = String(hotels.length); };
save(selected());

document.querySelector("#search").addEventListener("submit", async event => {
  event.preventDefault();
  target.innerHTML = '<div class="empty">Loading hotels…</div>';
  const filters = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const hotels = rows(await api.hotels.search(filters));
    const selectedKeys = new Set(selected().map(hotelKey));
    target.innerHTML = hotels.length ? hotels.map((hotel, index) => {
      const name = hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
      const id = hotel.id || hotel.hotel_id || hotel.property?.id || index;
      const price = hotel.price || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "Price on request";
      return `<article class="result-card"><p class="eyebrow">HOTEL</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(hotel.address || hotel.city || hotel.property?.address || "")}</p><p>★ ${escapeHtml(hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—")} · ${escapeHtml(price)}</p><label><input type="checkbox" data-compare="${index}" ${selectedKeys.has(hotelKey(hotel)) ? "checked" : ""}> Compare</label> <a class="button subtle" data-details="${index}" href="/pages/hotel-details.html?id=${encodeURIComponent(id)}">View details</a>${session.isLoggedIn() ? ` <button class="button subtle" data-favorite="${escapeHtml(id)}">Save</button>` : ""}</article>`;
    }).join("") : '<div class="empty">No hotels matched those details.</div>';

    target.querySelectorAll("[data-details]").forEach(link => link.addEventListener("click", () => sessionStorage.setItem("journovo_selected_hotel", JSON.stringify(hotels[Number(link.dataset.details)]))));
    target.querySelectorAll("[data-compare]").forEach(input => input.addEventListener("change", () => {
      const item = hotels[Number(input.dataset.compare)];
      let values = selected().filter(value => hotelKey(value) !== hotelKey(item));
      if (input.checked) values.push(item);
      if (values.length > 3) { input.checked = false; return notify("Compare up to three hotels.", true); }
      save(values);
    }));
    target.querySelectorAll("[data-favorite]").forEach(button => button.addEventListener("click", async () => {
      try { await api.favourites.add(button.dataset.favorite, "hotel"); notify("Saved to Favorites."); }
      catch (error) { notify(error.message, true); }
    }));
  } catch (error) { target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
});
