import { api, session } from "../shared/api.js";
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
    return restaurant.cuisines.map(c => typeof c === "object" ? (c.name || c.tag_name || "") : String(c)).filter(Boolean).join(" · ");
  }
  if (typeof restaurant.cuisine === "string" && restaurant.cuisine.trim()) return restaurant.cuisine.trim();
  if (Array.isArray(restaurant.establishment_types) && restaurant.establishment_types.length) {
    return restaurant.establishment_types.map(t => typeof t === "object" ? (t.name || "") : String(t)).filter(Boolean).join(" · ");
  }
  return "";
}

function extractAward(award) {
  if (!award) return "";
  if (typeof award === "string") return award;
  if (typeof award === "object") {
    return `${award.award_name || "Award"} ${award.year || ""}`.trim();
  }
  return "";
}

if (!id) {
  target.innerHTML = '<div class="empty">Choose a restaurant from the <a class="text-action" href="/pages/restaurants.html">restaurant search</a>.</div>';
} else {
  try {
    const payload = await api.restaurants.details(id);
    const restaurant = payload?.data || payload?.restaurant || payload || {};
    const name = restaurant.name || restaurant.title || "Restaurant";
    const address = extractAddress(restaurant);
    const rating = restaurant.rating || restaurant.averageRating || "—";
    const reviewCount = restaurant.reviews || restaurant.review_count || restaurant.num_reviews || null;
    const cuisines = extractCuisines(restaurant);
    const priceRange = restaurant.price_range || restaurant.price_level || restaurant.price || "";
    const description = typeof restaurant.description === "string" && restaurant.description ? restaurant.description : (typeof restaurant.about === "string" ? restaurant.about : "");
    const image = restaurant.featured_image || restaurant.photo?.images?.large?.url || restaurant.photo?.images?.medium?.url || restaurant.image || "";
    const phone = restaurant.phone || restaurant.telephone || "";
    const menuLink = restaurant.menu_link || "";
    const tripadvisorLink = restaurant.link || restaurant.web_url || "";
    const statusText = restaurant.status_text || (restaurant.is_open_now === true ? "Open now" : restaurant.is_open_now === false ? "Closed" : "");
    const award = extractAward(restaurant.award);
    const reviewLink = session.isLoggedIn() && id ? `<a class="button subtle" href="/pages/reviews.html?type=restaurant&id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}">Write a review</a>` : "";

    target.innerHTML = `
      <p class="eyebrow">RESTAURANT DETAILS</p>
      <h1>${escapeHtml(name)}</h1>
      ${image ? `<div class="restaurant-hero-image" style="margin: 18px 0; border-radius: 18px; overflow: hidden; max-height: 420px;"><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ""}
      ${description ? `<p class="lead">${escapeHtml(description)}</p>` : ""}
      <div class="panel" style="margin: 20px 0; display: grid; gap: 10px;">
        <p><b>Address:</b> ${escapeHtml(address)}</p>
        <p><b>Rating:</b> ★ ${escapeHtml(String(rating))}${reviewCount ? ` (${escapeHtml(String(reviewCount))} reviews)` : ""}${priceRange ? ` · ${escapeHtml(priceRange)}` : ""}</p>
        ${cuisines ? `<p><b>Cuisines:</b> ${escapeHtml(cuisines)}</p>` : ""}
        ${statusText ? `<p><b>Status:</b> ${escapeHtml(statusText)}</p>` : ""}
        ${phone ? `<p><b>Phone:</b> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>` : ""}
        ${award ? `<p><b>Award:</b> 🏆 ${escapeHtml(award)}</p>` : ""}
      </div>
      <div class="detail-actions">
        <a class="button subtle" href="/pages/restaurants.html">Back to search</a>
        ${menuLink ? `<a class="button subtle" href="${escapeHtml(menuLink)}" target="_blank" rel="noopener noreferrer">View menu ↗</a>` : ""}
        ${tripadvisorLink ? `<a class="button subtle" href="${escapeHtml(tripadvisorLink)}" target="_blank" rel="noopener noreferrer">Tripadvisor ↗</a>` : ""}
        ${reviewLink}
        ${favouriteControl(id, "restaurant")}
      </div>
    `;
    bindFavouriteControls(target);
  } catch (error) {
    target.innerHTML = `<div class="empty">${escapeHtml(error.message)} <a class="text-action" href="/pages/restaurants.html">Search again</a></div>`;
  }
}
