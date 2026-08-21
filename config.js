// Immediate Theme Loader to prevent Flash of Unstyled Content (FOUC)
(function() {
  try {
    const saved = localStorage.getItem("journovo-theme");
    if (saved === "dark") {
      document.documentElement.dataset.theme = "dark";
    } else {
      document.documentElement.dataset.theme = "light";
    }
  } catch (e) {}
})();

const isProduction = true; // Set to true for production, false for development

let defaultApiUrl;

if (isProduction) {
    defaultApiUrl = `https://conferencec1-production.up.railway.app/api`; 
} else {
    defaultApiUrl = `http://${window.location.hostname}:8000/api`;
}

window.JOURNOVO_CONFIG = Object.freeze({
  API_BASE_URL: window.JOURNOVO_API_BASE_URL || defaultApiUrl
});

//redeployment test