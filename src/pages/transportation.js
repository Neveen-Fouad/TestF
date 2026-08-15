import { api } from "../shared/api.js";
import { mountNavigation, notify } from "../shared/navigation.js";

mountNavigation("transportation");

const target = document.querySelector("#transportation-results");

document.querySelector("#transportation-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const button = form.querySelector("button");
  const city = new FormData(form).get("city");
  
  try {
    button.disabled = true;
    button.textContent = "Loading...";
    target.innerHTML = '<div class="empty">Analyzing transportation options...</div>';
    
    const response = await api.transportation.tips(city);
    const tips = response.data?.tips || response.tips || response.data || "";
    
    if (tips) {
      target.innerHTML = `
        <article class="card" style="padding: 2rem;">
          <h2 style="margin-bottom: 1rem; color: var(--secondary);">Getting around ${city}</h2>
          <div style="line-height: 1.6; color: var(--text-muted); white-space: pre-line;">${tips}</div>
        </article>
      `;
    } else {
      target.innerHTML = '<div class="empty">No transportation tips available for this destination.</div>';
    }
  } catch (error) {
    target.innerHTML = `<div class="empty" style="color: var(--danger);">${error.message}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = "Get Tips";
  }
});
