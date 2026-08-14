import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify } from "../shared/navigation.js";

mountNavigation("explore");
const target = document.querySelector("#trips");
const catalogView = new URLSearchParams(location.search).get("catalog") === "1";
const memberView = session.isLoggedIn() && !catalogView;

if (memberView) {
  document.querySelector("#trips-eyebrow").textContent = "YOUR TRAVEL SPACE";
  document.querySelector("#trips-title").textContent = "My trips";
  document.querySelector("#trips-intro").textContent = "Open a journey to view its daily plans, memories, and booking details.";
} else if (catalogView) {
  document.querySelector("#trips-eyebrow").textContent = "EXPLORE";
  document.querySelector("#trips-title").textContent = "Ready-made journeys";
  document.querySelector("#trips-intro").textContent = "Choose a curated itinerary and add it to your travel plans.";
}

try {
  const trips = rows(await (memberView ? api.trips.list() : api.trips.preMade()));
  target.innerHTML = trips.length ? trips.map(trip => {
    const id = trip.id;
    const action = memberView
      ? id
        ? `<a class="button subtle" href="/pages/trip-details.html?id=${encodeURIComponent(id)}">View itinerary</a>`
        : '<span class="muted">This trip is missing its itinerary reference.</span>'
      : session.isLoggedIn() && id
        ? `<button class="button" type="button" data-book-trip="${escapeHtml(id)}">Add to my trips</button>`
        : '<a class="button subtle" href="/pages/login.html?returnTo=%2Fpages%2Ftrips.html%3Fcatalog%3D1">Sign in to add this trip</a>';
    return `<article class="result-card"><div class="eyebrow">${escapeHtml(trip.destination || trip.country || "JOURNEY")}</div><h3>${escapeHtml(trip.name || trip.title || "Untitled trip")}</h3><p>${escapeHtml(trip.description || trip.duration || trip.style || "View its live daily itinerary.")} · $${escapeHtml(trip.estimated_expenses || trip.budget || "—")} estimated</p>${action}</article>`;
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
} catch (error) {
  target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
}
