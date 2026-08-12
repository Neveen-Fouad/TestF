import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation();

const target = document.querySelector("#comparison");
const selected = JSON.parse(sessionStorage.getItem("journovo_compare_hotels") || "[]");

if (selected.length < 2) {
  target.innerHTML = '<div class="empty">Select at least two hotels from the Hotels page to compare them.</div>';
} else {
  try {
    // Re-fetch each hotel from /hotels/search using the stored search city
    const refreshed = await Promise.all(selected.map(async hotel => {
      try {
        const searchCity = hotel.searchCity || hotel.destination || hotel.city || "";
        if (!searchCity) return hotel;
        // We can't reliably re-fetch a single hotel without full search params (check-in, check-out, etc.)
        // So we display the stored snapshot data directly
        return hotel;
      } catch {
        return hotel;
      }
    }));

    target.innerHTML = `<div class="compare-grid" style="display:grid;grid-template-columns:repeat(${refreshed.length},1fr);gap:16px;">` +
      refreshed.map(hotel => {
        const name = hotel.name || hotel.hotel_name || hotel.summary?.name || "Hotel";
        const address = hotel.address || hotel.city || hotel.summary?.location?.address?.addressLine || hotel.searchCity || "";
        const price = hotel.price || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "—";
        const rating = hotel.rating || hotel.review_score || hotel.reviewInfo?.summary?.overallScoreWithDescriptionA11y?.value || "—";
        const amenities = hotel.amenities?.join(", ") || "";
        return `<article class="result-card">
          <p class="eyebrow">HOTEL</p>
          <h3>${escapeHtml(String(name))}</h3>
          ${address ? `<p>${escapeHtml(String(address))}</p>` : ""}
          <p class="compare-value">${escapeHtml(String(price))}</p>
          <p>Rating: ${escapeHtml(String(rating))}</p>
          ${amenities ? `<p>${escapeHtml(amenities)}</p>` : ""}
        </article>`;
      }).join("") + "</div>";
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
