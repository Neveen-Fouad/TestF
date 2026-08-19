import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
const target = document.querySelector("#reviews");
const form = document.querySelector("#review-form");
const itemPickerField = document.querySelector("#item-picker-field");
const itemSelect = document.querySelector("#item-select");
const parameters = new URLSearchParams(location.search);
const type = parameters.get("type");
const reviewableId = parameters.get("id");
const validTypes = new Set(["trip", "hotel", "restaurant"]);
let currentPage = 1;

function showSubmissionStatus(message, error = false) {
  let status = form.querySelector("[data-review-status]");
  if (!status) {
    status = document.createElement("p");
    status.dataset.reviewStatus = "";
    status.className = "form-message";
    form.prepend(status);
  }
  status.classList.toggle("error", error);
  status.textContent = message;
}

if (requireLogin()) {
  initReviewForm();
  await loadReviews();
}

async function initReviewForm() {
  form.addEventListener("submit", submitReview);

  if (validTypes.has(type) && reviewableId) {
    if (type === "trip") {
      // AI trips and custom trips are reviewable by the member
      form.elements.type.value = type;
      form.elements.reviewable_id.value = reviewableId;
      document.querySelector("#review-context").textContent = `Reviewing: ${parameters.get("name") || "Trip"}`;
      if (itemPickerField) itemPickerField.hidden = true;
    } else {
      // Hotel & restaurant bookings must be confirmed and completed (past checkout)
      try {
        const bookingPayload = await api.dashboard.bookings().catch(() => []);
        const myBookings = rows(bookingPayload);
        const eligibleBooking = myBookings.find(b => {
          const bType = b.type || b.booking_type;
          const bId = String(b.external_reference_id || b.id);
          const checkoutDate = new Date(b.check_out_date);
          const isPastCheckout = !Number.isNaN(checkoutDate.valueOf()) && checkoutDate <= new Date();
          const isConfirmed = String(b.status || "").toLowerCase() === "confirmed";
          return bType === type && bId === String(reviewableId) && isConfirmed && isPastCheckout;
        });

        if (eligibleBooking) {
          form.elements.type.value = type;
          form.elements.reviewable_id.value = reviewableId;
          document.querySelector("#review-context").textContent = `Reviewing: ${parameters.get("name") || `${type[0].toUpperCase()}${type.slice(1)}`}`;
          if (itemPickerField) itemPickerField.hidden = true;
        } else {
          showSubmissionStatus("Reviews unlock only for confirmed bookings after your stay has ended.", true);
          form.querySelector("button").disabled = true;
          document.querySelector("#review-context").textContent = "Booking not completed yet";
          if (itemPickerField) itemPickerField.hidden = true;
        }
      } catch {
        form.elements.type.value = type;
        form.elements.reviewable_id.value = reviewableId;
      }
    }
  } else {
    document.querySelector("#review-context").textContent = "Write a review";
    if (itemPickerField) {
      itemPickerField.hidden = false;
      await populateItemPicker();
    }
  }
}

async function populateItemPicker() {
  if (!itemSelect) return;
  itemSelect.innerHTML = '<option value="">Loading your completed trips and stays…</option>';
  try {
    const [tripPayload, bookingPayload] = await Promise.all([
      api.trips.list().catch(() => []),
      api.dashboard.bookings().catch(() => [])
    ]);

    const trips = rows(tripPayload);
    const bookings = rows(bookingPayload);

    const options = [];

    // 1. AI & Custom Trips (reviewable)
    trips.forEach(trip => {
      const id = trip.trip_id || trip.trip?.id || trip.template_trip_id || trip.id;
      if (id) {
        const title = trip.destination || trip.name || trip.title || "Trip";
        const tag = trip.is_ai_generated ? "AI Trip" : "Custom Trip";
        options.push(`<option value="trip:${escapeHtml(id)}">${escapeHtml(title)} (${tag})</option>`);
      }
    });

    // 2. Bookings: ONLY Confirmed & Completed (past checkout date)
    bookings.forEach(item => {
      const itemType = item.type || item.booking_type;
      const id = item.external_reference_id || item.id;
      const details = item.details || {};
      const name = details.hotel?.name || details.hotel_name || details.name || item.provider_name || `${itemType} booking`;
      
      const checkoutDate = new Date(item.check_out_date);
      const isPastCheckout = !Number.isNaN(checkoutDate.valueOf()) && checkoutDate <= new Date();
      const isConfirmed = String(item.status || "").toLowerCase() === "confirmed";
      const isNotFlight = itemType !== "flight";

      if (itemType && id && isNotFlight && isConfirmed && isPastCheckout) {
        options.push(`<option value="${escapeHtml(itemType)}:${escapeHtml(id)}">${escapeHtml(name)} (Completed Stay)</option>`);
      }
    });

    if (options.length) {
      itemSelect.innerHTML = '<option value="">-- Choose what you want to review --</option>' + options.join("");
      itemSelect.addEventListener("change", () => {
        if (!itemSelect.value) {
          form.elements.type.value = "";
          form.elements.reviewable_id.value = "";
          return;
        }
        const [selectedType, selectedId] = itemSelect.value.split(":");
        form.elements.type.value = selectedType;
        form.elements.reviewable_id.value = selectedId;
      });
    } else {
      itemSelect.innerHTML = '<option value="">No completed trips or confirmed stays available yet</option>';
    }
  } catch (e) {
    itemSelect.innerHTML = '<option value="">Could not load travel items</option>';
  }
}

async function submitReview(event) {
  event.preventDefault();
  const button = event.submitter;

  if (!form.elements.type.value || !form.elements.reviewable_id.value) {
    showSubmissionStatus("Please select a trip or completed stay to review.", true);
    notify("Please select a trip or completed stay to review.", true);
    return;
  }

  button.disabled = true;
  try {
    const data = new FormData(form);
    if (!data.get("image")?.size) data.delete("image");
    if (data.has("item_select")) data.delete("item_select");

    const result = await api.reviews.create(data);
    const review = result?.data || result;

    form.elements.rating.value = "5";
    form.elements.description.value = "";
    if (form.elements.image) form.elements.image.value = "";
    if (itemSelect) itemSelect.value = "";

    showSubmissionStatus(`Your review was submitted successfully and is pending approval.`);
    notify("Review submitted for approval.");
    await loadReviews();
  } catch (error) {
    showSubmissionStatus(error.message || "Your review could not be submitted.", true);
    notify(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function loadReviews() {
  try {
    const payload = await api.reviews.list(currentPage);
    const items = rows(payload);
    const pagination = payload?.data?.current_page ? payload.data : (payload?.current_page ? payload : {});
    currentPage = Number(pagination.current_page) || currentPage;
    const controls = Number(pagination.last_page) > 1 ? `<div class="pagination-controls"><button class="button subtle" type="button" data-page="prev" ${!pagination.prev_page_url ? "disabled" : ""}>← Previous</button><span>Page ${currentPage} of ${pagination.last_page}</span><button class="button subtle" type="button" data-page="next" ${!pagination.next_page_url ? "disabled" : ""}>Next →</button></div>` : "";
    target.innerHTML = items.length ? items.map(item => `
      <article class="result-card">
        <div class="eyebrow">${escapeHtml((item.type || "review").toUpperCase())}</div>
        <h3>${escapeHtml(item.destination?.name || item.type || "Traveler review")}</h3>
        <p style="color: var(--primary); font-weight: 700;">★ ${escapeHtml(String(item.rating || "—"))}/5</p>
        <p>${escapeHtml(item.description || item.comment || item.content || "")}</p>
      </article>
    `).join("") + controls : '<div class="empty">No reviews available.</div>';
    target.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
      currentPage += button.dataset.page === "prev" ? -1 : 1;
      loadReviews();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}
