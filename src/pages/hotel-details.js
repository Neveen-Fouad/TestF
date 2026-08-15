import { api } from "../shared/api.js";
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
  const price = (typeof hotel.price === "object" ? hotel.price?.priceSummary?.definition?.displayPrice : hotel.price) || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "Price on request";
  const rating = hotel.guestRating?.rating || hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—";
  const address = hotel.description || hotel.address || hotel.city || hotel.property?.address || (hotel.messages?.length ? hotel.messages[hotel.messages.length - 1] : "");
  const bookingAction = hotelId
    ? `<a class="button" href="/pages/hotel-booking.html?id=${encodeURIComponent(hotelId)}">Book this hotel</a>`
    : '<span class="muted">Booking is unavailable because this hotel has no valid provider ID.</span>';
  target.innerHTML = `<p class="eyebrow">HOTEL DETAILS</p><h1>${escapeHtml(name)}</h1><p class="lead">${escapeHtml(address)}</p><p>Rating: ${escapeHtml(rating)}</p><p>${escapeHtml(price)}</p><div class="detail-actions">${bookingAction}${hotelId ? ` <a class="button subtle" href="/pages/reviews.html?type=hotel&id=${encodeURIComponent(hotelId)}&name=${encodeURIComponent(name)}">Write a review</a>` : ""}${favouriteControl(hotelId, "hotel")}</div>`;
  bindFavouriteControls(target);
}
