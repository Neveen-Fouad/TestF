import { api, session } from "../shared/api.js";
import { mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("profile");
  const profileForm = document.querySelector("#profile-form"); const status = document.querySelector("#profile-status");
  const fill = user => ["first_name", "last_name", "email", "phone", "birth_date"].forEach(key => { if (profileForm.elements[key]) profileForm.elements[key].value = user?.[key] || user?.client?.[key] || ""; });
  fill(session.user());
  try { const payload = await api.profile.get(); fill(payload?.data || payload); } catch { status.textContent = "Using the details saved for this session."; }
  profileForm.addEventListener("submit", async event => { event.preventDefault(); try { const result = await api.profile.update(Object.fromEntries(new FormData(profileForm))); const user = result?.data?.user || result?.user || result?.data; session.updateUser(user); status.textContent = "Saved"; notify("Profile saved."); } catch (error) { notify(error.message, true); } });
  document.querySelector("#password-form").addEventListener("submit", async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); if (values.password !== values.password_confirmation) return notify("New passwords do not match.", true); try { await api.profile.password(values); event.currentTarget.reset(); notify("Password updated."); } catch (error) { notify(error.message, true); } });
}
