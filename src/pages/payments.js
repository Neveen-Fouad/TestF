import { api, rows, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();

if (requireLogin()) {
  mountSidebar("payments");

  const target = document.querySelector("#payments");
  const paginationTarget = document.querySelector("#payments-pagination");
  const filterTabsContainer = document.querySelector("#payment-filter-tabs");
  const detailContainer = document.querySelector("#payment-detail-container");
  const form = document.querySelector("#payment-form");

  const parameters = new URLSearchParams(location.search);
  const bookingId = parameters.get("booking_id");
  const paymentIdParam = parameters.get("payment_id");

  const PAGE_SIZE = 6;
  let currentPage = 1;
  let activeFilter = "all";
  let allPayments = [];
  let currentClientId = session.clientId();

  // Helper to format currency
  function formatMoney(amount, currency = "EGP") {
    const num = Number(amount);
    if (!Number.isFinite(num)) return `${currency} ${amount || "0.00"}`;
    return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Helper for status badge
  function renderStatusBadge(status) {
    const s = String(status || "pending").toLowerCase();
    const isPaid = ["paid", "completed", "successful"].includes(s);
    const isFailed = ["failed", "cancelled", "rejected"].includes(s);
    const badgeClass = isPaid ? "paid" : isFailed ? "failed" : "pending";
    const label = isPaid ? "Completed" : isFailed ? "Failed" : "Pending";
    return `<span class="payment-status-badge ${badgeClass}">${escapeHtml(label)}</span>`;
  }

  // Initialize
  init();

  async function init() {
    // If clientId is missing, fetch user profile to populate
    if (!currentClientId) {
      try {
        const profilePayload = await api.profile.get();
        const user = profilePayload?.data?.user || profilePayload?.data || profilePayload;
        if (user) {
          session.updateUser(user);
          currentClientId = session.clientId() || user.id;
        }
      } catch {}
    }

    // If booking_id query param is present, prepare checkout form
    if (bookingId && form) {
      form.hidden = false;
      form.elements.booking_id.value = bookingId;
      form.addEventListener("submit", async event => {
        event.preventDefault();
        try {
          const result = await api.payments.create(bookingId);
          notify("Payment session created.");
          if (result.checkout_url) {
            location.assign(result.checkout_url);
          } else {
            notify("Payment created successfully.");
            setTimeout(() => {
              location.assign("/pages/payments.html");
            }, 1000);
          }
        } catch (error) {
          notify(error.message, true);
        }
      });
    }

    // Set up filter tabs
    if (filterTabsContainer) {
      filterTabsContainer.querySelectorAll("[data-filter]").forEach(tab => {
        tab.addEventListener("click", () => {
          activeFilter = tab.dataset.filter;
          currentPage = 1;
          filterTabsContainer.querySelectorAll("[data-filter]").forEach(t => {
            t.classList.toggle("active", t.dataset.filter === activeFilter);
          });
          renderPayments();
        });
      });
    }

    // Load payments list
    await loadPayments();

    // If payment_id query param is present, view details directly
    if (paymentIdParam) {
      await showPaymentDetails(paymentIdParam);
    }
  }

  async function loadPayments() {
    if (!currentClientId) {
      target.innerHTML = '<div class="empty">Your client account profile is unavailable.</div>';
      return;
    }

    try {
      target.innerHTML = '<div class="empty">Loading your payment history…</div>';
      const payload = await api.payments.list(currentClientId);
      allPayments = rows(payload);
      currentPage = 1;
      renderPayments();
    } catch (error) {
      target.innerHTML = `<div class="empty is-error">${escapeHtml(error.message || "Unable to load payment history.")}</div>`;
      if (paginationTarget) paginationTarget.innerHTML = "";
    }
  }

  function renderPayments() {
    // Filter payments
    const filtered = allPayments.filter(p => {
      const s = String(p.status || "pending").toLowerCase();
      if (activeFilter === "paid") return ["paid", "completed", "successful"].includes(s);
      if (activeFilter === "pending") return s === "pending";
      if (activeFilter === "failed") return ["failed", "cancelled", "rejected"].includes(s);
      return true;
    });

    if (!filtered.length) {
      const emptyMsg = activeFilter === "all"
        ? "No payment history recorded yet. Completed and pending booking payments will appear here."
        : `No ${activeFilter} transactions found.`;
      target.innerHTML = `<div class="empty">${emptyMsg}</div>`;
      if (paginationTarget) paginationTarget.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    target.innerHTML = pageItems.map(item => {
      const amount = formatMoney(item.amount, item.currency || "EGP");
      const reference = item.payment_reference || `PAY-#${item.id}`;
      const date = item.paid_at || item.created_at ? new Date(item.paid_at || item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "—";
      const method = (item.payment_method || item.gateway || "Card").toUpperCase();
      const s = String(item.status || "pending").toLowerCase();
      const isPending = s === "pending";

      return `
        <article class="result-card payment-card">
          <div>
            <div class="payment-card-header">
              <span class="eyebrow" style="margin: 0;">${escapeHtml(item.payment_type || "BOOKING")}</span>
              ${renderStatusBadge(item.status)}
            </div>
            <div class="payment-amount">${escapeHtml(amount)}</div>
            <div class="payment-meta-list">
              <div class="payment-meta-row">
                <span>Reference</span>
                <span title="${escapeHtml(reference)}">${escapeHtml(reference)}</span>
              </div>
              ${item.booking_id ? `
                <div class="payment-meta-row">
                  <span>Booking</span>
                  <span><a href="/pages/bookings.html" style="color: var(--blue); text-decoration: underline;">#${escapeHtml(String(item.booking_id))}</a></span>
                </div>
              ` : ""}
              <div class="payment-meta-row">
                <span>Method</span>
                <span>${escapeHtml(method)}</span>
              </div>
              <div class="payment-meta-row">
                <span>Date</span>
                <span>${escapeHtml(date)}</span>
              </div>
            </div>
          </div>
          <div class="detail-actions" style="margin-top: 14px; gap: 8px;">
            <button class="button subtle" type="button" data-view-payment="${escapeHtml(String(item.id))}">
              View details
            </button>
            ${isPending && item.booking_id ? `
              <a class="button" href="/pages/payments.html?booking_id=${encodeURIComponent(item.booking_id)}">
                Pay now
              </a>
            ` : ""}
          </div>
        </article>
      `;
    }).join("");

    // Attach click listeners for View Details
    target.querySelectorAll("[data-view-payment]").forEach(btn => {
      btn.addEventListener("click", () => {
        showPaymentDetails(btn.dataset.viewPayment);
      });
    });

    // Pagination controls
    if (paginationTarget) {
      if (totalPages > 1) {
        paginationTarget.innerHTML = `
          <button class="button subtle" type="button" data-page="prev" ${currentPage <= 1 ? "disabled" : ""}>← Previous</button>
          <span>Page ${currentPage} of ${totalPages} (${filtered.length} transactions)</span>
          <button class="button subtle" type="button" data-page="next" ${currentPage >= totalPages ? "disabled" : ""}>Next →</button>
        `;
        paginationTarget.querySelectorAll("[data-page]").forEach(btn => {
          btn.addEventListener("click", () => {
            currentPage += btn.dataset.page === "prev" ? -1 : 1;
            renderPayments();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });
      } else {
        paginationTarget.innerHTML = "";
      }
    }
  }

  async function showPaymentDetails(paymentId) {
    if (!detailContainer) return;
    detailContainer.hidden = false;
    detailContainer.innerHTML = '<div class="empty">Loading transaction details…</div>';
    detailContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const payload = await api.payments.show(paymentId);
      const payment = payload?.data?.payment || payload?.data || payload;

      if (!payment || !payment.id) {
        throw new Error("Transaction details not found.");
      }

      const amount = formatMoney(payment.amount, payment.currency || "EGP");
      const reference = payment.payment_reference || `PAY-#${payment.id}`;
      const createdDate = payment.created_at ? new Date(payment.created_at).toLocaleString() : "—";
      const paidDate = payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "Not paid yet";
      const method = (payment.payment_method || "Card").toUpperCase();
      const gateway = (payment.gateway || "Paymob").toUpperCase();
      const gatewayRef = payment.gateway_reference || payment.gateway_transaction_id || "—";
      const failureReason = payment.failure_reason;

      detailContainer.innerHTML = `
        <article class="payment-detail-card">
          <div class="payment-detail-header">
            <div>
              <p class="eyebrow" style="margin: 0 0 4px;">TRANSACTION RECEIPT</p>
              <h2 style="margin: 0; color: var(--navy); font-size: 24px;">${escapeHtml(reference)}</h2>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              ${renderStatusBadge(payment.status)}
              <button class="button subtle" type="button" id="close-payment-detail" style="min-height: 36px; padding: 6px 12px;" aria-label="Close details">✕ Close</button>
            </div>
          </div>

          <div class="payment-detail-grid">
            <div class="payment-detail-item">
              <small>Total Amount</small>
              <strong style="color: var(--blue); font-size: 20px;">${escapeHtml(amount)}</strong>
            </div>
            <div class="payment-detail-item">
              <small>Payment Status</small>
              <strong>${escapeHtml(String(payment.status || "Pending").toUpperCase())}</strong>
            </div>
            <div class="payment-detail-item">
              <small>Payment Method / Gateway</small>
              <strong>${escapeHtml(`${method} (${gateway})`)}</strong>
            </div>
            <div class="payment-detail-item">
              <small>Associated Booking</small>
              <strong>${payment.booking_id ? `<a href="/pages/bookings.html" style="color: var(--blue); text-decoration: underline;">Booking #${escapeHtml(String(payment.booking_id))}</a>` : "General Payment"}</strong>
            </div>
            <div class="payment-detail-item">
              <small>Created Timestamp</small>
              <strong>${escapeHtml(createdDate)}</strong>
            </div>
            <div class="payment-detail-item">
              <small>Settled / Paid At</small>
              <strong>${escapeHtml(paidDate)}</strong>
            </div>
            <div class="payment-detail-item" style="grid-column: 1 / -1;">
              <small>Gateway Transaction Reference</small>
              <strong>${escapeHtml(gatewayRef)}</strong>
            </div>
            ${failureReason ? `
              <div class="payment-detail-item" style="grid-column: 1 / -1; border-color: #f1c6c6; background: #fff7f6;">
                <small style="color: var(--danger);">Failure Reason</small>
                <strong style="color: var(--danger);">${escapeHtml(failureReason)}</strong>
              </div>
            ` : ""}
          </div>

          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="button subtle" type="button" onclick="window.print()">
              🖨 Print receipt
            </button>
            ${String(payment.status).toLowerCase() === "pending" && payment.booking_id ? `
              <a class="button" href="/pages/payments.html?booking_id=${encodeURIComponent(payment.booking_id)}">
                Complete checkout →
              </a>
            ` : ""}
          </div>
        </article>
      `;

      detailContainer.querySelector("#close-payment-detail")?.addEventListener("click", () => {
        detailContainer.hidden = true;
        detailContainer.innerHTML = "";
      });
    } catch (error) {
      detailContainer.innerHTML = `
        <div class="empty is-error">
          <p>${escapeHtml(error.message || "Failed to load transaction details.")}</p>
          <button class="button subtle" type="button" id="close-payment-detail">Close</button>
        </div>
      `;
      detailContainer.querySelector("#close-payment-detail")?.addEventListener("click", () => {
        detailContainer.hidden = true;
        detailContainer.innerHTML = "";
      });
    }
  }
}

