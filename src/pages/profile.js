import { api, session } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("profile");

  const profileForm = document.querySelector("#profile-form");
  const passwordForm = document.querySelector("#password-form");
  const profileInfo = document.querySelector("#profile-info");
  const status = document.querySelector("#profile-status");

  // ── Read-only display helpers ─────────────────────────────────────────────
  function fillDisplay(user) {
    const u = user?.profile || user?.data?.profile || user?.data || user || {};
    const firstName = u.first_name || u.name || "";
    const lastName = u.last_name || "";
    document.querySelector("#profile-display-name").textContent = [firstName, lastName].filter(Boolean).join(" ") || "Profile";
    document.querySelector("#info-email").textContent = u.email || "—";
    document.querySelector("#info-phone").textContent = u.phone || "—";
    document.querySelector("#info-birth_date").textContent = u.birth_date || "—";
  }

  // ── Form fill helper ──────────────────────────────────────────────────────
  function fillForm(user) {
    const u = user?.profile || user?.data?.profile || user?.data || user || {};
    ["first_name", "last_name", "email", "phone", "birth_date"].forEach(key => {
      if (profileForm.elements[key]) profileForm.elements[key].value = u[key] || "";
    });
  }

  // Pre-fill from session cache, then refresh from API
  const cached = session.user();
  fillDisplay(cached);
  fillForm(cached);

  api.profile.get().then(payload => {
    fillDisplay(payload);
    fillForm(payload?.data?.profile || payload?.data || payload);
  }).catch(() => {
    if (status) status.textContent = "Using cached session data.";
  });

  // ── Toggle logic ──────────────────────────────────────────────────────────
  document.querySelector("#btn-edit").addEventListener("click", () => {
    profileForm.style.display = profileForm.style.display === "none" ? "" : "none";
    passwordForm.style.display = "none"; // hide password form if open
  });

  document.querySelector("#btn-password").addEventListener("click", () => {
    passwordForm.style.display = passwordForm.style.display === "none" ? "" : "none";
    profileForm.style.display = "none"; // hide edit form if open
  });

  document.querySelector("#btn-cancel-edit").addEventListener("click", () => {
    profileForm.style.display = "none";
  });

  document.querySelector("#btn-cancel-password").addEventListener("click", () => {
    passwordForm.style.display = "none";
  });

  // ── Profile update ────────────────────────────────────────────────────────
  profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const result = await api.profile.update(Object.fromEntries(new FormData(profileForm)));
      const updatedUser = result?.data?.profile || result?.data || result;
      session.updateUser(updatedUser);
      fillDisplay(updatedUser);
      if (status) status.textContent = "Saved";
      notify("Profile saved.");
      profileForm.style.display = "none";
    } catch (error) {
      notify(error.message, true);
    }
  });

  // ── Password update ───────────────────────────────────────────────────────
  passwordForm.addEventListener("submit", async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.password_confirmation) return notify("New passwords do not match.", true);
    try {
      await api.profile.password(values);
      event.currentTarget.reset();
      notify("Password updated.");
      passwordForm.style.display = "none";
    } catch (error) {
      notify(error.message, true);
    }
  });
}
