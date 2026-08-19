import { api, rows } from "../shared/api.js";
import { escapeHtml, mountAdminSidebar, notify, requireAdmin, updateSiteSettings } from "../shared/navigation.js";
import { constrainFutureDate } from "../shared/forms.js";

const page = document.body.dataset.adminPage;
if (requireAdmin()) { mountAdminSidebar(page); load(); }

async function load() {
  const target = document.querySelector("#admin-content");
  try {
    if (page === "dashboard") { await loadDashboard(target); return; }
    if (page === "bookings") { await loadAdminBookings(target); return; }
    if (page === "trips") {
      const trips = rows(await api.trips.list());
      target.innerHTML = trips.length ? `<div class="admin-table-wrap"><table class="table"><thead><tr><th>Destination</th><th>Dates</th><th>Travellers</th><th>Budget</th><th>Style</th><th>Actions</th></tr></thead><tbody>${trips.map(trip => `<tr><td><strong>${escapeHtml(trip.destination || trip.name || "Untitled trip")}</strong></td><td>${escapeHtml(dateRange(trip))}</td><td>${escapeHtml(trip.number_of_travels || trip.travellers || "—")}</td><td>${escapeHtml(money(trip.budget))}</td><td>${escapeHtml(trip.style || trip.classes || "—")}</td><td>${trip.id ? `<button class="button subtle" type="button" data-edit-trip="${escapeHtml(trip.id)}">Edit</button> <button class="button subtle" type="button" data-delete-trip="${escapeHtml(trip.id)}">Delete</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No trips were returned.</div>';
      target.querySelectorAll("[data-edit-trip]").forEach(button => button.addEventListener("click", async () => {
        const trip = trips.find(item => String(item.id) === button.dataset.editTrip);
        if (!trip) return;
        try { await editAdminTrip(trip); await load(); } catch (error) { notify(error.message, true); }
      }));
      target.querySelectorAll("[data-delete-trip]").forEach(button => button.addEventListener("click", async () => {
        if (!confirm("Delete this trip? This cannot be undone.")) return;
        try { await api.trips.remove(button.dataset.deleteTrip); notify("Trip deleted."); await load(); } catch (error) { notify(error.message, true); }
      }));
      return;
    }
    if (page === "users") {
      const users = rows(await api.admin.users());
      target.innerHTML = `<div class="admin-table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>${users.map(user => `<tr><td>${escapeHtml(user.name || `${user.first_name || ""} ${user.last_name || ""}`)}</td><td>${escapeHtml(user.email || "")}</td><td>${user.is_active ? "Active" : "Inactive"}</td><td><button class="button subtle" data-user="${escapeHtml(user.id)}" data-active="${user.is_active ? "0" : "1"}">${user.is_active ? "Deactivate" : "Activate"}</button></td></tr>`).join("")}</tbody></table></div>`;
      target.querySelectorAll("[data-user]").forEach(button => button.addEventListener("click", async () => { try { await api.admin.userStatus(button.dataset.user, button.dataset.active === "1"); load(); } catch (error) { notify(error.message, true); } }));
      return;
    }
    if (page === "create-trip") {
      const createForm = document.querySelector("#trip-create-form");
      const detailsContainer = document.querySelector("#daily-details-container");
      constrainFutureDate(createForm.elements.start_date);
      document.querySelector("#add-day-button").addEventListener("click", () => addDailyDetail(detailsContainer));
      detailsContainer.addEventListener("click", event => {
        const removeButton = event.target.closest("[data-remove-day]");
        if (removeButton) removeButton.closest(".daily-detail").remove();
      });
      createForm.addEventListener("submit", async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        for (const key of ["number_of_travels", "number_of_days", "budget", "estimated_expenses"]) values[key] = Number(values[key]);
        for (const key of ["detail_day", "detail_title", "detail_expenses", "detail_plan"]) delete values[key];
        values.details = Array.from(detailsContainer.querySelectorAll(".daily-detail"), detail => {
          const plan = detail.querySelector('[name="detail_plan"]').value.trim();
          return {
            day: Number(detail.querySelector('[name="detail_day"]').value),
            title: detail.querySelector('[name="detail_title"]').value.trim(),
            expenses: Number(detail.querySelector('[name="detail_expenses"]').value),
            plan: parseItineraryPlan(plan)
          };
        });
        try { await api.trips.create(values); notify("Trip created."); location.assign("/pages/admin-trips.html"); } catch (error) { notify(error.message, true); }
      });
      return;
    }
    if (page === "legacy-interests") {
      const render = async () => { const interests = rows(await api.admin.interests()); target.innerHTML = interests.map(item => `<article class="result-card"><h3>${escapeHtml(item.name || item.title)}</h3><button class="button subtle" data-remove="${escapeHtml(item.id)}">Delete</button></article>`).join("") || '<div class="empty">No interests yet.</div>'; target.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", async () => { try { await api.admin.removeInterest(button.dataset.remove); render(); } catch (error) { notify(error.message, true); } })); };
      await render();
      document.querySelector("#interest-form").addEventListener("submit", async event => { event.preventDefault(); try { await api.admin.createInterest(Object.fromEntries(new FormData(event.currentTarget))); event.currentTarget.reset(); render(); } catch (error) { notify(error.message, true); } });
      return;
    }
    if (page === "interests") { await loadInterests(target); return; }
    if (page === "legacy-complaints") {
      const messages = rows(await api.admin.messages());
      target.innerHTML = cards(messages, item => `<p class="eyebrow">${escapeHtml(item.status || "PENDING")}</p><h3>${escapeHtml(item.title || "Complaint")}</h3><p>${escapeHtml(item.description || "")}</p><p>${escapeHtml(item.email || "")} · ${escapeHtml(item.phone || "")}</p><button class="button subtle" data-reply="${escapeHtml(item.id)}">Mark replied</button>`);
      target.querySelectorAll("[data-reply]").forEach(button => button.addEventListener("click", async () => { try { await api.admin.messageStatus(button.dataset.reply, "replied"); button.closest("article").remove(); } catch (error) { notify(error.message, true); } }));
      return;
    }
    if (page === "complaints") { await loadComplaints(target); return; }
    if (page === "reviews") {
      let currentPage = 1;
      let activeStatus = "";

      const statusTabs = document.querySelectorAll("#review-status-tabs [data-status]");
      statusTabs.forEach(tab => {
        tab.addEventListener("click", () => {
          activeStatus = tab.dataset.status;
          currentPage = 1;
          statusTabs.forEach(t => t.classList.toggle("active", t.dataset.status === activeStatus));
          loadReviews();
        });
      });

      const loadReviews = async () => {
        target.innerHTML = '<div class="empty">Loading reviews…</div>';
        const filters = activeStatus ? { status: activeStatus } : {};
        const payload = await api.admin.reviews(currentPage, filters);
        const reviews = rows(payload);
        const pagination = payload?.data?.current_page ? payload.data : (payload?.current_page ? payload : {});
        currentPage = Number(pagination.current_page) || currentPage;
        const lastPage = Number(pagination.last_page) || 1;
        const total = pagination.total != null ? pagination.total : reviews.length;

        const controls = lastPage > 1 ? `<div class="pagination-controls"><button class="button subtle" type="button" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>← Previous</button><span>Page ${currentPage} of ${lastPage} (${total} reviews)</span><button class="button subtle" type="button" data-page="next" ${currentPage >= lastPage ? "disabled" : ""}>Next →</button></div>` : "";

        target.innerHTML = reviews.length ? cards(reviews, item => {
          const status = String(item.status || "pending").toLowerCase();
          const statusBadge = status === "approved"
            ? '<span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: #e6f4ea; color: #137333; font-size: 11px; font-weight: 800; text-transform: uppercase;">Approved</span>'
            : (status === "rejected"
              ? '<span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: #fce8e6; color: #c5221f; font-size: 11px; font-weight: 800; text-transform: uppercase;">Rejected</span>'
              : '<span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: #fef7e0; color: #b06000; font-size: 11px; font-weight: 800; text-transform: uppercase;">Pending</span>');

          return `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;"><p class="eyebrow" style="margin:0">${escapeHtml((item.type || "review").toUpperCase())} #${escapeHtml(item.id)}</p>${statusBadge}</div><h3>${escapeHtml(item.title || `${item.type ? item.type[0].toUpperCase() + item.type.slice(1) : "Traveler"} review`)}</h3><p style="color: var(--primary); font-weight: 700; margin: 4px 0 8px;">★ ${escapeHtml(String(item.rating || "—"))}/5</p><p>${escapeHtml(item.description || item.comment || item.content || "No review text was provided.")}</p><div class="detail-actions" style="margin-top: 14px;">${status !== "approved" ? `<button class="button" data-decision="approve" data-id="${escapeHtml(item.id)}">Approve</button>` : ""}${status !== "rejected" ? ` <button class="button subtle" data-decision="reject" data-id="${escapeHtml(item.id)}">Reject</button>` : ""}</div>`;
        }) + controls : `<div class="empty">No ${activeStatus ? activeStatus : ""} reviews found.</div>`;

        target.querySelectorAll("[data-decision]").forEach(button => button.addEventListener("click", async () => {
          try {
            await api.admin.reviewDecision(button.dataset.id, button.dataset.decision);
            notify(`Review ${button.dataset.decision}d.`);
            await loadReviews();
          } catch (error) {
            notify(error.message, true);
          }
        }));

        target.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
          currentPage += button.dataset.page === "prev" ? -1 : 1;
          loadReviews();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }));
      };

      await loadReviews();
      return;
    }
    if (page === "site-settings") {
      const form = document.querySelector("#site-settings-form");
      const settings = rows(await api.admin.settings());
      const current = settings[0] || {};
      form.elements.settings_id.value = current.id || "";
      const fields = [["name", "Site name", "text"], ["phone", "Phone", "tel"], ["slogan", "Slogan", "text"], ["facebook", "Facebook URL", "url"], ["instagram", "Instagram URL", "url"], ["logo", "Logo", "file"]];
      target.innerHTML = fields.map(([name, label, type]) => `<div class="field"><label>${label}</label><input name="${name}" type="${type}" ${type === "file" ? 'accept="image/png,image/jpeg,image/svg+xml"' : `value="${escapeHtml(current[name] || "")}"`} ${current.id || type !== "file" ? "" : "required"}></div>`).join("");
      form.addEventListener("submit", async event => { event.preventDefault(); const data = new FormData(form); const id = data.get("settings_id"); data.delete("settings_id"); if (!data.get("logo")?.size) data.delete("logo"); try { const result = id ? await api.admin.updateSettings(id, data) : await api.admin.createSettings(data); updateSiteSettings(result); notify("Site settings saved."); } catch (error) { notify(error.message, true); } });
    }
  } catch (error) { target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
}

async function editAdminTrip(trip) {
  const fields = [
    ["destination", "Destination", trip.destination || trip.name || ""],
    ["start_date", "Start date (YYYY-MM-DD)", String(trip.start_date || "").slice(0, 10)],
    ["number_of_days", "Number of days", trip.number_of_days || ""],
    ["budget", "Budget", trip.budget || ""],
    ["estimated_expenses", "Estimated expenses", trip.estimated_expenses || ""],
    ["number_of_travels", "Travellers", trip.number_of_travels || trip.travellers || ""],
    ["style", "Travel style", trip.style || ""]
  ];
  const values = {};
  for (const [key, label, current] of fields) {
    const value = prompt(label, current);
    if (value === null) return;
    values[key] = value.trim();
  }
  for (const key of ["number_of_days", "budget", "estimated_expenses", "number_of_travels"]) {
    values[key] = Number(values[key]);
    if (!Number.isFinite(values[key])) throw new Error(`${key.replaceAll("_", " ")} must be a valid number.`);
  }
  await api.trips.update(trip.id, values);
  notify("Trip updated.");
}
function addDailyDetail(container) {
  const nextDay = Math.max(0, ...Array.from(container.querySelectorAll('[name="detail_day"]'), input => Number(input.value) || 0)) + 1;
  const detail = document.createElement("article");
  detail.className = "daily-detail";
  detail.innerHTML = `<div class="daily-detail-heading"><h3>Day itinerary</h3><button class="button subtle" type="button" data-remove-day>Remove</button></div><div class="form-grid"><div class="field"><label>Day</label><input name="detail_day" type="number" min="1" value="${nextDay}" required></div><div class="field"><label>Title</label><input name="detail_title" required placeholder="Arrival and city highlights"></div><div class="field"><label>Expenses</label><input name="detail_expenses" type="number" min="0" step="0.01" value="0" required></div><div class="field"><label>Plan <small>(itinerary text or valid JSON)</small></label><textarea name="detail_plan" rows="4" required placeholder="Morning: explore the old town…"></textarea></div></div>`;
  container.append(detail);
  detail.querySelector('[name="detail_title"]').focus();
}

function parseItineraryPlan(plan) {
  try { return JSON.parse(plan); }
  catch { return plan; }
}
async function loadDashboard(target) {
  const form = document.querySelector("#dashboard-period");
  const now = new Date();
  if (!form.dataset.ready) {
    form.elements.month.innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${new Date(2000, index).toLocaleString(undefined, { month: "long" })}</option>`).join("");
    form.elements.month.value = String(now.getMonth() + 1);
    form.elements.year.value = String(now.getFullYear());
    form.dataset.ready = "true";
    form.addEventListener("submit", event => { event.preventDefault(); loadDashboard(target); });
    document.querySelector("#export-pdf").addEventListener("click", exportPdf);
  }
  target.innerHTML = '<div class="empty">Loading dashboard data…</div>';
  const filters = Object.fromEntries(new FormData(form));
  const results = await Promise.allSettled([
    api.admin.dashboardStatistics(filters), api.admin.tripStatistics(), api.admin.statistics(), api.admin.revenue()
  ]);
  const [reportPayload, tripPayload, userPayload, revenuePayload] = results.map(result => result.status === "fulfilled" ? result.value : {});
  const unavailable = ["Dashboard report", "Trip statistics", "User statistics", "Revenue"].filter((_, index) => results[index].status === "rejected");
  const report = unwrap(reportPayload);
  const tripStats = { ...(report.trip_stats || {}), ...unwrap(tripPayload) };
  const userStats = { ...(report.user_stats || {}), ...unwrap(userPayload) };
  const revenue = number(unwrap(revenuePayload).total_revenue ?? tripStats.total_revenue);
  const revenueSeries = Array.isArray(report.trip_stats?.revenue_last_6_months) ? report.trip_stats.revenue_last_6_months : [];
  const tripBars = [
    { label: "Total", value: number(tripStats.total_trips) },
    { label: "This month", value: number(tripStats.monthly_trips) },
    { label: "Favorites", value: number(tripStats.favorite_trips) },
    { label: "AI generated", value: number(tripStats.ai_generated_trips) }
  ];
  const userBars = [
    { label: "Verified", value: number(userStats.verified_users) },
    { label: "Unverified", value: number(userStats.unverified_users) },
    { label: "New this month", value: number(userStats.monthly_users) }
  ];
  target.innerHTML = `${unavailable.length ? `<div class="admin-warning">Partial data: ${escapeHtml(unavailable.join(", "))} could not be loaded.</div>` : ""}<section class="admin-metrics" aria-label="Dashboard summary">
    ${metric("Total revenue", money(revenue), "All booking revenue")}
    ${metric("Monthly revenue", money(tripStats.monthly_revenue), report.period_label || "Selected period")}
    ${metric("Total trips", number(tripStats.total_trips), `${number(tripStats.monthly_trips)} this month`)}
    ${metric("Total users", number(userStats.total_users), `${number(userStats.monthly_users)} this month`)}
  </section><section class="admin-charts">
    ${chartPanel("Revenue trend", "Booking revenue over the latest six reported months.", lineChart(revenueSeries.map(item => ({ label: item.month, value: number(item.revenue) })), "Revenue over six months"))}
    ${chartPanel("Trip activity", "Total, monthly, favorite, and AI-generated trips.", barChart(tripBars, "Trip statistics", "#0e6ed9"))}
    ${chartPanel("User status", "Verification and new-user composition.", barChart(userBars, "User statistics", "#ff8a3d"))}
  </section><p class="admin-updated">Report period: ${escapeHtml(report.period_label || "Current period")} · Generated ${escapeHtml(report.generated_at || new Date().toLocaleString())}</p>`;
}

async function exportPdf() {
  const button = document.querySelector("#export-pdf");
  const form = document.querySelector("#dashboard-period");
  button.disabled = true;
  button.textContent = "Preparing PDF…";
  try {
    const { blob, disposition } = await api.admin.exportDashboardPdf(Object.fromEntries(new FormData(form)));
    const filename = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)?.[1] || `dashboard-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = decodeURIComponent(filename);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Dashboard PDF downloaded.");
  } catch (error) { notify(error.message, true); }
  finally { button.disabled = false; button.textContent = "Download PDF"; }
}

function lineChart(items, title) {
  if (!items.length) return '<div class="chart-empty">No revenue trend was returned.</div>';
  const width = 640, height = 250, left = 48, right = 18, top = 22, bottom = 42;
  const max = Math.max(...items.map(item => item.value), 1);
  const x = index => left + index * ((width - left - right) / Math.max(items.length - 1, 1));
  const y = value => top + (height - top - bottom) * (1 - value / max);
  const points = items.map((item, index) => `${x(index)},${y(item.value)}`).join(" ");
  const labels = items.map((item, index) => `<text x="${x(index)}" y="${height - 14}" text-anchor="middle" class="chart-label">${escapeHtml(item.label)}</text><text x="${x(index)}" y="${Math.max(y(item.value) - 10, 14)}" text-anchor="middle" class="chart-value">${escapeHtml(compact(item.value))}</text>`).join("");
  return `<svg class="admin-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title><line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" class="chart-axis"/><polyline points="${points}" class="chart-line"/>${items.map((item, index) => `<circle cx="${x(index)}" cy="${y(item.value)}" r="5" class="chart-point"><title>${escapeHtml(item.label)}: ${escapeHtml(money(item.value))}</title></circle>`).join("")}${labels}</svg>`;
}

function barChart(items, title, color) {
  const shown = items.filter(item => item.value || item.label);
  if (!shown.length) return '<div class="chart-empty">No chart data was returned.</div>';
  const width = 640, row = 54, left = 135, right = 55, height = shown.length * row + 28;
  const max = Math.max(...shown.map(item => item.value), 1);
  return `<svg class="admin-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title>${shown.map((item, index) => { const y = 16 + index * row; const barWidth = (width - left - right) * item.value / max; return `<text x="${left - 12}" y="${y + 20}" text-anchor="end" class="chart-label">${escapeHtml(item.label)}</text><rect x="${left}" y="${y}" width="${Math.max(barWidth, item.value ? 3 : 0)}" height="28" rx="6" fill="${color}"><title>${escapeHtml(item.label)}: ${item.value}</title></rect><text x="${left + barWidth + 9}" y="${y + 20}" class="chart-value">${item.value}</text>`; }).join("")}</svg>`;
}

function chartPanel(title, description, chart) { return `<article class="admin-chart-card"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>${chart}</article>`; }
function metric(label, value, detail) { return `<article class="admin-metric"><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong><span>${escapeHtml(detail)}</span></article>`; }
function unwrap(payload) { return payload?.data || payload || {}; }
function number(value) { const result = Number(value); return Number.isFinite(result) ? result : 0; }
function money(value) { return `$${number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
function compact(value) { return number(value).toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 }); }
function dateRange(trip) { const start = String(trip.start_date || "").slice(0, 10); const end = String(trip.end_date || "").slice(0, 10); return start && end ? `${start} – ${end}` : start || end || "—"; }
function stats(values) { return Object.entries(values || {}).map(([key, value]) => `<article class="result-card"><p class="eyebrow">${escapeHtml(key.replaceAll("_", " ").toUpperCase())}</p><h2>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</h2></article>`).join("") || '<div class="empty">No statistics were returned.</div>'; }
function cards(items, content) { return items.length ? items.map(item => `<article class="result-card">${content(item)}</article>`).join("") : '<div class="empty">No records returned.</div>'; }

async function loadInterests(target) {
  const form = document.querySelector("#interest-form");
  const render = async () => {
    const interests = rows(await api.admin.interests());
    target.innerHTML = interests.length ? interests.map(item => `<article class="result-card"><h3>${escapeHtml(item.name || item.title)}</h3><div class="detail-actions"><button class="button subtle" data-edit-interest="${escapeHtml(item.id)}" data-interest-name="${escapeHtml(item.name || "")}">Edit</button><button class="button subtle" data-remove-interest="${escapeHtml(item.id)}">Delete</button></div></article>`).join("") : '<div class="empty">No interests yet.</div>';
    target.querySelectorAll("[data-edit-interest]").forEach(button => button.addEventListener("click", async () => {
      const name = prompt("Interest name", button.dataset.interestName);
      if (!name?.trim()) return;
      try { await api.admin.updateInterest(button.dataset.editInterest, { name: name.trim() }); await render(); notify("Interest updated."); } catch (error) { notify(error.message, true); }
    }));
    target.querySelectorAll("[data-remove-interest]").forEach(button => button.addEventListener("click", async () => {
      if (!confirm("Delete this interest?")) return;
      try { await api.admin.removeInterest(button.dataset.removeInterest); await render(); notify("Interest deleted."); } catch (error) { notify(error.message, true); }
    }));
  };
  if (!form.dataset.ready) {
    form.dataset.ready = "true";
    form.addEventListener("submit", async event => {
      event.preventDefault();
      try { await api.admin.createInterest(Object.fromEntries(new FormData(form))); form.reset(); await render(); notify("Interest added."); } catch (error) { notify(error.message, true); }
    });
  }
  await render();
}

async function loadComplaints(target) {
  const render = async () => {
    const messages = rows(await api.admin.messages());
    target.innerHTML = cards(messages, item => `<p class="eyebrow">${escapeHtml(item.status || "PENDING")}</p><h3>${escapeHtml(item.title || "Complaint")}</h3><p>${escapeHtml(item.description || "")}</p><p>${escapeHtml(item.email || "")} · ${escapeHtml(item.phone || "")}</p><div class="detail-actions"><button class="button subtle" data-reply="${escapeHtml(item.id)}">Mark replied</button><button class="button subtle" data-delete-message="${escapeHtml(item.id)}">Delete</button></div>`);
    target.querySelectorAll("[data-reply]").forEach(button => button.addEventListener("click", async () => { try { await api.admin.messageStatus(button.dataset.reply, "replied"); await render(); notify("Message marked replied."); } catch (error) { notify(error.message, true); } }));
    target.querySelectorAll("[data-delete-message]").forEach(button => button.addEventListener("click", async () => { if (!confirm("Delete this contact message?")) return; try { await api.admin.removeMessage(button.dataset.deleteMessage); await render(); notify("Message deleted."); } catch (error) { notify(error.message, true); } }));
  };
  await render();
}

async function loadAdminBookings(target) {
  const form = document.querySelector("#admin-bookings-form");
  const render = async () => {
    const clientId = form.elements.client_id.value.trim();
    if (!clientId) { target.innerHTML = '<div class="empty">Select a client to view their bookings.</div>'; return; }
    const bookingType = form.elements.type.value;
    const source = bookingType === "hotels" ? api.admin.bookings.hotels : bookingType === "flights" ? api.admin.bookings.flights : api.admin.bookings.all;
    const bookings = rows(await source(clientId));
    const shownBookings = bookingType === "trips" ? bookings.filter(booking => booking.type === "trip") : bookings;
    target.innerHTML = shownBookings.length ? cards(shownBookings, item => `<p class="eyebrow">${escapeHtml(item.status || item.type || "BOOKING")}</p><h3>${escapeHtml(item.details?.hotel_name || item.details?.airline || item.details?.destination || item.provider_name || item.name || "Booking")}</h3><p>${escapeHtml(item.check_in_date || item.booking_date || item.created_at || "")}</p><p>${escapeHtml(item.total_price != null ? `${item.currency || "USD"} ${item.total_price}` : "Price unavailable")}</p>`) : '<div class="empty">No bookings found for this client.</div>';
  };
  if (!form.dataset.ready) {
    form.dataset.ready = "true";
    form.addEventListener("submit", event => { event.preventDefault(); render().catch(error => { target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }); });
    try {
      const users = rows(await api.admin.users());
      const clients = users.map(user => {
        const clientId = user.client_id || user.client?.id || (user.role === "user" ? user.id : null);
        const name = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "Client";
        return clientId ? `<option value="${escapeHtml(clientId)}">${escapeHtml(name)} — client #${escapeHtml(clientId)}</option>` : "";
      }).filter(Boolean);
      document.querySelector("#client-options").innerHTML = clients.length
        ? '<option value="" disabled selected>Select a client...</option>' + clients.join("")
        : '<option value="" disabled selected>No clients are available.</option>';
    } catch {
      document.querySelector("#client-options").innerHTML = '<option value="" disabled selected>Clients could not be loaded.</option>';
    }
  }
  await render();
}
