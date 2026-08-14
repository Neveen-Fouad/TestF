import { api, rows } from "../shared/api.js";
import { escapeHtml, mountNavigation, requireLogin, notify } from "../shared/navigation.js";

mountNavigation();
if (requireLogin()) {
  const chat = document.querySelector("#chat");
  const form = document.querySelector("#joy-form");
  const input = form.elements.message;
  const submitButton = form.querySelector("button");
  const status = document.querySelector("#joy-status");
  let conversation;
  let isSending = false;

  const messageMarkup = (content, role = "assistant", state = "") => `
    <article class="message ${role === "user" ? "mine" : ""} ${state}">
      <span class="message-label">${role === "user" ? "You" : "Joy"}</span>
      <p>${escapeHtml(content)}</p>
    </article>`;
  const showStatus = (message, type = "") => {
    status.textContent = message;
    status.className = `joy-status ${type}`;
    status.hidden = !message;
  };
  const scrollToLatest = () => { chat.scrollTop = chat.scrollHeight; };
  const serviceMessage = error => error?.status >= 500
    ? "Joy is unavailable right now. The AI service needs to be configured before it can reply."
    : (error?.message || "We couldn't send that message. Please try again.");

  try {
    const conversations = rows(await api.joy.conversations());
    conversation = conversations[0];
    const detail = conversation ? await api.joy.show(conversation.id) : null;
    const messages = detail?.data?.messages || detail?.messages || rows(detail);
    chat.innerHTML = messages.map(message => messageMarkup(message.content || message.message || "", message.role)).join("") || messageMarkup("Hi, I'm Joy. Where are you dreaming of going next?");
  } catch (error) {
    chat.innerHTML = messageMarkup("Hi, I'm Joy. I couldn't load our earlier conversation, but you can still ask me a travel question.");
    showStatus(serviceMessage(error), "error");
  }
  scrollToLatest();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = new FormData(form).get("message")?.trim();
    if (!message || isSending) return;

    isSending = true;
    submitButton.disabled = true;
    showStatus("", "");
    chat.insertAdjacentHTML("beforeend", messageMarkup(message, "user"));
    chat.insertAdjacentHTML("beforeend", messageMarkup("Joy is thinking…", "assistant", "pending"));
    form.reset();
    scrollToLatest();
    try {
      const result = await api.joy.send(message, conversation?.id);
      const reply = result.data || result;
      conversation = reply.conversation || (reply.conversation_id ? { id: reply.conversation_id } : conversation);
      chat.querySelector(".message.pending")?.remove();
      chat.insertAdjacentHTML("beforeend", messageMarkup(reply.assistant_message?.content || reply.message || reply.content || reply.reply || "I don't have a response yet. Please try again.", "assistant"));
    } catch (error) {
      chat.querySelector(".message.pending")?.remove();
      const errorMessage = serviceMessage(error);
      chat.insertAdjacentHTML("beforeend", messageMarkup(errorMessage, "assistant", "error"));
      showStatus(errorMessage, "error");
      notify(errorMessage, true);
    } finally {
      isSending = false;
      submitButton.disabled = false;
      input.focus();
      scrollToLatest();
    }
  });
}
