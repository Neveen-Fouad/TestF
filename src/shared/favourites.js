import { api, session } from "./api.js";
import { escapeHtml, notify } from "./navigation.js";

export function favouriteControl(id, type) {
  if (!id) return "";
  if (!session.isLoggedIn()) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return ` <a class="button subtle favourite-button" href="/pages/login.html?returnTo=${returnTo}">♡ Sign in to save</a>`;
  }
  return ` <button class="button subtle favourite-button" type="button" data-favourite-id="${escapeHtml(String(id))}" data-favourite-type="${escapeHtml(type)}" aria-pressed="false">♡ Save</button>`;
}

export function bindFavouriteControls(container) {
  container.querySelectorAll("[data-favourite-id]").forEach(button => {
    button.addEventListener("click", async () => {
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Saving…";
      try {
        await api.favourites.add(button.dataset.favouriteId, button.dataset.favouriteType);
        button.textContent = "♥ Saved";
        button.setAttribute("aria-pressed", "true");
        button.classList.add("is-saved");
        notify("Saved to Favorites.");
      } catch (error) {
        button.disabled = false;
        button.textContent = originalLabel;
        notify(error.message, true);
      }
    }, { once: true });
  });
}
