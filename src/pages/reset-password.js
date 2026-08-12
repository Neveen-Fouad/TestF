import { api } from "../shared/api.js";
import { mountNavigation, notify } from "../shared/navigation.js";
mountNavigation();
const form = document.querySelector("#reset-form"); const params = new URLSearchParams(location.search); form.elements.token.value = params.get("token") || ""; form.elements.email.value = params.get("email") || "";
form.addEventListener("submit", async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); if (values.password !== values.password_confirmation) return notify("Passwords do not match.", true); const button = event.submitter; button.disabled = true; try { await api.auth.reset(values); notify("Password reset. You can now sign in."); setTimeout(() => location.assign("/pages/login.html"), 700); } catch (error) { notify(error.message, true); button.disabled = false; } });
