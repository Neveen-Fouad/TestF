import { api, rows } from "../shared/api.js";
import { confirmModal, escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();

if (requireLogin()) {
  mountSidebar("reviews");

  const target = document.querySelector("#reviews");
  const paginationTarget = document.querySelector("#reviews-pagination");
  const tabsContainer = document.querySelector(".reviews-tabs");
  const editContainer = document.querySelector("#review-edit-container");
  const editForm = document.querySelector("#review-edit-form");
  const writeContainer = document.querySelector("#review-write-container");
  const createForm = document.querySelector("#review-form");
  const itemPickerField = document.querySelector("#item-picker-field");
  const itemSelect = document.querySelector("#item-select");

  const parameters = new URLSearchParams(location.search);
  const typeParam = parameters.get("type");
  const reviewableIdParam = parameters.get("id");

  let activeTab = (typeParam && reviewableIdParam) ? "write" : "mine";
  let currentPage = 1;
  let myReviewsCache = [];

  function resolvePhotoUrl(path) {
    if (!path || typeof path !== "string") return "";
    if (/^https?:\/\//i.test(path) || /^data:image\//i.test(path)) return path;
    const defaultApiUrl = `http://${location.hostname}:8000/api`;
    const apiBase = (window.JOURNOVO_CONFIG?.API_BASE_URL || defaultApiUrl).replace(/\/$/, "");
    const backendOrigin = apiBase.replace(/\/api\/?$/i, "");
    const clean = path.replace(/^\/?storage\//i, "").replace(/^\//, "");
    return `${backendOrigin}/storage/${clean}`;
  }

  function renderStatusBadge(status) {
    const s = String(status || "pending").toLowerCase();
    const isApproved = s === "approved";
    const isRejected = s === "rejected";
    const badgeClass = isApproved ? "approved" : isRejected ? "rejected" : "pending";
    const label = isApproved ? "Approved" : isRejected ? "Rejected" : "Pending approval";
    return `<span class="review-status-badge ${badgeClass}">${escapeHtml(label)}</span>`;
  }

  function renderStarRating(rating) {
    const r = Math.round(Number(rating) || 5);
    const stars = "★".repeat(Math.max(1, Math.min(5, r))) + "☆".repeat(Math.max(0, 5 - r));
    return `<span class="review-stars">${stars} <span>${r}/5</span></span>`;
  }

  // Initialize
  init();

  async function init() {
    // Tab switching
    if (tabsContainer) {
      tabsContainer.querySelectorAll("[data-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
          switchTab(tab.dataset.tab);
        });
      });
      // Initial tab highlight
      updateTabButtons();
    }

    // Cancel buttons
    document.querySelector("#close-edit-review-btn")?.addEventListener("click", () => {
      editContainer.hidden = true;
    });
    document.querySelector("#cancel-edit-btn")?.addEventListener("click", () => {
      editContainer.hidden = true;
    });
    document.querySelector("#cancel-write-btn")?.addEventListener("click", () => {
      switchTab("mine");
    });

    // Edit form submission
    if (editForm) {
      editForm.addEventListener("submit", handleEditSubmit);
    }

    // Create form submission
    if (createForm) {
      createForm.addEventListener("submit", handleCreateSubmit);
      await initCreateForm();
    }

    // Character counter for create form textarea
    const createCounter = createForm?.querySelector("[data-count]");
    const createTextarea = createForm?.querySelector("textarea[name='description']");
    if (createCounter && createTextarea) {
      createTextarea.addEventListener("input", () => {
        createCounter.textContent = createTextarea.value.length;
      });
    }

    // Load initial tab content
    await switchTab(activeTab);
  }

  function updateTabButtons() {
    if (!tabsContainer) return;
    tabsContainer.querySelectorAll("[data-tab]").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.tab === activeTab);
    });
  }

  async function switchTab(tabName) {
    activeTab = tabName;
    currentPage = 1;
    updateTabButtons();

    // Hide edit panel on tab switch
    if (editContainer) editContainer.hidden = true;

    if (activeTab === "write") {
      if (writeContainer) writeContainer.hidden = false;
      target.innerHTML = "";
      if (paginationTarget) paginationTarget.innerHTML = "";
      document.querySelector("#reviews-page-title").textContent = "Write a review";
    } else {
      if (writeContainer) writeContainer.hidden = true;
      document.querySelector("#reviews-page-title").textContent = "My reviews";
      await loadMyReviews();
    }
  }

  // 1. GET ALL USER REVIEWS (GET /api/reviews/my)
  async function loadMyReviews() {
    target.innerHTML = '<div class="empty">Loading your reviews…</div>';
    if (paginationTarget) paginationTarget.innerHTML = "";

    try {
      const payload = await api.reviews.mine(currentPage);
      const items = rows(payload);
      myReviewsCache = items;

      const pagination = payload?.data?.current_page ? payload.data : (payload?.current_page ? payload : {});
      const lastPage = Number(pagination.last_page) || 1;
      const total = pagination.total != null ? pagination.total : items.length;

      if (!items.length) {
        target.innerHTML = `
          <div class="empty">
            <p>You haven’t submitted any reviews yet.</p>
            <button class="button subtle" type="button" data-switch-write style="margin-top: 10px;">Write your first review →</button>
          </div>
        `;
        target.querySelector("[data-switch-write]")?.addEventListener("click", () => switchTab("write"));
        return;
      }

      target.innerHTML = items.map(item => {
        const type = String(item.type || "review").toUpperCase();
        const rating = item.rating || 5;
        const comment = item.description || item.comment || item.content || "";
        const image = item.image ? resolvePhotoUrl(item.image) : "";
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "";
        const status = String(item.status || "pending").toLowerCase();
        const isPending = status === "pending";

        return `
          <article class="result-card user-review-card" data-review-id="${escapeHtml(String(item.id))}">
            <div>
              <div class="review-card-header">
                <span class="eyebrow" style="margin: 0;">${escapeHtml(type)}</span>
                ${renderStatusBadge(item.status)}
              </div>
              <h3 style="margin: 4px 0;">${escapeHtml(item.title || `${type} review`)}</h3>
              ${renderStarRating(rating)}
              <p style="margin: 8px 0; color: var(--ink); line-height: 1.55;">${escapeHtml(comment)}</p>
              ${image ? `<img class="review-image-thumbnail" src="${escapeHtml(image)}" alt="Review photo" loading="lazy" onerror="this.style.display='none'">` : ""}
              ${date ? `<p style="margin: 8px 0 0; color: var(--muted); font-size: 12px;">Submitted on ${escapeHtml(date)}</p>` : ""}
            </div>
            <div class="review-card-actions">
              ${isPending ? `
                <button class="button subtle" type="button" data-edit-review="${escapeHtml(String(item.id))}">
                  ✏ Edit review
                </button>
              ` : ""}
              <button class="button subtle danger" type="button" data-delete-review="${escapeHtml(String(item.id))}">
                🗑 Delete
              </button>
            </div>
          </article>
        `;
      }).join("");

      // Attach Edit & Delete Listeners
      target.querySelectorAll("[data-edit-review]").forEach(btn => {
        btn.addEventListener("click", () => {
          openEditReview(btn.dataset.editReview);
        });
      });

      target.querySelectorAll("[data-delete-review]").forEach(btn => {
        btn.addEventListener("click", () => {
          handleDeleteReview(btn.dataset.deleteReview);
        });
      });

      // Pagination
      renderPagination(lastPage, total, page => {
        currentPage = page;
        loadMyReviews();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      target.innerHTML = `<div class="empty is-error">${escapeHtml(error.message || "Failed to load your reviews.")}</div>`;
    }
  }

  // 2. EDIT REVIEW (POST /api/reviews/{review_id})
  function openEditReview(reviewId) {
    const review = myReviewsCache.find(r => String(r.id) === String(reviewId));
    if (!review || String(review.status).toLowerCase() !== "pending") {
      notify("Only pending reviews can be edited.", true);
      return;
    }

    editForm.elements.review_id.value = review.id;
    editForm.elements.rating.value = String(Math.round(Number(review.rating) || 5));
    editForm.elements.description.value = review.description || review.comment || "";
    if (editForm.elements.image) editForm.elements.image.value = "";

    editContainer.hidden = false;
    editContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    const reviewId = editForm.elements.review_id.value;
    if (!reviewId) return;

    const submitBtn = editForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const formData = new FormData(editForm);
      if (!formData.get("image")?.size) formData.delete("image");
      formData.delete("review_id");

      await api.reviews.update(reviewId, formData);
      notify("Review updated successfully.");
      editContainer.hidden = true;
      await loadMyReviews();
    } catch (error) {
      notify(error.message || "Failed to update review.", true);
    } finally {
      submitBtn.disabled = false;
    }
  }

  // 3. DELETE REVIEW (DELETE /api/reviews/{review_id})
  async function handleDeleteReview(reviewId) {
    if (!await confirmModal("Are you sure you want to delete this review? This action cannot be undone.", {
      title: "Delete Review",
      confirmText: "Delete",
      danger: true
    })) {
      return;
    }

    try {
      await api.reviews.remove(reviewId);
      notify("Review deleted successfully.");
      await loadMyReviews();
    } catch (error) {
      notify(error.message || "Failed to delete review.", true);
    }
  }



  // Pagination Renderer
  function renderPagination(lastPage, total, onPageChange) {
    if (!paginationTarget) return;
    if (lastPage > 1) {
      paginationTarget.innerHTML = `
        <button class="button subtle" type="button" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>← Previous</button>
        <span>Page ${currentPage} of ${lastPage} (${total} reviews)</span>
        <button class="button subtle" type="button" data-page="next" ${currentPage >= lastPage ? "disabled" : ""}>Next →</button>
      `;
      paginationTarget.querySelectorAll("[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
          const next = btn.dataset.page === "prev" ? currentPage - 1 : currentPage + 1;
          onPageChange(next);
        });
      });
    } else {
      paginationTarget.innerHTML = "";
    }
  }

  // 5. WRITE REVIEW FORM INITIALIZATION & SUBMIT
  async function initCreateForm() {
    const validTypes = new Set(["trip", "hotel", "restaurant"]);

    if (validTypes.has(typeParam) && reviewableIdParam) {
      createForm.elements.type.value = typeParam;
      createForm.elements.reviewable_id.value = reviewableIdParam;
      document.querySelector("#review-context").textContent = `Reviewing: ${parameters.get("name") || typeParam}`;
      if (itemPickerField) itemPickerField.hidden = true;
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

      trips.forEach(trip => {
        const id = trip.trip_id || trip.trip?.id || trip.template_trip_id || trip.id;
        if (id) {
          const title = trip.destination || trip.name || trip.title || "Trip";
          const tag = trip.is_ai_generated ? "AI Trip" : "Custom Trip";
          options.push(`<option value="trip:${escapeHtml(id)}">${escapeHtml(title)} (${tag})</option>`);
        }
      });

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
            createForm.elements.type.value = "";
            createForm.elements.reviewable_id.value = "";
            return;
          }
          const [selectedType, selectedId] = itemSelect.value.split(":");
          createForm.elements.type.value = selectedType;
          createForm.elements.reviewable_id.value = selectedId;
        });
      } else {
        itemSelect.innerHTML = '<option value="">No completed trips or confirmed stays available yet</option>';
      }
    } catch {
      itemSelect.innerHTML = '<option value="">Could not load travel items</option>';
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const submitBtn = createForm.querySelector('button[type="submit"]');

    if (!createForm.elements.type.value || !createForm.elements.reviewable_id.value) {
      notify("Please select a trip or completed stay to review.", true);
      return;
    }

    submitBtn.disabled = true;
    try {
      const data = new FormData(createForm);
      if (!data.get("image")?.size) data.delete("image");
      if (data.has("item_select")) data.delete("item_select");

      await api.reviews.create(data);
      notify("Your review was submitted successfully and is pending approval.");
      createForm.reset();
      createForm.elements.rating.value = "5";
      createForm.elements.type.value = "";
      createForm.elements.reviewable_id.value = "";
      if (createCounter) createCounter.textContent = "0";

      // Switch to My Reviews tab to view the submitted review
      await switchTab("mine");
    } catch (error) {
      notify(error.message || "Failed to submit review.", true);
    } finally {
      submitBtn.disabled = false;
    }
  }
}

