import { api, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";
import { constrainFutureDate } from "../shared/forms.js";

mountNavigation("plan-my-trip");

const plannerForm = document.querySelector("#plan");
constrainFutureDate(plannerForm.elements.start_date);
plannerForm.elements.budget.min = "100";

const requestedDestination = new URLSearchParams(location.search).get("destination");
if (requestedDestination) plannerForm.elements.destination.value = requestedDestination;

if (requireLogin()) {
  plannerForm.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"], button');
    const formData = new FormData(form);

    // Strictly send ONLY the attributes validated by StoreTripRequest
    const payload = {
      destination: String(formData.get("destination") || "").trim(),
      start_date: String(formData.get("start_date") || "").trim(),
      budget: Number(formData.get("budget")),
      number_of_travels: Number(formData.get("number_of_travels")),
      number_of_days: Number(formData.get("number_of_days")),
      style: String(formData.get("style") || "").trim()
    };

    const classes = String(formData.get("classes") || "").trim();
    if (classes) payload.classes = classes;

    const preferences = String(formData.get("preferences") || "").trim();
    if (preferences) payload.preferences = preferences;

    if (button) {
      button.disabled = true;
      button.textContent = "Creating trip…";
    }

    try {
      const response = await api.trips.create(payload, true);
      const trip = response?.data || response;
      const id = trip?.id || trip?.trip?.id;
      if (!id) throw new Error("The trip was created, but its itinerary reference was not returned.");
      notify("Trip created.");
      location.assign(`/pages/trip-details?id=${encodeURIComponent(id)}`);
    } catch (error) {
      document.querySelector("#plan-result").innerHTML = `<div class="empty is-error">${escapeHtml(error.message)}</div>`;
      notify(error.message, true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Build my trip plan";
      }
    }
  });
}
