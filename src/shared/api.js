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

export const rows = (payload) => {
  const value = payload?.data?.data ?? payload?.data ?? payload?.results ?? payload ?? [];
  if (Array.isArray(value)) return value;
  for (const key of ["hotels", "itineraries", "restaurants", "items", "notifications"]) if (Array.isArray(value?.[key])) return value[key];
  return Array.isArray(value?.data) ? value.data : [];
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
    search: filters => request(`/hotels?${query(filters)}`, { token: null }),
    details: id => request(`/hotels/${encodeURIComponent(id)}`, { token: null })
  },
  restaurants: { list: (city, page = 0) => request(`/restaurants?${query({ city, page })}`, { token: null }) },
  flights: { search: filters => request(`/flights?${query(filters)}`, { token: null }), details: id => request(`/flights/${encodeURIComponent(id)}`, { token: null }) },
  trips: {
    list: () => request("/trips"), create: (body, ai = false) => request(ai ? "/ai/trips" : "/trips", { method: "POST", body }),
    show: id => request(`/trips/${id}`), days: id => request(`/trips/${id}/tripDays`), update: (id, body) => request(`/trips/${id}`, { method: "PUT", body }), remove: id => request(`/trips/${id}`, { method: "DELETE" })
  },
  memories: { list: tripId => request(`/trips/${tripId}/memories`), create: (tripId, form) => request(`/trips/${tripId}/memories`, { method: "POST", body: form, form: true }), remove: (tripId, memoryId) => request(`/trips/${tripId}/memories/${memoryId}`, { method: "DELETE" }) },
  favourites: { list: () => request("/favourites"), add: (id, type) => request("/favourites", { method: "POST", body: { favouriteable_id: String(id), type } }), remove: id => request(`/favourites/${id}`, { method: "DELETE" }) },
  dashboard: { bookings: () => request("/dashboard/booking-history"), statistics: () => request("/dashboard/statistics"), settings: () => request("/dashboard/profile-settings"), updateSettings: body => request("/dashboard/profile-settings", { method: "PATCH", body }) },
  profile: { get: () => request("/profile"), update: body => request("/profile", { method: "PATCH", body }), password: body => request("/profile/password", { method: "PATCH", body }) },
  reviews: { list: () => request("/reviews"), mine: () => request("/reviews/my"), create: form => request("/reviews", { method: "POST", body: form, form: form instanceof FormData }) },
  notifications: { list: clientId => request(`/notifications/client/${clientId}`), unread: clientId => request(`/notifications/client/${clientId}/unread`) },
  joy: { conversations: () => request("/chat/conversations"), show: id => request(`/chat/conversations/${id}`), send: (message, conversation_id) => request("/chat/messages", { method: "POST", body: { message, conversation_id } }) },
  contact: body => request("/contact", { method: "POST", body, token: null })
};
