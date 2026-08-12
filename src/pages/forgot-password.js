import { api } from "../shared/api.js";
import { mountNavigation, notify } from "../shared/navigation.js";
mountNavigation();
document.querySelector("#forgot-form").addEventListener("submit", async event => { event.preventDefault(); const button = event.submitter; button.disabled = true; try { await api.auth.forgot(new FormData(event.currentTarget).get("email")); event.currentTarget.reset(); notify("Check your email for a password reset link."); } catch (error) { notify(error.message, true); } finally { button.disabled = false; } });
