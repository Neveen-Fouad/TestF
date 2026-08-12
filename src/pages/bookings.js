import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("bookings");
  const target = document.querySelector("#bookings");
  try {
    const bookings = rows(await api.dashboard.bookings());
    target.innerHTML = bookings.length ? bookings.map(item => `
      <article class="result-card">
        <div class="eyebrow">${escapeHtml(item.status || "BOOKING")}</div>
        <h3>${escapeHtml(item.hotel?.name || item.flight?.name || item.name || "Booking")}</h3>
        <p>${escapeHtml(item.created_at || item.date || "")}</p>
        <p>${escapeHtml(item.total || item.amount || "")}</p>
      </article>
    `).join("") : '<div class="empty">No bookings yet.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
