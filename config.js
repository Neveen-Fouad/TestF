// Production defaults to a same-origin `/api` proxy. Deployments with a
// separately hosted backend can set `window.JOURNOVO_API_BASE_URL` before this
// file loads, without rebuilding the frontend.
const localHostnames = new Set(["localhost", "127.0.0.1"]);
const defaultApiUrl = localHostnames.has(window.location.hostname)
  ? "http://127.0.0.1:8000/api"
  : `${window.location.origin}/api`;

window.JOURNOVO_CONFIG = Object.freeze({
  API_BASE_URL: window.JOURNOVO_API_BASE_URL || defaultApiUrl
});
