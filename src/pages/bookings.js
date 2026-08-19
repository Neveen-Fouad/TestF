import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("bookings");
  const target = document.querySelector("#bookings");
  try {
    const bookings = rows(await api.dashboard.bookings());
    target.innerHTML = bookings.length ? bookings.map(item => {
      const details = item.details || {};
      const type = item.type || item.booking_type || "booking";
      const name = details.hotel?.name || details.hotel_name || details.name || details.airline || item.provider_name || `${type} booking`;
      const dates = type === "hotel"
        ? [item.check_in_date, item.check_out_date].filter(Boolean).map(value => String(value).slice(0, 10)).join(" → ")
        : String(item.booking_date || item.booked_at || item.created_at || "").slice(0, 10);
      const total = item.total_price != null ? `${item.currency || "USD"} ${item.total_price}` : "Price unavailable";
      const checkoutDate = new Date(item.check_out_date);
      const isPastCheckout = !Number.isNaN(checkoutDate.valueOf()) && checkoutDate <= new Date();
      const isConfirmed = String(item.status || "").toLowerCase() === "confirmed";
      const isNotFlight = type !== "flight";
      const isReviewableType = ["trip", "hotel", "restaurant"].includes(type);
      const reviewAction = (isConfirmed && isPastCheckout && isNotFlight && isReviewableType)
        ? `<div style="margin-top: 1rem;"><a class="button subtle" href="/pages/reviews.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(item.external_reference_id || item.id)}&name=${encodeURIComponent(name)}">Write a review</a></div>`
        : "";
      return `<article class="result-card">
        <div class="eyebrow">${escapeHtml(item.status || "BOOKING")}</div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(dates)}</p>
        <p>${escapeHtml(total)}</p>
        ${reviewAction}
      </article>`;
    }).join("") : '<div class="empty">No bookings yet.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
