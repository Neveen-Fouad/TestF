import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, showRecoverableState } from "../shared/navigation.js";
import { constrainDateRange } from "../shared/forms.js";

mountNavigation("hotels");
const target = document.querySelector("#hotels");
const form = document.querySelector("#search");
const count = document.querySelector("#compare-count");
const selected = () => JSON.parse(sessionStorage.getItem("journovo_compare_hotels") || "[]");
const hotelKey = hotel => String(hotel.id || hotel.hotel_id || hotel.property?.id || hotel.name || hotel.hotel_name || "");
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
    sessionStorage.setItem("journovo_selected_hotel", JSON.stringify(hotels[Number(link.dataset.details)]));
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

  target.querySelectorAll("[data-favorite]").forEach(button => button.addEventListener("click", async () => {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await api.favourites.add(button.dataset.favorite, "hotel");
      button.textContent = "Saved";
      notify("Saved to Favorites.");
    } catch (error) {
      button.disabled = false;
      button.textContent = label;
      notify(error.message, true);
    }
  }));
}

async function runSearch() {
  target.innerHTML = '<div class="empty">Loading hotels…</div>';
  const filters = Object.fromEntries(new FormData(form));
  sessionStorage.setItem("journovo_hotel_search", JSON.stringify(filters));
  try {
    const hotels = rows(await api.hotels.search(filters));
    const selectedKeys = new Set(selected().map(hotelKey));
    target.innerHTML = hotels.length ? `${hotels.map((hotel, index) => {
      const name = hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
      const id = hotel.id || hotel.hotel_id || hotel.property?.id || index;
      const price = hotel.price || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "Price on request";
      return `<article class="result-card"><p class="eyebrow">Hotel</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(hotel.address || hotel.city || hotel.property?.address || "")}</p><p>★ ${escapeHtml(hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—")} · ${escapeHtml(price)}</p><label><input type="checkbox" data-compare="${index}" ${selectedKeys.has(hotelKey(hotel)) ? "checked" : ""}> Compare</label> <a class="button subtle" data-details="${index}" href="/pages/hotel-details.html?id=${encodeURIComponent(id)}">View details</a>${session.isLoggedIn() ? ` <button class="button subtle" type="button" data-favorite="${escapeHtml(id)}">Save</button>` : ""}</article>`;
    }).join("")}<p class="results-summary" role="status">${hotels.length} stay${hotels.length === 1 ? "" : "s"} found for ${escapeHtml(filters.destination)}.</p>` : '<div class="empty">No hotels matched those details. Try changing your dates, budget, or destination.</div>';
    bindHotelActions(hotels);
    focusResults();
  } catch (error) {
    showRecoverableState(target, error.message, { action: runSearch });
  }
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
