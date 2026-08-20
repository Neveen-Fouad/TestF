const defaultApiUrl = `http://${location.hostname}:8000/api`;
const API_BASE_URL = (window.JOURNOVO_CONFIG?.API_BASE_URL || defaultApiUrl).replace(/\/$/, "");
const ACCESS_KEY = "journovo_access_token";
const REFRESH_KEY = "journovo_refresh_token";
const USER_KEY = "journovo_user";

function emitRequestState(state, detail = {}) {
  window.dispatchEvent(new CustomEvent("journovo:request-state", { detail: { state, ...detail } }));
}

export class ApiError extends Error {
  constructor(message, status = 0, errors = {}) { super(message); this.name = "ApiError"; this.status = status; this.errors = errors; }
}

function validationErrors(payload) {
  const errors = payload?.errors || payload?.error || {};
  return errors && typeof errors === "object" && !Array.isArray(errors) ? errors : {};
}

function firstValidationMessage(errors) {
  return Object.values(errors).flat(Infinity).find(value => typeof value === "string" && value.trim());
}

export const session = {
  token: () => localStorage.getItem(ACCESS_KEY),
  refreshToken: () => localStorage.getItem(REFRESH_KEY),
  user: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
    catch { localStorage.removeItem(USER_KEY); return null; }
  },
  isLoggedIn: () => Boolean(localStorage.getItem(ACCESS_KEY)),
  isAdmin: () => String(session.user()?.role || session.user()?.user?.role || "").toLowerCase() === "admin",
  save(payload) {
    const data = payload?.data || payload || {};
    const tokenValue = data.token || data.access_token || payload?.token || payload?.access_token;
    const access = typeof tokenValue === "object" ? tokenValue?.token || tokenValue?.access_token : tokenValue;
    const refresh = data.refresh_token || payload?.refresh_token;
    const user = data.user || data.client || payload?.user || payload?.client;
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  updateUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify({ ...(session.user() || {}), ...user }));
  },
  clientId() {
    const user = session.user();
    return user?.client_id || user?.client?.id || null;
  },
  clear() { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); localStorage.removeItem(USER_KEY); }
};

let refreshRequest;

async function refreshAccessToken() {
  if (refreshRequest) return refreshRequest;
  const token = session.token();
  if (!token) return null;
  refreshRequest = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }
  }).then(async response => {
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({}));
    session.save(payload);
    return session.token();
  }).catch(() => null).finally(() => { refreshRequest = null; });
  return refreshRequest;
}

function tokenSecondsRemaining(token) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return typeof payload.exp === 'number' ? payload.exp - Math.floor(Date.now() / 1000) : null;
  } catch {
    return null;
  }
}

export async function request(path, { method = "GET", body, token = session.token(), form = false, retry = true } = {}) {
  if (token && retry && path !== "/auth/refresh") {
    const secondsRemaining = tokenSecondsRemaining(token);
    if (secondsRemaining !== null && secondsRemaining <= 0) {
      session.clear();
      window.dispatchEvent(new CustomEvent("journovo:unauthorized"));
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }
    if (secondsRemaining !== null && secondsRemaining <= 60) {
      token = await refreshAccessToken();
      if (!token) {
        session.clear();
        window.dispatchEvent(new CustomEvent("journovo:unauthorized"));
        throw new ApiError("Your session expired. Please sign in again.", 401);
      }
    }
  }
  const headers = { Accept: "application/json", "ngrok-skip-browser-warning": "true" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers["Content-Type"] = "application/json";
  let response;
  emitRequestState("start", { path, method });
  try { response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body ? (form ? body : JSON.stringify(body)) : undefined }); }
  catch {
    const error = new ApiError(navigator.onLine
      ? "The travel service is temporarily unavailable. Please try again in a moment."
      : "You appear to be offline. Reconnect to the internet and try again.");
    emitRequestState("end", { path, method, ok: false, error });
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && token) {
    session.clear();
    window.dispatchEvent(new CustomEvent("journovo:unauthorized"));
  }
  if (!response.ok) {
    const errors = validationErrors(payload);
    const error = new ApiError(firstValidationMessage(errors) || payload.message || "Request failed.", response.status, errors);
    emitRequestState("end", { path, method, ok: false, error });
    throw error;
  }
  emitRequestState("end", { path, method, ok: true });
  return payload;
}

export async function download(path, token = session.token()) {
  const headers = { Accept: "application/pdf", "ngrok-skip-browser-warning": "true" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  emitRequestState("start", { path, method: "GET" });
  try { response = await fetch(`${API_BASE_URL}${path}`, { headers }); }
  catch {
    const error = new ApiError(navigator.onLine
      ? "The report service is temporarily unavailable. Please try again in a moment."
      : "You appear to be offline. Reconnect to the internet and try again.");
    emitRequestState("end", { path, method: "GET", ok: false, error });
    throw error;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const errors = validationErrors(payload);
    const error = new ApiError(firstValidationMessage(errors) || payload.message || "Report download failed.", response.status, errors);
    emitRequestState("end", { path, method: "GET", ok: false, error });
    throw error;
  }
  const result = { blob: await response.blob(), disposition: response.headers.get("Content-Disposition") || "" };
  emitRequestState("end", { path, method: "GET", ok: true });
  return result;
}

export const rows = payload => {
  const queue = [payload];
  const keys = ["data", "results", "hotels", "propertySearch", "properties", "trips", "details", "itineraries", "restaurants", "items", "notifications", "savedTrips", "bookingHistory", "favouriteDestinations", "memories", "your_memories", "interests"];
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
  restaurants: {
    list: (city, page = 0, min_rating = "") => request(`/restaurants?${query({ city, page, min_rating })}`, { token: null }),
    details: id => request(`/restaurants/details?id=${encodeURIComponent(id)}`, { token: null })
  },
  flights: { airports: value => request(`/flights/search-airport?query=${encodeURIComponent(value)}`, { token: null }), search: filters => request(`/flights/search?${query(filters)}`, { token: null }), book: body => request("/flights/book", { method: "POST", body }) },
  trips: {
    list: () => request("/trips"),
    preMade: () => request("/trips/pre-made", { token: null }),
    create: (body, ai = false) => request(ai ? "/ai/trips" : "/trips", { method: "POST", body }),
    show: id => request(`/trips/${encodeURIComponent(id)}`),
    days: id => request(`/trips/${encodeURIComponent(id)}/tripDays`),
    update: (id, body) => request(`/trips/${encodeURIComponent(id)}`, { method: "PUT", body }),
    remove: id => request(`/trips/${encodeURIComponent(id)}`, { method: "DELETE" }),
    book: id => request(`/trips/${encodeURIComponent(id)}/book`, { method: "POST" })
  },
  memories: { list: tripId => request(`/trips/${tripId}/memories`), create: (tripId, form) => request(`/trips/${tripId}/memories`, { method: "POST", body: form, form: true }), remove: (tripId, memoryId) => request(`/trips/${tripId}/memories/${memoryId}`, { method: "DELETE" }) },
  favourites: { list: (page = 1) => request(`/favourites?${query({ page })}`), add: (id, type) => request("/favourites", { method: "POST", body: { favouriteable_id: String(id), type } }), remove: id => request(`/favourites/${id}`, { method: "DELETE" }) },
  dashboard: {
    bookings: () => request("/bookings"),
    savedTrips: () => request("/dashboard/saved-trips"),
    favouriteDestinations: () => request("/dashboard/favorite-destinations"),
    bookingHistory: () => request("/dashboard/booking-history"),
    statistics: () => request("/dashboard/statistics"),
    settings: () => request("/dashboard/profile-settings"),
    updateSettings: body => request("/dashboard/profile-settings", { method: "PATCH", body })
  },
  interests: { mine: () => request("/client/interests"), update: interests => request("/client/interests", { method: "PUT", body: { interests } }) },
  profile: { get: () => request("/profile"), update: body => request("/profile", { method: "PATCH", body }), password: body => request("/profile/password", { method: "PATCH", body }) },
  reviews: {
    list: (page = 1, filters = {}) => request(`/reviews?${query({ ...filters, page })}`),
    mine: (page = 1) => request(`/reviews/my?page=${encodeURIComponent(page)}`),
    create: form => request("/reviews", { method: "POST", body: form, form: form instanceof FormData }),
    update: (id, form) => request(`/reviews/${encodeURIComponent(id)}`, { method: "POST", body: form, form: form instanceof FormData }),
    remove: id => request(`/reviews/${encodeURIComponent(id)}`, { method: "DELETE" })
  },
  notifications: { list: clientId => request(`/notifications/client/${clientId}`), unread: clientId => request(`/notifications/client/${clientId}/unread`), unreadCount: clientId => request(`/notifications/client/${clientId}/unread-count`), read: id => request(`/notifications/${id}/read`, { method: "PATCH" }), readAll: clientId => request(`/notifications/client/${clientId}/read-all`, { method: "PATCH" }) },
  payments: { list: clientId => request(`/payments/client/${clientId}`), show: id => request(`/payments/${id}`), create: booking_id => request("/payments", { method: "POST", body: { booking_id } }) },
  joy: { conversations: () => request("/chat/conversations"), show: id => request(`/chat/conversations/${id}`), send: (message, conversation_id) => request("/chat/messages", { method: "POST", body: { message, conversation_id } }) },
  transportation: { tips: body => request("/transportation/tips", { method: "POST", body }) },
  contact: body => request("/contact", { method: "POST", body, token: null }),
  site: {
    // Public, read-only settings used to brand every page. Editing remains under api.admin.
    settings: () => request("/settings", { token: null })
  },
  admin: {
    users: () => request("/admin/users"),
    user: id => request(`/admin/users/${encodeURIComponent(id)}`),
    userStatus: (id, is_active) => request(`/admin/users/${id}/status`, { method: "PATCH", body: { is_active } }),
    createAdmin: body => request("/admin/admins", { method: "POST", body }),
    reviews: (page = 1, filters = {}) => request(`/admin/reviews?${query({ ...filters, page })}`),
    reviewDecision: (id, decision) => request(`/admin/reviews/${id}/${decision}`, { method: "POST" }),
    messages: () => request("/admin/contact-messages"),
    message: id => request(`/admin/contact-messages/${encodeURIComponent(id)}`),
    messageStatus: (id, status) => request(`/admin/contact-messages/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
    removeMessage: id => request(`/admin/contact-messages/${encodeURIComponent(id)}`, { method: "DELETE" }),
    interests: () => request("/admin/interests"),
    createInterest: body => request("/admin/interests", { method: "POST", body }),
    updateInterest: (id, body) => request(`/admin/interests/${encodeURIComponent(id)}`, { method: "PUT", body }),
    removeInterest: id => request(`/admin/interests/${id}`, { method: "DELETE" }),
    settings: () => request("/admin/settings"),
    createSettings: form => request("/admin/settings", { method: "POST", body: form, form: true }),
    updateSettings: (id, form) => { form.set("_method", "PATCH"); return request(`/admin/settings/${id}`, { method: "POST", body: form, form: true }); },
    statistics: () => request("/admin/statistics"),
    tripStatistics: () => request("/admin/trips/statistics"),
    dashboardStatistics: (filters = {}) => request(`/admin/dashboard/statistics?${query(filters)}`),
    exportDashboardPdf: (filters = {}) => download(`/admin/dashboard/export-pdf?${query(filters)}`),
    revenue: () => request("/revenue/total"),
    bookings: {
      all: clientId => request(`/admin/bookings/${encodeURIComponent(clientId)}`),
      hotels: clientId => request(`/admin/bookings/${encodeURIComponent(clientId)}/hotels`),
      flights: clientId => request(`/admin/bookings/${encodeURIComponent(clientId)}/flights`)
    }
  }
};
