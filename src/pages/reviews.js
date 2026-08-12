import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
const target = document.querySelector("#reviews");
const form = document.querySelector("#review-form");

if (requireLogin()) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const data = new FormData(form);
      if (!data.get("image")?.size) data.delete("image");
      await api.reviews.create(data);
      form.reset();
      notify("Review submitted for approval.");
      await loadReviews();
    } catch (error) {
      notify(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
  await loadReviews();
}

async function loadReviews() {
  try {
    const items = rows(await api.reviews.list());
    target.innerHTML = items.length ? items.map(item => `
      <article class="result-card">
        <h3>${escapeHtml(item.title || item.destination?.name || "Traveler review")}</h3>
        <p>★ ${escapeHtml(item.rating || "—")}</p>
        <p>${escapeHtml(item.comment || item.content || "")}</p>
      </article>
    `).join("") : '<div class="empty">No reviews available.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
