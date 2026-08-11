import { api, rows, session } from "../shared/api.js";
import { mountNavigation, requireLogin, notify } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  const status = document.querySelector("#admin-status");
  if (!session.isAdmin()) status.textContent = "Administrator access is required.";
  else {
    try {
      const [statistics, tripStatistics, usersPayload, tripsPayload, bookingsPayload, reviewsPayload, messagesPayload, interestsPayload, settingsPayload] = await Promise.all([api.admin.statistics(), api.admin.tripStatistics(), api.admin.users(), api.trips.list(), api.dashboard.bookings(), api.admin.reviews(), api.admin.messages(), api.admin.interests(), api.admin.settings()]);
      status.textContent = `Live data loaded. Platform: ${JSON.stringify(statistics.data || statistics)}. Trips: ${JSON.stringify(tripStatistics.data || tripStatistics)}.`;
      const users = rows(usersPayload);
      document.querySelector("#users").innerHTML = users.map(user => `<tr><td>${user.name || `${user.first_name || ""} ${user.last_name || ""}`}</td><td>${user.email || ""}</td><td>${user.is_active ? "Active" : "Inactive"}</td><td><button class="button subtle" data-status="${user.id}" data-active="${user.is_active ? "0" : "1"}">${user.is_active ? "Deactivate" : "Activate"}</button></td></tr>`).join("") || '<tr><td colspan="4">No users returned.</td></tr>';
      document.querySelectorAll("[data-status]").forEach(button => button.addEventListener("click", async () => { try { await api.admin.userStatus(button.dataset.status, button.dataset.active === "1"); location.reload(); } catch (error) { notify(error.message, true); } }));
      const trips = rows(tripsPayload);
      document.querySelector("#admin-trips").innerHTML = cards(trips, trip => `<h3>${trip.name || trip.title || "Trip"}</h3><p>${trip.status || ""}</p><a class="button subtle" href="/pages/trip-details.html?id=${trip.id}">Inspect itinerary</a> <button class="button subtle" data-trip="${trip.id}">Delete</button>`);
      document.querySelectorAll("[data-trip]").forEach(button => button.addEventListener("click", async () => { if (!confirm("Delete this trip?")) return; try { await api.trips.remove(button.dataset.trip); button.closest("article").remove(); } catch (error) { notify(error.message, true); } }));
      document.querySelector("#admin-bookings").innerHTML = cards(rows(bookingsPayload), item => `<h3>${item.name || item.hotel?.name || "Booking"}</h3><p>${item.status || ""} ${item.amount || item.total || ""}</p>`);
      document.querySelector("#admin-reviews").innerHTML = cards(rows(reviewsPayload), item => `<h3>${item.title || "Review"}</h3><p>${item.comment || item.content || ""}</p><button class="button" data-approve="${item.id}">Approve</button> <button class="button subtle" data-reject="${item.id}">Reject</button>`);
      document.querySelectorAll("[data-approve],[data-reject]").forEach(button => button.addEventListener("click", async () => { const decision = button.dataset.approve ? "approve" : "reject"; try { await api.admin.reviewDecision(button.dataset.approve || button.dataset.reject, decision); button.closest("article").remove(); } catch (error) { notify(error.message, true); } }));
      document.querySelector("#admin-messages").innerHTML = cards(rows(messagesPayload), item => `<h3>${item.subject || item.name || "Support message"}</h3><p>${item.message || item.content || ""}</p>`);
      document.querySelector("#admin-configuration").innerHTML = cards([...rows(interestsPayload), ...rows(settingsPayload)], item => `<h3>${item.name || item.key || "Configuration"}</h3><p>${item.value || item.description || ""}</p>`);
    } catch (error) { status.textContent = error.message; }
  }
}
function cards(items, content) { return items.length ? items.map(item => `<article class="result-card">${content(item)}</article>`).join("") : '<div class="empty">No records returned.</div>'; }
