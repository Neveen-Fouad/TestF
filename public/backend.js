(() => {
  "use strict";

  const BASE_URL = (
    window.VAMORA_API_BASE_URL ||
    "https://61a8-197-52-104-51.ngrok-free.app/api"
  ).replace(/\/+$/, "");

  const getToken = () => localStorage.getItem("vamora_access_token");
  const saveToken = (payload) => {
    const token = payload?.data?.token || payload?.token || payload?.access_token;
    if (typeof token === "string" && token) {
      localStorage.setItem("vamora_access_token", token);
    }
    const user = payload?.user || payload?.data?.user || payload?.client || payload?.data?.client;
    if(user) {
       localStorage.setItem('vamora_user_name', ((user.first_name || user.name || 'Traveler') + ' ' + (user.last_name || '')).trim());
       localStorage.setItem('vamora_user_email', user.email || '');
    }
    return token;
  };

  const rows = (payload) => {
    const value = payload?.data?.data ?? payload?.data ?? payload ?? [];
    return Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
  };

  const messageFrom = (payload, fallback) => {
    const validation = Object.values(payload?.errors || {}).flat().find(Boolean);
    return validation || payload?.message || fallback;
  };

  async function rawRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    const token = options.auth === false ? null : getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const isForm = options.body instanceof FormData;
    if (options.body && !isForm) headers.set("Content-Type", "application/json");
    headers.set("ngrok-skip-browser-warning", "true");
    return fetch(`${BASE_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body
        ? isForm
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    });
  }

  async function request(path, options = {}, retried = false) {
    let response;
    try {
      response = await rawRequest(path, options);
    } catch {
      throw new Error("The Laravel API is offline. Keep php artisan serve and ngrok running.");
    }

    if (response.status === 401 && !retried && getToken() && path !== "/auth/refresh") {
      const refreshResponse = await rawRequest("/auth/refresh", { method: "POST" });
      const refreshPayload = await refreshResponse.json().catch(() => ({}));
      if (refreshResponse.ok && saveToken(refreshPayload)) {
        return request(path, options, true);
      }
      localStorage.removeItem("vamora_access_token");
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(messageFrom(payload, `Request failed (${response.status}).`));
    }
    return payload;
  }

  window.VamoraApi = {
    baseUrl: BASE_URL,
    request,
    auth: {
      login: (email, password) => request("/auth/login", { method: "POST", auth: false, body: { email, password } }),
      register: (body) => request("/auth/register", { method: "POST", auth: false, body }),
      refresh: () => request("/auth/refresh", { method: "POST" }),
      logout: () => request("/auth/logout", { method: "POST" }),
      forgot: (email) => request("/auth/forgot-password", { method: "POST", auth: false, body: { email } }),
      reset: (body) => request("/auth/reset-password", { method: "POST", auth: false, body }),
    },
    profile: {
      get: () => request("/profile"),
      update: (body) => request("/profile", { method: "PATCH", body }),
      password: (body) => request("/profile/password", { method: "PATCH", body }),
    },
    dashboard: {
      statistics: () => request("/dashboard/statistics"),
      bookings: () => request("/dashboard/booking-history"),
      settings: () => request("/dashboard/profile-settings"),
      updateSettings: (body) => request("/dashboard/profile-settings", { method: "PATCH", body }),
    },
    countries: () => request("/countries", { auth: false }),
    country: (name) => request(`/countries/${encodeURIComponent(name)}`, { auth: false }),
    hotels: {
      search: (query) => request(`/hotels/search?${query}`, { auth: false }),
      details: (id) => request(`/hotels/details?hotel_id=${encodeURIComponent(id)}`, { auth: false }),
      book: (body) => request("/hotels/bookings", { method: "POST", body }),
    },
    restaurants: {
      list: (city, rating = 3, page = 1) => request(`/restaurants?city=${encodeURIComponent(city)}&min_rating=${rating}&page=${page}`, { auth: false }),
      details: (id) => request(`/restaurants/details?id=${encodeURIComponent(id)}`, { auth: false }),
    },
    flights: {
      airports: (query) => request(`/flights/search-airport?query=${encodeURIComponent(query)}`, { auth: false }),
      search: (query) => request(`/flights/search?${query}`, { auth: false }),
      book: (body) => request("/flights/book", { method: "POST", body }),
    },
    trips: {
      list: () => request("/trips"),
      create: (body, ai = false) => request(ai ? "/ai/trips" : "/trips", { method: "POST", body }),
      update: (id, body) => request(`/trips/${id}`, { method: "PUT", body }),
      remove: (id) => request(`/trips/${id}`, { method: "DELETE" }),
    },
    memories: {
      list: (tripId) => request(`/trips/${tripId}/memories`),
      create: (tripId, form) => request(`/trips/${tripId}/memories`, { method: "POST", body: form }),
      remove: (tripId, memoryId) => request(`/trips/${tripId}/memories/${memoryId}`, { method: "DELETE" }),
    },
    favourites: {
      list: () => request("/favourites"),
      add: (id, type) => request("/favourites", { method: "POST", body: { favouriteable_id: String(id), type } }),
      remove: (id) => request(`/favourites/${id}`, { method: "DELETE" }),
    },
    reviews: {
      list: () => request("/reviews"),
      mine: () => request("/reviews/my"),
      create: (form) => request("/reviews", { method: "POST", body: form }),
    },
    notifications: {
      list: (clientId) => request(`/notifications/client/${clientId}`, { auth: false }),
      unread: (clientId) => request(`/notifications/client/${clientId}/unread`, { auth: false }),
    },
    payments: {
      list: (clientId) => request(`/payments/client/${clientId}`, { auth: false }),
      create: (clientId, bookingId) => request("/payments", { method: "POST", auth: false, body: { client_id: clientId, booking_id: bookingId } }),
    },
    contact: (body) => request("/contact", { method: "POST", auth: false, body }),
    admin: {
      users: () => request("/admin/users"),
      statistics: () => request("/admin/statistics"),
      tripStatistics: () => request("/admin/trips/statistics"),
      reviews: () => request("/admin/reviews"),
      messages: () => request("/admin/contact-messages"),
      settings: () => request("/admin/settings"),
      interests: () => request("/admin/interests"),
    },
  };

  window.apiRequest = (path, options = {}) => request(path, {
    method: options.method,
    auth: options.authenticated === false ? false : undefined,
    body: options.body,
  });

  window.registerWithApi = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = document.getElementById("registerSubmit");
    const values = Object.fromEntries(new FormData(form).entries());
    if (values.password !== values.password_confirmation) return toast("Passwords do not match.");
    setBusy(button, true, "Creating account…");
    try {
      const result = await window.VamoraApi.auth.register({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
        birth_date: values.birth_date,
        long: values.long,
        latittude: values.latittude,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      saveToken(result);
      toast(result.message || "Account created. Check your email to verify it.");
      show("dashboard");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(button, false);
    }
  };

  window.loginWithApi = async () => {
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    const button = document.getElementById("loginSubmit");
    if (!email || !password) return toast("Enter your email and password.");
    setBusy(button, true, "Signing in…");
    try {
      const result = await window.VamoraApi.auth.login(email, password);
      saveToken(result);
      toast(result.message || "Welcome back.");
      show("dashboard");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(button, false);
    }
  };

  window.forgotPasswordWithApi = async () => {
    const input = document.querySelector("#forgot input[type='email']");
    const button = document.querySelector("#forgot .reset-submit");
    const email = input?.value.trim();
    if (!email) return toast("Enter your email address.");
    setBusy(button, true, "Sending reset link…");
    try {
      const result = await window.VamoraApi.auth.forgot(email);
      toast(result.message || "Password reset link sent successfully.");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(button, false);
    }
  };

  window.resetPasswordWithApi = async () => {
    const inputs = document.querySelectorAll("#reset input");
    const email = inputs[0]?.value.trim();
    const password = inputs[1]?.value;
    const confirmation = inputs[2]?.value;
    const token = new URLSearchParams(location.search).get("token") || "";
    const button = document.querySelector("#reset .reset-submit");
    if (!email || !token) return toast("Open this page using the reset link from your email.");
    if (!password || password !== confirmation) return toast("Passwords do not match.");
    setBusy(button, true, "Resetting password…");
    try {
      const result = await window.VamoraApi.auth.reset({ email, token, password, password_confirmation: confirmation });
      toast(result.message || "Password reset successfully.");
      setTimeout(() => show("login"), 700);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(button, false);
    }
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const resultCard = (title, lines = [], pills = []) => `
    <article class="api-card">
      <h3>${escapeHtml(title)}</h3>
      ${lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      <div class="api-meta">${pills.filter(Boolean).map((pill) => `<span class="api-pill">${escapeHtml(pill)}</span>`).join("")}</div>
    </article>`;

  const status = (id, text, kind = "") => {
    const element = document.getElementById(id);
    if (element) {
      element.className = `api-status ${kind}`;
      element.textContent = text;
    }
  };

  const renderCards = (id, items, factory) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.innerHTML = items.length
      ? items.map(factory).join("")
      : '<div class="api-empty">No results were returned by the backend.</div>';
  };

  const originalPageContent = window.pageContent;
  window.pageContent = function frameworkFreePageContent(type) {
    if (type === "countries") return `<section class="api-workspace"><div class="api-toolbar two"><div class="api-field"><label>Country</label><input id="countryApiSearch" placeholder="Search by country name"></div><button class="api-button" onclick="loadCountries(document.getElementById('countryApiSearch').value)">Search</button></div><div id="countriesStatus" class="api-status">Loading countries from Laravel…</div><div id="countriesResults" class="api-results"></div></section>`;
    if (type === "hotels") return `<section class="api-workspace"><div class="api-toolbar"><div class="api-field"><label>Destination</label><input id="hotelDestination" value="Cairo"></div><div class="api-field"><label>Check in</label><input id="hotelCheckIn" type="date"></div><div class="api-field"><label>Check out</label><input id="hotelCheckOut" type="date"></div><div class="api-field"><label>Budget</label><input id="hotelBudget" type="number" value="1000"></div><button class="api-button" onclick="searchHotelsApi()">Search hotels</button></div><div id="hotelsStatus" class="api-status">Enter your travel details to search.</div><div id="hotelsResults" class="api-results"></div></section>`;
    if (type === "restaurants") return `<section class="api-workspace"><div class="api-toolbar two"><div class="api-field"><label>City</label><input id="restaurantCity" value="Cairo"></div><div class="api-field"><label>Minimum rating</label><select id="restaurantRating"><option>3</option><option>4</option><option>5</option></select></div><button class="api-button" onclick="searchRestaurantsApi()">Find restaurants</button></div><div id="restaurantsStatus" class="api-status">Choose a city and rating.</div><div id="restaurantsResults" class="api-results"></div></section>`;
    if (type === "flights") return `<section class="api-workspace"><div class="api-toolbar two"><div class="api-field"><label>Airport or city</label><input id="airportQuery" value="Cairo"></div><button class="api-button" onclick="searchAirportsApi()">Search airports</button></div><div id="flightsStatus" class="api-status">Search an airport first. Flight search uses the Sky Scrapper IDs returned here.</div><div id="flightsResults" class="api-results"></div></section>`;
    if (type === "my-trips") return `<section class="api-workspace"><div class="api-toolbar"><div class="api-field"><label>Destination</label><input id="tripDestination" value="Luxor"></div><div class="api-field"><label>Start date</label><input id="tripStart" type="date"></div><div class="api-field"><label>End date</label><input id="tripEnd" type="date"></div><div class="api-field"><label>Budget</label><input id="tripBudget" type="number" value="1200"></div><button class="api-button" onclick="createTripApi(false)">Create trip</button></div><div id="tripsStatus" class="api-status">Loading your trips…</div><div id="tripsResults" class="api-results"></div></section>`;
    if (type === "memories") return `<section class="memory-workspace"><div class="memory-hero"><div><span class="memory-kicker">YOUR TRAVEL TIME CAPSULE</span><h2>Save it now. Relive it together.</h2><p>Choose one of your trips and keep a note, photo or voice memory. The shared capsule opens when the trip ends.</p></div><div class="memory-orbit" aria-hidden="true"><span>✦</span><i>⌁</i><b>♡</b></div></div><div class="memory-layout"><aside class="memory-compose"><div class="api-field"><label>Trip</label><select id="memoryTrip" onchange="loadMemoryCapsule()"><option value="">Loading your trips…</option></select></div><form id="memoryForm" onsubmit="createMemoryApi(event)"><div class="api-field"><label>Memory type</label><div class="memory-types"><button type="button" class="active" data-memory-type="note" onclick="setMemoryType('note')">✎ <span>Note</span></button><button type="button" data-memory-type="photo" onclick="setMemoryType('photo')">▧ <span>Photo</span></button><button type="button" data-memory-type="voice" onclick="setMemoryType('voice')">◉ <span>Voice</span></button></div><input id="memoryType" name="type" type="hidden" value="note"></div><div id="memoryNoteField" class="api-field"><label>Your note</label><textarea name="note" id="memoryNote" placeholder="What made this moment special?"></textarea></div><div id="memoryFileField" class="api-field memory-file-field" hidden><label>Upload memory</label><label class="memory-drop"><input name="file" id="memoryFile" type="file"><span id="memoryFileIcon">＋</span><b id="memoryFileTitle">Choose a file</b><small>Up to 10 MB</small></label></div><div class="api-field"><label>Caption <small>(optional)</small></label><input name="caption" maxlength="255" placeholder="A short title for this moment"></div><button id="memorySubmit" class="api-button memory-save">Add to capsule ✦</button></form></aside><main class="memory-capsule"><div id="memoryStatus" class="api-status">Loading your memory capsule…</div><div id="memorySummary"></div><div id="memoryResults" class="memory-grid"></div></main></div></section>`;
    if (type === "payments") return `<section class="api-workspace"><div class="api-toolbar two"><div class="api-field"><label>Client ID</label><input id="paymentClientId" type="number" value="${escapeHtml(localStorage.getItem("vamora_client_id") || "")}" placeholder="Client ID"></div><button class="api-button" onclick="loadPaymentsApi()">Load payments</button></div><div id="paymentsStatus" class="api-status">The backend currently requires a client ID for payment history.</div><div id="paymentsResults" class="api-results"></div></section>`;
    if (type === "contact") return `<section class="api-workspace"><form class="api-toolbar two" onsubmit="sendContactApi(event)"><div class="api-field"><label>Email</label><input name="email" type="email" required></div><div class="api-field"><label>Phone</label><input name="phone" required></div><div class="api-field"><label>Title</label><input name="title" required></div><div class="api-field"><label>Message</label><textarea name="description" required></textarea></div><button class="api-button">Send message</button></form><div id="contactStatus" class="api-status">Your message will be sent to the Laravel complaint endpoint.</div></section>`;
    if (type === "admin") return `<section class="api-workspace"><div class="admin-launcher"><button onclick="loadAdminApi('users')">Users<span>Accounts and activation status</span></button><button onclick="loadAdminApi('statistics')">Statistics<span>Platform overview</span></button><button onclick="loadAdminApi('trips')">Trip analytics<span>Trip totals and budgets</span></button><button onclick="loadAdminApi('reviews')">Reviews<span>Approval queue</span></button><button onclick="loadAdminApi('messages')">Messages<span>Customer complaints</span></button><button onclick="loadAdminApi('settings')">Settings<span>Brand and contact details</span></button></div><div id="adminStatus" class="api-status">Choose an admin section. An administrator JWT is required.</div><div id="adminResults" class="api-results"></div></section>`;
    return originalPageContent(type);
  };

  window.loadCountries = async (query = "") => {
    status("countriesStatus", "Loading countries…");
    try {
      const payload = query ? await window.VamoraApi.country(query) : await window.VamoraApi.countries();
      const items = rows(payload);
      renderCards("countriesResults", items, (item) => resultCard(item.name || item.names?.common || "Country", [item.capital ? `Capital: ${item.capital}` : "", item.language ? `Language: ${item.language}` : ""], [item.code || item.code2, item.currency, item.flag]));
      status("countriesStatus", `${items.length} countr${items.length === 1 ? "y" : "ies"} loaded.`, "success");
    } catch (error) {
      status("countriesStatus", error.message, "error");
    }
  };

  window.searchHotelsApi = async () => {
    const params = new URLSearchParams({
      destination: document.getElementById("hotelDestination").value,
      check_in: document.getElementById("hotelCheckIn").value,
      check_out: document.getElementById("hotelCheckOut").value,
      guests: "2",
      budget: document.getElementById("hotelBudget").value,
    });
    status("hotelsStatus", "Searching hotels…");
    try {
      const items = rows(await window.VamoraApi.hotels.search(params));
      renderCards("hotelsResults", items, (item) => resultCard(item.name || item.hotel_name || "Hotel", [item.location || item.address, item.description], [item.rating ? `★ ${item.rating}` : "", item.price ? `${item.price}` : ""]));
      status("hotelsStatus", `${items.length} hotel options loaded.`, "success");
    } catch (error) {
      status("hotelsStatus", error.message, "error");
    }
  };

  window.searchRestaurantsApi = async () => {
    status("restaurantsStatus", "Searching restaurants…");
    try {
      const items = rows(await window.VamoraApi.restaurants.list(document.getElementById("restaurantCity").value, Number(document.getElementById("restaurantRating").value)));
      renderCards("restaurantsResults", items, (item) => resultCard(item.name || "Restaurant", [item.address || item.location, item.cuisine || item.category], [item.rating ? `★ ${item.rating}` : "", item.price_level || item.priceRange]));
      status("restaurantsStatus", `${items.length} restaurant options loaded.`, "success");
    } catch (error) {
      status("restaurantsStatus", error.message, "error");
    }
  };

  window.searchAirportsApi = async () => {
    status("flightsStatus", "Searching airports…");
    try {
      const items = rows(await window.VamoraApi.flights.airports(document.getElementById("airportQuery").value));
      renderCards("flightsResults", items, (item) => resultCard(item.presentation?.title || item.name || item.skyId || "Airport", [item.presentation?.subtitle || item.city || item.country], [item.skyId, item.entityId]));
      status("flightsStatus", `${items.length} airport matches loaded.`, "success");
    } catch (error) {
      status("flightsStatus", error.message, "error");
    }
  };

  window.loadTripsApi = async () => {
    if (!getToken()) return status("tripsStatus", "Sign in to load your trips.", "error");
    status("tripsStatus", "Loading your trips…");
    try {
      const items = rows(await window.VamoraApi.trips.list());
      renderCards("tripsResults", items, (item) => `<article class="api-card"><h3>${escapeHtml(item.destination || `Trip #${item.id}`)}</h3><p>${escapeHtml(`${item.start_date || ""} — ${item.end_date || ""}`)}</p>${item.style ? `<p>${escapeHtml(`Style: ${item.style}`)}</p>` : ""}<div class="api-meta"><span class="api-pill">${escapeHtml(item.budget ? `${item.budget}` : "Flexible budget")}</span><span class="api-pill">${item.is_ai_generated ? "AI generated" : "Custom"}</span></div><button class="memory-card-link" onclick="openTripMemories(${Number(item.id)})">Open memory capsule →</button></article>`);
      status("tripsStatus", `${items.length} trips loaded.`, "success");
    } catch (error) {
      status("tripsStatus", error.message, "error");
    }
  };

  let memoryTrips = [];

  const safeMediaUrl = (value) => {
    try {
      const url = new URL(String(value || ""), location.origin);
      return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
    } catch {
      return "";
    }
  };

  window.setMemoryType = (type) => {
    const validType = ["note", "photo", "voice"].includes(type) ? type : "note";
    document.getElementById("memoryType").value = validType;
    document.querySelectorAll("[data-memory-type]").forEach((button) => button.classList.toggle("active", button.dataset.memoryType === validType));
    const isNote = validType === "note";
    const noteField = document.getElementById("memoryNoteField");
    const fileField = document.getElementById("memoryFileField");
    const note = document.getElementById("memoryNote");
    const file = document.getElementById("memoryFile");
    if (noteField) noteField.hidden = !isNote;
    if (fileField) fileField.hidden = isNote;
    if (note) note.required = isNote;
    if (file) {
      file.required = !isNote;
      file.accept = validType === "photo" ? "image/*" : validType === "voice" ? "audio/*" : "";
    }
    const title = document.getElementById("memoryFileTitle");
    if (title) title.textContent = validType === "photo" ? "Choose a photo" : "Choose a voice recording";
    const icon = document.getElementById("memoryFileIcon");
    if (icon) icon.textContent = validType === "photo" ? "▧" : "◉";
  };

  const memoryCard = (memory, unlocked) => {
    const type = memory.type || "note";
    const url = safeMediaUrl(memory.content);
    const body = type === "photo" && url
      ? `<img class="memory-photo" src="${url}" alt="${escapeHtml(memory.caption || "Trip memory")}" loading="lazy">`
      : type === "voice" && url
        ? `<div class="memory-voice"><span>◉</span><audio controls preload="metadata" src="${url}"></audio></div>`
        : `<p class="memory-note">${escapeHtml(memory.content || "")}</p>`;
    const date = memory.created_at ? new Date(memory.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Saved memory";
    return `<article class="memory-card"><div class="memory-card-top"><span class="memory-kind ${escapeHtml(type)}">${type === "photo" ? "▧ Photo" : type === "voice" ? "◉ Voice" : "✎ Note"}</span><button aria-label="Delete memory" title="Delete memory" onclick="deleteMemoryApi(${Number(memory.id)})">×</button></div>${body}${memory.caption ? `<h3>${escapeHtml(memory.caption)}</h3>` : ""}<footer><span>${escapeHtml(date)}</span>${unlocked && memory.client?.phone ? `<span>Shared by ${escapeHtml(memory.client.phone)}</span>` : ""}</footer></article>`;
  };

  window.loadMemoryTrips = async (preferredTripId = null) => {
    if (!getToken()) return status("memoryStatus", "Sign in to open your trip memory capsule.", "error");
    try {
      memoryTrips = rows(await window.VamoraApi.trips.list());
      const select = document.getElementById("memoryTrip");
      if (!select) return;
      if (!memoryTrips.length) {
        select.innerHTML = '<option value="">Create a trip first</option>';
        status("memoryStatus", "You need a trip before you can save a memory.", "error");
        document.getElementById("memoryResults").innerHTML = '<div class="api-empty">Create your first trip, then come back to start its memory capsule.</div>';
        return;
      }
      select.innerHTML = memoryTrips.map((trip) => `<option value="${Number(trip.id)}">${escapeHtml(trip.destination || `Trip #${trip.id}`)} · ${escapeHtml(trip.end_date || "No end date")}</option>`).join("");
      const saved = preferredTripId || Number(localStorage.getItem("vamora_memory_trip"));
      if (saved && memoryTrips.some((trip) => Number(trip.id) === Number(saved))) select.value = String(saved);
      await loadMemoryCapsule();
    } catch (error) {
      status("memoryStatus", error.message, "error");
    }
  };

  window.loadMemoryCapsule = async () => {
    const tripId = Number(document.getElementById("memoryTrip")?.value);
    if (!tripId) return;
    localStorage.setItem("vamora_memory_trip", String(tripId));
    status("memoryStatus", "Opening your trip capsule…");
    try {
      const capsule = await window.VamoraApi.memories.list(tripId);
      const unlocked = Boolean(capsule?.unlocked);
      const items = unlocked ? (capsule.memories || []) : (capsule.your_memories || []);
      const trip = memoryTrips.find((item) => Number(item.id) === tripId) || {};
      const summary = document.getElementById("memorySummary");
      summary.innerHTML = `<div class="capsule-state ${unlocked ? "open" : "locked"}"><span class="capsule-icon">${unlocked ? "✦" : "♙"}</span><div><b>${unlocked ? "The capsule is open" : "Your shared capsule is still sealed"}</b><p>${unlocked ? "Every traveller's memories are now together in one place." : `It opens after ${escapeHtml(trip.end_date || "the trip ends")}. You can still see and manage your own memories.`}</p></div>${!unlocked && Number(capsule.others_count) > 0 ? `<em>+${Number(capsule.others_count)} hidden from other travellers</em>` : ""}</div>`;
      document.getElementById("memoryResults").innerHTML = items.length ? items.map((item) => memoryCard(item, unlocked)).join("") : '<div class="api-empty">This capsule is waiting for its first memory.</div>';
      status("memoryStatus", `${items.length} ${items.length === 1 ? "memory" : "memories"} in this capsule.`, "success");
    } catch (error) {
      status("memoryStatus", error.message, "error");
      document.getElementById("memorySummary").innerHTML = "";
      document.getElementById("memoryResults").innerHTML = '<div class="api-empty">The capsule could not be opened. Check the backend note below.</div>';
    }
  };

  window.createMemoryApi = async (event) => {
    event.preventDefault();
    const tripId = Number(document.getElementById("memoryTrip")?.value);
    if (!tripId) return status("memoryStatus", "Choose a trip first.", "error");
    const button = document.getElementById("memorySubmit");
    const form = new FormData(event.currentTarget);
    const type = form.get("type");
    if (type === "note") form.delete("file");
    else form.delete("note");
    setBusy(button, true, "Saving memory…");
    try {
      await window.VamoraApi.memories.create(tripId, form);
      event.currentTarget.reset();
      setMemoryType("note");
      toast("Memory added to your trip capsule.");
      await loadMemoryCapsule();
    } catch (error) {
      status("memoryStatus", error.message, "error");
    } finally {
      setBusy(button, false);
    }
  };

  window.deleteMemoryApi = async (memoryId) => {
    const tripId = Number(document.getElementById("memoryTrip")?.value);
    if (!tripId || !memoryId || !confirm("Delete this memory from the capsule?")) return;
    status("memoryStatus", "Removing memory…");
    try {
      await window.VamoraApi.memories.remove(tripId, memoryId);
      toast("Memory removed.");
      await loadMemoryCapsule();
    } catch (error) {
      status("memoryStatus", error.message, "error");
    }
  };

  window.openTripMemories = (tripId) => {
    localStorage.setItem("vamora_memory_trip", String(tripId));
    show("memories");
  };

  window.createTripApi = async (ai) => {
    const body = {
      destination: document.getElementById("tripDestination").value,
      start_date: document.getElementById("tripStart").value,
      end_date: document.getElementById("tripEnd").value,
      budget: Number(document.getElementById("tripBudget").value),
      number_of_travels: 2,
      estimated_expenses: 0,
      style: "cultural",
    };
    status("tripsStatus", "Creating your trip…");
    try {
      await window.VamoraApi.trips.create(body, ai);
      toast("Trip created successfully.");
      loadTripsApi();
    } catch (error) {
      status("tripsStatus", error.message, "error");
    }
  };

  window.loadPaymentsApi = async () => {
    const clientId = Number(document.getElementById("paymentClientId").value);
    if (!clientId) return status("paymentsStatus", "Enter a valid client ID.", "error");
    localStorage.setItem("vamora_client_id", String(clientId));
    status("paymentsStatus", "Loading payments…");
    try {
      const items = rows(await window.VamoraApi.payments.list(clientId));
      renderCards("paymentsResults", items, (item) => resultCard(item.payment_reference || `Payment #${item.id}`, [item.payment_method || "Paymob", item.failure_reason], [item.status, item.amount ? `${item.amount} ${item.currency || ""}` : ""]));
      status("paymentsStatus", `${items.length} payments loaded.`, "success");
    } catch (error) {
      status("paymentsStatus", error.message, "error");
    }
  };

  window.sendContactApi = async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    status("contactStatus", "Sending your message…");
    try {
      const result = await window.VamoraApi.contact(body);
      event.currentTarget.reset();
      status("contactStatus", result.message || "Message sent successfully.", "success");
    } catch (error) {
      status("contactStatus", error.message, "error");
    }
  };

  window.loadAdminApi = async (section) => {
    status("adminStatus", `Loading admin ${section}…`);
    const calls = {
      users: window.VamoraApi.admin.users,
      statistics: window.VamoraApi.admin.statistics,
      trips: window.VamoraApi.admin.tripStatistics,
      reviews: window.VamoraApi.admin.reviews,
      messages: window.VamoraApi.admin.messages,
      settings: window.VamoraApi.admin.settings,
    };
    try {
      const payload = await calls[section]();
      const items = rows(payload);
      const normalized = items.length ? items : [payload?.data || payload];
      renderCards("adminResults", normalized, (item, index) => resultCard(item.name || item.email || item.title || `${section} ${index + 1}`, Object.entries(item || {}).slice(0, 4).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`), [item.status, item.role]));
      status("adminStatus", `Admin ${section} loaded.`, "success");
    } catch (error) {
      status("adminStatus", error.message, "error");
    }
  };

  const originalSidebar = window.renderAppSidebar;
  window.renderAppSidebar = function enhancedSidebar(active) {
    originalSidebar(active);
    const side = document.getElementById("appSidebar");
    if (!side) return;
    const backendPages = new Set(["countries", "hotels", "restaurants", "flights", "my-trips", "memories", "payments", "contact", "admin"]);
    if (backendPages.has(active) && !side.innerHTML) {
      document.body.classList.add("with-app-sidebar");
      const core = [
        ["trips", "◈", "Explore trips"], ["explore-map", "⌖", "Explore map"],
        ["create-trip", "⊞", "Create a trip"], ["favourites", "♡", "Favourites"],
        ["compare", "⇄", "Compare"], ["booking", "▣", "Bookings"], ["reviews", "☆", "Reviews"],
      ];
      side.innerHTML = `<div class="app-side-top"><div class="app-side-brand vamora-logo vamora-compact" onclick="show('home')"><img class="vamora-logo-image" src="/vamora-logo.svg" alt="Vamora"></div><button class="app-side-collapse" aria-label="Toggle sidebar" onclick="toggleAppSidebar()">‹</button></div><div class="app-side-section">TRAVEL</div><div class="app-side-list">${core.map(([id, icon, label]) => `<button class="app-side-link" onclick="show('${id}')"><i>${icon}</i><strong>${label}</strong></button>`).join("")}</div>`;
    }
    const extra = [
      ["countries", "◎", "Countries"],
      ["hotels", "▦", "Hotels"],
      ["restaurants", "♨", "Restaurants"],
      ["flights", "✈", "Flights"],
      ["my-trips", "◇", "My trips"],
      ["memories", "✦", "Trip memories"],
      ["payments", "$", "Payments"],
      ["contact", "✉", "Contact"],
      ["admin", "⚙", "Admin"],
    ];
    if (!side.innerHTML) return;
    side.insertAdjacentHTML("beforeend", `<div class="app-side-divider"></div><div class="app-side-section">LIVE BACKEND</div><div class="app-side-list">${extra.map(([id, icon, label]) => `<button class="app-side-link ${active === id ? "active" : ""}" onclick="show('${id}')"><i>${icon}</i><strong>${label}</strong></button>`).join("")}</div>`);
  };

  const originalShow = window.show;
  window.show = function enhancedShow(id) {
    originalShow(id);
    if (id === "countries") loadCountries();
    if (id === "my-trips") loadTripsApi();
    if (id === "memories") loadMemoryTrips();
  };

  const route = new URLSearchParams(location.search).get("route");
  const routeMap = {
    "/": "home", "/overview": "dashboard", "/countries": "countries",
    "/hotels": "hotels", "/restaurants": "restaurants", "/flights": "flights",
    "/trips": "my-trips", "/memories": "memories", "/payments": "payments", "/contact": "contact",
    "/admin": "admin", "/notifications": "notifications", "/profile": "profile",
    "/login": "login", "/create-account": "register", "/forgot-password": "forgot",
    "/reset-password": "reset", "/map": "explore-map", "/compare": "compare",
    "/favorites": "favourites", "/reviews": "reviews", "/bookings": "booking",
  };
  if (route && routeMap[route]) show(routeMap[route]);

  document.querySelector("#forgot .reset-submit")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    forgotPasswordWithApi();
  }, true);
  document.querySelector("#reset .reset-submit")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    resetPasswordWithApi();
  }, true);
})();
