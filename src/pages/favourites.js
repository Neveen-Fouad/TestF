import { api, rows } from "../shared/api.js";
import { confirmModal, escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("favorites");
  const target = document.querySelector("#favorites");
  let currentPage = 1;
  const loadFavorites = async () => {
    try {
    const payload = await api.favourites.list(currentPage);
    const favorites = rows(payload);
    const pagination = Number(payload?.current_page) && Number(payload?.last_page) ? payload : {};
    currentPage = Number(pagination.current_page) || currentPage;
    const controls = Number(pagination.last_page) > 1 ? `<div class="pagination-controls"><button class="button subtle" type="button" data-page="prev" ${!pagination.prev_page_url ? "disabled" : ""}>← Previous</button><span>Page ${currentPage} of ${pagination.last_page}</span><button class="button subtle" type="button" data-page="next" ${!pagination.next_page_url ? "disabled" : ""}>Next →</button></div>` : "";
    target.innerHTML = favorites.length ? favorites.map(item => {
      const details = item.item_details || item.favouriteable || {};
      const itemType = String(item.type || item.favouriteable_type || "SAVED").toLowerCase();
      const name = details.name || details.destination || details.hotel_name || details.title || item.name || item.title || "Saved item";
      
      let extraMeta = "";
      if (itemType === "trip") {
        const parts = [];
        if (details.number_of_days) parts.push(`${details.number_of_days} days`);
        if (details.budget) parts.push(`$${details.budget} budget`);
        if (details.start_date) parts.push(`Starts ${String(details.start_date).slice(0, 10)}`);
        if (parts.length) extraMeta = `<p style="color: var(--muted); font-size: 13px; margin: 4px 0 8px;">${escapeHtml(parts.join(" · "))}</p>`;
      }

      const description = details.description || details.address || details.destination || details.style || item.description || "Open its source page to see the latest details.";

      const viewAction = itemType === "trip" && (item.favouriteable_id || details.id)
        ? `<a class="button subtle" href="/pages/trip-details?id=${escapeHtml(item.favouriteable_id || details.id)}">View itinerary</a>`
        : itemType === "hotel" && item.favouriteable_id
        ? `<a class="button subtle" href="/pages/hotel-details?id=${escapeHtml(item.favouriteable_id)}">View hotel</a>`
        : itemType === "flight" && item.favouriteable_id
        ? `<a class="button subtle" href="/pages/flight-details?id=${escapeHtml(item.favouriteable_id)}">View flight</a>`
        : itemType === "restaurant" && item.favouriteable_id
        ? `<a class="button subtle" href="/pages/restaurant-details?id=${escapeHtml(item.favouriteable_id)}">View restaurant</a>`
        : "";

      return `<article class="result-card">
        <div class="eyebrow">${escapeHtml(itemType.toUpperCase())}</div>
        <h3>${escapeHtml(name)}</h3>
        ${extraMeta}
        <p>${escapeHtml(description)}</p>
        <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; align-items: center;">
          ${viewAction}
          <button class="button subtle" type="button" data-remove="${escapeHtml(item.id)}">Remove</button>
        </div>
      </article>`;
    }).join("") + controls : '<div class="empty">You have not saved anything yet.</div>';
    target.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", async () => {
      if (!await confirmModal("Are you sure you want to remove this item from your favorites?", {
        title: "Remove from Favorites",
        confirmText: "Remove",
        danger: true
      })) return;
      try {
        await api.favourites.remove(button.dataset.remove);
        await loadFavorites();
        notify("Removed from Favorites.");
      } catch (error) { notify(error.message, true); }
    }));
    target.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
      currentPage += button.dataset.page === "prev" ? -1 : 1;
      loadFavorites();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
  };
  loadFavorites();
}
