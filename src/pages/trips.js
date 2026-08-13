import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("explore");
const target = document.querySelector("#trips");
const memberView = session.isLoggedIn();

if (memberView) {
  document.querySelector("#trips-eyebrow").textContent = "YOUR TRAVEL SPACE";
  document.querySelector("#trips-title").textContent = "My trips";
  document.querySelector("#trips-intro").textContent = "Open a journey to view its daily plans, memories, and booking details.";
}

try {
  const trips = rows(await (memberView ? api.trips.list() : api.trips.preMade()));
  target.innerHTML = trips.length ? trips.map(trip => `<article class="result-card">
    <div class="eyebrow">${escapeHtml(trip.destination || trip.country || "JOURNEY")}</div>
    <h3>${escapeHtml(trip.name || trip.title || "Untitled trip")}</h3>
    <p>${escapeHtml(trip.description || trip.duration || trip.style || "View its live daily itinerary.")}</p>
    ${memberView ? `<a class="button subtle" href="/pages/trip-details.html?id=${encodeURIComponent(trip.id)}">Open trip</a>` : '<a class="button subtle" href="/pages/login.html?returnTo=%2Fpages%2Fplanner.html">Sign in to personalize</a>'}
  </article>`).join("") : '<div class="empty">No trips are available.</div>';
} catch (error) {
  target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
}
