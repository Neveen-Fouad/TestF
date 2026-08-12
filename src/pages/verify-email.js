import { api, session } from "../shared/api.js";
import { mountNavigation, notify } from "../shared/navigation.js";

mountNavigation();
const params = new URLSearchParams(location.search); const message = document.querySelector("#verification-message"); const resend = document.querySelector("#resend");
const id = params.get("id"); const hash = params.get("hash");
if (id && hash) {
  const signed = new URLSearchParams(); ["expires", "signature"].forEach(key => { if (params.get(key)) signed.set(key, params.get(key)); });
  message.textContent = "Verifying your email…";
  try { const result = await api.auth.verifyEmail(id, hash, signed.toString()); message.textContent = result.message || "Your email is verified. You can now sign in."; document.querySelector("#verification-actions").innerHTML = '<a class="button" href="/pages/login.html">Sign in to Journovo</a>'; }
  catch (error) { message.textContent = error.message || "This verification link is no longer valid."; if (session.isLoggedIn()) resend.hidden = false; }
} else if (session.isLoggedIn()) resend.hidden = false;
resend.addEventListener("click", async () => { resend.disabled = true; try { const result = await api.auth.resendVerification(); message.textContent = result.message || "A new verification email is on its way."; notify("Verification email sent."); } catch (error) { notify(error.message, true); } finally { resend.disabled = false; } });
