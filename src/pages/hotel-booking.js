import { api } from "../shared/api.js";
import { getHotelId } from "../shared/hotels.js";
import { mountNavigation, notify, requireLogin } from "../shared/navigation.js";
import { constrainDateRange } from "../shared/forms.js";

mountNavigation("hotels");
if (requireLogin()) {
  const form = document.querySelector("#booking-form");
  let selectedHotel = null;
  try { selectedHotel = JSON.parse(sessionStorage.getItem("journovo_selected_hotel") || "null"); } catch {}
  const hotelId = getHotelId(new URLSearchParams(location.search).get("id"))
    || getHotelId(sessionStorage.getItem("journovo_selected_hotel_id"))
    || getHotelId(selectedHotel);
  if (!hotelId) {
    form.hidden = true;
    form.insertAdjacentHTML("beforebegin", '<div class="panel empty">This booking link does not include a valid hotel ID. <a class="text-action" href="/pages/hotels.html">Search hotels again</a></div>');
  } else {
    constrainDateRange(form, "check_in_date", "check_out_date");
    form.elements.hotel_id.value = hotelId;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      try {
        const values = Object.fromEntries(new FormData(form));
        values.hotel_id = hotelId;
        values.guests = Number(values.guests);
        values.rooms = Number(values.rooms);
        const result = await api.hotels.book(values);
        const booking = result?.data || result;
        location.assign(`/pages/payments?booking_id=${encodeURIComponent(booking.id || booking.booking_id || "")}`);
      } catch (error) {
        notify(error.message, true);
        button.disabled = false;
      }
    });
  }
}
