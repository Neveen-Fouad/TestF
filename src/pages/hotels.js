import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify } from "../shared/navigation.js";

mountNavigation("hotels");
const target = document.querySelector("#hotels");
const selected = () => JSON.parse(sessionStorage.getItem("journovo_compare_hotels") || "[]");
const save = hotels => sessionStorage.setItem("journovo_compare_hotels", JSON.stringify(hotels));

// Set minimum dates to today
const today = new Date().toISOString().split("T")[0];
document.querySelectorAll("input[type='date']").forEach(el => el.min = today);
const checkIn = document.querySelector("[name='check_in']");
const checkOut = document.querySelector("[name='check_out']");
if (checkIn && checkOut) {
  checkIn.addEventListener("change", () => {
    checkOut.min = checkIn.value || today;
    if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = "";
  });
}

document.querySelector("#search").addEventListener("submit", async event => {
  event.preventDefault();
  target.innerHTML = '<div class="empty">Loading hotels…</div>';
  const filters = Object.fromEntries(new FormData(event.currentTarget));
  filters.guests = Number(filters.guests);
  filters.budget = Number(filters.budget);

  try {
    // POST /hotels/search (SearchController@searchHotels via HotelSearchRequest)
    const response = await api.hotels.search(filters);
    // Backend returns { data: { destination, check_in, check_out, guests, budget, count, hotels: [...] } }
    // hotels is the array from the external API (Hotels.com v3)
    const hotels = response?.data?.hotels ?? response?.hotels ?? rows(response);

    if (!Array.isArray(hotels) || hotels.length === 0) {
      target.innerHTML = '<div class="empty">No hotels matched those details.</div>';
      return;
    }

    target.innerHTML = hotels.map((hotel, index) => {
      // Hotels.com v3 shape: hotel.summary.name, hotel.summary.location.address, hotel.priceBreakdown, etc.
      const name = hotel.summary?.name || hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
      const id = hotel.hotelId || hotel.id || hotel.hotel_id || hotel.property?.id || index;
      const price = hotel.priceBreakdown?.grossPrice?.value
        ? `$${hotel.priceBreakdown.grossPrice.value} ${hotel.priceBreakdown.grossPrice.currency || ""}`
        : hotel.price || hotel.price_per_night || "Price on request";
      const rating = hotel.reviewInfo?.summary?.overallScoreWithDescriptionA11y?.value
        || hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—";
      const address = hotel.summary?.location?.address?.addressLine
        || hotel.address || hotel.city || filters.destination || "";

      return `<article class="result-card">
        <p class="eyebrow">HOTEL</p>
        <h3>${escapeHtml(String(name))}</h3>
        ${address ? `<p>${escapeHtml(String(address))}</p>` : ""}
        <p>★ ${escapeHtml(String(rating))} · ${escapeHtml(String(price))}</p>
        <label><input type="checkbox" data-compare="${index}"> Compare</label>
        ${session.isLoggedIn() ? `<button class="button subtle" style="margin-top:8px;" data-favorite="${escapeHtml(String(id))}">Save</button>` : ""}
      </article>`;
    }).join("");

    target.querySelectorAll("[data-compare]").forEach(input => {
      input.addEventListener("change", () => {
        const item = { ...hotels[Number(input.dataset.compare)], searchCity: filters.destination };
        let values = selected().filter(value => String(value.id || value.hotelId) !== String(item.id || item.hotelId));
        if (input.checked) values.push(item);
        if (values.length > 3) { input.checked = false; return notify("Compare up to three hotels.", true); }
        save(values);
      });
    });

    target.querySelectorAll("[data-favorite]").forEach(button => {
      button.addEventListener("click", async () => {
        try { await api.favourites.add(button.dataset.favorite, "hotel"); notify("Saved to Favorites."); }
        catch (error) { notify(error.message, true); }
      });
    });
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
});
