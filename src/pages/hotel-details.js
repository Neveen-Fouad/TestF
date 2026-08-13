import { api } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("hotels");
const id = new URLSearchParams(location.search).get("id");
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
  const hotelId = id || hotel.id || hotel.hotel_id || hotel.property?.id;
  target.innerHTML = `<p class="eyebrow">HOTEL DETAILS</p><h1>${escapeHtml(name)}</h1><p class="lead">${escapeHtml(hotel.description || hotel.address || hotel.property?.address || "")}</p><p>Rating: ${escapeHtml(hotel.rating || hotel.review_score || hotel.property?.reviewScore || "—")}</p><p>${escapeHtml(hotel.price || hotel.price_per_night || hotel.priceBreakdown?.grossPrice?.value || "Price on request")}</p><div class="detail-actions"><a class="button" href="/pages/hotel-booking.html?id=${encodeURIComponent(hotelId || "")}">Book this hotel</a>${hotelId ? ` <a class="button subtle" href="/pages/reviews.html?type=hotel&id=${encodeURIComponent(hotelId)}&name=${encodeURIComponent(name)}">Write a review</a>` : ""}</div>`;
}
