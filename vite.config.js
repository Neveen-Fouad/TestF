import { defineConfig } from "vite";
import { resolve } from "node:path";

const pages = ["login", "register", "verify-email", "dashboard", "trips", "trip-details", "hotels", "compare", "favourites", "bookings", "payments", "planner", "joy", "profile", "album", "countries", "restaurants", "flights", "reviews", "contact", "notifications", "admin", "explore"];

export default defineConfig({
  server: { host: "0.0.0.0" },
  build: { rollupOptions: { input: { home: resolve("index.html"), ...Object.fromEntries(pages.map(page => [page, resolve(`pages/${page}.html`)])) } } }
});
