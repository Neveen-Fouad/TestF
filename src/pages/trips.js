import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation();
const target = document.querySelector("#trips");
const catalogView = new URLSearchParams(location.search).get("catalog") === "1";
const memberView = session.isLoggedIn() && !catalogView;

if (memberView) {
  document.querySelector("#trips-eyebrow").textContent = "YOUR TRAVEL SPACE";
  document.querySelector("#trips-title").textContent = "My trips";
  document.querySelector("#trips-intro").textContent = "Open a journey to view its daily plans, memories, and booking details.";
} else if (catalogView) {
  document.querySelector("#trips-eyebrow").textContent = "DISCOVER";
  document.querySelector("#trips-title").textContent = "Ready-made journeys";
  document.querySelector("#trips-intro").textContent = "Choose a curated itinerary and add it to your travel plans.";
}

try {
  const trips = rows(await (memberView ? api.trips.list() : api.trips.preMade()));
  target.innerHTML = trips.length ? trips.map(trip => {
    const id = trip.trip_id || trip.trip?.id || trip.template_trip_id || trip.id;
    const itineraryLink = catalogView && id ? ' <a class="button subtle" href="/pages/trip-details?id=' + id + '">View itinerary</a>' : "";
    const reviewBtn = (memberView && id)
      ? ` <a class="button subtle" href="/pages/reviews.html?type=trip&id=${encodeURIComponent(id)}&name=${encodeURIComponent(trip.destination || trip.name || "Trip")}">Write a review</a>`
      : "";
    const action = memberView
      ? id
        ? `<a class="button subtle" href="/pages/trip-details?id=${id}">View itinerary</a>${reviewBtn}`
        : '<span class="muted">This trip is missing its itinerary reference.</span>'
      : session.isLoggedIn() && id
        ? `<button class="button" type="button" data-book-trip="${escapeHtml(id)}">Add to my trips</button>${itineraryLink}`
        : `<a class="button subtle" href="/pages/login.html?returnTo=%2Fpages%2Ftrips.html%3Fcatalog%3D1">Sign in to add this trip</a>${itineraryLink}`;
    return `<article class="result-card"><div class="eyebrow">${escapeHtml(trip.destination || trip.country || "JOURNEY")}</div><h3>${escapeHtml(trip.name || trip.title || "Untitled trip")}</h3><p>${escapeHtml(trip.description || trip.duration || trip.style || "View its live daily itinerary.")} · $${escapeHtml(trip.estimated_expenses || trip.budget || "—")} estimated</p>${action}${!memberView ? favouriteControl(id, "trip") : ""}</article>`;
  }).join("") : '<div class="empty">No trips are available.</div>';
  target.querySelectorAll("[data-book-trip]").forEach(button => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await api.trips.book(button.dataset.bookTrip);
      notify("Trip added to your travel plans.");
      location.assign("/pages/trips.html");
    } catch (error) {
      button.disabled = false;
      notify(error.message, true);
    }
  }));
  bindFavouriteControls(target);
} catch (error) {
  target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
}
