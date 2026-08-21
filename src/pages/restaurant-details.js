import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";
import { bindFavouriteControls, favouriteControl } from "../shared/favourites.js";

mountNavigation("restaurants");
const id = new URLSearchParams(location.search).get("id");
const target = document.querySelector("#details");

function extractAddress(restaurant) {
  const addr = restaurant.address;
  if (!addr) {
    if (restaurant.parent_location) {
      return typeof restaurant.parent_location === "object" ? (restaurant.parent_location.name || "") : String(restaurant.parent_location);
    }
    return typeof restaurant.location === "object" ? (restaurant.location.name || "") : String(restaurant.location || "");
  }
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    if (addr.address) return addr.address;
    const parts = [addr.street || addr.street1, addr.city, addr.country].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return addr.name || addr.country || "";
  }
  return "Address unavailable";
}

function extractCuisines(restaurant) {
  if (Array.isArray(restaurant.cuisines) && restaurant.cuisines.length) {
    return restaurant.cuisines.map(c => typeof c === "object" ? (c.name || c.tag_name || "") : String(c)).filter(Boolean);
  }
  if (typeof restaurant.cuisine === "string" && restaurant.cuisine.trim()) {
    return [restaurant.cuisine.trim()];
  }
  return [];
}

function extractEstablishments(restaurant) {
  if (Array.isArray(restaurant.establishment_types) && restaurant.establishment_types.length) {
    return restaurant.establishment_types.map(t => typeof t === "object" ? (t.name || "") : String(t)).filter(Boolean);
  }
  return [];
}

function extractAward(award) {
  if (!award) return "";
  if (typeof award === "string") return award;
  if (typeof award === "object") {
    return `${award.award_name || "Award"} ${award.year || ""}`.trim();
  }
  return "";
}

function getTodayDayName() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

function extractRestaurantId(restaurant) {
  if (!restaurant) return "";
  if (restaurant.tripadvisor_entity_id) return String(restaurant.tripadvisor_entity_id);
  if (restaurant.id) return String(restaurant.id);
  if (restaurant.location_id) return String(restaurant.location_id);
  if (restaurant.locationId) return String(restaurant.locationId);
  if (restaurant.documentId) return String(restaurant.documentId);
  if (restaurant.entity_id) return String(restaurant.entity_id);
  if (restaurant.restaurant_id) return String(restaurant.restaurant_id);
  
  const link = restaurant.link || restaurant.web_url || "";
  const match = link.match(/-d(\d+)-/);
  if (match && match[1]) return match[1];

  return restaurant.name || "";
}

function getRequestedRestaurantId() {
  const params = new URLSearchParams(location.search);
  let id = params.get("id") || params.get("query") || params.get("restaurant_id");
  if (id && id !== "undefined" && id !== "null") return id;

  const savedId = sessionStorage.getItem("journovo_last_selected_restaurant_id");
  if (savedId && savedId !== "undefined" && savedId !== "null") return savedId;

  try {
    const raw = sessionStorage.getItem("journovo_last_selected_restaurant");
    if (raw) {
      const obj = JSON.parse(raw);
      const extracted = extractRestaurantId(obj);
      if (extracted) return extracted;
    }
  } catch {}

  return null;
}

async function renderRestaurantDetails() {
  const id = getRequestedRestaurantId();

  // 1. Check local session cache for instantaneous rendering
  let cachedData = null;
  try {
    if (id) {
      const raw = sessionStorage.getItem(`restaurant_${id}`) || sessionStorage.getItem("journovo_last_selected_restaurant");
      if (raw) cachedData = JSON.parse(raw);
    } else {
      const raw = sessionStorage.getItem("journovo_last_selected_restaurant");
      if (raw) cachedData = JSON.parse(raw);
    }
  } catch {}

  let restaurant = cachedData;

  if (!id && !restaurant) {
    target.innerHTML = '<div class="empty">Choose a restaurant from the <a class="text-action" href="/pages/restaurants.html">restaurant search</a>.</div>';
    return;
  }

  // If id is known, ensure URL parameter is populated
  if (id && (!location.search || !location.search.includes("id="))) {
    try {
      history.replaceState(null, "", `/pages/restaurant-details.html?id=${encodeURIComponent(id)}`);
    } catch {}
  }

  // 2. Fetch fresh details from backend if ID is available
  if (id) {
    try {
      if (!restaurant) {
        target.innerHTML = '<div class="empty">Loading restaurant details…</div>';
      }
      const payload = await api.restaurants.details(id);
      const freshData = payload?.data || payload?.restaurant || (Array.isArray(payload) ? payload[0] : payload);
      if (freshData && typeof freshData === "object") {
        restaurant = { ...restaurant, ...freshData };
      }
    } catch (error) {
      if (!restaurant) {
        target.innerHTML = `<div class="empty">${escapeHtml(error.message || "Failed to load restaurant details.")} <a class="text-action" href="/pages/restaurants.html">Back to search</a></div>`;
        return;
      }
    }
  }

  if (!restaurant) {
    target.innerHTML = '<div class="empty">Restaurant not found. <a class="text-action" href="/pages/restaurants.html">Search restaurants</a></div>';
    return;
  }

  const name = restaurant.name || restaurant.title || "Restaurant";
  const address = extractAddress(restaurant);
  const rating = restaurant.rating || restaurant.averageRating || null;
  const reviewCount = restaurant.reviews || restaurant.review_count || restaurant.num_reviews || null;
  const cuisines = extractCuisines(restaurant);
  const establishmentTypes = extractEstablishments(restaurant);
  const priceRange = restaurant.price_range || restaurant.price_level || restaurant.price || "";
  const description = typeof restaurant.description === "string" && restaurant.description ? restaurant.description : (typeof restaurant.about === "string" ? restaurant.about : "");
  const image = restaurant.featured_image || restaurant.photo?.images?.large?.url || restaurant.photo?.images?.medium?.url || restaurant.image || "";
  const phone = restaurant.phone || restaurant.telephone || "";
  const menuLink = restaurant.menu_link || "";
  const statusText = restaurant.status_text || (restaurant.is_open_now === true ? "Open now" : restaurant.is_open_now === false ? "Closed" : "");
  const isOpen = restaurant.is_open_now ?? (statusText ? statusText.toLowerCase().includes("open") : null);
  const award = extractAward(restaurant.award);
  const reservationProviders = Array.isArray(restaurant.reservation_providers) ? restaurant.reservation_providers : [];
  const primaryReservation = reservationProviders[0];

  const reviewSnippets = Array.isArray(restaurant.review_snippets) ? restaurant.review_snippets : [];
  const hoursList = Array.isArray(restaurant.hours) ? restaurant.hours : [];
  const todayName = getTodayDayName();

  const reviewLink = session.isLoggedIn()
    ? `<a class="button subtle" href="/pages/reviews.html?type=restaurant&id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}">✍ Write a review</a>`
    : "";

  target.innerHTML = `
    <!-- Hero Banner -->
    <article class="restaurant-details-hero">
      ${image ? `
        <div class="restaurant-hero-img-wrap">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}">
          <div class="restaurant-hero-gradient"></div>
        </div>
      ` : ""}
      <div class="restaurant-hero-content">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span class="eyebrow" style="margin: 0;">RESTAURANT DETAILS</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${statusText ? `<span class="status-pill ${isOpen ? "is-open" : "is-closed"}">${escapeHtml(statusText)}</span>` : ""}
            ${award ? `<span class="restaurant-award-badge" style="position: static;">🏆 ${escapeHtml(award)}</span>` : ""}
          </div>
        </div>
        <h1 class="restaurant-hero-title">${escapeHtml(name)}</h1>
        <div class="restaurant-hero-meta">
          ${rating ? `<span class="restaurant-rating" style="font-size: 16px;">★ ${escapeHtml(String(rating))}</span>` : ""}
          ${reviewCount ? `<span class="restaurant-reviews" style="font-size: 14px;">(${escapeHtml(String(reviewCount))} reviews)</span>` : ""}
        </div>

        <div class="detail-actions" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line);">
          <a class="button subtle" href="/pages/restaurants.html">← Back to search</a>
          ${menuLink ? `<a class="button" href="${escapeHtml(menuLink)}" target="_blank" rel="noopener noreferrer">📖 View digital menu ↗</a>` : ""}
          ${reviewLink}
          ${favouriteControl(id, "restaurant")}
        </div>
      </div>
    </article>

    <!-- Details Sections Grid -->
    <div class="restaurant-details-grid">
      <!-- Location & Contact Card -->
      <section class="restaurant-info-card">
        <h3>📍 Location & Contact</h3>
        <p style="margin: 0 0 10px; line-height: 1.5; color: var(--ink);">
          <strong>Address:</strong><br>
          ${escapeHtml(address)}
        </p>
        ${phone ? `
          <p style="margin: 0 0 14px; line-height: 1.5; color: var(--ink);">
            <strong>Phone number:</strong><br>
            <a href="tel:${escapeHtml(phone)}" style="color: var(--blue); font-weight: 700; text-decoration: underline;">${escapeHtml(phone)}</a>
          </p>
        ` : ""}
      </section>

      <!-- Operating Hours Card -->
      <section class="restaurant-info-card">
        <h3>🕒 Opening Hours</h3>
        ${hoursList.length ? `
          <table class="hours-table">
            <tbody>
              ${hoursList.map(h => {
                const day = h.day || "";
                const isToday = day.toLowerCase() === todayName.toLowerCase();
                const times = Array.isArray(h.times) && h.times.length
                  ? h.times.map(t => `${t.open || "—"} - ${t.close || "—"}`).join(", ")
                  : (h.time || "Closed");
                return `
                  <tr class="${isToday ? "is-today" : ""}">
                    <td>${escapeHtml(day)} ${isToday ? '<span style="font-size: 10px; background: var(--blue); color: #fff; padding: 1px 6px; border-radius: 4px; margin-left: 4px;">Today</span>' : ""}</td>
                    <td>${escapeHtml(times)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        ` : `
          <p style="color: var(--muted); margin: 0;">
            Opening hours are not specified by this establishment.
          </p>
        `}
      </section>

      <!-- Dining Features Card -->
      <section class="restaurant-info-card">
        <h3>✨ Dining Features</h3>
        <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; font-size: 13.5px;">
          ${priceRange ? `
            <li style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--line); padding-bottom: 6px;">
              <span style="color: var(--muted);">Price Range:</span>
              <span style="font-weight: 700; color: var(--ink);">${escapeHtml(priceRange)}</span>
            </li>
          ` : ""}
          ${cuisines.length ? `
            <li style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--line); padding-bottom: 6px;">
              <span style="color: var(--muted);">Cuisines:</span>
              <span style="font-weight: 700; color: var(--ink); text-align: right;">${escapeHtml(cuisines.join(", "))}</span>
            </li>
          ` : ""}
          ${establishmentTypes.length ? `
            <li style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--line); padding-bottom: 6px;">
              <span style="color: var(--muted);">Category:</span>
              <span style="font-weight: 700; color: var(--ink); text-align: right;">${escapeHtml(establishmentTypes.join(", "))}</span>
            </li>
          ` : ""}
          <li style="display: flex; justify-content: space-between;">
            <span style="color: var(--muted);">Delivery:</span>
            <span style="font-weight: 700; color: ${restaurant.has_delivery ? "var(--success)" : "var(--muted)"};">
              ${restaurant.has_delivery ? "✓ Available" : "Dine-in / Takeout"}
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Review Snippets Section -->
    ${reviewSnippets.length ? `
      <section class="restaurant-info-card" style="margin-bottom: 30px;">
        <h3>💬 What Diners Are Saying</h3>
        <div class="restaurant-snippets-list">
          ${reviewSnippets.map(snippet => {
            const text = (snippet.snippet_text || snippet.text || "")
              .replaceAll("\ufff9", "")
              .replaceAll("\ufffb", "");
            return `
              <blockquote class="restaurant-snippet-card">
                “${escapeHtml(text)}”
              </blockquote>
            `;
          }).join("")}
        </div>
      </section>
    ` : ""}

    <!-- Journovo Community Reviews Section -->
    <section class="restaurant-info-card restaurant-reviews-container">
      <h3 style="margin: 0 0 16px;">⭐ Journovo Traveler Reviews</h3>
      <div id="restaurant-community-reviews">
        <div class="empty">Loading traveler reviews…</div>
      </div>
    </section>
  `;

  bindFavouriteControls(target);

  // Load Community Reviews for this restaurant
  loadRestaurantCommunityReviews(id);
}

async function loadRestaurantCommunityReviews(restaurantId) {
  const reviewsContainer = document.querySelector("#restaurant-community-reviews");
  if (!reviewsContainer) return;

  try {
    const payload = await api.reviews.list(1, { type: "restaurant", reviewable_id: restaurantId });
    const reviews = rows(payload);

    if (!reviews.length) {
      reviewsContainer.innerHTML = `
        <div class="empty" style="padding: 20px 0;">
          <p>No traveler reviews submitted yet for this restaurant on Journovo.</p>
          ${session.isLoggedIn() ? `<a class="button subtle" href="/pages/reviews.html?type=restaurant&id=${encodeURIComponent(restaurantId)}">Be the first to write a review →</a>` : ""}
        </div>
      `;
      return;
    }

    reviewsContainer.innerHTML = `
      <div style="display: grid; gap: 14px;">
        ${reviews.map(r => {
          const stars = "★".repeat(Math.round(Number(r.rating) || 5)) + "☆".repeat(Math.max(0, 5 - Math.round(Number(r.rating) || 5)));
          const author = r.client?.name || r.user?.name || "Journovo Traveler";
          const date = r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "";
          return `
            <article class="result-card" style="padding: 16px; border-radius: 12px; background: var(--surface);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: var(--navy); font-size: 15px;">${escapeHtml(author)}</strong>
                <span style="color: var(--warm); font-weight: 800;">${stars}</span>
              </div>
              <p style="margin: 6px 0; color: var(--ink); line-height: 1.5;">${escapeHtml(r.description || r.comment || "")}</p>
              ${date ? `<span style="color: var(--muted); font-size: 12px;">${escapeHtml(date)}</span>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    `;
  } catch {
    reviewsContainer.innerHTML = '<div class="empty">Could not load community reviews.</div>';
  }
}

renderRestaurantDetails();

