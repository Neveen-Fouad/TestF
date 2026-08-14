import { api } from "../shared/api.js";
import { mountNavigation, notify } from "../shared/navigation.js";

mountNavigation("contact");

const form = document.querySelector("#contact-form");
const description = form.querySelector("[name=description]");
const count = form.querySelector("[data-count]");

description.addEventListener("input", () => { count.textContent = description.value.length; });

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  try {
    await api.contact(Object.fromEntries(new FormData(form)));
    form.reset();
    count.textContent = "0";
    notify("Your message is on its way. We’ll be in touch soon.");
  } catch (error) {
    notify(error.message, true);
  }
});
