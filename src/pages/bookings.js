import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("bookings");
  const target = document.querySelector("#bookings");
  try {
    // GET /bookings — auth required, returns all bookings (hotel + flight) for the user
    const bookings = rows(await api.bookings.all());
    target.innerHTML = bookings.length
      ? bookings.map(item => {
          const type = item.type || "booking";
          const name = item.hotel?.name || item.flight?.airline || item.name || item.title || "Booking";
          const details = item.check_in_date
            ? `Check-in: ${item.check_in_date} → Check-out: ${item.check_out_date || ""}`
            : item.departure_date
            ? `Departs: ${item.departure_date}`
            : item.created_at || item.date || "";
          return `<article class="result-card">
            <div class="eyebrow">${escapeHtml(String(type).toUpperCase())}</div>
            <h3>${escapeHtml(String(name))}</h3>
            <p>${escapeHtml(String(details))}</p>
            <p>Status: ${escapeHtml(String(item.status || "—"))}</p>
          </article>`;
        }).join("")
      : '<div class="empty">No bookings yet.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
