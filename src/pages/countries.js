import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation } from "../shared/navigation.js";

mountNavigation("explore");

const form = document.querySelector("#explore-form");
const countrySelect = document.querySelector("#country-select");
const cityInput = document.querySelector("#explore-city");
const target = document.querySelector("#attractions");
const weatherPanel = document.querySelector("#weather");
const cityPillsContainer = document.querySelector("#city-pills");
const mapMetaBadge = document.querySelector("#map-meta-badge");
const mapMetaCount = document.querySelector("#map-meta-count");

const transitToolbar = document.querySelector("#transit-toolbar");
const transitOriginLabel = document.querySelector("#transit-origin-label");
const btnOriginCity = document.querySelector("#btn-origin-city");
const btnOriginGps = document.querySelector("#btn-origin-gps");

const mapElement = document.querySelector("#attraction-map");
if (mapElement) mapElement.setAttribute("role", "region");

// Initialize map centered over Egypt / MENA
const map = window.L.map("attraction-map", {
  zoomControl: true,
  scrollWheelZoom: true,
}).setView([26.8206, 30.8025], 5);

const markersLayer = window.L.layerGroup().addTo(map);
const routeLayer = window.L.layerGroup().addTo(map);
const markerMap = new Map();

let currentOriginPoint = [30.0444, 31.2357];
let currentOriginName = "City Center";
let originMarker = null;

window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

const PAGE_SIZE = 10;
let attractions = [];
let mappedCount = 0;
let currentPage = 1;
let activeAttractionIndex = null;

// Real Landmark Coordinates for Egypt
const EGYPT_LANDMARKS = [
  // Giza & Ancient Cairo
  {
    keywords: ["giza pyramid", "pyramids of giza", "khufu", "cheops", "khephren", "mykerinos", "great pyramid", "giza plateau"],
    lat: 29.9792,
    lng: 31.1342,
    name: "Giza Pyramids Plateau",
    photo: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Wonder"
  },
  {
    keywords: ["sphinx", "great sphinx"],
    lat: 29.9753,
    lng: 31.1376,
    name: "The Great Sphinx of Giza",
    photo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=600&q=80",
    category: "Historical Landmark"
  },
  {
    keywords: ["saqqara", "sakkara", "step pyramid", "djoser"],
    lat: 29.8713,
    lng: 31.2165,
    name: "Saqqara Step Pyramid of Djoser",
    photo: "https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=600&q=80",
    category: "Archaeological Site"
  },
  {
    keywords: ["dahshur", "dahshoor", "bent pyramid", "red pyramid"],
    lat: 29.8088,
    lng: 31.2062,
    name: "Dahshur Royal Necropolis",
    photo: "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=600&q=80",
    category: "Pyramid Complex"
  },
  {
    keywords: ["memphis", "mit rahina"],
    lat: 29.8497,
    lng: 31.2536,
    name: "Ancient Memphis Open Air Museum",
    photo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Capital"
  },
  {
    keywords: ["grand egyptian museum", "gem"],
    lat: 29.9947,
    lng: 31.1197,
    name: "Grand Egyptian Museum (GEM)",
    photo: "https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=600&q=80",
    category: "Museum"
  },

  // Central Cairo & Islamic/Coptic Cairo
  {
    keywords: ["egyptian museum", "tahrir", "museum of egyptian antiquities"],
    lat: 30.0478,
    lng: 31.2336,
    name: "The Egyptian Museum in Tahrir",
    photo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=80",
    category: "Museum"
  },
  {
    keywords: ["national museum of egyptian civilization", "nmec", "fustat"],
    lat: 30.0076,
    lng: 31.2494,
    name: "National Museum of Egyptian Civilization (NMEC)",
    photo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=600&q=80",
    category: "Museum"
  },
  {
    keywords: ["khan el khalili", "khan el-khalili", "khalili", "bazaar", "khan"],
    lat: 30.0477,
    lng: 31.2623,
    name: "Khan El Khalili Historic Bazaar",
    photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80",
    category: "Cultural Market"
  },
  {
    keywords: ["al-muizz", "al muizz", "el moez", "moez street"],
    lat: 30.0514,
    lng: 31.2612,
    name: "Al-Muizz Historic Street",
    photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80",
    category: "Historic Architecture"
  },
  {
    keywords: ["citadel", "saladin", "muhammad ali mosque", "mohamed ali mosque"],
    lat: 30.0299,
    lng: 31.2611,
    name: "Cairo Citadel & Mosque of Muhammad Ali",
    photo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=80",
    category: "Historic Fortress"
  },
  {
    keywords: ["coptic", "hanging church", "babylon fortress", "sergius", "bacchus", "coptic cairo"],
    lat: 30.0053,
    lng: 31.2301,
    name: "Coptic Cairo & The Hanging Church",
    photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80",
    category: "Historic Heritage"
  },
  {
    keywords: ["sufi", "tanoura", "ghouri", "wekalet el ghouri"],
    lat: 30.0461,
    lng: 31.2605,
    name: "Wekalet El Ghouri Tanoura & Sufi Show",
    photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80",
    category: "Live Performance"
  },
  {
    keywords: ["felucca", "dinner cruise", "nile river", "nile cruise", "pharaoh cruise", "sailing"],
    lat: 30.0385,
    lng: 31.2295,
    name: "Nile River Sailing & Dinner Cruise",
    photo: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80",
    category: "River Experience"
  },
  {
    keywords: ["cairo tower", "zamalek"],
    lat: 30.0459,
    lng: 31.2243,
    name: "Cairo Tower & Zamalek Island",
    photo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=80",
    category: "Observation Deck"
  },
  {
    keywords: ["al-azhar", "azhar mosque", "azhar park"],
    lat: 30.0457,
    lng: 31.2627,
    name: "Al-Azhar Mosque & Gardens",
    photo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=80",
    category: "Sacred Heritage"
  },
  {
    keywords: ["cave church", "simon the tanner", "mokattam"],
    lat: 30.0309,
    lng: 31.2764,
    name: "The Cave Church of St. Simon",
    photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80",
    category: "Sacred Site"
  },
  {
    keywords: ["baron", "empain", "heliopolis"],
    lat: 30.0867,
    lng: 31.3303,
    name: "Baron Empain Palace",
    photo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=80",
    category: "Palace"
  },
  {
    keywords: ["cairo airport", "airport transfer"],
    lat: 30.1219,
    lng: 31.4056,
    name: "Cairo International Airport",
    photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
    category: "Transit"
  },

  // Alexandria
  {
    keywords: ["bibliotheca", "alexandria library"],
    lat: 31.2089,
    lng: 29.9092,
    name: "Bibliotheca Alexandrina",
    photo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=600&q=80",
    category: "Cultural Landmark"
  },
  {
    keywords: ["qaitbay", "citadel of qaitbay", "qaitbay fort"],
    lat: 31.2140,
    lng: 29.8856,
    name: "Citadel of Qaitbay",
    photo: "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=600&q=80",
    category: "Coastal Fortress"
  },
  {
    keywords: ["catacombs", "kom el shoqafa", "kom el shoqafa catacombs"],
    lat: 31.1786,
    lng: 29.8931,
    name: "Catacombs of Kom El Shoqafa",
    photo: "https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=600&q=80",
    category: "Necropolis"
  },
  {
    keywords: ["montaza", "montazah", "montaza palace"],
    lat: 31.2882,
    lng: 30.0161,
    name: "Montaza Palace Gardens & Royal Beach",
    photo: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80",
    category: "Royal Gardens"
  },
  {
    keywords: ["pompey", "pillar", "serapeum"],
    lat: 31.1825,
    lng: 29.8965,
    name: "Pompey's Pillar & Serapeum",
    photo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Monument"
  },
  {
    keywords: ["stanley", "stanley bridge"],
    lat: 31.2355,
    lng: 29.9497,
    name: "Stanley Bridge & Mediterranean Corniche",
    photo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=80",
    category: "Coastal Landmark"
  },

  // Luxor & Upper Egypt
  {
    keywords: ["karnak", "karnak temple", "temple of karnak"],
    lat: 25.7188,
    lng: 32.6573,
    name: "Karnak Temple Complex",
    photo: "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Temple"
  },
  {
    keywords: ["luxor temple", "temple of luxor"],
    lat: 25.6995,
    lng: 32.6396,
    name: "Luxor Temple",
    photo: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Temple"
  },
  {
    keywords: ["valley of the kings", "kings valley", "tutankhamun tomb"],
    lat: 25.7402,
    lng: 32.6014,
    name: "Valley of the Kings",
    photo: "https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=600&q=80",
    category: "Royal Tombs"
  },
  {
    keywords: ["hatshepsut", "deir el-bahari", "temple of hatshepsut"],
    lat: 25.7382,
    lng: 32.6065,
    name: "Mortuary Temple of Hatshepsut",
    photo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Temple"
  },
  {
    keywords: ["colossi", "memnon", "colossi of memnon"],
    lat: 25.7206,
    lng: 32.6105,
    name: "Colossi of Memnon",
    photo: "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Statues"
  },
  {
    keywords: ["balloon", "hot air balloon", "sunrise balloon"],
    lat: 25.7312,
    lng: 32.6150,
    name: "Luxor Sunrise Hot Air Balloon Experience",
    photo: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80",
    category: "Adventure Tour"
  },

  // Aswan & Abu Simbel
  {
    keywords: ["philae", "isis temple", "philae temple"],
    lat: 24.0253,
    lng: 32.8843,
    name: "Philae Temple of Isis",
    photo: "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=600&q=80",
    category: "Island Temple"
  },
  {
    keywords: ["high dam", "aswan dam", "aswan high dam"],
    lat: 23.9701,
    lng: 32.8776,
    name: "Aswan High Dam & Lake Nasser",
    photo: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80",
    category: "Engineering Wonder"
  },
  {
    keywords: ["abu simbel", "ramses ii", "great temple"],
    lat: 22.3372,
    lng: 31.6258,
    name: "Abu Simbel Sun Temples",
    photo: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=600&q=80",
    category: "Ancient Monument"
  },
  {
    keywords: ["nubian", "elephantine", "nubian village"],
    lat: 24.0858,
    lng: 32.8872,
    name: "Colorful Nubian Village & Elephantine Island",
    photo: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80",
    category: "Cultural Village"
  },

  // Red Sea & Sinai
  {
    keywords: ["dolphin", "giftun", "snorkelling", "hurghada dolphin", "giftun island"],
    lat: 27.1833,
    lng: 33.9167,
    name: "Giftun Island & Dolphin Watching Lagoon",
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
    category: "Marine & Snorkelling"
  },
  {
    keywords: ["hurghada marina", "marina boulevard", "marina"],
    lat: 27.2250,
    lng: 33.8410,
    name: "Hurghada Marina Boulevard",
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    category: "Waterfront Promenade"
  },
  {
    keywords: ["ras mohammed", "ras mohamed"],
    lat: 27.7280,
    lng: 34.2500,
    name: "Ras Mohammed National Marine Park",
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
    category: "Marine Sanctuary"
  },
  {
    keywords: ["naama", "sharm", "naama bay"],
    lat: 27.9158,
    lng: 34.3297,
    name: "Naama Bay Promenade",
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    category: "Beach Resort"
  },
  {
    keywords: ["st. catherine", "saint catherine", "mount sinai", "catherine monastery"],
    lat: 28.5559,
    lng: 33.9760,
    name: "Saint Catherine's Monastery & Mount Sinai",
    photo: "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=600&q=80",
    category: "Sacred UNESCO Site"
  },
  {
    keywords: ["blue hole", "dahab", "canyon dahab"],
    lat: 28.5721,
    lng: 34.5367,
    name: "Dahab Blue Hole & Coral Reefs",
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
    category: "World Dive Site"
  },

  // Western Desert & Oases
  {
    keywords: ["white desert", "black desert", "bahariya", "desert camping"],
    lat: 28.3417,
    lng: 28.8683,
    name: "White Desert & Black Desert National Park",
    photo: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80",
    category: "Desert Safari"
  },
  {
    keywords: ["siwa", "siwa oasis", "cleopatra spring", "shali fortress"],
    lat: 29.2032,
    lng: 25.5195,
    name: "Siwa Oasis & Cleopatra's Spring",
    photo: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80",
    category: "Historic Oasis"
  }
];

// Fallback City Centers for accurate geographic anchoring
const CITY_CENTERS = {
  cairo: [30.0444, 31.2357],
  giza: [29.9870, 31.1500],
  alexandria: [31.2001, 29.9187],
  luxor: [25.6872, 32.6396],
  aswan: [24.0889, 32.8998],
  hurghada: [27.2579, 33.8116],
  "sharm el sheikh": [27.9158, 34.3299],
  dahab: [28.5097, 34.5135],
  "marsa alam": [25.0744, 34.8967],
  "el gouna": [27.3942, 33.6782],
  "port said": [31.2653, 32.3019],
  suez: [29.9668, 32.5498],
  tanta: [30.7865, 31.0004],
  mansoura: [31.0409, 31.3785],
  siwa: [29.2032, 25.5195],
  istanbul: [41.0082, 28.9784],
  paris: [48.8566, 2.3522],
  rome: [41.9028, 12.4964],
  london: [51.5074, -0.1278],
  athens: [37.9838, 23.7275],
  dubai: [25.2048, 55.2708],
  barcelona: [41.3879, 2.1699],
  lisbon: [38.7223, -9.1393],
  tokyo: [35.6762, 139.6503],
  "new york": [40.7128, -74.0060],
};

// Quick city filter buttons for Egypt
const EGYPT_POPULAR_CITIES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Luxor",
  "Aswan",
  "Hurghada",
  "Sharm El Sheikh",
  "Dahab"
];

// Simple deterministic hash to scatter non-landmark attractions realistically around the city center
function hashString(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Haversine Distance & Transit fallback formula (matching backend TransportationService)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateSmartTransit(origin, destination) {
  const meters = calculateHaversineDistance(origin[0], origin[1], destination[0], destination[1]);
  const km = (meters / 1000).toFixed(1);

  // Walking: ~5 km/h (83.3 m/min)
  // Driving: ~35 km/h in city traffic (583 m/min)
  const walkMinutes = Math.max(1, Math.round(meters / 83.3));
  const driveMinutes = Math.max(2, Math.round((meters * 1.3) / 583.3));

  if (walkMinutes <= 15) {
    return {
      label: `${walkMinutes} min walk (${Math.round(meters)} m)`,
      icon: "🚶",
      mode: "walk",
      duration_minutes: walkMinutes,
      distance_meters: Math.round(meters),
      distance_km: km
    };
  }

  return {
    label: `${driveMinutes} min drive (${km} km)`,
    icon: "🚗",
    mode: "drive",
    duration_minutes: driveMinutes,
    distance_meters: Math.round(meters),
    distance_km: km
  };
}

const countryName = (country) =>
  country.name || country.country || country.title || "";
const countryCode = (country) =>
  country.code2 ||
  country.code ||
  country.country_code ||
  country.iso2 ||
  country.iso_code ||
  "";
const cityName = (city) =>
  typeof city === "string"
    ? city
    : city?.name || city?.city || city?.title || "";

// Smart Coordinate Resolver for Attractions
function resolveAttractionLocation(attraction, fallbackCity = "", fallbackCountry = "") {
  // 1. Check if direct coordinates exist
  const location =
    attraction.location ||
    attraction.coordinates ||
    attraction.geometry?.location ||
    {};
  const rawLat = attraction.latitude ?? attraction.lat ?? location.latitude ?? location.lat;
  const rawLng = attraction.longitude ?? attraction.lng ?? attraction.lon ?? location.longitude ?? location.lng ?? location.lon;

  if (rawLat != null && rawLng != null && rawLat !== "" && rawLng !== "") {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return { point: [lat, lng], landmarkMatch: null };
    }
  }

  // 2. Search Landmark dictionary by keyword
  const textToScan = `${attraction.name || ""} ${attraction.title || ""} ${attraction.description || ""} ${attraction.address || ""}`.toLowerCase();
  for (const landmark of EGYPT_LANDMARKS) {
    if (landmark.keywords.some((keyword) => textToScan.includes(keyword.toLowerCase()))) {
      return { point: [landmark.lat, landmark.lng], landmarkMatch: landmark };
    }
  }

  // 3. Fallback to City Center with a deterministic spatial offset
  const normalizedCity = fallbackCity.trim().toLowerCase();
  const center = CITY_CENTERS[normalizedCity] || CITY_CENTERS[fallbackCountry.trim().toLowerCase()];
  if (center) {
    const hash = hashString(attraction.name || attraction.title || "attraction");
    const angle = (hash % 360) * (Math.PI / 180);
    // Radius between 0.7km and 4.2km
    const radiusKm = 0.7 + ((hash >> 3) % 35) * 0.1;
    const latOffset = (radiusKm / 111) * Math.cos(angle);
    const lngOffset = (radiusKm / (111 * Math.cos(center[0] * (Math.PI / 180)))) * Math.sin(angle);
    return { point: [center[0] + latOffset, center[1] + lngOffset], landmarkMatch: null };
  }

  return { point: null, landmarkMatch: null };
}

const attractionRows = (payload) => {
  const data = payload?.data || payload || {};
  for (const key of [
    "attractions",
    "tourist_attractions",
    "places",
    "points_of_interest",
    "results",
    "Data"
  ]) {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Array.isArray(data) ? data : [];
};

function renderCityPills(selectedCountry = "") {
  if (!cityPillsContainer) return;
  const isEgypt = selectedCountry.toLowerCase().includes("egypt") || selectedCountry.toUpperCase() === "EG";
  if (!isEgypt) {
    cityPillsContainer.hidden = true;
    cityPillsContainer.innerHTML = "";
    return;
  }

  const currentCity = cityInput.value.trim().toLowerCase();
  cityPillsContainer.hidden = false;
  cityPillsContainer.innerHTML = `
    <span class="city-pills-label">Top Egypt Cities:</span>
    ${EGYPT_POPULAR_CITIES.map((c) => `
      <button type="button" class="city-pill ${c.toLowerCase() === currentCity ? "is-active" : ""}" data-city="${escapeHtml(c)}">
        ${escapeHtml(c)}
      </button>
    `).join("")}
  `;

  cityPillsContainer.querySelectorAll(".city-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      cityInput.value = btn.dataset.city;
      cityPillsContainer.querySelectorAll(".city-pill").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      loadAttractions();
    });
  });
}

function renderWeather(weather) {
  const current = weather?.current;
  if (!weatherPanel || !current) {
    if (weatherPanel) weatherPanel.hidden = true;
    return;
  }
  const condition = current.condition?.text || "";
  const icon = current.condition?.icon;
  weatherPanel.hidden = false;
  weatherPanel.innerHTML = `
    <div class="weather-now">
      <div>
        <p class="eyebrow">WEATHER</p>
        <h2>${escapeHtml(weather.location?.name || cityInput.value.trim())}${weather.location?.country ? `, ${escapeHtml(weather.location.country)}` : ""}</h2>
      </div>
      <div class="weather-current">
        ${icon ? `<img src="${icon.startsWith("//") ? "https:" + icon : icon}" alt="" width="48" height="48">` : ""}
        <strong>${escapeHtml(current.temp_c)}°C</strong>
        <span>${escapeHtml(condition)}</span>
      </div>
    </div>
    <div class="weather-meta">
      <span>Feels like ${escapeHtml(current.feelslike_c)}°C</span>
      <span>Humidity ${escapeHtml(current.humidity)}%</span>
      <span>Wind ${escapeHtml(current.wind_kph)} km/h</span>
      ${current.last_updated ? `<span>Updated ${escapeHtml(current.last_updated)}</span>` : ""}
    </div>`;
}

function createCustomPin(index, isActive = false) {
  return window.L.divIcon({
    className: "journovo-map-pin-container",
    html: `<div class="journovo-map-pin ${isActive ? "is-active" : ""}" data-index="${index}"><div class="journovo-map-pin-inner">${index + 1}</div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
}

function createOriginPin(title = "Origin") {
  return window.L.divIcon({
    className: "journovo-origin-pin-container",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#13845a;border:3px solid #fff;box-shadow:0 4px 12px rgba(19,132,90,0.4);color:#fff;font-size:16px;">📍</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function buildPopupHtml(attraction, index, point) {
  const name = attraction.name || attraction.title || "Attraction";
  const photo = attraction.photo || attraction.image || attraction.landmarkMatch?.photo || "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80";
  const rating = attraction.rating ? `★ ${attraction.rating}` : "★ 4.8";
  const price = attraction.price ? `$${attraction.price}` : "";
  const snippet = attraction.description || attraction.address || "Discover this incredible must-see location.";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${point[0]},${point[1]}`;
  const transitLabel = attraction.transit?.label || "";

  return `
    <div class="map-popup-card">
      <div class="map-popup-media">
        <img class="map-popup-img" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy">
        <span class="map-popup-rating">${escapeHtml(rating)}</span>
      </div>
      <div class="map-popup-body">
        <h4>${escapeHtml(name)}</h4>
        ${transitLabel ? `<div class="map-popup-transit">${escapeHtml(attraction.transit.icon || "🚗")} ${escapeHtml(transitLabel)} from ${escapeHtml(currentOriginName)}</div>` : ""}
        <p>${escapeHtml(snippet)}</p>
        <div class="map-popup-actions">
          <span class="map-popup-price">${escapeHtml(price ? `From ${price}` : "Free / Public Entry")}</span>
          <a class="map-popup-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Directions ↗</a>
        </div>
      </div>
    </div>
  `;
}

// Fetch or compute transportation tips using backend api.transportation.tips
async function updateTransportationRoutes(items) {
  if (!items.length || !currentOriginPoint) return;

  if (transitToolbar) {
    transitToolbar.hidden = false;
    if (transitOriginLabel) {
      transitOriginLabel.textContent = `Calculated from ${currentOriginName}`;
    }
  }

  // Build destinations payload for backend
  const destinations = items
    .map((attraction, index) => {
      if (!attraction._point) return null;
      return {
        id: String(index),
        lat: Number(attraction._point[0]),
        lng: Number(attraction._point[1])
      };
    })
    .filter(Boolean);

  if (!destinations.length) return;

  try {
    const payload = await api.transportation.tips({
      origin: { lat: currentOriginPoint[0], lng: currentOriginPoint[1] },
      destinations
    });

    const tips = payload?.data || payload || {};
    items.forEach((attraction, index) => {
      if (!attraction._point) return;
      const key = String(index);
      if (tips[key]) {
        attraction.transit = {
          label: tips[key].label || `${tips[key].duration_minutes} mins`,
          icon: tips[key].mode === "walk" || (tips[key].label || "").includes("walk") ? "🚶" : "🚗",
          duration_minutes: tips[key].duration_minutes,
          distance_meters: tips[key].distance_meters
        };
      } else {
        attraction.transit = calculateSmartTransit(currentOriginPoint, attraction._point);
      }
    });
  } catch {
    // Graceful fallback: local haversine + speed calculations
    items.forEach((attraction) => {
      if (!attraction._point) return;
      attraction.transit = calculateSmartTransit(currentOriginPoint, attraction._point);
    });
  }

  // Refresh popups with updated transit info
  markerMap.forEach((marker, index) => {
    const attraction = items[index];
    if (attraction && attraction._point) {
      marker.setPopupContent(buildPopupHtml(attraction, index, attraction._point));
    }
  });

  renderAttractionList();
}

function renderOriginMarker() {
  if (originMarker) {
    markersLayer.removeLayer(originMarker);
    originMarker = null;
  }
  if (!currentOriginPoint) return;

  originMarker = window.L.marker(currentOriginPoint, {
    icon: createOriginPin(currentOriginName),
    title: `Origin: ${currentOriginName}`,
    zIndexOffset: 500,
  }).bindPopup(`<strong>📍 Starting Point</strong><br>${escapeHtml(currentOriginName)}`);

  originMarker.addTo(markersLayer);
}

function drawRoutePolyline(destinationPoint, transitInfo) {
  routeLayer.clearLayers();
  if (!currentOriginPoint || !destinationPoint) return;

  const polyline = window.L.polyline([currentOriginPoint, destinationPoint], {
    color: "#0e6ed9",
    weight: 4,
    opacity: 0.85,
    dashArray: "6, 8",
    lineCap: "round",
  }).addTo(routeLayer);

  if (transitInfo?.label) {
    const midLat = (currentOriginPoint[0] + destinationPoint[0]) / 2;
    const midLng = (currentOriginPoint[1] + destinationPoint[1]) / 2;
    const tooltipMarker = window.L.marker([midLat, midLng], {
      icon: window.L.divIcon({
        className: "route-transit-tooltip-container",
        html: `<div style="padding:4px 8px;border-radius:99px;background:#082b61;color:#fff;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.25);">${escapeHtml(transitInfo.icon || "🚗")} ${escapeHtml(transitInfo.label)}</div>`,
        iconSize: [100, 24],
        iconAnchor: [50, 12],
      })
    }).addTo(routeLayer);
  }
}

function renderMarkers(items, currentCity = "", currentCountry = "") {
  markersLayer.clearLayers();
  routeLayer.clearLayers();
  markerMap.clear();
  mappedCount = 0;
  const locatedPoints = [];

  // Update origin point
  const normalizedCity = currentCity.toLowerCase();
  const center = CITY_CENTERS[normalizedCity] || CITY_CENTERS[currentCountry.toLowerCase()] || [30.0444, 31.2357];
  currentOriginPoint = center;
  currentOriginName = currentCity ? `Downtown ${currentCity}` : "City Center";
  renderOriginMarker();

  items.forEach((attraction, index) => {
    const { point, landmarkMatch } = resolveAttractionLocation(attraction, currentCity, currentCountry);
    if (!point) return;

    // Attach resolved metadata to attraction object
    attraction._point = point;
    attraction._resolved = true;
    attraction.transit = calculateSmartTransit(currentOriginPoint, point);

    if (landmarkMatch) {
      attraction.landmarkMatch = landmarkMatch;
      if (!attraction.photo) attraction.photo = landmarkMatch.photo;
    }
    if (!attraction.photo) {
      attraction.photo = "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80";
    }

    mappedCount += 1;
    locatedPoints.push(point);

    const marker = window.L.marker(point, {
      icon: createCustomPin(index, false),
      title: attraction.name || "Attraction",
    });

    const popupContent = buildPopupHtml(attraction, index, point);
    marker.bindPopup(popupContent, { maxWidth: 280 });

    marker.on("click", () => {
      highlightActiveAttraction(index);
    });

    marker.addTo(markersLayer);
    markerMap.set(index, marker);
  });

  if (mapMetaBadge && mapMetaCount) {
    mapMetaCount.textContent = mappedCount;
    mapMetaBadge.hidden = mappedCount === 0;
  }

  if (locatedPoints.length) {
    locatedPoints.push(currentOriginPoint);
    map.fitBounds(locatedPoints, { padding: [40, 40], maxZoom: 14 });
  } else {
    map.setView(currentOriginPoint, 11);
  }

  // Compute live backend transit tips asynchronously
  updateTransportationRoutes(items);
}

function highlightActiveAttraction(index) {
  activeAttractionIndex = index;
  // Update marker icons
  markerMap.forEach((marker, i) => {
    marker.setIcon(createCustomPin(i, i === index));
  });

  const attraction = attractions[index];
  if (attraction?._point) {
    drawRoutePolyline(attraction._point, attraction.transit);
  }

  // Highlight list card
  target.querySelectorAll(".attraction-card").forEach((card) => {
    if (Number(card.dataset.index) === index) {
      card.classList.add("is-active");
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      card.classList.remove("is-active");
    }
  });
}

function focusAttractionOnMap(index) {
  const marker = markerMap.get(index);
  const attraction = attractions[index];
  if (!marker || !attraction?._point) return;

  highlightActiveAttraction(index);
  map.flyTo(attraction._point, 14, { duration: 1.2 });
  marker.openPopup();
}

function renderAttractionList() {
  const total = attractions.length;
  if (!total) {
    target.innerHTML =
      '<div class="empty">No attractions were found for this destination. Try selecting another city!</div>';
    return;
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = attractions.slice(start, start + PAGE_SIZE);

  const cards = slice
    .map((attraction, localIndex) => {
      const globalIndex = start + localIndex;
      const name = attraction.name || attraction.title || "Attraction";
      const rating = attraction.rating ? `★ ${attraction.rating}` : "★ 4.8";
      const photo = attraction.photo || "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80";
      const desc = attraction.description || attraction.address || "A stunning highlight and must-visit experience in this vibrant destination.";
      const price = attraction.price ? `$${attraction.price}` : "Free entry";
      const category = attraction.landmarkMatch?.category || "POPULAR ATTRACTION";
      const transitLabel = attraction.transit?.label ? `${attraction.transit.icon || "🚗"} ${attraction.transit.label}` : "";

      return `
        <article class="attraction-card ${activeAttractionIndex === globalIndex ? "is-active" : ""}" data-index="${globalIndex}">
          <div class="attraction-media">
            <img class="attraction-img" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy">
            <span class="attraction-badge-top">${escapeHtml(category)}</span>
            <span class="attraction-badge-rating">${escapeHtml(rating)}</span>
            ${transitLabel ? `<span class="attraction-badge-transit">${escapeHtml(transitLabel)}</span>` : ""}
          </div>
          <div class="attraction-body">
            <p class="eyebrow">NO. 0${globalIndex + 1}</p>
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(desc)}</p>
            <div class="attraction-foot">
              <span class="attraction-price">${escapeHtml(price)}</span>
              <button class="attraction-btn-map" type="button" data-locate="${globalIndex}">
                <span>View on map</span> 📍
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const pagination =
    total > PAGE_SIZE
      ? `<div class="pagination">
        <button class="button subtle" type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>← Previous</button>
        <span>Page ${currentPage} of ${pages} · ${total} attractions</span>
        <button class="button subtle" type="button" data-page="next" ${currentPage === pages ? "disabled" : ""}>Next →</button>
      </div>`
      : "";

  target.innerHTML = cards + pagination;

  target.querySelectorAll(".attraction-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const index = Number(card.dataset.index);
      focusAttractionOnMap(index);
    });
  });

  target.querySelectorAll("[data-locate]").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = Number(button.dataset.locate);
      focusAttractionOnMap(index);
      mapElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  target.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage += button.dataset.page === "prev" ? -1 : 1;
      renderAttractionList();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// Curated top attractions if API returns empty for Egypt
function getCuratedEgyptAttractions(city = "Cairo") {
  const lowerCity = city.toLowerCase();
  if (lowerCity.includes("alexandria")) {
    return EGYPT_LANDMARKS.filter((l) => l.name.includes("Alexandria") || l.keywords.some((k) => k.includes("alexandria") || k.includes("qaitbay") || k.includes("bibliotheca")));
  }
  if (lowerCity.includes("luxor")) {
    return EGYPT_LANDMARKS.filter((l) => l.keywords.some((k) => k.includes("karnak") || k.includes("luxor") || k.includes("kings") || k.includes("hatshepsut") || k.includes("balloon") || k.includes("memnon")));
  }
  if (lowerCity.includes("aswan")) {
    return EGYPT_LANDMARKS.filter((l) => l.keywords.some((k) => k.includes("philae") || k.includes("aswan") || k.includes("abu simbel") || k.includes("nubian")));
  }
  if (lowerCity.includes("hurghada")) {
    return EGYPT_LANDMARKS.filter((l) => l.keywords.some((k) => k.includes("hurghada") || k.includes("giftun") || k.includes("dolphin")));
  }
  if (lowerCity.includes("sharm") || lowerCity.includes("sheikh")) {
    return EGYPT_LANDMARKS.filter((l) => l.keywords.some((k) => k.includes("sharm") || k.includes("ras mohammed") || k.includes("naama") || k.includes("sinai")));
  }
  // Default Cairo / Giza
  return EGYPT_LANDMARKS.slice(0, 16);
}

async function loadAttractions() {
  const option = countrySelect.selectedOptions[0];
  const selectedCountry = option?.value || "Egypt";
  const countryCodeVal = option?.dataset.code || "EG";
  const city = cityInput.value.trim() || "Cairo";

  target.innerHTML = '<div class="empty is-loading">Discovering attractions & calculating transit routes…</div>';
  markersLayer.clearLayers();
  routeLayer.clearLayers();
  currentPage = 1;
  activeAttractionIndex = null;

  renderCityPills(selectedCountry);

  try {
    let payload = null;
    try {
      payload = await api.explore.destination(city, countryCodeVal);
    } catch {
      payload = null;
    }

    renderWeather(payload?.weather);
    let items = attractionRows(payload);

    // If API returned 0 items and country is Egypt, use rich curated attractions
    if (!items.length && (selectedCountry.toLowerCase().includes("egypt") || countryCodeVal === "EG")) {
      items = getCuratedEgyptAttractions(city).map((l) => ({
        name: l.name,
        description: `Experience the breathtaking history of ${l.name}. One of Egypt's most celebrated landmarks.`,
        rating: 4.9,
        photo: l.photo,
        latitude: l.lat,
        longitude: l.lng,
        price: 20,
      }));
    }

    attractions = items;
    renderMarkers(attractions, city, selectedCountry);
    renderAttractionList();
  } catch (error) {
    renderWeather(null);
    target.innerHTML = `<div class="empty is-error">${escapeHtml(error.message || "Failed to load attractions")}</div>`;
  }
}

// Origin Switcher Event Listeners
if (btnOriginCity) {
  btnOriginCity.addEventListener("click", () => {
    btnOriginCity.classList.add("is-active");
    if (btnOriginGps) btnOriginGps.classList.remove("is-active");

    const city = cityInput.value.trim();
    const center = CITY_CENTERS[city.toLowerCase()] || [30.0444, 31.2357];
    currentOriginPoint = center;
    currentOriginName = city ? `Downtown ${city}` : "City Center";
    renderOriginMarker();
    updateTransportationRoutes(attractions);
    if (activeAttractionIndex != null && attractions[activeAttractionIndex]?._point) {
      drawRoutePolyline(attractions[activeAttractionIndex]._point, attractions[activeAttractionIndex].transit);
    }
  });
}

if (btnOriginGps) {
  btnOriginGps.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    transitOriginLabel.textContent = "Locating your GPS position...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btnOriginGps.classList.add("is-active");
        if (btnOriginCity) btnOriginCity.classList.remove("is-active");

        currentOriginPoint = [pos.coords.latitude, pos.coords.longitude];
        currentOriginName = "Your GPS Location";
        renderOriginMarker();
        updateTransportationRoutes(attractions);
        if (activeAttractionIndex != null && attractions[activeAttractionIndex]?._point) {
          drawRoutePolyline(attractions[activeAttractionIndex]._point, attractions[activeAttractionIndex].transit);
        }
      },
      () => {
        alert("Unable to retrieve your location. Please check browser permissions.");
        if (btnOriginCity) btnOriginCity.classList.add("is-active");
        if (btnOriginGps) btnOriginGps.classList.remove("is-active");
      }
    );
  });
}

countrySelect.addEventListener("change", async () => {
  const option = countrySelect.selectedOptions[0];
  if (!option?.value) return;
  cityInput.value = option.dataset.city || "";
  renderCityPills(option.value);

  try {
    const detailPayload = await api.explore.country(option.value);
    const detail = detailPayload?.data || detailPayload || {};
    const cities = detail.cities || detail.country?.cities || [];
    cityInput.value =
      cityName(cities[0]) || detail.capital || detail.city || cityInput.value;
  } catch {}
  if (cityInput.value) loadAttractions();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAttractions();
});

// Initial Load
try {
  const payload = await api.explore.countries();
  const countries =
    payload?.countries || payload?.data?.countries || rows(payload);

  countrySelect.innerHTML =
    '<option value="">Select a country</option>' +
    countries
      .map(
        (country) =>
          `<option value="${escapeHtml(countryName(country))}" data-code="${escapeHtml(countryCode(country))}" data-city="${escapeHtml(country.capital || cityName(country.cities?.[0]) || "Cairo")}">${escapeHtml(countryName(country))}</option>`,
      )
      .join("");

  // Default selection to Egypt if available
  const egyptOption = Array.from(countrySelect.options).find(
    (opt) => opt.value.toLowerCase() === "egypt" || opt.textContent.toLowerCase().includes("egypt"),
  );

  if (egyptOption) {
    countrySelect.value = egyptOption.value;
    cityInput.value = "Cairo";
    renderCityPills(egyptOption.value);
    loadAttractions();
  } else if (countries.length) {
    countrySelect.selectedIndex = 1;
    cityInput.value = countrySelect.selectedOptions[0]?.dataset.city || "";
    loadAttractions();
  } else {
    target.innerHTML = '<div class="empty">No countries are available right now.</div>';
  }
} catch (error) {
  // If country listing fails, provide Egypt fallback directly
  countrySelect.innerHTML = '<option value="Egypt" data-code="EG" data-city="Cairo" selected>Egypt</option>';
  cityInput.value = "Cairo";
  renderCityPills("Egypt");
  loadAttractions();
}

