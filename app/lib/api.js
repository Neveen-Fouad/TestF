export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://61a8-197-52-104-51.ngrok-free.app/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function jwtSubject(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      window.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const value = Number(payload.sub);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function jwtRole(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      window.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const role = payload.role ?? payload.user?.role;
    return typeof role === "string" ? role.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error("API_NOT_CONFIGURED");
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  headers.set("Accept", "application/json");

  // --- إضافة الهيدر الخاص بتخطي تحذير ngrok ---
  headers.set("ngrok-skip-browser-warning", "true");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.message ||
      Object.values(payload?.errors ?? {})
        .flat()
        .join(" ") ||
      "Request failed";
    throw new ApiError(String(message), response.status, payload?.errors ?? {});
  }
  return payload;
}

export const api = {
  auth: {
    login: (body) =>
      apiRequest("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    register: (body) =>
      apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    forgotPassword: (email) =>
      apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (body) =>
      apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    resendVerification: (token) =>
      apiRequest("/auth/email/verification-notification", {
        method: "POST",
        token,
      }),
    logout: (token) =>
      apiRequest("/auth/logout", { method: "POST", token }),
    refresh: (token) =>
      apiRequest("/auth/refresh", { method: "POST", token }),
  },
  explore: {
    countries: () => apiRequest("/countries"),
    country: (country) =>
      apiRequest(`/countries/${encodeURIComponent(country)}`),
    destination: (city, countryCode) =>
      apiRequest(
        `/destination-data?city=${encodeURIComponent(city)}${countryCode ? `&country_code=${encodeURIComponent(countryCode)}` : ""}`,
      ),
    interests: () => apiRequest("/interests"),
  },
  hotels: {
    search: (query) => apiRequest(`/hotels/search?${query}`),
    details: (hotelId) =>
      apiRequest(`/hotels/details?hotel_id=${hotelId}`),
    book: (body, token) =>
      apiRequest("/hotels/bookings", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      }),
  },
  restaurants: {
    list: (city, minRating = 3, page = 1) =>
      apiRequest(
        `/restaurants?city=${encodeURIComponent(city)}&min_rating=${minRating}&page=${page}`,
      ),
    details: (id) =>
      apiRequest(`/restaurants/details?id=${encodeURIComponent(id)}`),
  },
  flights: {
    list: () => apiRequest("/flights"),
    details: (id) => apiRequest(`/flights/${id}`),
    airports: (query) =>
      apiRequest(`/flights/search-airport?query=${encodeURIComponent(query)}`),
    search: (query) => apiRequest(`/flights/search?${query}`),
    book: (body, token) =>
      apiRequest("/flights/book", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      }),
  },
  trips: {
    list: (token) => apiRequest("/trips", { token }),
    create: (body, token, ai = false) =>
      apiRequest(ai ? "/ai/trips" : "/trips", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      }),
    show: (id, token) => apiRequest(`/trips/${id}`, { token }),
    update: (id, body, token) =>
      apiRequest(`/trips/${id}`, {
        method: "PUT",
        token,
        body: JSON.stringify(body),
      }),
    remove: (id, token) =>
      apiRequest(`/trips/${id}`, { method: "DELETE", token }),
  },
  dashboard: {
    savedTrips: (token) =>
      apiRequest("/dashboard/saved-trips", { token }),
    favourites: (token) =>
      apiRequest("/dashboard/favorite-destinations", { token }),
    bookings: (token) =>
      apiRequest("/dashboard/booking-history", { token }),
    statistics: (token) =>
      apiRequest("/dashboard/statistics", { token }),
    profileSettings: (token) =>
      apiRequest("/dashboard/profile-settings", { token }),
    updateProfileSettings: (body, token) =>
      apiRequest("/dashboard/profile-settings", {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      }),
  },
  favourites: {
    list: (token) => apiRequest("/favourites", { token }),
    add: (favouriteable_id, type, token) =>
      apiRequest("/favourites", {
        method: "POST",
        token,
        body: JSON.stringify({ favouriteable_id, type }),
      }),
    remove: (id, token) =>
      apiRequest(`/favourites/${id}`, { method: "DELETE", token }),
  },
  reviews: {
    list: (token) => apiRequest("/reviews", { token }),
    mine: (token) => apiRequest("/reviews/my", { token }),
    create: (form, token) =>
      apiRequest("/reviews", { method: "POST", token, body: form }),
    show: (id, token) =>
      apiRequest(`/reviews/${id}`, { token }),
    update: (id, form, token) =>
      apiRequest(`/reviews/${id}`, { method: "PUT", token, body: form }),
    remove: (id, token) =>
      apiRequest(`/reviews/${id}`, { method: "DELETE", token }),
  },
  payments: {
    create: (booking_id, client_id) =>
      apiRequest("/payments", {
        method: "POST",
        body: JSON.stringify({ booking_id, client_id }),
      }),
    client: (clientId) => apiRequest(`/payments/client/${clientId}`),
    show: (paymentId) => apiRequest(`/payments/${paymentId}`),
  },
  profile: {
    get: (token) => apiRequest("/profile", { token }),
    update: (body, token) =>
      apiRequest("/profile", {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      }),
    password: (body, token) =>
      apiRequest("/profile/password", {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      }),
  },
  notifications: {
    list: (clientId) => apiRequest(`/notifications/client/${clientId}`),
    unread: (clientId) =>
      apiRequest(`/notifications/client/${clientId}/unread`),
    create: (body) =>
      apiRequest("/notifications", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  contact: (body) => apiRequest("/contact", { method: "POST", body: JSON.stringify(body) }),
  joy: {
    conversations: (token) =>
      apiRequest("/chat/conversations", { token }),
    show: (id, token) =>
      apiRequest(`/chat/conversations/${id}`, { token }),
    send: (message, conversation_id, token) =>
      apiRequest("/chat/messages", {
        method: "POST",
        token,
        body: JSON.stringify({ message, conversation_id }),
      }),
  },
  admin: {
    users: (token) => apiRequest("/admin/users", { token }),
    userStatus: (id, is_active, token) =>
      apiRequest(`/admin/users/${id}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ is_active }),
      }),
    user: (id, token) =>
      apiRequest(`/admin/users/${id}`, { token }),
    addAdmin: (body, token) =>
      apiRequest("/admin/admins", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      }),
    updateAdmin: (id, body, token) =>
      apiRequest(`/admin/admins/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      }),
    removeAdmin: (id, token) =>
      apiRequest(`/admin/admins/${id}`, { method: "DELETE", token }),
    interests: (token) => apiRequest("/admin/interests", { token }),
    addInterest: (name, token) =>
      apiRequest("/admin/interests", {
        method: "POST",
        token,
        body: JSON.stringify({ name }),
      }),
    updateInterest: (id, name, token) =>
      apiRequest(`/admin/interests/${id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({ name }),
      }),
    removeInterest: (id, token) =>
      apiRequest(`/admin/interests/${id}`, { method: "DELETE", token }),
    reviews: (token) => apiRequest("/admin/reviews", { token }),
    reviewDecision: (id, decision, token) =>
      apiRequest(`/admin/reviews/${id}/${decision}`, { method: "POST", token }),
    messages: (token) =>
      apiRequest("/admin/contact-messages", { token }),
    messageStatus: (id, status, token) =>
      apiRequest(`/admin/contact-messages/${id}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      }),
    removeMessage: (id, token) =>
      apiRequest(`/admin/contact-messages/${id}`, { method: "DELETE", token }),
    settings: (token) => apiRequest("/admin/settings", { token }),
    createSettings: (form, token) =>
      apiRequest("/admin/settings", { method: "POST", token, body: form }),
    updateSettings: (id, form, token) =>
      apiRequest(`/admin/settings/${id}`, {
        method: "PATCH",
        token,
        body: form,
      }),
    statistics: (token) => apiRequest("/admin/statistics", { token }),
    tripStatistics: (token) =>
      apiRequest("/admin/trips/statistics", { token }),
    revenue: () => apiRequest("/revenue/total"),
  },
};
