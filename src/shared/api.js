const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const ACCESS_KEY = "journovo_access_token";
const REFRESH_KEY = "journovo_refresh_token";
const USER_KEY = "journovo_user";

export class ApiError extends Error {
  constructor(message, status = 0, errors = {}) { super(message); this.name = "ApiError"; this.status = status; this.errors = errors; }
}

export const session = {
  token: () => localStorage.getItem(ACCESS_KEY),
  user: () => JSON.parse(localStorage.getItem(USER_KEY) || "null"),
  isLoggedIn: () => Boolean(localStorage.getItem(ACCESS_KEY)),
  isAdmin: () => String(session.user()?.role || session.user()?.user?.role || "").toLowerCase() === "admin",
  save(payload) {
    const data = payload?.data || payload || {};
    const access = data.token || data.access_token || payload?.token || payload?.access_token;
    const refresh = data.refresh_token || payload?.refresh_token;
    const user = data.user || data.client || payload?.user || payload?.client;
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  updateUser(user) { if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); },
  clear() { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); localStorage.removeItem(USER_KEY); }
};

export async function request(path, { method = "GET", body, token = session.token(), form = false } = {}) {
  const headers = { Accept: "application/json", "ngrok-skip-browser-warning": "true" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers["Content-Type"] = "application/json";
  let response;
  try { response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body ? (form ? body : JSON.stringify(body)) : undefined }); }
  catch { throw new ApiError("Unable to reach the travel API. Check its URL and CORS settings."); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = Object.values(payload.errors || {}).flat().find(Boolean);
    throw new ApiError(error || payload.message || "Request failed.", response.status, payload.errors || {});
  }
  return payload;
}

export const rows = payload => {
  const queue = [payload];
  const keys = ["data", "results", "hotels", "itineraries", "restaurants", "items", "notifications", "savedTrips", "bookingHistory", "favouriteDestinations", "memories", "your_memories"];
  while (queue.length) {
    const value = queue.shift();
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") continue;
    for (const key of keys) if (value[key] != null) queue.push(value[key]);
  }
  return [];
};

const query = values => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== "" && value != null)).toString();

export const api = {
  auth: {
    login: body => request("/auth/login", { method: "POST", body, token: null }),
    register: body => request("/auth/register", { method: "POST", body, token: null }),
    logout: () => request("/auth/logout", { method: "POST" }),
    forgot: email => request("/auth/forgot-password", { method: "POST", body: { email }, token: null }),
    reset: body => request("/auth/reset-password", { method: "POST", body, token: null }),
    verifyEmail: (id, hash, parameters = "") => request(`/auth/email/verify/${encodeURIComponent(id)}/${encodeURIComponent(hash)}${parameters ? `?${parameters}` : ""}`, { token: null }),
    resendVerification: () => request("/auth/email/verification-notification", { method: "POST" })
  },
  explore: {
    countries: () => request("/countries", { token: null }),
    country: name => request(`/countries/${encodeURIComponent(name)}`, { token: null }),
    interests: () => request("/interests", { token: null }),
    destination: (city, code = "") => request(`/destination-data?city=${encodeURIComponent(city)}${code ? `&country_code=${encodeURIComponent(code)}` : ""}`, { token: null })
  },
  hotels: {
    search: filters => request(`/hotels/search?${query(filters)}`, { token: null }),
    details: id => request(`/hotels/details?hotel_id=${encodeURIComponent(id)}`, { token: null }),
    book: body => request("/hotels/bookings", { method: "POST", body })
  },
  restaurants: { list: (city, page = 0) => request(`/restaurants?${query({ city, page })}`, { token: null }) },
  flights: { airports: value => request(`/flights/search-airport?query=${encodeURIComponent(value)}`, { token: null }), search: filters => request(`/flights/search?${query(filters)}`, { token: null }), details: id => request(`/flights/${encodeURIComponent(id)}`, { token: null }), book: body => request("/flights/book", { method: "POST", body }) },
  trips: {
    list: () => request("/trips"), create: (body, ai = false) => request(ai ? "/ai/trips" : "/trips", { method: "POST", body }),
    show: id => request(`/trips/${id}`), update: (id, body) => request(`/trips/${id}`, { method: "PUT", body }), remove: id => request(`/trips/${id}`, { method: "DELETE" })
  },
  memories: { list: tripId => request(`/trips/${tripId}/memories`), create: (tripId, form) => request(`/trips/${tripId}/memories`, { method: "POST", body: form, form: true }), remove: (tripId, memoryId) => request(`/trips/${tripId}/memories/${memoryId}`, { method: "DELETE" }) },
  favourites: { list: () => request("/favourites"), add: (id, type) => request("/favourites", { method: "POST", body: { favouriteable_id: String(id), type } }), remove: id => request(`/favourites/${id}`, { method: "DELETE" }) },
  dashboard: { bookings: () => request("/bookings"), statistics: () => request("/dashboard/statistics"), settings: () => request("/dashboard/profile-settings"), updateSettings: body => request("/dashboard/profile-settings", { method: "PATCH", body }) },
  interests: { mine: () => request("/client/interests"), update: interests => request("/client/interests", { method: "PUT", body: { interests } }) },
  profile: { get: () => request("/profile"), update: body => request("/profile", { method: "PATCH", body }), password: body => request("/profile/password", { method: "PATCH", body }) },
  reviews: { list: () => request("/reviews"), mine: () => request("/reviews/my"), create: form => request("/reviews", { method: "POST", body: form, form: form instanceof FormData }) },
  notifications: { list: clientId => request(`/notifications/client/${clientId}`), unread: clientId => request(`/notifications/client/${clientId}/unread`), unreadCount: clientId => request(`/notifications/client/${clientId}/unread-count`), read: id => request(`/notifications/${id}/read`, { method: "PATCH" }), readAll: clientId => request(`/notifications/client/${clientId}/read-all`, { method: "PATCH" }) },
  payments: { list: clientId => request(`/payments/client/${clientId}`), show: id => request(`/payments/${id}`), create: (booking_id, client_id) => request("/payments", { method: "POST", body: { booking_id, client_id } }) },
  joy: { conversations: () => request("/chat/conversations"), show: id => request(`/chat/conversations/${id}`), send: (message, conversation_id) => request("/chat/messages", { method: "POST", body: { message, conversation_id } }) },
  contact: body => request("/contact", { method: "POST", body, token: null }),
  admin: {
    users: () => request("/admin/users"),
    userStatus: (id, is_active) => request(`/admin/users/${id}/status`, { method: "PATCH", body: { is_active } }),
    reviews: () => request("/admin/reviews"),
    reviewDecision: (id, decision) => request(`/admin/reviews/${id}/${decision}`, { method: "POST" }),
    messages: () => request("/admin/contact-messages"),
    messageStatus: (id, status) => request(`/admin/contact-messages/${id}/status`, { method: "PATCH", body: { status } }),
    interests: () => request("/admin/interests"),
    createInterest: body => request("/admin/interests", { method: "POST", body }),
    removeInterest: id => request(`/admin/interests/${id}`, { method: "DELETE" }),
    settings: () => request("/admin/settings"),
    createSettings: form => request("/admin/settings", { method: "POST", body: form, form: true }),
    updateSettings: (id, form) => { form.set("_method", "PATCH"); return request(`/admin/settings/${id}`, { method: "POST", body: form, form: true }); },
    statistics: () => request("/admin/statistics"),
    tripStatistics: () => request("/admin/trips/statistics"),
    dashboardStatistics: () => request("/admin/dashboard/statistics"),
    revenue: () => request("/revenue/total")
  }
};
