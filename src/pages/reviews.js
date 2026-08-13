import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
const target = document.querySelector("#reviews");
const form = document.querySelector("#review-form");
const prompt = document.querySelector("#review-prompt");
const parameters = new URLSearchParams(location.search);
const type = parameters.get("type");
const reviewableId = parameters.get("id");
const validTypes = new Set(["trip", "hotel", "restaurant", "flight"]);

if (requireLogin()) {
  if (validTypes.has(type) && reviewableId) {
    form.hidden = false;
    form.elements.type.value = type;
    form.elements.reviewable_id.value = reviewableId;
    document.querySelector("#review-context").textContent = parameters.get("name") || `${type[0].toUpperCase()}${type.slice(1)} review`;
    form.addEventListener("submit", submitReview);
  } else {
    prompt.hidden = false;
    prompt.innerHTML = '<h2>Choose what you want to review</h2><p>Open one of your trips, a hotel, a flight, or a restaurant result and select “Write a review.” This keeps the review connected to the correct item.</p><div class="detail-actions"><a class="button subtle" href="/pages/trips.html">My trips</a> <a class="button subtle" href="/pages/hotels.html">Hotels</a> <a class="button subtle" href="/pages/flights.html">Flights</a> <a class="button subtle" href="/pages/restaurants.html">Restaurants</a></div>';
  }
  await loadReviews();
}

async function submitReview(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const data = new FormData(form);
    if (!data.get("image")?.size) data.delete("image");
    await api.reviews.create(data);
    form.elements.rating.value = "5";
    form.elements.description.value = "";
    form.elements.image.value = "";
    notify("Review submitted for approval.");
    await loadReviews();
  } catch (error) {
    notify(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function loadReviews() {
  try {
    const items = rows(await api.reviews.list());
    target.innerHTML = items.length ? items.map(item => `
      <article class="result-card">
        <h3>${escapeHtml(item.type || item.destination?.name || "Traveler review")}</h3>
        <p>★ ${escapeHtml(item.rating || "—")}</p>
        <p>${escapeHtml(item.description || item.comment || item.content || "")}</p>
      </article>
    `).join("") : '<div class="empty">No reviews available.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
