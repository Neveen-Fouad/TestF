import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, mountSidebar, notify, requireLogin } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  mountSidebar("trip-album"); const tripSelect = document.querySelector("#album-trip"); const target = document.querySelector("#album-memories"); const summary = document.querySelector("#album-summary"); const form = document.querySelector("#memory-form");
  const renderMemory = item => { const type = item.type || "note"; const content = item.content || item.url || item.file_url || ""; const body = type === "photo" && content ? `<img src="${escapeHtml(content)}" alt="${escapeHtml(item.caption || "Trip memory")}">` : type === "voice" && content ? `<audio controls src="${escapeHtml(content)}"></audio>` : `<p>${escapeHtml(item.note || content || "A private trip note.")}</p>`; return `<article class="memory-card"><div class="memory-card-top"><span class="memory-kind ${type}">${type === "photo" ? "▧ Photo" : type === "voice" ? "◉ Voice" : "✎ Note"}</span><button data-delete="${item.id}" aria-label="Delete memory">×</button></div>${body}${item.caption ? `<h2>${escapeHtml(item.caption)}</h2>` : ""}<footer>${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Saved memory")}</footer></article>`; };
  async function loadMemories() { const id = tripSelect.value; if (!id) return; target.innerHTML = '<div class="empty">Opening your trip album…</div>'; try { const payload = await api.memories.list(id); const items = rows(payload); const unlocked = payload?.data?.unlocked ?? payload?.unlocked; summary.innerHTML = `<span>${unlocked ? "✦" : "⌁"}</span><p>${unlocked ? "Your time capsule is open — enjoy every shared memory." : "Your memories are safely collecting here. The shared capsule opens when the trip ends."}</p>`; target.innerHTML = items.length ? items.map(renderMemory).join("") : '<div class="empty">This album is waiting for its first memory.</div>'; target.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", async () => { try { await api.memories.remove(id, button.dataset.delete); notify("Memory removed."); loadMemories(); } catch (error) { notify(error.message, true); } })); } catch (error) { summary.innerHTML = '<span>!</span><p>This trip album is not available until the backend exposes the documented memories route.</p>'; target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; } }
  try { const trips = rows(await api.trips.list()); const requestedTrip = new URLSearchParams(location.search).get("trip_id"); tripSelect.innerHTML = trips.length ? trips.map(trip => `<option value="${trip.id}">${escapeHtml(trip.destination || trip.name || `Trip #${trip.id}`)}</option>`).join("") : '<option value="">Create a trip before adding memories</option>'; if (requestedTrip && trips.some(trip => String(trip.id) === requestedTrip)) tripSelect.value = requestedTrip; if (trips.length) loadMemories(); } catch (error) { tripSelect.innerHTML = '<option value="">Trips are unavailable</option>'; target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
  tripSelect.addEventListener("change", loadMemories);
  const typeTabs = [...document.querySelectorAll("[data-type]")];
  const selectType = button => {
    const type = button.dataset.type;
    typeTabs.forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = document.querySelector(`#${item.getAttribute("aria-controls")}`);
      panel.hidden = !selected;
      panel.querySelectorAll("input, textarea").forEach(control => {
        control.disabled = !selected;
        if (control.type === "file") control.required = selected;
      });
    });
    form.elements.type.value = type;
  };
  typeTabs.forEach((button, index) => {
    button.addEventListener("click", () => selectType(button));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? typeTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + typeTabs.length) % typeTabs.length;
      selectType(typeTabs[nextIndex]);
      typeTabs[nextIndex].focus();
    });
  });
  selectType(typeTabs[0]);
  form.addEventListener("submit", async event => { event.preventDefault(); const id = tripSelect.value; if (!id) return notify("Choose a trip first.", true); const data = new FormData(form); if (data.get("type") === "note" && !data.get("note").trim()) return notify("Add a note before saving.", true); try { await api.memories.create(id, data); form.reset(); form.elements.type.value = "note"; document.querySelector('[data-type="note"]').click(); notify("Memory added to your album."); loadMemories(); } catch (error) { notify(error.message, true); } });
}
