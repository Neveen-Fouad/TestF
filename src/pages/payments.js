import { api, rows, session } from "../shared/api.js";
import { mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";
mountNavigation();
if (requireLogin()) {
  mountSidebar();
  const target = document.querySelector("#payments");
  const user = session.user();
  const clientId = user?.id || user?.client_id || user?.client?.id;
  if (!clientId) target.innerHTML = '<div class="empty">Your account identifier is unavailable.</div>';
  else try {
    const payments = rows(await api.payments.list(clientId));
    target.innerHTML = payments.length ? payments.map(item => `<article class="result-card"><h3>${item.status || "Payment"}</h3><p>${item.amount || item.total || ""}</p><p>${item.created_at || item.date || ""}</p></article>`).join("") : '<div class="empty">No payment history is available.</div>';
  } catch (error) { target.innerHTML = `<div class="empty">${error.message}</div>`; }
}
