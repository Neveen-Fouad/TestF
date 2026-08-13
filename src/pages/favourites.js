import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("favorites");
  const target = document.querySelector("#favorites");
  try {
    const favorites = rows(await api.favourites.list());
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
    }).join("") : '<div class="empty">You have not saved anything yet.</div>';
    target.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", async () => {
      try {
        await api.favourites.remove(button.dataset.remove);
        button.closest("article").remove();
        notify("Removed from Favorites.");
      } catch (error) { notify(error.message, true); }
    }));
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
