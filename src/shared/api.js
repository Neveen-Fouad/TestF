const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://61a8-197-52-104-51.ngrok-free.app/api").replace(/\/$/, "");
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
    scheduleRefresh();
  },
  clear() { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); localStorage.removeItem(USER_KEY); }
};

let refreshTimer;
function tokenExpiry(token) {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000; } catch { return 0; }
}
export function scheduleRefresh() {
  clearTimeout(refreshTimer);
  const expiresAt = tokenExpiry(session.token());
  if (!expiresAt) return;
  refreshTimer = setTimeout(() => refreshSession().catch(() => session.clear()), Math.max(0, expiresAt - Date.now() - 60_000));
}
export async function refreshSession() {
  const token = localStorage.getItem(REFRESH_KEY) || session.token();
  if (!token) throw new ApiError("Your session has expired.", 401);
  const response = await request("/auth/refresh", { method: "POST", token, skipRefresh: true });
  session.save(response);
  return response;
}

export async function request(path, { method = "GET", body, token = session.token(), skipRefresh = false, form = false } = {}) {
  const headers = { Accept: "application/json", "ngrok-skip-browser-warning": "true" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body ? (form ? body : JSON.stringify(body)) : undefined });
  } catch { throw new ApiError("Unable to reach the travel API. Check its URL and CORS settings."); }
  if (response.status === 401 && !skipRefresh && session.token()) {
    try { await refreshSession(); return request(path, { method, body, form, skipRefresh: true }); }
    catch { session.clear(); window.dispatchEvent(new Event("journovo:logout")); }
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = Object.values(payload.errors || {}).flat().find(Boolean);
    throw new ApiError(error || payload.message || "Request failed.", response.status, payload.errors || {});
  }
  return payload;
}

export const rows = (payload) => {
  const value = payload?.data?.data ?? payload?.data ?? payload ?? [];
  return Array.isArray(value) ? value : Array.isArray(value.data) ? value.data : [];
};

export const api = {
  auth: {
    login: (body) => request("/auth/login", { method: "POST", body, token: null }),
    register: (body) => request("/auth/register", { method: "POST", body, token: null }),
    logout: () => request("/auth/logout", { method: "POST" }),
    forgot: (email) => request("/auth/forgot-password", { method: "POST", body: { email }, token: null }),
    reset: (body) => request("/auth/reset-password", { method: "POST", body, token: null })
  },
  explore: {
    countries: () => request("/countries", { token: null }), country: (name) => request(`/countries/${encodeURIComponent(name)}`, { token: null }),
    interests: () => request("/interests", { token: null }), destination: (city, code = "") => request(`/destination-data?city=${encodeURIComponent(city)}${code ? `&country_code=${encodeURIComponent(code)}` : ""}`, { token: null })
  },
  hotels: { search: (query) => request(`/hotels/search?${query}`, { token: null }), details: (id) => request(`/hotels/details?hotel_id=${encodeURIComponent(id)}`, { token: null }), book: (body) => request("/hotels/bookings", { method: "POST", body }) },
  restaurants: { list: (city, rating = 3, page = 1) => request(`/restaurants?city=${encodeURIComponent(city)}&min_rating=${rating}&page=${page}`, { token: null }), details: (id) => request(`/restaurants/details?id=${encodeURIComponent(id)}`, { token: null }) },
  flights: { list: () => request("/flights", { token: null }), details: (id) => request(`/flights/${id}`, { token: null }), airports: (query) => request(`/flights/search-airport?query=${encodeURIComponent(query)}`, { token: null }), search: (query) => request(`/flights/search?${query}`, { token: null }), book: (body) => request("/flights/book", { method: "POST", body }) },
  trips: { list: () => request("/trips"), create: (body, ai = false) => request(ai ? "/ai/trips" : "/trips", { method: "POST", body }), show: (id) => request(`/trips/${id}`), days: (id) => request(`/trips/${id}/tripDays`), update: (id, body) => request(`/trips/${id}`, { method: "PUT", body }), remove: (id) => request(`/trips/${id}`, { method: "DELETE" }) },
  favourites: { list: () => request("/favourites"), add: (id, type) => request("/favourites", { method: "POST", body: { favouriteable_id: String(id), type } }), remove: (id) => request(`/favourites/${id}`, { method: "DELETE" }) },
  dashboard: { bookings: () => request("/dashboard/booking-history"), statistics: () => request("/dashboard/statistics"), settings: () => request("/dashboard/profile-settings"), updateSettings: (body) => request("/dashboard/profile-settings", { method: "PATCH", body }) },
  profile: { get: () => request("/profile"), update: (body) => request("/profile", { method: "PATCH", body }), password: (body) => request("/profile/password", { method: "PATCH", body }) },
  reviews: { list: () => request("/reviews"), mine: () => request("/reviews/my"), create: (form) => request("/reviews", { method: "POST", body: form, form: form instanceof FormData }) },
  notifications: { list: (clientId) => request(`/notifications/client/${clientId}`, { token: null }), unread: (clientId) => request(`/notifications/client/${clientId}/unread`, { token: null }) },
  payments: { list: (clientId) => request(`/payments/client/${clientId}`, { token: null }), show: (id) => request(`/payments/${id}`, { token: null }), create: (booking_id, client_id) => request("/payments", { method: "POST", body: { booking_id, client_id }, token: null }) },
  joy: { conversations: () => request("/chat/conversations"), show: (id) => request(`/chat/conversations/${id}`), send: (message, conversation_id) => request("/chat/messages", { method: "POST", body: { message, conversation_id } }) },
  contact: (body) => request("/contact", { method: "POST", body, token: null }),
  admin: { users: () => request("/admin/users"), userStatus: (id, is_active) => request(`/admin/users/${id}/status`, { method: "PATCH", body: { is_active } }), reviews: () => request("/admin/reviews"), reviewDecision: (id, decision) => request(`/admin/reviews/${id}/${decision}`, { method: "POST" }), messages: () => request("/admin/contact-messages"), interests: () => request("/admin/interests"), settings: () => request("/admin/settings"), statistics: () => request("/admin/statistics"), tripStatistics: () => request("/admin/trips/statistics") }
};

scheduleRefresh();
