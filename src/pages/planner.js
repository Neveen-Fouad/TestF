import { api } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation("plan-a-trip");

// Set today as minimum for start_date, and update end_date minimum when start_date changes
const startInput = document.querySelector("[name='start_date']");
const endInput = document.querySelector("[name='end_date']");
const today = new Date().toISOString().split("T")[0];
if (startInput) startInput.min = today;
if (startInput && endInput) {
  startInput.addEventListener("change", () => {
    endInput.min = startInput.value || today;
    if (endInput.value && endInput.value <= startInput.value) endInput.value = "";
  });
}

if (requireLogin()) {
  document.querySelector("#plan").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const values = Object.fromEntries(new FormData(form));

    // Coerce numeric fields
    values.number_of_travels = Number(values.number_of_travels);
    values.budget = Number(values.budget);
    values.estimated_expenses = Number(values.estimated_expenses || 0);

    button.disabled = true;
    button.textContent = "Creating your plan…";
    try {
      // POST /ai/trips — distinct from Joy's chat endpoint /chat/messages
      const response = await api.trips.create(values, true);
      const trip = response?.data || response;
      const id = trip?.id || trip?.trip?.id;
      document.querySelector("#plan-result").innerHTML = `<section class="plan-success"><span>✦</span><div><p class="eyebrow">YOUR PLAN IS READY</p><h2>${escapeHtml(trip?.destination || values.destination)}</h2><p>${escapeHtml(response?.message || "Joy has created the first version of your itinerary.")}</p></div>${id ? `<a class="button subtle" href="/pages/trip-details.html?id=${encodeURIComponent(id)}">Open itinerary</a>` : ""}</section>`;
      notify("Your trip plan is ready.");
    } catch (error) {
      document.querySelector("#plan-result").innerHTML = `<div class="empty">${escapeHtml(error.message)}${error.status === 404 ? " The backend needs to expose the documented /ai/trips endpoint." : ""}</div>`;
      notify(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Create my trip plan";
    }
  });
}
