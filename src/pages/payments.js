import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar();
  const target = document.querySelector("#payments");
  const form = document.querySelector("#payment-form");
  const clientId = session.clientId();
  const bookingId = new URLSearchParams(location.search).get("booking_id");

  if (bookingId) {
    document.querySelector("#payment-title").textContent = "Complete payment";
    form.hidden = false;
    form.elements.booking_id.value = bookingId;
    target.hidden = true;
    if (!clientId) {
      form.querySelector("button").disabled = true;
      form.insertAdjacentHTML("beforeend", '<div class="empty">Your account has no client profile for payment.</div>');
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const result = await api.payments.create(bookingId, clientId);
        notify("Payment created successfully.");
        if (result.checkout_url) location.assign(result.checkout_url);
        else setTimeout(() => location.assign("/pages/bookings.html"), 700);
      } catch (error) { notify(error.message, true); }
    });
  } else if (!clientId) {
    target.innerHTML = '<div class="empty">Your account identifier is unavailable.</div>';
  } else {
    try {
      const payments = rows(await api.payments.list(clientId));
      target.innerHTML = payments.length ? payments.map(item => `
        <article class="result-card">
          <h3>${escapeHtml(item.status || "Payment")}</h3>
          <p>${escapeHtml(item.amount || item.total || "")}</p>
          <p>${escapeHtml(item.created_at || item.date || "")}</p>
        </article>
      `).join("") : '<div class="empty">No payment history is available.</div>';
    } catch (error) {
      target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
  }
}
