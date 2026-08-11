export const viewPaths = {
  home: "/",
  overview: "/overview",
  explore: "/explore",
  countries: "/countries",
  map: "/map",
  compare: "/compare",
  hotels: "/hotels",
  restaurants: "/restaurants",
  flights: "/flights",
  planner: "/create-trip",
  trips: "/trips",
  favorites: "/favorites",
  bookings: "/bookings",
  payments: "/payments",
  reviews: "/reviews",
  notifications: "/notifications",
  joy: "/joy",
  profile: "/profile",
  contact: "/contact",
  login: "/login",
  register: "/create-account",
  forgot: "/forgot-password",
  reset: "/reset-password",
  verify: "/verify-email",
  admin: "/admin",
  "admin-users": "/admin/users",
  "admin-trips": "/admin/trips",
  "admin-interests": "/admin/interests",
  "admin-reviews": "/admin/reviews",
  "admin-messages": "/admin/messages",
  "admin-settings": "/admin/settings",
};

const pathViews = Object.fromEntries(
  Object.entries(viewPaths).map(([view, path]) => [path, view]),
);

const aliases = {
  "/favourites": "favorites",
  "/planner": "planner",
  "/register": "register",
  "/signin": "login",
};

export function viewFromPath(pathname) {
  const normalized =
    pathname === "/" ? "/" : `/${pathname.split("/").filter(Boolean).join("/")}`;

  return pathViews[normalized] ?? aliases[normalized] ?? "home";
}
