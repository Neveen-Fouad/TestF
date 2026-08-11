import { Brand } from "./Brand";
export { viewFromPath, viewPaths } from "@/app/lib/routes";

const links = [
  ["Explore", "explore"],
  ["Map", "map"],
  ["Hotels", "hotels"],
  ["Restaurants", "restaurants"],
  ["Flights", "flights"],
  ["Plan a trip", "planner"],
];

export function AppNav({
  view,
  onNavigate,
  onNotify,
  authenticated = false,
  isAdmin = false,
  onLogout = () => {},
}) {
  return (
    <header className="topNav">
      <Brand onClick={() => onNavigate("home")} />
      <nav>
        {links.map(([label, target]) => (
          <button
            key={target}
            className={view === target ? "navActive" : ""}
            onClick={() => onNavigate(target)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="navActions">
        <button className="joyNavButton" onClick={() => onNavigate("joy")}>
          ✦ Joy
        </button>
        <button
          className="notificationButton"
          onClick={onNotify}
          aria-label="Open notifications"
          title="Notifications"
        >
          <span aria-hidden="true">🔔</span>
          <i aria-hidden="true" />
        </button>
        {isAdmin && (
          <button
            className="adminNavButton"
            onClick={() => onNavigate("admin")}
          >
            ⚙ Admin
          </button>
        )}
        {authenticated ? (
          <>
            <button
              className="signInButton"
              onClick={() => onNavigate("profile")}
            >
              Profile
            </button>
            <button className="primaryButton smallButton" onClick={onLogout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              className="signInButton"
              onClick={() => onNavigate("login")}
            >
              Sign in
            </button>
            <button
              className="primaryButton smallButton"
              onClick={() => onNavigate("register")}
            >
              Create account
            </button>
          </>
        )}
      </div>
    </header>
  );
}
