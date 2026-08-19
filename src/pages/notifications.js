import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("notifications");
  const target = document.querySelector("#notifications");
  const paginationTarget = document.querySelector("#notification-pagination");
  const badge = document.querySelector("#unread-count");
  const markAllButton = document.querySelector("#mark-all-read");
  const clientId = session.clientId();

  const PAGE_SIZE = 5;
  let currentPage = 1;
  let allItems = [];

  if (!clientId) {
    markAllButton.disabled = true;
    target.innerHTML = '<div class="empty">Your account does not include a client profile yet, so updates cannot be loaded.</div>';
  } else {
    markAllButton.addEventListener("click", async () => {
      markAllButton.disabled = true;
      try {
        await api.notifications.readAll(clientId);
        allItems.forEach(item => {
          item.read_at = new Date().toISOString();
          item.is_read = true;
        });
        updateUnread(0);
        renderPage();
        notify("All notifications marked as read.");
      } catch (error) {
        notify(error.message, true);
        markAllButton.disabled = false;
      }
    });
    await loadNotifications();
  }

  async function loadNotifications() {
    const [listResult, unreadResult] = await Promise.allSettled([
      api.notifications.list(clientId),
      api.notifications.unread(clientId)
    ]);

    if (unreadResult.status === "fulfilled") {
      updateUnread(rows(unreadResult.value).length || Number(unreadResult.value?.data?.count || 0));
    }

    if (listResult.status !== "fulfilled") {
      target.innerHTML = '<div class="empty">Notifications are not available yet.</div>';
      if (paginationTarget) paginationTarget.innerHTML = "";
      return;
    }

    allItems = rows(listResult.value);
    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    if (!allItems.length) {
      target.innerHTML = '<div class="empty">You are all caught up.</div>';
      if (paginationTarget) paginationTarget.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(allItems.length / PAGE_SIZE);
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = allItems.slice(start, start + PAGE_SIZE);

    target.innerHTML = pageItems.map((item, index) => {
      const unread = !(item.read_at || item.is_read);
      const globalIndex = start + index;
      return `<article class="notification-card ${unread ? "unread" : ""}">
        <span class="notification-icon">${item.type === "booking" ? "✓" : item.type === "trip" ? "✦" : "✈"}</span>
        <div>
          <h2>${escapeHtml(item.title || item.type || "Travel update")}</h2>
          <p>${escapeHtml(item.description || item.message || item.content || "There is a new update for your account.")}</p>
          <time>${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Just now")}</time>
        </div>
        ${unread ? `<button class="button subtle" type="button" data-mark-read="${escapeHtml(item.id)}" data-index="${globalIndex}">Mark read</button>` : ""}
      </article>`;
    }).join("");

    if (paginationTarget) {
      if (totalPages > 1) {
        paginationTarget.innerHTML = `
          <button class="button subtle" type="button" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>← Previous</button>
          <span>Page ${currentPage} of ${totalPages} (${allItems.length} updates)</span>
          <button class="button subtle" type="button" data-page="next" ${currentPage >= totalPages ? "disabled" : ""}>Next →</button>
        `;
        paginationTarget.querySelectorAll("[data-page]").forEach(btn => {
          btn.addEventListener("click", () => {
            currentPage += btn.dataset.page === "prev" ? -1 : 1;
            renderPage();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });
      } else {
        paginationTarget.innerHTML = "";
      }
    }

    target.querySelectorAll("[data-mark-read]").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const id = button.dataset.markRead;
        const idx = Number(button.dataset.index);
        try {
          await api.notifications.read(id);
          if (allItems[idx]) {
            allItems[idx].read_at = new Date().toISOString();
            allItems[idx].is_read = true;
          }
          button.closest(".notification-card").classList.remove("unread");
          button.remove();
          updateUnread(Math.max(currentUnread() - 1, 0));
        } catch (error) {
          notify(error.message, true);
          button.disabled = false;
        }
      });
    });
  }

  function currentUnread() { return Number(badge.dataset.count || 0); }
  function updateUnread(count) {
    badge.dataset.count = String(count);
    badge.hidden = count === 0;
    badge.textContent = count ? `${count} unread` : "";
    markAllButton.disabled = count === 0;
  }
}
