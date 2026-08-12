import { defineConfig } from "vite";
import { resolve } from "node:path";

const pages = ["login", "register", "verify-email", "forgot-password", "reset-password", "dashboard", "trips", "trip-details", "hotels", "hotel-details", "hotel-booking", "compare", "favourites", "bookings", "payments", "planner", "joy", "profile", "album", "interests", "settings", "countries", "restaurants", "flights", "flight-details", "flight-booking", "reviews", "contact", "notifications", "admin", "admin-users", "admin-create-trip", "admin-interests", "admin-complaints", "admin-reviews", "admin-revenue", "admin-settings"];

export default defineConfig({
  server: { host: "0.0.0.0" },
  build: { rollupOptions: { input: { home: resolve("index.html"), ...Object.fromEntries(pages.map(page => [page, resolve(`pages/${page}.html`)])) } } }
});
