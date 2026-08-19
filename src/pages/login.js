import { api, session } from "../shared/api.js";
import { mountNavigation, notify, safeLocalPath } from "../shared/navigation.js";

mountNavigation();

document.querySelector("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const result = await api.auth.login(Object.fromEntries(new FormData(event.currentTarget)));
    session.save(result);

    try {
      const profilePayload = await api.profile.get();
      const profile = profilePayload?.data?.profile || profilePayload?.data || profilePayload;
      session.updateUser(profile);
    } catch {}

    const requested = safeLocalPath(new URLSearchParams(location.search).get("returnTo"));
    const destination = session.isAdmin() ? "/pages/admin.html" : (requested || "/");
    location.assign(destination);
  } catch (error) {
    session.clear();
    notify(error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
});
