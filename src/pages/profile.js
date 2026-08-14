import { api, session } from "../shared/api.js";
import { mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("profile");
  const profileForm = document.querySelector("#profile-form");
  const fill = user => {
    const value = { ...(user || {}), ...(user?.client || {}) };
    ["first_name", "last_name", "email", "phone", "birth_date"].forEach(key => { if (profileForm.elements[key]) profileForm.elements[key].value = value[key] || ""; });
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
  profileForm.addEventListener("submit", async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(profileForm)); try { const [profileResult, settingsResult] = await Promise.all([api.profile.update({ first_name: values.first_name, last_name: values.last_name }), api.dashboard.updateSettings({ phone: values.phone, birth_date: values.birth_date })]); const user = profileResult?.data?.profile || profileResult?.data || profileResult; const settings = settingsResult?.data?.profileSettings || {}; session.updateUser(user); fill({ ...settings, ...user }); profileForm.hidden = true; notify("Profile saved."); } catch (error) { notify(error.message, true); } });
  document.querySelector("#password-form").addEventListener("submit", async event => { const form = event.currentTarget; event.preventDefault(); const values = Object.fromEntries(new FormData(form)); if (values.password !== values.password_confirmation) return notify("New passwords do not match.", true); try { await api.profile.password(values); form.reset(); notify("Password updated."); } catch (error) { notify(error.message, true); } });
}
