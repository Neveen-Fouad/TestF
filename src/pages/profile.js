import { api, session } from "../shared/api.js";
import { mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("profile");
  const fill = user => {
    const value = { ...(user || {}), ...(user?.client || {}) };
    document.querySelector("#profile-name").textContent = `${value.first_name || ""} ${value.last_name || ""}`.trim() || value.name || "Traveller";
    const summary = document.querySelector("#profile-summary");
    summary.replaceChildren(...[value.email || "No email available", value.phone || "No phone added", value.birth_date || "No birth date added"].map(text => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      return paragraph;
    }));
  };
  fill(session.user());
  try { const [profilePayload, settingsPayload] = await Promise.all([api.profile.get(), api.dashboard.settings()]); const profile = profilePayload?.data?.profile || profilePayload?.data || profilePayload; const settings = settingsPayload?.data?.profileSettings || {}; fill({ ...settings, ...profile }); } catch {}
  document.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", () => { const form = document.querySelector(`#${button.dataset.toggle}`); form.hidden = !form.hidden; button.setAttribute("aria-expanded", String(!form.hidden)); }));
  const passwordForm = document.querySelector("#password-form"); const pw = passwordForm.elements.password; const pwConfirm = passwordForm.elements.password_confirmation; function validatePasswordMatch() { pwConfirm.setCustomValidity(pwConfirm.value && pw.value !== pwConfirm.value ? "Passwords do not match." : ""); } pw.addEventListener("input", validatePasswordMatch); pwConfirm.addEventListener("input", validatePasswordMatch); passwordForm.addEventListener("submit", async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await api.profile.password(values); event.currentTarget.reset(); notify("Password updated."); } catch (error) { notify(error.message, true); } });
}
