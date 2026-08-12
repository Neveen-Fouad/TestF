import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar();
  const target = document.querySelector("#payments");
  const user = session.user();
  const clientId = user?.id || user?.client_id || user?.client?.id;
  if (!clientId) {
    target.innerHTML = '<div class="empty">Your account identifier is unavailable.</div>';
  } else {
    try {
      // GET /payments/client/{clientId} — public endpoint, no auth required by backend
      const payments = rows(await api.payments.list(clientId));
      target.innerHTML = payments.length
        ? payments.map(item => `<article class="result-card">
            <p class="eyebrow">${escapeHtml(String(item.status || "PAYMENT"))}</p>
            <h3>${escapeHtml(String(item.amount || item.total || "—"))}</h3>
            <p>${escapeHtml(String(item.created_at || item.date || ""))}</p>
            ${item.id ? `<a class="button subtle" href="/pages/payments.html?id=${encodeURIComponent(item.id)}" style="margin-top:8px;display:inline-flex;">View</a>` : ""}
          </article>`).join("")
        : '<div class="empty">No payment history is available.</div>';
    } catch (error) {
      target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
  }
}
