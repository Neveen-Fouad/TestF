import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

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
      const name = details.name || details.hotel_name || details.title || item.name || item.title || "Saved item";
      const description = details.description || details.address || details.destination || item.description || "Open its source page to see the latest details.";
      return `<article class="result-card">
        <div class="eyebrow">${escapeHtml(item.type || item.favouriteable_type || "SAVED")}</div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(description)}</p>
        <button class="button subtle" type="button" data-remove="${escapeHtml(item.id)}">Remove</button>
      </article>`;
    }).join("") + controls : '<div class="empty">You have not saved anything yet.</div>';
    target.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", async () => {
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
