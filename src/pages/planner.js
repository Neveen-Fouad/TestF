import { api, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";
import { constrainFutureDate } from "../shared/forms.js";

mountNavigation("plan-my-trip");
document.querySelector(".planner-hero .eyebrow").textContent = "PERSONAL TRIP PLANNING";
document.querySelector(".planner-hero h1 + p").textContent = "Share the essentials and Journovo will build a personalized itinerary. Administrators can use the separate manual trip creator.";
const plannerForm = document.querySelector("#plan");
constrainFutureDate(plannerForm.elements.start_date);
plannerForm.elements.budget.min = "100";
const requestedDestination = new URLSearchParams(location.search).get("destination");
if (requestedDestination) plannerForm.elements.destination.value = requestedDestination;
if (requireLogin()) plannerForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  const values = Object.fromEntries(new FormData(form));
  values.number_of_travels = Number(values.number_of_travels);
  values.number_of_days = Number(values.number_of_days);
  values.budget = Number(values.budget);
  button.disabled = true;
  button.textContent = "Creating trip…";
  try {
    const response = await api.trips.create(values, true);
    const trip = response?.data || response;
    const id = trip?.id || trip?.trip?.id;
    if (!id) throw new Error("The trip was created, but its itinerary reference was not returned.");
    notify("Trip created.");
    location.assign(`/pages/trip-details?id=${encodeURIComponent(id)}`);
  } catch (error) {
    document.querySelector("#plan-result").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    notify(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Create trip";
  }
});
