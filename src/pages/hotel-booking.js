import { api } from "../shared/api.js";
import { mountNavigation, notify, requireLogin } from "../shared/navigation.js";

mountNavigation("hotels");
if (requireLogin()) {
  const form = document.querySelector("#booking-form");
  form.elements.hotel_id.value = new URLSearchParams(location.search).get("id") || "";
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      values.guests = Number(values.guests);
      values.rooms = Number(values.rooms);
      const result = await api.hotels.book(values);
      const booking = result?.data || result;
      location.assign(`/pages/payments.html?booking_id=${encodeURIComponent(booking.id || booking.booking_id || "")}`);
    } catch (error) {
      notify(error.message, true);
      button.disabled = false;
    }
  });
}
