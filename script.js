const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");
const chatbox = document.querySelector(".chatbox");
const historySidebar = document.querySelector(".history-sidebar");
const historyList = document.querySelector(".history-list");
const deleteAllBtn = document.querySelector(".delete-all-btn");
const welcomeText = document.querySelector(".welcome");
const sidebarToggle = document.getElementById("sidebar-toggle");
const closeSidebarBtn = document.getElementById("close-sidebar");
const newChatBtn = document.getElementById("new-chat-btn");

if (newChatBtn) {
  newChatBtn.addEventListener("click", async () => {
    await createNewChat();
  });
}



// ===== APP: Responsive safe-top (prevents status bar overlap) =====
function applySafeTop() {
  // visualViewport works well on mobile browsers / WebView
  const vv = window.visualViewport;
  if (!vv) return;

  // Difference between layout viewport and visual viewport top
  // Usually equals status bar / notch area in many WebViews
  const topInset = Math.max(0, Math.round(vv.offsetTop || 0));

  // If offsetTop is 0 (some Android), keep fallback 24px
  if (topInset > 0) {
    document.body.style.setProperty("--safe-top", topInset + "px");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("in-app")) {
    applySafeTop();
    window.addEventListener("resize", applySafeTop);
    window.visualViewport?.addEventListener("resize", applySafeTop);
    window.visualViewport?.addEventListener("scroll", applySafeTop);
  }
});

// User management with persistence
function getUserId() {
  let userId = localStorage.getItem('genie_userId');
  if (!userId) {
    // Create a unique user ID and save it
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('genie_userId', userId);
    console.log('🆕 Created new user ID:', userId);
  } else {
    console.log('🔍 Found existing user ID:', userId);
  }
  return userId;
}

// Initialize user ID when page loads
document.addEventListener('DOMContentLoaded', function() {
  const userId = getUserId();
  console.log('👤 Current user:', userId);
});


// API configurations
const WEATHER_API_KEY = "c4846573091c7b3978af67020443a2b4";
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let conversationMemory = [];
let activeChatId = localStorage.getItem("genie_activeChatId") || null;
const BACKEND_URL = "https://8c4f04f8-814c-43a8-99c8-a96f45bfd9e6-00-1p3byqr3jjezl.sisko.replit.dev";

// Timezone data
const timeZones = {
  india: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  newyork: "America/New_York",
  "new york": "America/New_York",
  london: "Europe/London",
  tokyo: "Asia/Tokyo",
  sydney: "Australia/Sydney",
  dubai: "Asia/Dubai",
  paris: "Europe/Paris",
  singapore: "Asia/Singapore",
  california: "America/Los_Angeles",
  berlin: "Europe/Berlin",
  chicago: "America/Chicago",
  beijing: "Asia/Shanghai",
  seoul: "Asia/Seoul"
};

// Create chat message element
function createChatLi(message, className) {
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", className);

  if (className === "outgoing") {
    chatLi.innerHTML = `<p>${message}</p>`;
  } else {
    const container = document.createElement("div");
    container.className = "bot-message-container";

    const p = document.createElement("p");
    p.innerHTML = message;
    container.appendChild(p);

    const speakBtn = document.createElement("button");
    speakBtn.className = "speak-btn material-symbols-outlined";
    speakBtn.textContent = "volume_up";

    // 🔊 FIX: SPEAK ON CLICK
    speakBtn.addEventListener("click", () => {
      const text = p.innerText.trim();
      if (text) speakText(text);
    });

    container.appendChild(speakBtn);

    chatLi.appendChild(container);

  }

  return chatLi;
}

async function ensureActiveChat() {
  const userId = getUserId();

  // If no active chat, create one on server
  if (!activeChatId) {
    const resp = await fetch(`${BACKEND_URL}/chat/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title: "New chat" })
    });
    const data = await resp.json();
    activeChatId = data.chatId;
    localStorage.setItem("genie_activeChatId", activeChatId);
  }

  await loadSessionsSidebar();
  await loadChatFromServer(activeChatId);
}

async function loadSessionsSidebar() {
  const userId = getUserId();
  const resp = await fetch(`${BACKEND_URL}/chats/${userId}`);
  const data = await resp.json();

  historyList.innerHTML = "";

  const sessions = data.sessions || [];
  if (!sessions.length) {
    historyList.innerHTML = "<li>No chats yet</li>";
    return;
  }

  sessions.forEach(s => {
    const li = document.createElement("li");
    li.className = "history-item";
    if (s.chatId === activeChatId) li.classList.add("active");

    li.innerHTML = `
      <span class="history-title">${escapeHtml(s.title || "New chat")}</span>
      <span class="material-icons delete-icon">delete</span>
    `;

    // Open chat on click
    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-icon")) return;
      openSession(s.chatId);
    });

    // Delete chat
    li.querySelector(".delete-icon").addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteSession(s.chatId);
    });

    historyList.appendChild(li);
  });
}

async function openSession(chatId) {
  activeChatId = chatId;
  localStorage.setItem("genie_activeChatId", activeChatId);
  await loadChatFromServer(chatId);
  await loadSessionsSidebar();
}

async function loadChatFromServer(chatId) {
  const userId = getUserId();
  const resp = await fetch(`${BACKEND_URL}/chat/${userId}/${chatId}`);
  const data = await resp.json();

  chatbox.innerHTML = "";

  (data.messages || []).forEach(m => {
    if (m.role === "user") {
      chatbox.appendChild(createChatLi(m.message, "outgoing"));
    } else {
      const li = createChatLi("", "incoming");
      const p = li.querySelector("p");

      const htmlWithBlocks = parseFencedBlocks(m.message);
      p.innerHTML = `<div class="bot-message-content">${htmlWithBlocks}</div>`;

      if (window.Prism) Prism.highlightAllUnder(p);
      enableCopyButtons(p);

      ensureMsgActions(li.querySelector(".bot-message-container"));
      chatbox.appendChild(li);
    }
  });

  chatbox.scrollTo(0, chatbox.scrollHeight);
}

async function createNewChat() {
  const userId = getUserId();
  const resp = await fetch(`${BACKEND_URL}/chat/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title: "New chat" })
  });
  const data = await resp.json();
  await openSession(data.chatId);
}

async function deleteSession(chatId) {
  const userId = getUserId();
  await fetch(`${BACKEND_URL}/chat/${userId}/${chatId}`, { method: "DELETE" });

  // If deleted current chat, create a new one
  if (chatId === activeChatId) {
    activeChatId = null;
    localStorage.removeItem("genie_activeChatId");
    await ensureActiveChat();
    return;
  }

  await loadSessionsSidebar();
}

// Save search history
const saveSearchHistory = (message) => {
  searchHistory.push(message);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  loadSessionsSidebar();

};

// Update history sidebar
const updateHistorySidebar = () => {
  historyList.innerHTML = "";
  if (searchHistory.length === 0) {
    historyList.innerHTML = "<li>No history available</li>";
  } else {
      searchHistory.forEach((query, index) => {
      const listItem = document.createElement("li");
      listItem.textContent = query;
      const deleteIcon = document.createElement("span");
      deleteIcon.classList.add("material-icons", "delete-icon");
      deleteIcon.textContent = "delete";
      deleteIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistoryItem(index);
      });
      listItem.appendChild(deleteIcon);
      listItem.addEventListener("click", () => {
        chatInput.value = query;
      });
      historyList.appendChild(listItem);
    });
  }
};

// Delete history item
deleteAllBtn.addEventListener("click", async () => {
  const userId = getUserId();

  // delete all sessions from server
  await fetch(`${BACKEND_URL}/chats/${userId}`, { method: "DELETE" });

  // reset active chat
  activeChatId = null;
  localStorage.removeItem("genie_activeChatId");

  // create a new empty chat + reload sidebar
  await ensureActiveChat();
});


const handleChat = () => {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  chatInput.value = "";
  chatbox.appendChild(createChatLi(userMessage, "outgoing"));
  chatbox.scrollTo(0, chatbox.scrollHeight);

  setTimeout(() => {
    const typingLi = showTypingIndicator();
    generateResponse(typingLi, userMessage);
  }, 600);
};


// Fetch real-time weather
async function fetchWeather(city) {
  try {
    const resp = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}


// Fetch real-time time in a timezone
function getTimeInZone(timeZone) {
  return new Date().toLocaleTimeString("en-US", { timeZone });
}

// Main response generator
const generateResponse = async (incomingChatli, userMessage) => {
  const messageElement = convertTypingToMessage(incomingChatli);
messageElement.innerHTML = "Thinking<span class='dots'></span>";


  const lowerMessage = userMessage.toLowerCase();

  // ---------- WEATHER HANDLING ----------
  if (lowerMessage.includes("weather") || lowerMessage.includes("temperature")) {
    let city = userMessage
      .replace(/\b(weather|temperature|in|at|for|what|is|the|current)\b/gi, "")
      .trim();

    if (!city) {
      const words = userMessage.split(" ");
      city = words[words.length - 1];
    }

    if (!city) {
      messageElement.innerHTML = "Please specify a location for the weather.";
      return;
    }

    const weatherData = await fetchWeather(city);
    if (!weatherData) {
      messageElement.innerHTML = `Sorry, I couldn't find weather data for "${city}".`;
      return;
    }

    const { temp, feels_like, humidity } = weatherData.main;
    const description = weatherData.weather[0].description;
    const windSpeed = weatherData.wind.speed;
    const { name: cityName, sys: { country } } = weatherData;

    const weatherReply = `🌤️ Weather in ${cityName}, ${country}:<br>
    Temperature: ${temp}°C 
    (feels like ${feels_like}°C)<br>
    Condition: ${description}<br>
    Humidity: ${humidity}%<br>
    Wind Speed: ${windSpeed} m/s`;
    messageElement.innerHTML = weatherReply;

    conversationMemory.push({ role: "user", text: userMessage });
    conversationMemory.push({ role: "assistant", text: weatherReply.replace(/<[^>]*>/g, "") });
    await loadSessionsSidebar();

    return;
  }

  // ---------- CLEAR MEMORY ----------
  if (lowerMessage.includes("clear memory")) {
    conversationMemory = [];
    messageElement.innerHTML = "🧠 Memory cleared.";
    return;
  }

  // ---------- MEMORY UPDATE ----------
  conversationMemory.push({ role: "user", text: userMessage });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // ✅ FIXED: Get persistent user ID and make correct API call
    const userId = getUserId(); // Make sure this function exists
    
    const response = await fetch("https://8c4f04f8-814c-43a8-99c8-a96f45bfd9e6-00-1p3byqr3jjezl.sisko.replit.dev/chat", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
  userId: userId,
  chatId: activeChatId,            // ✅ ADD THIS
  message: userMessage.trim()
}),

      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Server error:", response.status, errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Backend response:", data);
    
    const responseText = data.reply || "⚠️ No response from AI backend.";

    // Format Markdown to HTML
    const finalText = responseText
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");

    const htmlWithBlocks = parseFencedBlocks(responseText); // use raw text so ``` blocks are detected
messageElement.innerHTML = `<div class="bot-message-content">${htmlWithBlocks}</div>`;

// Prism highlight (if you added prism in HTML)
if (window.Prism) Prism.highlightAllUnder(messageElement);

// enable copy only inside code blocks
enableCopyButtons(messageElement);

ensureMsgActions(messageElement.closest(".bot-message-container"));




    // Save clean text to memory
    const plainText = responseText.replace(/<[^>]*>/g, "");
    conversationMemory.push({ role: "assistant", text: plainText });
    await loadSessionsSidebar();


  } catch (error) {
    console.error("❌ Backend error:", error);
    messageElement.innerHTML = "❌ Failed to get response. Please try again later.";
  } finally {
    chatbox.scrollTo(0, chatbox.scrollHeight);
  }
};

// Event listeners
sendChatBtn.addEventListener("click", handleChat);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleChat();
  }
});

// ✅ FIX: chatbot toggler should NOT control sidebar
chatbotToggler.addEventListener("click", () => {
  document.body.classList.toggle("show-chatbot");
  // ❌ removed: document.body.classList.toggle("show-history");
});

// ✅ FIX: close button should also close sidebar completely
closeBtn.addEventListener("click", () => {
  document.body.classList.remove("show-chatbot");
  historySidebar.classList.remove("active");   // ✅ added
  document.body.classList.remove("show-history");
});

loadSessionsSidebar();



const startChatBtn = document.querySelector(".start-chat-btn");
startChatBtn.addEventListener("click", async () => {
  document.body.classList.add("show-chatbot");
 welcome.style.display = "none";
  container.style.display = "block";
  // ✅ don’t auto open sidebar
  historySidebar.classList.remove("active");
  document.body.classList.remove("show-history");

  await ensureActiveChat();
});


// Dark/light mode toggle
const toggleButton = document.getElementById("mode-toggle");
const icon = toggleButton.querySelector(".material-symbols-outlined");
toggleButton.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  icon.textContent = document.body.classList.contains("light-mode") ? "light_mode" : "dark_mode";
});
window.addEventListener("DOMContentLoaded", () => {
  icon.textContent = document.body.classList.contains("light-mode") ? "light_mode" : "dark_mode";
});


// History sidebar functionality (FIXED: use only .active)
if (sidebarToggle && closeSidebarBtn) {
  sidebarToggle.addEventListener("click", (e) => {
    e.stopPropagation(); // prevents immediate outside-click close
    historySidebar.classList.toggle("active");
  });

  closeSidebarBtn.addEventListener("click", () => {
    historySidebar.classList.remove("active");
  });

  // close when clicking outside (mobile)
  document.addEventListener("click", (event) => {
    if (
      window.innerWidth <= 480 &&
      historySidebar.classList.contains("active") &&
      !historySidebar.contains(event.target) &&
      event.target !== sidebarToggle
    ) {
      historySidebar.classList.remove("active");
    }
  });
}


// ✅ Welcome screen and container management (FIXED)
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const welcome = document.querySelector(".welcome");
  const startChatBtn = document.querySelector(".start-chat-btn");

  // initial state
  if (welcome && container) {
    welcome.style.display = "block";
    container.style.display = "none";
  }

  // ✅ IMPORTANT: do NOT auto-open sidebar
  historySidebar.classList.remove("active");
  

  if (startChatBtn) {
    startChatBtn.addEventListener("click", async () => {
      if (welcome && container) {
        welcome.style.display = "none";
        container.style.display = "block";
      }

      // ✅ do NOT force open sidebar here
      // historySidebar.classList.add("active");
      // document.body.classList.add("show-history");

      // ✅ load chats + ensure active chat
      await ensureActiveChat();
    });
  }

  if (closeBtn && container && welcome) {
    closeBtn.addEventListener("click", () => {
      container.style.display = "none";
      welcome.style.display = "block";

      historySidebar.classList.remove("active");
      document.body.classList.remove("show-history");
    });
  }
});

// ✅ Adjust sidebar on window resize (FIXED: never auto-open)
window.addEventListener("resize", () => {
  if (window.innerWidth <= 480) {
    historySidebar.classList.remove("active");
    document.body.classList.remove("show-history");
  }
});


// Disable zoom
window.addEventListener("wheel", function(e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
window.addEventListener("keydown", function(e) {
  if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) e.preventDefault();
});

// mic working
// ================= MIC (Speech to Text) FIX =================
document.addEventListener("DOMContentLoaded", () => {
  const micBtn = document.getElementById("mic-btn");
  const chatInput = document.querySelector(".chat-input textarea");

  if (!micBtn || !chatInput) return;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micBtn.style.display = "none";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  let listening = false;

  micBtn.addEventListener("click", async () => {
    if (listening) {
      recognition.stop();
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.start();
    } catch {
      alert("Please allow microphone permission.");
    }
  });

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add("listening");
    micBtn.textContent = "mic_off";
  };

  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove("listening");
    micBtn.textContent = "mic";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    handleChat();
  };

  recognition.onerror = () => {
    listening = false;
    micBtn.textContent = "mic";
  };
});




// Test backend connection
async function testBackendConnection() {
  try {
    const response = await fetch("https://8c4f04f8-814c-43a8-99c8-a96f45bfd9e6-00-1p3byqr3jjezl.sisko.replit.dev/");
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Backend is reachable:", data);
      return true;
    } else {
      console.error("❌ Backend responded with error:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Cannot reach backend:", error);
    return false;
  }
}

// Test connection on page load
document.addEventListener('DOMContentLoaded', async function() {
  testBackendConnection();
  
});



function showTypingIndicator() {
  const typingLi = document.createElement("li");
  typingLi.className = "chat incoming typing";

  typingLi.innerHTML = `
    <div class="bot-message-container">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  chatbox.appendChild(typingLi);
  chatbox.scrollTo(0, chatbox.scrollHeight);

  return typingLi;
}

function convertTypingToMessage(incomingChatli) {
  incomingChatli.className = "chat incoming";

  incomingChatli.innerHTML = `
    <div class="bot-message-container">
      <p></p>
    </div>
  `;

  return incomingChatli.querySelector("p");
}


// ===== COPY BUTTON FUNCTIONALITY =====
document.addEventListener("click", (e) => {
  const copyBtn = e.target.closest(".copy-btn");
  if (!copyBtn) return;

  const messageText = copyBtn
    .closest(".bot-message-container")
    .querySelector("p")?.innerText;

  if (!messageText) return;

  navigator.clipboard.writeText(messageText).then(() => {
    copyBtn.textContent = "done";
    setTimeout(() => {
      copyBtn.textContent = "content_copy";
    }, 1200);
  });
});



// speaker functionality
// ===== SPEAKER BUTTON FIX =====
let voices = [];

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}

// Load voices (important for Chrome)
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// Event delegation for dynamically created buttons
document.addEventListener("click", (e) => {
  const speakBtn = e.target.closest(".speak-btn");
  if (!speakBtn) return;

  const messageText = speakBtn.parentElement.querySelector("p")?.innerText;
  if (!messageText) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    speakBtn.textContent = "volume_up"; // speaker icon
    return;
  }

  speakBtn.textContent = "volume_off"; // muted icon while speaking

  const utterance = new SpeechSynthesisUtterance(messageText);
  const englishVoice = voices.find(v => v.lang.startsWith("en"));
  if (englishVoice) utterance.voice = englishVoice;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onend = () => {
    speakBtn.textContent = "volume_up"; // restore icon when done
  };

  window.speechSynthesis.speak(utterance);
});



function ensureMsgActions(container) {
  // If already exists, do nothing
  if (container.querySelector(".msg-actions")) return;

  const actions = document.createElement("div");
  actions.className = "msg-actions";

  actions.innerHTML = `
    <button class="copy-btn material-symbols-outlined" title="Copy">content_copy</button>
    <button class="speak-btn material-symbols-outlined" title="Speak">volume_up</button>
  `;

  container.appendChild(actions);
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseFencedBlocks(text) {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let html = "";

  for (const match of text.matchAll(regex)) {
    const [full, lang, code] = match;
    const start = match.index;
    const end = start + full.length;
html += escapeHtml(text.slice(lastIndex, start)).replaceAll("\n", "<br>");

const safeLang = (lang || "text").toLowerCase();

html += `
  <div class="code-block">
    <button class="code-copy-btn" type="button">Copy</button>
    <pre class="language-${safeLang}"><code class="language-${safeLang}">${escapeHtml(code)}</code></pre>
  </div>
`;

lastIndex = end;

  }

  html += escapeHtml(text.slice(lastIndex)).replaceAll("\n", "<br>");
  return html;
}

function enableCopyButtons(container) {
  container.querySelectorAll(".code-copy-btn").forEach(btn => {
    btn.onclick = () => {
      const code = btn.nextElementSibling.innerText;
      navigator.clipboard.writeText(code);
      btn.innerText = "Copied!";
      setTimeout(() => (btn.innerText = "Copy"), 1000);
    };
  });
}

