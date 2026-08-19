import { api, rows } from "../shared/api.js";
import { getHotelId } from "../shared/hotels.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("hotels");
const id = getHotelId(new URLSearchParams(location.search).get("id"));
const target = document.querySelector("#details");
let hotel = JSON.parse(sessionStorage.getItem("journovo_selected_hotel") || "null");

try {
  if (id) {
    const response = await api.hotels.details(id);
    hotel = response?.data || response || hotel;
  }
} catch {}

if (!hotel) {
  target.innerHTML = '<div class="empty">Hotel details are unavailable. <a class="text-action" href="/pages/hotels.html">Search hotels again</a></div>';
} else {
  const name = hotel.name || hotel.hotel_name || hotel.property?.name || "Hotel";
  const hotelId = id || getHotelId(hotel) || getHotelId(sessionStorage.getItem("journovo_selected_hotel_id"));
  if (hotelId) sessionStorage.setItem("journovo_selected_hotel_id", hotelId);

  const media = hotel.mediaSection?.media || hotel.images || [];
  const rating = hotel.guestRating?.rating || hotel.rating || hotel.review_score || hotel.property?.reviewScore || null;
  const totalReviews = hotel.guestRating?.totalReviews || hotel.reviews_count || hotel.total_reviews || null;
  const starRating = hotel.guestRating?.starRating || null;

  const priceObj = typeof hotel.price === "object" ? hotel.price : null;
  const displayPrice = priceObj?.priceSummary?.definition?.displayPrice ||
    priceObj?.priceSummary?.displayPrices?.find(p => p.role === "LEAD")?.price?.formatted ||
    (typeof hotel.price === "string" ? hotel.price : null) ||
    hotel.price_per_night ||
    hotel.priceBreakdown?.grossPrice?.value ||
    "Price on request";

  const strikeOut = priceObj?.priceSummary?.definition?.strikeOut ||
    priceObj?.priceSummary?.displayPrices?.find(p => p.role === "STRIKEOUT")?.price?.formatted ||
    "";

  const discountBadge = priceObj?.badge?.text || priceObj?.standardBadge?.text || "";
  const nightlyRate = priceObj?.priceSummary?.displayPrices?.find(p => p.value?.includes("night"))?.value || "";
  const periodText = priceObj?.priceSummary?.displayPrices?.find(p => p.value?.includes("for ") || p.value?.includes("nights"))?.value || "";

  const messages = Array.isArray(hotel.messages) ? hotel.messages : [];
  const address = hotel.address || hotel.city || hotel.property?.address || (messages.length ? messages[messages.length - 1] : "Address unavailable");
  const roomType = messages.length > 1 ? messages[0] : "";
  const capacity = messages.length > 2 ? messages[1] : "";
  const amenities = Array.isArray(hotel.short_amenities) ? hotel.short_amenities : (Array.isArray(hotel.amenities) ? hotel.amenities : []);

  const bookingAction = hotelId
    ? `<a class="button" href="/pages/hotel-booking.html?id=${encodeURIComponent(hotelId)}">Book this hotel</a>`
    : '<span class="muted">Booking is unavailable because this hotel has no valid provider ID.</span>';

  target.innerHTML = `
    <p class="eyebrow">HOTEL DETAILS</p>
    <h1>${escapeHtml(name)}</h1>
    ${address ? `<p class="lead">${escapeHtml(address)}</p>` : ""}

    ${media.length ? `
      <div class="hotel-gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin: 20px 0; border-radius: 18px; overflow: hidden;">
        ${media.slice(0, 3).map(m => `
          <div style="height: 220px; overflow: hidden; border-radius: 14px; background: #edf3f8;">
            <img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.description || name)}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        `).join("")}
      </div>
    ` : ""}

    <div class="panel" style="margin: 20px 0; display: grid; gap: 12px;">
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${rating ? `<span style="font-weight: 800; color: #df6936; font-size: 18px;">★ ${escapeHtml(String(rating))}</span>` : ""}
          ${totalReviews ? `<span class="muted">(${escapeHtml(String(totalReviews))} verified reviews)</span>` : ""}
          ${starRating ? `<span class="muted">· ${escapeHtml(String(starRating))} Star property</span>` : ""}
        </div>
        <div style="text-align: right;">
          ${discountBadge ? `<span style="display: inline-block; padding: 3px 8px; border-radius: 8px; background: #eaf5ff; color: #0e6ed9; font-size: 12px; font-weight: 750; margin-bottom: 4px;">${escapeHtml(discountBadge)}</span><br>` : ""}
          ${strikeOut ? `<span style="text-decoration: line-through; color: #8e9fb3; font-size: 14px; margin-right: 6px;">${escapeHtml(strikeOut)}</span>` : ""}
          <b style="font-size: 26px; color: var(--navy); font-family: Georgia, serif;">${escapeHtml(displayPrice)}</b>
          ${nightlyRate ? `<div class="muted" style="font-size: 12px;">${escapeHtml(nightlyRate)}</div>` : ""}
          ${periodText ? `<div class="muted" style="font-size: 12px;">${escapeHtml(periodText)}</div>` : ""}
        </div>
      </div>

      ${roomType || capacity ? `<p style="margin: 4px 0 0; color: #476282; font-weight: 600;">🛏️ ${[roomType, capacity].filter(Boolean).map(escapeHtml).join(" · ")}</p>` : ""}

      ${amenities.length ? `
        <div style="margin-top: 8px;">
          <b style="font-size: 13px; color: var(--navy); display: block; margin-bottom: 6px;">Key Amenities:</b>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${amenities.map(a => `<span style="padding: 4px 10px; border-radius: 20px; background: #f0f6fc; color: #0e6ed9; font-size: 12px; font-weight: 700;">✓ ${escapeHtml(a)}</span>`).join("")}
          </div>
        </div>
      ` : ""}
    </div>

    <div class="detail-actions">
      ${bookingAction}
      <a class="button subtle" href="/pages/hotels.html">Back to search</a>
      ${favouriteControl(hotelId, "hotel")}
    </div>
  `;
  bindFavouriteControls(target);

  const reviewsTarget = document.querySelector("#hotel-reviews");
  if (reviewsTarget && hotelId) {
    reviewsTarget.innerHTML = '<div class="empty">Loading reviews…</div>';
    try {
      const reviews = rows(await api.reviews.list(1, { type: 'hotel', reviewable_id: hotelId }));
      if (reviews.length > 0) {
        reviewsTarget.innerHTML = `<h3>Traveler Reviews</h3><div class="reviews-list" style="margin-top: 1rem;">` +
          reviews.map(r => {
            const reviewerName = r.client?.name || r.client?.first_name || "Guest";
            const date = new Date(r.created_at).toLocaleDateString();
            return `<article style="padding-bottom: 1rem; border-bottom: 1px solid var(--border); margin-bottom: 1rem;">
              <p><strong>${escapeHtml(reviewerName)}</strong> <span class="muted" style="margin-left: 0.5rem;">${date}</span></p>
              <p style="color: var(--primary);">★ ${escapeHtml(String(r.rating || 5))}/5</p>
              <p style="margin-top: 0.5rem;">${escapeHtml(r.comment || "")}</p>
            </article>`;
          }).join("") + `</div>`;
      } else {
        reviewsTarget.innerHTML = '<div class="empty">No reviews yet for this hotel. Be the first to write one!</div>';
      }
    } catch {
      reviewsTarget.innerHTML = '<div class="empty is-error">Could not load reviews at this time.</div>';
    }
  }
}
