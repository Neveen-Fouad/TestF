import { api, rows } from "../shared/api.js";
import { mountNavigation } from "../shared/navigation.js";
mountNavigation("home");
const target = document.querySelector("#home-trips");
try { const trips = rows(await api.trips.list()); target.innerHTML = trips.length ? trips.slice(0, 6).map(trip => `<article class="card"><div class="eyebrow">${trip.country || trip.destination || "JOURNEY"}</div><h3>${trip.name || trip.title || "Untitled trip"}</h3><p>${trip.description || trip.duration || "Open this journey to see the full plan."}</p><a class="button subtle" href="/pages/trip-details.html?id=${encodeURIComponent(trip.id)}">View itinerary</a></article>`).join("") : '<div class="empty">No journeys are available right now.</div>'; } catch (error) { target.innerHTML = `<div class="empty">${error.message}</div>`; }
