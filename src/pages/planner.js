import { api, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation("plan-a-trip");
document.querySelector(".planner-hero .eyebrow").textContent = "PERSONAL TRIP PLANNING";
document.querySelector(".planner-hero h1 + p").textContent = "Share the essentials and Journovo will build a personalized itinerary. Administrators can use the separate manual trip creator.";
if (requireLogin()) document.querySelector("#plan").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  const values = Object.fromEntries(new FormData(form));
  values.number_of_travels = Number(values.number_of_travels);
  values.number_of_days = Number(values.number_of_days);
  values.budget = Number(values.budget);
  values.estimated_expenses = Number(values.estimated_expenses || 0);
  const endDate = new Date(`${values.start_date}T00:00:00`);
  endDate.setDate(endDate.getDate() + values.number_of_days);
  values.end_date = endDate.toISOString().slice(0, 10);
  button.disabled = true;
  button.textContent = "Creating trip…";
  try {
    const response = await api.trips.create(values, !session.isAdmin());
    const trip = response?.data || response;
    const id = trip?.id || trip?.trip?.id;
    document.querySelector("#plan-result").innerHTML = `<section class="plan-success"><span>✦</span><div><p class="eyebrow">TRIP CREATED</p><h2>${escapeHtml(trip?.destination || values.destination)}</h2><p>${escapeHtml(response?.message || "The trip has been created.")}</p></div>${id ? `<a class="button subtle" href="/pages/trip-details.html?id=${encodeURIComponent(id)}">Open itinerary</a>` : ""}</section>`;
    notify("Trip created.");
  } catch (error) {
    document.querySelector("#plan-result").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    notify(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Create trip";
  }
});
