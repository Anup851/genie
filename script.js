/* =========================
   WELCOME SCREEN + CHAT STARTED (FIX)
   - Sidebar hidden on welcome
   - On desktop: sidebar should be visible only when body.chat-started
   ========================= */
function setupWelcomeAndStart() {
  // initial: welcome on, chat hidden, sidebar closed
  document.body.classList.remove("chat-started");
  document.body.classList.remove("show-chatbot");
  historySidebar?.classList.remove("active");

  if (welcome && container) {
    welcome.style.display = "block";
    container.style.display = "none";
  }

  // start chat
  if (startChatBtn) {
    startChatBtn.addEventListener("click", async () => {
      document.body.classList.add("chat-started");
      document.body.classList.add("show-chatbot");

      if (welcome && container) {
        welcome.style.display = "none";
        container.style.display = "block";
      }

      // keep sidebar closed on start (mobile)
      historySidebar?.classList.remove("active");

      await ensureActiveChat();
    });
  }

  // close chat
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.classList.remove("chat-started");
      document.body.classList.remove("show-chatbot");
      historySidebar?.classList.remove("active");

      if (welcome && container) {
        container.style.display = "none";
        welcome.style.display = "block";
      }
    });
  }
}
