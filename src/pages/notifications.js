import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("notifications");
  const target = document.querySelector("#notifications");
  const badge = document.querySelector("#unread-count");
  const markAllButton = document.querySelector("#mark-all-read");
  const clientId = session.clientId();

  if (!clientId) {
    markAllButton.disabled = true;
    target.innerHTML = '<div class="empty">Your account does not include a client profile yet, so updates cannot be loaded.</div>';
  } else {
    markAllButton.addEventListener("click", async () => {
      markAllButton.disabled = true;
      try {
        await api.notifications.readAll(clientId);
        target.querySelectorAll(".notification-card").forEach(card => card.classList.remove("unread"));
        target.querySelectorAll("[data-mark-read]").forEach(button => button.remove());
        updateUnread(0);
        notify("All notifications marked as read.");
      } catch (error) {
        notify(error.message, true);
        markAllButton.disabled = false;
      }
    });
    await loadNotifications();
  }

  async function loadNotifications() {
    const [listResult, unreadResult] = await Promise.allSettled([api.notifications.list(clientId), api.notifications.unread(clientId)]);
    if (unreadResult.status === "fulfilled") updateUnread(rows(unreadResult.value).length || Number(unreadResult.value?.data?.count || 0));
    if (listResult.status !== "fulfilled") {
      target.innerHTML = '<div class="empty">Notifications are not available yet.</div>';
      return;
    }
    const items = rows(listResult.value);
    target.innerHTML = items.length ? items.map(item => {
      const unread = !(item.read_at || item.is_read);
      return `<article class="notification-card ${unread ? "unread" : ""}">
        <span class="notification-icon">${item.type === "booking" ? "✓" : item.type === "trip" ? "✦" : "✈"}</span>
        <div><h2>${escapeHtml(item.title || item.type || "Travel update")}</h2><p>${escapeHtml(item.description || item.message || item.content || "There is a new update for your account.")}</p><time>${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Just now")}</time></div>
        ${unread ? `<button class="button subtle" type="button" data-mark-read="${escapeHtml(item.id)}">Mark read</button>` : ""}
      </article>`;
    }).join("") : '<div class="empty">You are all caught up.</div>';
    target.querySelectorAll("[data-mark-read]").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await api.notifications.read(button.dataset.markRead);
        button.closest(".notification-card").classList.remove("unread");
        button.remove();
        updateUnread(Math.max(currentUnread() - 1, 0));
      } catch (error) {
        notify(error.message, true);
        button.disabled = false;
      }
    }));
  }

  function currentUnread() { return Number(badge.dataset.count || 0); }
  function updateUnread(count) {
    badge.dataset.count = String(count);
    badge.hidden = count === 0;
    badge.textContent = count ? `${count} unread` : "";
    markAllButton.disabled = count === 0;
  }
}
