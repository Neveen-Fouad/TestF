import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("notifications"); const target = document.querySelector("#notifications"); const user = session.user();
  const clientId = user?.client_id || user?.client?.id || user?.id;
  if (!clientId) target.innerHTML = '<div class="empty">Your account does not include a client profile yet, so updates cannot be loaded.</div>';
  else {
    const [listResult, unreadResult] = await Promise.allSettled([api.notifications.list(clientId), api.notifications.unread(clientId)]);
    if (unreadResult.status === "fulfilled") { const unread = rows(unreadResult.value); const count = Array.isArray(unread) ? unread.length : Number(unreadResult.value?.data?.count || 0); const badge = document.querySelector("#unread-count"); if (count) { badge.hidden = false; badge.textContent = `${count} unread`; } }
    if (listResult.status === "fulfilled") { const items = rows(listResult.value); target.innerHTML = items.length ? items.map(item => `<article class="notification-card ${item.read_at || item.is_read ? "" : "unread"}"><span class="notification-icon">${item.type === "booking" ? "✓" : item.type === "trip" ? "✦" : "✈"}</span><div><h2>${escapeHtml(item.title || item.type || "Travel update")}</h2><p>${escapeHtml(item.description || item.message || item.content || "There is a new update for your account.")}</p><time>${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Just now")}</time></div></article>`).join("") : '<div class="empty">You are all caught up.</div>'; }
    else target.innerHTML = '<div class="empty">Notifications are not available yet. The backend must expose the documented client-notification route.</div>';
  }
}
