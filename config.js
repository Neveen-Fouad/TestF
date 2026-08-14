// Production defaults to a same-origin `/api` proxy. Deployments with a
// separately hosted backend can set `window.JOURNOVO_API_BASE_URL` before this
// file loads, without rebuilding the frontend.
const localHostnames = new Set(["localhost", "127.0.0.1"]);
const isLocalNetwork = window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);

let defaultApiUrl;
if (window.location.pathname.includes('/TestF/')) {
    defaultApiUrl = window.location.origin + window.location.pathname.split('/TestF/')[0] + '/conference_c1/public/api';
} else if (localHostnames.has(window.location.hostname) || isLocalNetwork) {
    defaultApiUrl = `http://${window.location.hostname}:8000/api`;
} else {
    defaultApiUrl = `${window.location.origin}/api`;
}

window.JOURNOVO_CONFIG = Object.freeze({
  API_BASE_URL: window.JOURNOVO_API_BASE_URL || defaultApiUrl
});
