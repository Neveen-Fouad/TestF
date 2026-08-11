"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import { AppNav } from "./AppNav";
import { viewFromPath, viewPaths } from "@/app/lib/routes";
import { DashboardSidebar } from "./DashboardSidebar";
import { DestinationCard } from "./DestinationCard";
import {
  destinations,
  mapCountries,
} from "@/app/data/destinations";
import { api, ApiError, jwtRole, jwtSubject } from "@/app/lib/api";
import {
  AdminPage,
  ContactPage,
  CountriesPage,
  FlightsPage,
  HotelsPage,
  JoyPage,
  OverviewPage,
  PaymentsPage,
  RestaurantsPage,
  TripPlannerPage,
  TripsPage,
} from "./PlatformPages";

const icon = (name) =>
  name === "Beach" ? "☀" : name === "City" ? "⌘" : "✦";

function roleFromResponse(response) {
  if (!response || typeof response !== "object") return null;
  const root = response;
  const data =
    root.data && typeof root.data === "object"
      ? root.data
      : {};
  const user =
    data.user && typeof data.user === "object"
      ? data.user
      : {};
  const profile =
    data.profile && typeof data.profile === "object"
      ? data.profile
      : {};
  const role = root.role ?? data.role ?? user.role ?? profile.role;
  return typeof role === "string" ? role.toLowerCase() : null;
}

export function VamoraApp({ initialPath = "/" }) {
  const [view, setView] = useState(() => viewFromPath(initialPath));
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState(destinations[0]);
  const [filter, setFilter] = useState("All");
  const [mapCountry, setMapCountry] = useState(mapCountries[1]);
  const [toast, setToast] = useState(null);
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem("vamora_token");
    setToken(storedToken);
    setUserRole(jwtRole(storedToken));
    if (storedToken) {
      api.profile
        .get(storedToken)
        .then((response) => {
          const role = roleFromResponse(response);
          if (role) setUserRole(role);
        })
        .catch(() => {});
    }

    const handleHistoryNavigation = () => {
      setView(viewFromPath(window.location.pathname));
      window.scrollTo({ top: 0 });
    };

    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, []);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };
  const navigate = (target) => {
    const nextPath = viewPaths[target];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ view: target }, "", nextPath);
    }
    setView(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleSaved = (name) =>
    setSaved((items) =>
      items.includes(name)
        ? items.filter((item) => item !== name)
        : [...items, name],
    );
  const selectDestination = (destination) => {
    setSelected(destination);
    navigate("bookings");
    notify(`${destination.name} is ready to book.`);
  };
  const authenticated = (nextToken, responseRole) => {
    window.localStorage.setItem("vamora_token", nextToken);
    setToken(nextToken);
    setUserRole(responseRole ?? jwtRole(nextToken));
    api.profile
      .get(nextToken)
      .then((response) => {
        const role = roleFromResponse(response);
        if (role) setUserRole(role);
      })
      .catch(() => {});
    navigate("overview");
    notify("Welcome to Vamora — you are signed in.");
  };
  const logout = async () => {
    try {
      if (token) await api.auth.logout(token);
    } catch {
    } finally {
      window.localStorage.removeItem("vamora_token");
      setToken(null);
      setUserRole(null);
      navigate("home");
      notify("You have been signed out.");
    }
  };
  const authViews = ["login", "register", "forgot", "reset", "verify"];
  const adminViews = [
    "admin",
    "admin-users",
    "admin-trips",
    "admin-interests",
    "admin-reviews",
    "admin-messages",
    "admin-settings",
  ];
  const isAdmin = userRole === "admin";

  return (
    <main className="appRoot">
      {authViews.includes(view) ? (
        <AuthPage
          type={view}
          onNavigate={navigate}
          notify={notify}
          token={token}
          onAuthenticated={authenticated}
        />
      ) : (
        <>
          <AppNav
            view={view}
            onNavigate={navigate}
            onNotify={() => navigate("notifications")}
            authenticated={Boolean(token)}
            isAdmin={isAdmin}
            onLogout={logout}
          />
          {view === "home" ? (
            <Home
              onNavigate={navigate}
              onSelect={selectDestination}
              saved={saved}
              onToggleSave={toggleSaved}
            />
          ) : (
            <div className="dashboardLayout">
              <DashboardSidebar view={view} onNavigate={navigate} />
              <section className="dashboardContent">
                {view === "overview" && (
                  <OverviewPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "explore" && (
                  <Explore
                    filter={filter}
                    setFilter={setFilter}
                    saved={saved}
                    onToggleSave={toggleSaved}
                    onSelect={selectDestination}
                  />
                )}
                {view === "countries" && (
                  <CountriesPage notify={notify} onNavigate={navigate} />
                )}
                {view === "map" && (
                  <ExploreMap country={mapCountry} onCountry={setMapCountry} />
                )}
                {view === "compare" && (
                  <Compare onSelect={selectDestination} onNavigate={navigate} />
                )}
                {view === "hotels" && (
                  <HotelsPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "restaurants" && (
                  <RestaurantsPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "flights" && (
                  <FlightsPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "planner" && (
                  <TripPlannerPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "trips" && (
                  <TripsPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "favorites" && (
                  <Favorites
                    saved={saved}
                    onToggleSave={toggleSaved}
                    onSelect={selectDestination}
                    onNavigate={navigate}
                    token={token}
                    notify={notify}
                  />
                )}
                {view === "bookings" && (
                  <Bookings
                    destination={selected}
                    notify={notify}
                    token={token}
                    onNavigate={navigate}
                  />
                )}
                {view === "payments" && (
                  <PaymentsPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "reviews" && (
                  <Reviews
                    notify={notify}
                    token={token}
                    onNavigate={navigate}
                  />
                )}
                {view === "notifications" && (
                  <Notifications
                    notify={notify}
                    token={token}
                    onNavigate={navigate}
                  />
                )}
                {view === "joy" && (
                  <JoyPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {view === "profile" && (
                  <Profile notify={notify} token={token} />
                )}
                {view === "contact" && (
                  <ContactPage
                    notify={notify}
                    onNavigate={navigate}
                    token={token}
                  />
                )}
                {adminViews.includes(view) &&
                  (isAdmin ? (
                    <AdminPage
                      section={view}
                      notify={notify}
                      onNavigate={navigate}
                      token={token}
                    />
                  ) : (
                    <section className="panel adminRestricted">
                      <span>🔒</span>
                      <h1>Admin access only</h1>
                      <p>This area is available only to authenticated admin accounts.</p>
                      <button
                        className="primaryButton"
                        onClick={() => navigate(token ? "overview" : "login")}
                      >
                        {token ? "Return to overview" : "Sign in"}
                      </button>
                    </section>
                  ))}
              </section>
            </div>
          )}
        </>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}

function Home({ onNavigate, onSelect, saved, onToggleSave }) {
  return (
    <div className="homeRestore">
      <section className="hero">
        <div className="heroContent">
          <div>
            <p className="eyebrow">Travel, made personal</p>
            <h1>
              Your next story starts <em>here.</em>
            </h1>
            <p>
              Explore handpicked journeys or let Joy create a trip that fits
              your time, taste and budget.
            </p>
            <div className="heroSearch">
              <input
                aria-label="Search destination"
                placeholder="Where do you want to go?"
              />
              <button
                className="primaryButton"
                onClick={() => onNavigate("explore")}
              >
                Explore trips →
              </button>
            </div>
          </div>
          <div className="journeyCard">
            <small>YOUR NEXT ESCAPE</small>
            <div className="route">
              <span>CAI</span>
              <b>✈</b>
              <span>IST</span>
            </div>
            <h3>Istanbul City Escape</h3>
            <div className="homeTripMeta">
              <span>5 Days</span>
              <span>•</span>
              <span>From $620</span>
              <span>•</span>
              <span>4.9 ★</span>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">Start exploring</p>
            <h2>Ready trips for you</h2>
          </div>
          <button className="textButton" onClick={() => onNavigate("explore")}>
            View all trips →
          </button>
        </div>
        <div className="destinationGrid">
          {destinations.map((destination) => (
            <DestinationCard
              key={destination.name}
              destination={destination}
              saved={saved.includes(destination.name)}
              onToggleSave={() => onToggleSave(destination.name)}
              onSelect={() => onSelect(destination)}
            />
          ))}
        </div>
      </section>
      <section className="howSection">
        <div className="howCard">
          <div className="sectionTitle">
            <div>
              <p className="eyebrow">Simple by design</p>
              <h2>Plan your way</h2>
            </div>
            <span className="pill">FROM IDEA TO ITINERARY</span>
          </div>
          <div className="steps">
            {[
              [
                "1",
                "Choose your destination",
                "Browse ready trips or tell us where, when and how you want to travel.",
              ],
              [
                "2",
                "Joy builds your plan",
                "Get hotels, restaurants, flights and a daily itinerary within your budget.",
              ],
              [
                "3",
                "Make it yours",
                "Compare options, save favourites, then book only what you want.",
              ],
            ].map(([number, title, text]) => (
              <div className="step" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="homeFooter">
        © 2026 Vamora. Make every journey yours.
      </footer>
    </div>
  );
}

function Explore({ filter, setFilter, saved, onToggleSave, onSelect }) {
  const options = ["All", "Beach", "City", "Adventure"];
  return (
    <div>
      <PageHeading
        eyebrow="Find your next story"
        title="Explore trips"
        copy="Choose a destination, compare what matters, and let Vamora handle the details."
      />
      <div className="filters">
        {options.map((option) => (
          <button
            key={option}
            className={filter === option ? "filterActive" : ""}
            onClick={() => setFilter(option)}
          >
            {icon(option)} {option}
          </button>
        ))}
      </div>
      <div className="destinationGrid">
        {(filter === "All"
          ? destinations
          : destinations.filter((item) => item.style === filter)
        ).map((destination) => (
          <DestinationCard
            key={destination.name}
            destination={destination}
            saved={saved.includes(destination.name)}
            onToggleSave={() => onToggleSave(destination.name)}
            onSelect={() => onSelect(destination)}
          />
        ))}
      </div>
    </div>
  );
}

const mapDetails = {
  Turkey: {
    view: [39, 35],
    zoom: 5,
    places: [
      ["Hagia Sophia", 41.0086, 28.9802, "Historic landmark · Istanbul"],
      ["Cappadocia", 38.6431, 34.8289, "Sunrise balloons · Nevşehir"],
      ["Old Town Antalya", 36.8841, 30.7045, "Coastal old town"],
      ["Ephesus", 37.939, 27.3411, "Ancient city · Selçuk"],
      ["Pamukkale", 37.9259, 29.1257, "Terraces & thermal pools"],
    ],
  },
  Egypt: {
    view: [26.8, 30.8],
    zoom: 5,
    places: [
      ["Pyramids of Giza", 29.9792, 31.1342, "Ancient wonder · Giza"],
      ["Khan el-Khalili", 30.0478, 31.2625, "Historic market · Cairo"],
      ["Luxor Temple", 25.6995, 32.6391, "Temple complex · Luxor"],
      ["Hurghada Marina", 27.2579, 33.8129, "Red Sea escape"],
      ["Siwa Oasis", 29.2032, 25.5195, "Desert oasis · Matrouh"],
    ],
  },
  Greece: {
    view: [39.1, 22.9],
    zoom: 6,
    places: [
      ["Acropolis of Athens", 37.9715, 23.7267, "Ancient citadel · Athens"],
      ["Oia, Santorini", 36.4618, 25.3753, "Clifftop sunsets"],
      ["Meteora", 39.7217, 21.6305, "Monasteries on rock pillars"],
      ["Plaka", 37.9741, 23.7278, "Cafés & local streets"],
      ["Navagio Beach", 37.8593, 20.6241, "Iconic beach · Zakynthos"],
    ],
  },
  Indonesia: {
    view: [-2.5, 118],
    zoom: 4,
    places: [
      ["Ubud", -8.5069, 115.2625, "Rice terraces · Bali"],
      ["Komodo National Park", -8.5638, 119.4835, "Island adventure"],
      ["Nusa Penida", -8.7276, 115.5444, "Cliffs & clear water"],
      ["Gili Trawangan", -8.3514, 116.0392, "Car-free island"],
      ["Uluwatu Temple", -8.8291, 115.0849, "Oceanfront temple"],
    ],
  },
};

function ExploreMap({ country, onCountry }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markerLayers = useRef([]);
  const flightMarker = useRef(null);
  const latestCountry = useRef(country);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const drawCountry = (item) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const details = mapDetails[item.name];
    if (!L || !map || !details) return;

    markerLayers.current.forEach((layer) => layer.remove());
    markerLayers.current = [];
    flightMarker.current?.remove();
    flightMarker.current = null;
    map.setView(details.view, details.zoom, { animate: true });

    details.places.forEach((place) => {
      const [name, latitude, longitude, description] = place;
      const pin = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "vamoraPinShell",
          html: '<span class="vamoraMapPin"><i></i></span>',
          iconSize: [38, 42],
          iconAnchor: [19, 39],
        }),
      }).addTo(map);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      pin.bindPopup(
        `<div class="vamoraMapPopup"><h4>${name}</h4><p>${description}</p><a href="${mapsUrl}" target="_blank" rel="noopener">Open location ↗</a></div>`,
      );
      markerLayers.current.push(pin);
    });

    const updateFlightPrice = () => {
      flightMarker.current?.remove();
      flightMarker.current = null;
      if (map.getZoom() <= details.zoom - 1) {
        flightMarker.current = L.marker(details.view, {
          interactive: false,
          icon: L.divIcon({
            className: "flightPriceMarker",
            html: `✈ Flights from ${item.flight}`,
            iconSize: [132, 34],
            iconAnchor: [66, 17],
          }),
        }).addTo(map);
      }
    };
    map.off("zoomend");
    map.on("zoomend", updateFlightPrice);
    updateFlightPrice();
  };

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapElement.current || mapRef.current) return;
      leafletRef.current = L;
      const initial =
        mapDetails[latestCountry.current.name];
      const map = L.map(mapElement.current, { zoomControl: false }).setView(
        initial.view,
        initial.zoom,
      );
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
      drawCountry(latestCountry.current);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    latestCountry.current = country;
    drawCountry(country);
  }, [country]);

  const focusCountry = () => {
    const found = mapCountries.find((item) =>
      item.name.toLowerCase().includes(search.trim().toLowerCase()),
    );
    if (!found) {
      setMessage("Try Egypt, Turkey, Greece or Indonesia.");
      return;
    }
    setMessage("");
    onCountry(found);
  };

  return (
    <section className="mapExperience">
      <div
        ref={mapElement}
        className="realTravelMap"
        aria-label="Interactive travel map"
      />
      <div className="mapStatus">
        <b>{country.name}</b>
        <span>
          {country.places.length} traveller favourites · flights from{" "}
          {country.flight}
        </span>
      </div>
      <aside className="mapExplorerPanel">
        <p className="eyebrow">EXPLORE THE WORLD</p>
        <h1>Find your next stop</h1>
        <p>
          Search a country and discover its most-loved places, with live flight
          prices.
        </p>
        <div className="mapSearch">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") focusCountry();
            }}
            placeholder="Search a country"
            aria-label="Search a country"
          />
          <button className="primaryButton" onClick={focusCountry}>
            Search
          </button>
        </div>
        {message && <small className="mapSearchMessage">{message}</small>}
        <div className="mapCountryList">
          {mapCountries.map((item) => (
            <button
              onClick={() => {
                setMessage("");
                onCountry(item);
              }}
              className={country.name === item.name ? "countryActive" : ""}
              key={item.name}
            >
              <b>{item.name}</b>
              <span>From {item.flight}</span>
            </button>
          ))}
        </div>
        <p className="mapTip">
          ✦ Select a country to zoom in. Tap any pin to see why it belongs in
          your trip. Zoom out to see its flight price.
        </p>
      </aside>
    </section>
  );
}

function Compare({ onSelect, onNavigate }) {
  const hotels = [
    {
      name: "Azure Bay Resort",
      place: "Nusa Dua, Bali",
      image: "/bali-hero.png",
      rating: "★ 4.8 (1,284 reviews)",
      nightly: "$224",
      total: "$1,238",
      room: "Ocean View King",
      cancel: "Free until Jun 7",
      distance: "2.4 km",
      score: "Excellent 9.2",
      badge: "✿ Best overall",
    },
    {
      name: "Sunset Cove",
      place: "Uluwatu, Bali",
      image: "/istanbul-hero.png",
      rating: "★ 4.6 (892 reviews)",
      nightly: "$198",
      total: "$1,108",
      room: "Cliff Suite",
      cancel: "Non-refundable",
      distance: "4.8 km",
      score: "Excellent 8.9",
      badge: "◇ Best value",
    },
    {
      name: "Royal Garden",
      place: "Ubud, Bali",
      image: "/athens-hero.png",
      rating: "★ 4.7 (1,047 reviews)",
      nightly: "$206",
      total: "$1,180",
      room: "Garden Villa",
      cancel: "Free until Jun 8",
      distance: "1.2 km",
      score: "Exceptional 9.4",
      badge: "♛ Top rated",
    },
  ];
  return (
    <div className="compareRestore">
      <div className="compareCrumb">
        Favourites &nbsp;/&nbsp; <span>Compare</span>
      </div>
      <header className="compareHead">
        <div>
          <h1>Compare favourite hotels</h1>
          <p>Compare the stays you saved and choose the best fit.</p>
        </div>
        <button
          className="outlineButton"
          onClick={() => onNavigate("favorites")}
        >
          ← Back to favourites
        </button>
      </header>
      <button
        className="compareSearchStrip"
        onClick={() => onNavigate("favorites")}
      >
        <span>⌖ Bali, Indonesia</span>
        <span>▣ Jun 10 – Jun 15, 2026</span>
        <span>♙ 2 Guests, 1 Room</span>
        <b>♡ Edit favourites</b>
      </button>
      <section className="hotelCompareTable">
        <div className="hotelLabels">
          <div>Total for 5 nights</div>
          <div>Room type</div>
          <div>Breakfast</div>
          <div>Cancellation</div>
          <div>Distance from center</div>
          <div>Guest rating</div>
          <div className="amenityLabel">Amenities</div>
        </div>
        {hotels.map((hotel, index) => (
          <article
            className={`hotelCompareColumn ${index === 0 ? "recommended" : ""}`}
            key={hotel.name}
          >
            <div className="hotelCompareCard">
              <img src={hotel.image} alt="" />
              <h2>{hotel.name}</h2>
              <p>⌖ {hotel.place}</p>
              <span className="hotelRating">{hotel.rating}</span>
              <strong>
                {hotel.nightly} <small>/ night</small>
              </strong>
              <em>{hotel.badge}</em>
            </div>
            <div>
              <b>{hotel.total}</b>
            </div>
            <div>{hotel.room}</div>
            <div className="compareBlue">● Included</div>
            <div
              className={hotel.cancel.startsWith("Free") ? "compareBlue" : ""}
            >
              {hotel.cancel}
            </div>
            <div>{hotel.distance}</div>
            <div className="compareBlue">{hotel.score}</div>
            <div className="amenitiesRow">
              ♨ &nbsp; ♧ &nbsp; ≋ &nbsp; ▰ &nbsp; ⚉
            </div>
            <button
              className={index === 0 ? "primaryButton" : "outlineButton"}
              onClick={() => onSelect(destinations[index])}
            >
              Select {hotel.name.split(" ")[0]}
            </button>
          </article>
        ))}
      </section>
      <footer className="compareFoot">
        ♢ Prices include taxes and fees
        <button onClick={() => onNavigate("favorites")}>Clear comparison</button>
      </footer>
    </div>
  );
}

function Favorites({ saved, onToggleSave, onSelect, onNavigate, token, notify }) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState([]);
  const [liveCount, setLiveCount] = useState(null);
  const [liveItems, setLiveItems] = useState([]);
  const loadFavourites = async () => {
    if (!token) return;
    try {
      const response = await api.favourites.list(token);
      const page = response.data;
      const rows = Array.isArray(page)
        ? page
        : page &&
            typeof page === "object" &&
            Array.isArray(page.data)
          ? page.data
          : [];
      setLiveItems(rows);
      setLiveCount(rows.length);
    } catch {
      setLiveCount(null);
    }
  };
  useEffect(() => {
    loadFavourites();
  }, [token]);
  const demoItems = [
    {
      type: "Hotel",
      name: "Azure Bay Resort",
      place: "Nusa Dua, Bali",
      image: "/bali-hero.png",
      info: "★★★★★ 4.8 (1,284 reviews)",
      price: "$224 / night",
      target: 0,
      favouriteId: 0,
    },
    {
      type: "Hotel",
      name: "Sunset Cove",
      place: "Uluwatu, Bali",
      image: "/istanbul-hero.png",
      info: "★★★★★ 4.6 (892 reviews)",
      price: "$198 / night",
      target: 1,
      favouriteId: 0,
    },
    {
      type: "Trip",
      name: "7-Day Bali Escape",
      place: "Bali, Indonesia",
      image: "/bali-hero.png",
      info: "7 days · 12 activities",
      price: "From $1,460",
      target: 2,
      favouriteId: 0,
    },
    {
      type: "Hotel",
      name: "Royal Garden",
      place: "Ubud, Bali",
      image: "/athens-hero.png",
      info: "★★★★★ 4.7 (1,047 reviews)",
      price: "$206 / night",
      target: 0,
      favouriteId: 0,
    },
    {
      type: "Place",
      name: "Uluwatu Temple",
      place: "South Kuta, Bali",
      image: "/istanbul-hero.png",
      info: "Culture · Sunset views",
      price: "From $10",
      target: 1,
      favouriteId: 0,
    },
    {
      type: "Trip",
      name: "Nusa Islands Adventure",
      place: "Nusa Penida, Indonesia",
      image: "/athens-hero.png",
      info: "3 days · 8 activities",
      price: "From $620",
      target: 2,
      favouriteId: 0,
    },
  ];
  const liveCards = liveItems.map((favourite, index) => {
    const details =
      favourite.item_details && typeof favourite.item_details === "object"
        ? favourite.item_details
        : {};
    const summary =
      details.summary && typeof details.summary === "object"
        ? details.summary
        : {};
    const type = String(favourite.type ?? "trip");
    return {
      type: type[0].toUpperCase() + type.slice(1),
      name: String(
        details.name ??
          details.destination ??
          summary.name ??
          `${type} #${favourite.favouriteable_id}`,
      ),
      place: String(
        details.address ??
          details.city ??
          details.destination ??
          "Saved from Vamora",
      ),
      image: ["/bali-hero.png", "/istanbul-hero.png", "/athens-hero.png"][
        index % 3
      ],
      info: `Saved ${String(favourite.created_at ?? "").slice(0, 10)}`,
      price: details.budget
        ? `$${Number(details.budget).toLocaleString()}`
        : "View details",
      target: index % destinations.length,
      favouriteId: Number(favourite.id),
    };
  });
  const items = (liveItems.length ? liveCards : demoItems).filter(
    (item) =>
      !hidden.includes(item.name) &&
      (tab === "All" || item.type === tab.slice(0, -1)) &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="favoritesRestore">
      <header className="favoritesHero">
        <div>
          <h1>Your favourites</h1>
          <p>Everything you saved, all in one place.</p>
          <span>♡ &nbsp; {liveCount ?? 12} saved items</span>
        </div>
        <button className="primaryButton" onClick={() => onNavigate("planner")}>
          ▣ Plan a trip
        </button>
      </header>
      <section className="favoritesToolbar">
        <div className="favoritesTabs">
          {[
            ["All", 12],
            ["Hotels", 6],
            ["Trips", 3],
            ["Places", 3],
          ].map(([label, count]) => (
            <button
              className={tab === label ? "active" : ""}
              onClick={() => setTab(String(label))}
              key={label}
            >
              {label} <b>{count}</b>
            </button>
          ))}
        </div>
        <label className="favoritesSearch">
          ⌕{" "}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search favourites"
          />
        </label>
        <button className="outlineButton" onClick={() => setTab("Hotels")}>
          ☷ Filters
        </button>
        <button className="favoritesSort" onClick={() => setQuery("")}>
          Recently saved ⌄
        </button>
      </section>
      <h2 className="favoritesHeading">Saved for later</h2>
      <section className="favoritesGrid">
        {items.map((item) => (
          <article className="favoriteCard" key={item.name}>
            <div
              className="favoriteImage"
              style={{ backgroundImage: `url(${item.image})` }}
            >
              <button
                aria-label={`Remove ${item.name}`}
                onClick={async () => {
                  if (item.favouriteId && token) {
                    try {
                      await api.favourites.remove(item.favouriteId, token);
                      notify(`${item.name} removed from favourites.`);
                      await loadFavourites();
                    } catch (error) {
                      notify(
                        error instanceof ApiError
                          ? error.message
                          : "Could not remove favourite.",
                      );
                    }
                  } else {
                    setHidden((current) => [...current, item.name]);
                  }
                }}
              >
                ♥
              </button>
              <button aria-label={`More options for ${item.name}`}>•••</button>
            </div>
            <div className="favoriteBody">
              <div>
                <span>{item.type}</span>
                <h3>{item.name}</h3>
              </div>
              <p>{item.place}</p>
              <section>
                <span className={item.type === "Hotel" ? "favoriteStars" : ""}>
                  {item.info}
                </span>
                <b>{item.price}</b>
              </section>
              <footer>
                {item.type === "Hotel" && (
                  <label>
                    <input
                      type="checkbox"
                      defaultChecked={item.name !== "Royal Garden"}
                    />{" "}
                    Compare
                  </label>
                )}
                <button onClick={() => onSelect(destinations[item.target])}>
                  View {item.type.toLowerCase()}
                </button>
              </footer>
            </div>
          </article>
        ))}
      </section>
      <section className="favoritesCompareBar">
        <b>2 hotels selected</b>
        <span>
          <img src="/bali-hero.png" alt="" />
          Azure Bay Resort
        </span>
        <span>
          <img src="/istanbul-hero.png" alt="" />
          Sunset Cove
        </span>
        <button className="textButton" onClick={() => setHidden([])}>
          Clear
        </button>
        <button className="primaryButton" onClick={() => onNavigate("compare")}>
          Compare selected favourites
        </button>
      </section>
    </div>
  );
}

function Bookings({ destination, notify, token, onNavigate }) {
  const [selection, setSelection] = useState(null);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("vamora_booking_selection");
      if (stored) setSelection(JSON.parse(stored));
    } catch {
      setSelection(null);
    }
    if (token)
      api.dashboard
        .bookings(token)
        .then((response) => {
          const value = response;
          const outer = value.data;
          const bookingHistory =
            outer && !Array.isArray(outer) && typeof outer === "object"
              ? outer.bookingHistory
              : outer;
          const rows = Array.isArray(bookingHistory)
            ? bookingHistory
            : bookingHistory &&
                typeof bookingHistory === "object" &&
                Array.isArray(bookingHistory.data)
              ? bookingHistory.data
              : [];
          setHistory(rows);
        })
        .catch(() => setHistory([]));
  }, [token]);
  const createBooking = async (event) => {
    event.preventDefault();
    if (!token) {
      notify("Please sign in before booking.");
      onNavigate("login");
      return;
    }
    if (!selection) {
      notify("Select a live hotel or flight first.");
      onNavigate("hotels");
      return;
    }
    setSubmitting(true);
    try {
      const response =
        selection.kind === "hotel"
          ? await api.hotels.book(
              {
                hotel_id: Number(selection.hotel_id),
                check_in_date: selection.check_in,
                check_out_date: selection.check_out,
                guests: Number(selection.guests ?? 1),
                rooms: Number(selection.rooms ?? 1),
              },
              token,
            )
          : await api.flights.book(
              {
                itinerary: selection.itinerary,
                cabin_class: selection.cabin_class ?? "economy",
                adults: Number(selection.adults ?? 1),
                currency: selection.currency ?? "USD",
              },
              token,
            );
      const wrapped = response;
      const booking = wrapped.data ?? wrapped;
      const bookingId = Number(booking.id);
      const clientId = Number(booking.client_id) || jwtSubject(token);
      if (!bookingId || !clientId)
        throw new Error("Booking was created without payment identifiers.");
      window.localStorage.setItem("vamora_client_id", String(clientId));
      const paymentResponse = await api.payments.create(bookingId, clientId);
      window.localStorage.removeItem("vamora_booking_selection");
      notify("Booking created. Opening secure Paymob checkout…");
      if (paymentResponse.checkout_url)
        window.location.assign(paymentResponse.checkout_url);
      else onNavigate("payments");
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Booking failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const bookingName = selection?.name ?? destination.name;
  const bookingImage = selection?.image ?? destination.image;
  const bookingPrice = Number(selection?.price) || destination.price;
  return (
    <div>
      <PageHeading
        eyebrow="A few easy steps"
        title="Complete your booking"
        copy="Your selected stay is held while you complete your details."
      />
      <div className="bookingLayout">
        <article className="bookingSummary">
          <img src={bookingImage} alt="" />
          <div>
            <span>
              {selection?.kind === "flight"
                ? "Flight"
                : (selection?.place ?? destination.country)}
            </span>
            <h2>{bookingName}</h2>
            <p>
              {selection?.kind === "flight"
                ? `${selection.adults ?? 1} adults · ${selection.cabin_class ?? "economy"}`
                : `${selection?.guests ?? 2} Guests · ${selection?.rooms ?? 1} Room`}
            </p>
            <div className="priceLine">
              <span>
                {selection?.kind === "flight"
                  ? "Flight price"
                  : "Estimated stay"}
              </span>
              <b>
                {typeof selection?.price === "string"
                  ? selection.price
                  : `$${bookingPrice.toLocaleString()}`}
              </b>
            </div>
            <div className="priceLine total">
              <span>Total</span>
              <b>Confirmed by provider at checkout</b>
            </div>
          </div>
        </article>
        <form className="bookingForm" onSubmit={createBooking}>
          <h2>Guest details</h2>
          <div className="formGrid">
            <label>
              First name
              <input required placeholder="Mohand" />
            </label>
            <label>
              Last name
              <input required placeholder="Ayman" />
            </label>
            <label className="spanAll">
              Email
              <input required type="email" placeholder="you@example.com" />
            </label>
            <label className="spanAll">
              Phone number
              <input required type="tel" placeholder="+20" />
            </label>
          </div>
          <button
            className="primaryButton wideButton"
            type="submit"
            disabled={submitting || !selection}
          >
            {submitting
              ? "Creating booking…"
              : selection
                ? "Continue to Paymob →"
                : "Select a live hotel or flight first"}
          </button>
        </form>
      </div>
      <section className="dataPanel">
        <div className="panelTop">
          <h2>Booking history</h2>
          <span>{history.length} bookings</span>
        </div>
        {history.map((booking) => (
          <div className="activityRow" key={String(booking.id)}>
            <span className="activityIcon">
              {String(booking.type) === "flight" ? "✈" : "⌂"}
            </span>
            <div>
              <b>{String(booking.provider ?? booking.type ?? "Booking")}</b>
              <small>#{String(booking.id)}</small>
            </div>
            <span className="statusPill">
              {String(booking.status ?? "pending")}
            </span>
            <time>
              {String(booking.booking_date ?? booking.created_at ?? "").slice(
                0,
                10,
              )}
            </time>
          </div>
        ))}
        {token && !history.length && (
          <div className="apiInlineNotice">No previous bookings found.</div>
        )}
      </section>
    </div>
  );
}

function Reviews({ notify, token, onNavigate }) {
  const [reviews, setReviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const load = async () => {
    if (!token) return;
    try {
      const response = await api.reviews.list(token);
      setReviews(
        (Array.isArray(response.data) ? response.data : []),
      );
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : "Could not load reviews.",
      );
    }
  };
  useEffect(() => {
    load();
  }, [token]);
  const createReview = async (event) => {
    event.preventDefault();
    if (!token) {
      notify("Please sign in to write a review.");
      onNavigate("login");
      return;
    }
    setSubmitting(true);
    try {
      await api.reviews.create(new FormData(event.currentTarget), token);
      event.currentTarget.reset();
      notify("Thanks — your review was sent for moderation.");
      await load();
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : "Could not save your review.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="From travellers like you"
        title="Hotel reviews"
        copy="Real moments from recent Vamora trips."
      />
      <div className="panel reviewPanel">
        <form className="contactForm" onSubmit={createReview}>
          <label>
            Review type
            <select name="type" defaultValue="hotel">
              <option value="hotel">Hotel</option>
              <option value="restaurant">Restaurant</option>
              <option value="flight">Flight</option>
              <option value="trip">Trip</option>
            </select>
          </label>
          <label>
            Item ID
            <input
              name="reviewable_id"
              required
              placeholder="Provider item ID"
            />
          </label>
          <label>
            Rating
            <input
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.5"
              defaultValue="5"
              required
            />
          </label>
          <label className="spanAll">
            Your review
            <textarea
              name="description"
              required
              placeholder="Share your experience…"
            />
          </label>
          <label className="spanAll">
            Optional photo
            <input name="image" type="file" accept="image/png,image/jpeg" />
          </label>
          <button className="primaryButton" disabled={submitting}>
            {submitting ? "Submitting…" : "+ Submit review"}
          </button>
        </form>
        {reviews.map((review) => (
          <article className="review" key={String(review.id)}>
            <div className="avatar">
              {
                String(
                  review.user && typeof review.user === "object"
                    ? (review.user.first_name ??
                        "V")
                    : "V",
                )[0]
              }
            </div>
            <div>
              <b>{String(review.type ?? "Traveller review")}</b>
              <p className="stars">
                {"★".repeat(Math.round(Number(review.rating ?? 0)))}
              </p>
              <p>{String(review.description ?? "")}</p>
              <small>{String(review.status ?? "pending")}</small>
            </div>
          </article>
        ))}
        {token && !reviews.length && (
          <div className="apiInlineNotice">No reviews found yet.</div>
        )}
      </div>
    </div>
  );
}

function Notifications({ notify, token, onNavigate }) {
  const [read, setRead] = useState(false);
  const [notices, setNotices] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const clientId =
    typeof window !== "undefined"
      ? Number(window.localStorage.getItem("vamora_client_id")) ||
        jwtSubject(token)
      : null;
  useEffect(() => {
    if (!clientId) return;
    const request = unreadOnly
      ? api.notifications.unread(clientId)
      : api.notifications.list(clientId);
    request
      .then((response) => {
        const value = response;
        setNotices(
          (Array.isArray(value.data) ? value.data : []),
        );
      })
      .catch((error) =>
        notify(
          error instanceof ApiError
            ? error.message
            : "Could not load notifications.",
        ),
      );
  }, [clientId, unreadOnly]);
  return (
    <div>
      <PageHeading
        eyebrow="Keep up to date"
        title="Notifications"
        copy="The small details that keep your journey moving."
      />
      <section className="panel">
        {!token || !clientId ? (
          <div className="apiInlineNotice">
            Sign in to load your notifications.{" "}
            <button onClick={() => onNavigate("login")}>Sign in</button>
          </div>
        ) : (
          <button
            className="outlineButton"
            onClick={() => setUnreadOnly((value) => !value)}
          >
            {unreadOnly ? "Show all" : "Show unread only"}
          </button>
        )}
        <button
          className="textButton"
          onClick={() => {
            setRead(true);
            notify(
              "Marked as read on this screen. The backend does not expose a read endpoint yet.",
            );
          }}
        >
          Mark all as read
        </button>
        {notices.map((notice) => (
          <article
            className={`notice ${read || notice.read_at ? "noticeRead" : ""}`}
            key={String(notice.id)}
          >
            <i>{String(notice.type ?? "notice") === "booking" ? "✓" : "✦"}</i>
            <div>
              <b>{String(notice.type ?? "Notification")}</b>
              <p>{String(notice.description ?? "")}</p>
              <small>{String(notice.created_at ?? "").slice(0, 10)}</small>
            </div>
          </article>
        ))}
        {token && clientId && !notices.length && (
          <div className="apiInlineNotice">No notifications found.</div>
        )}
      </section>
    </div>
  );
}

function Profile({ notify, token }) {
  const [values, setValues] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  useEffect(() => {
    if (!token) return;
    api.profile
      .get(token)
      .then((response) => {
        const result = response;
        const profile = result.data?.profile ?? {};
        setValues({
          first_name: String(profile.first_name ?? ""),
          last_name: String(profile.last_name ?? ""),
          email: String(profile.email ?? ""),
        });
      })
      .catch((error) =>
        notify(
          error instanceof ApiError
            ? error.message
            : "Could not load your profile.",
        ),
      );
  }, [token]);
  const save = async (event) => {
    event.preventDefault();
    if (!token) {
      notify("Please sign in to update your profile.");
      return;
    }
    setSaving(true);
    try {
      await api.profile.update(values, token);
      notify("Your profile has been saved.");
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    if (!token) return;
    setPasswordSaving(true);
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      await api.profile.password(values, token);
      event.currentTarget.reset();
      notify("Password updated successfully.");
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : "Could not update password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="Your Vamora"
        title="Profile & preferences"
        copy="A few details help Joy make every recommendation feel personal."
      />
      <form className="panel profileForm" onSubmit={save}>
        <div className="formGrid">
          <label>
            First name
            <input
              value={values.first_name}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  first_name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Last name
            <input
              value={values.last_name}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  last_name: event.target.value,
                }))
              }
            />
          </label>
          <label className="spanAll">
            Email
            <input
              type="email"
              value={values.email}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <h3>Travel preferences</h3>
        {["Deals and price alerts", "Trip reminders", "Travel inspiration"].map(
          (item) => (
            <label className="preference" key={item}>
              <input type="checkbox" defaultChecked /> <span>{item}</span>
            </label>
          ),
        )}
        <button className="primaryButton" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
      <form className="panel profileForm" onSubmit={changePassword}>
        <h3>Change password</h3>
        <div className="formGrid">
          <label className="spanAll">
            Current password
            <input name="current_password" type="password" required />
          </label>
          <label>
            New password
            <input name="password" type="password" minLength={8} required />
          </label>
          <label>
            Confirm password
            <input
              name="password_confirmation"
              type="password"
              minLength={8}
              required
            />
          </label>
        </div>
        <button className="primaryButton" disabled={passwordSaving}>
          {passwordSaving ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function AuthPage({ type, onNavigate, notify, token, onAuthenticated }) {
  const [submitting, setSubmitting] = useState(false);
  if (type === "forgot" || type === "reset")
    return <RecoveryPage mode={type} onNavigate={onNavigate} notify={notify} />;
  const register = type === "register";
  const titles = {
    login: "Sign in to your journey",
    register: "Create your account",
    forgot: "Find your account",
    reset: "Choose a new password",
    verify: "Verify your email",
  };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      const response =
        type === "login"
          ? (await api.auth.login({
              email: String(values.email),
              password: String(values.password),
            }))
          : type === "register"
            ? (await api.auth.register(values))
            : await apiRequestVerification(token);
      if ((type === "login" || type === "register") && response.data?.token)
        onAuthenticated(response.data.token, roleFromResponse(response));
      else notify(response.message ?? "Request completed successfully.");
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : "Could not connect to the Laravel API.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className={`authPage auth-${type}`}>
      <div className="authVisual">
        <div className="authBrand">
          <img
            src={register ? "/vamora-logo.svg" : "/vamora-logo-light.svg"}
            alt="Vamora"
          />
        </div>
        {register ? (
          <div className="registerStory">
            <h1>Your next journey starts here</h1>
            <span>
              Create an account to save trips, compare stays, and plan with Joy.
            </span>
            <ul>
              <li>
                ✓ <b>Save your favourite places</b>
              </li>
              <li>
                ✓ <b>Build smarter itineraries</b>
              </li>
              <li>
                ✓ <b>Get personalised recommendations</b>
              </li>
            </ul>
          </div>
        ) : (
          <div>
            <p>TRAVEL, MADE PERSONAL</p>
            <h1>Every good trip starts with a feeling.</h1>
            <span>
              Vamora turns that feeling into an itinerary you can make your own.
            </span>
          </div>
        )}
      </div>
      <form
        className={`authForm ${register ? "registerForm" : ""}`}
        onSubmit={submit}
      >
        {register ? (
          <>
            <h2>{titles[type]}</h2>
            <p className="registerIntro">Start planning trips made for you.</p>
            <div className="registerFields">
              <label>
                First name
                <input name="first_name" required />
              </label>
              <label>
                Last name
                <input name="last_name" required />
              </label>
              <label className="registerEmail">
                Email
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Phone
                <input name="phone" required />
              </label>
              <label>
                Birth date
                <input name="birth_date" type="date" required />
              </label>
              <label>
                Password
                <input
                  name="password"
                  required
                  type="password"
                  placeholder="••••••••"
                />
              </label>
              <label>
                Confirm password
                <input
                  name="password_confirmation"
                  required
                  type="password"
                  placeholder="••••••••"
                />
              </label>
            </div>
            <label className="registerTerms">
              <input type="checkbox" required />
              <span>
                I agree to the <button type="button">Terms of Service</button>{" "}
                and <button type="button">Privacy Policy</button>
              </span>
            </label>
            <button className="primaryButton wideButton" type="submit">
              Create account
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">SECURE LARAVEL AUTH</p>
            <h2>{titles[type]}</h2>
            {type === "login" && (
              <label>
                Email
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="you@example.com"
                />
              </label>
            )}
            {type === "login" && (
              <label>
                Password
                <input
                  name="password"
                  required
                  type="password"
                  placeholder="••••••••"
                />
              </label>
            )}
            {type === "verify" && (
              <div className="verificationCard">
                <span>✉</span>
                <p>
                  Use the verification link sent to your email, or request a new
                  one.
                </p>
              </div>
            )}
            <button
              className="primaryButton wideButton"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Connecting…"
                : type === "login"
                  ? "Sign in"
                  : "Resend verification email"}
            </button>
            {type === "login" && (
              <button
                className="forgotLink"
                type="button"
                onClick={() => onNavigate("forgot")}
              >
                Forgot password?
              </button>
            )}
          </>
        )}
        <p className="authSwitch">
          {register
            ? "Already have an account?"
            : type === "login"
              ? "Don’t have an account?"
              : "Back to your account?"}{" "}
          <button
            type="button"
            onClick={() => onNavigate(type === "login" ? "register" : "login")}
          >
            {type === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </form>
    </section>
  );
}

async function apiRequestVerification(token) {
  if (!token)
    throw new ApiError("Sign in first to resend the verification email.", 401);
  return api.auth.resendVerification(token);
}

function RecoveryPage({ mode, onNavigate, notify }) {
  const reset = mode === "reset";
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      const response = reset
        ? await api.auth.resetPassword(values)
        : await api.auth.forgotPassword(String(values.email));
      notify(
        response.message ??
          (reset
            ? "Password reset successfully."
            : "Reset link sent successfully."),
      );
      if (reset) window.setTimeout(() => onNavigate("login"), 900);
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : "Could not connect to the Laravel API.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main
      className={`recoveryPage ${reset ? "resetRecovery" : "forgotRecovery"}`}
    >
      <section className="recoveryVisual">
        <img
          className="recoveryBrandLight"
          src="/vamora-logo-light.svg"
          alt="Vamora"
        />
        <div className="recoveryCopy">
          <p>{reset ? "A FRESH START" : "WELCOME BACK"}</p>
          <h1>
            {reset
              ? "Your next journey starts here"
              : "Every journey deserves a smooth return"}
          </h1>
          <span>
            {reset
              ? "Plan smarter, travel better, and let Joy guide the way."
              : "Tell us where to send your secure reset link."}
          </span>
          <div className="recoveryFeatures">
            {(reset
              ? [
                  "AI trip planning",
                  "Best hotel deals",
                  "Personalized journeys",
                ]
              : ["Secure access", "Quick recovery", "24/7 support"]
            ).map((feature) => (
              <b key={feature}>✓ {feature}</b>
            ))}
          </div>
        </div>
      </section>
      <section className="recoveryPanel">
        <form className="recoveryForm" onSubmit={submit}>
          <img src="/vamora-logo.svg" alt="Vamora" />
          <span className="recoveryIcon">{reset ? "⌑" : "✉"}</span>
          <h2>{reset ? "Reset your password" : "Forgot your password?"}</h2>
          <p>
            {reset
              ? "Create a strong new password for your Vamora account."
              : "No worries. Enter your email and we’ll send you a secure reset link."}
          </p>
          {reset && (
            <label>
              Reset token
              <input
                name="token"
                required
                placeholder="Enter the token from your email"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              required
              type="email"
              placeholder="you@example.com"
            />
          </label>
          {reset && (
            <>
              <label>
                New password
                <input
                  name="password"
                  required
                  type="password"
                  placeholder="At least 8 characters"
                />
              </label>
              <label>
                Confirm new password
                <input
                  name="password_confirmation"
                  required
                  type="password"
                  placeholder="Repeat your new password"
                />
              </label>
              <div className="passwordRules">
                <b>Your password should include:</b>
                <span>✓ At least 8 characters</span>
                <span>✓ Uppercase, lowercase and a number</span>
              </div>
            </>
          )}
          <button
            className="primaryButton wideButton"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Connecting…"
              : reset
                ? "Reset password"
                : "Send reset link"}
          </button>
          <button
            className="recoveryBack"
            type="button"
            onClick={() => onNavigate("login")}
          >
            ← Back to sign in
          </button>
          {!reset && (
            <>
              <aside className="recoveryNotice">
                <b>Check your inbox</b>
                <span>
                  The link will be valid for a limited time for your security.
                </span>
              </aside>
              <button
                className="recoveryTokenLink"
                type="button"
                onClick={() => onNavigate("reset")}
              >
                Already have a reset token? Reset password
              </button>
            </>
          )}
          {reset && (
            <small className="recoveryNote">
              Your password is encrypted and never shared with travel partners.
            </small>
          )}
        </form>
      </section>
    </main>
  );
}

function PageHeading({ eyebrow, title, copy }) {
  return (
    <header className="pageHeading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}
function EmptyState({ title, text }) {
  return (
    <div className="emptyState">
      <span>♡</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
