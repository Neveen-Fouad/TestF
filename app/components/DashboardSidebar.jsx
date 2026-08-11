const entries = [
  ["Overview", "overview", "⌂"], ["Explore", "explore", "⌕"], ["Countries", "countries", "◍"],
  ["Hotels", "hotels", "▦"], ["Create a trip", "planner", "✦"],
  ["My trips", "trips", "☷"], ["Favourites", "favorites", "♡"], ["Bookings", "bookings", "▣"],
  ["Payments", "payments", "$"], ["Reviews", "reviews", "★"],
  ["Profile", "profile", "◉"], ["Contact us", "contact", "✉"]
];

export function DashboardSidebar({ view, onNavigate }) {
  return <aside className="sidebar"><p className="sidebarLabel">YOUR TRAVEL SPACE</p>{entries.map(([label, target, icon]) => <button className={view === target ? "sideActive" : ""} onClick={() => onNavigate(target)} key={label}><span>{icon}</span>{label}</button>)}</aside>;
}
