import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, requireLogin, notify } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  const chat = document.querySelector("#chat");
  let conversation;
  try {
    const conversations = rows(await api.joy.conversations());
    conversation = conversations[0];
    const detail = conversation ? await api.joy.show(conversation.id) : null;
    const messages = rows(detail);
    chat.innerHTML = messages.map(message => `<p class="message ${message.role === "user" ? "mine" : ""}">${escapeHtml(message.content || message.message || "")}</p>`).join("") || '<p class="message">Hi, I’m Joy. How can I help?</p>';
  } catch (error) { chat.innerHTML = `<p class="message">Hi, I’m Joy. ${escapeHtml(error.message)}</p>`; }

  document.querySelector("#joy-form").addEventListener("submit", async event => {
    event.preventDefault();
    const message = new FormData(event.currentTarget).get("message");
    chat.insertAdjacentHTML("beforeend", `<p class="message mine">${escapeHtml(message)}</p>`);
    event.currentTarget.reset();
    try {
      const result = await api.joy.send(message, conversation?.id);
      const reply = result.data || result;
      conversation = reply.conversation || conversation;
      chat.insertAdjacentHTML("beforeend", `<p class="message">${escapeHtml(reply.message || reply.content || reply.reply || "Joy is thinking…")}</p>`);
      chat.scrollTop = chat.scrollHeight;
    } catch (error) { notify(error.message, true); }
  });
}
