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