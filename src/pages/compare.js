import { api } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();
const target = document.querySelector("#comparison");
if (requireLogin()) {
  mountSidebar("compare");
  const selected = JSON.parse(sessionStorage.getItem("journovo_compare_hotels") || "[]");
  if (selected.length < 2) {
    target.innerHTML = '<div class="empty">Select at least two hotels from the Hotels page to compare them.</div>';
  } else {
    try {
      const refreshed = await Promise.all(selected.map(async hotel => {
        const id = hotel.id || hotel.hotel_id || hotel.property?.id;
        try { return (await api.hotels.details(id))?.data || hotel; }
        catch { return hotel; }
      }));
      target.innerHTML = refreshed.map((hotel, index) => {
        const amenities = Array.isArray(hotel.amenities) ? hotel.amenities.join(", ") : (hotel.amenities || "Amenities supplied by the hotel API.");
        return `<article class="result-card">
          <h3>${escapeHtml(hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel")}</h3>
          <p>${escapeHtml(hotel.address || hotel.city || hotel.property?.address || "")}</p>
          <p class="compare-value">${escapeHtml(hotel.price || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "—")}</p>
          <p>Rating: ${escapeHtml(hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—")}</p>
          <p>${escapeHtml(amenities)}</p>
          <button class="button subtle" type="button" data-remove-compare="${index}">Remove</button>
        </article>`;
      }).join("");
      target.querySelectorAll("[data-remove-compare]").forEach(button => button.addEventListener("click", () => {
        selected.splice(Number(button.dataset.removeCompare), 1);
        sessionStorage.setItem("journovo_compare_hotels", JSON.stringify(selected));
        location.reload();
      }));
    } catch (error) {
      target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
  }
}
