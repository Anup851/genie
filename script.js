// ================= DOM ELEMENTS =================
const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");
const chatbox = document.querySelector(".chatbox");
const historySidebar = document.querySelector(".history-sidebar");
const historyList = document.querySelector(".history-list");
const deleteAllBtn = document.querySelector(".delete-all-btn");
const welcome = document.querySelector(".welcome");
const container = document.querySelector(".container");
const sidebarToggle = document.getElementById("sidebar-toggle");
const closeSidebarBtn = document.getElementById("close-sidebar");
const newChatBtn = document.getElementById("new-chat-btn");
const startChatBtn = document.querySelector(".start-chat-btn");
const modeToggle = document.getElementById("mode-toggle");
const modeIcon = modeToggle?.querySelector(".material-symbols-outlined");
const micBtn = document.getElementById("mic-btn");

function markAppView() {
  const ua = navigator.userAgent || "";

  // Android WebView detection (works for most APK webview wrappers)
  const isWebView =
    /wv/i.test(ua) || (ua.includes("Version/") && ua.includes("Chrome/"));

  if (isWebView) document.body.classList.add("app-view");
}

document.addEventListener("DOMContentLoaded", markAppView);


// ================= APP CONFIG =================
const WEATHER_API_KEY = "c4846573091c7b3978af67020443a2b4";
const BACKEND_URL = "https://8c4f04f8-814c-43a8-99c8-a96f45bfd9e6-00-1p3byqr3jjezl.sisko.replit.dev";

let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let conversationMemory = [];
let activeChatId = localStorage.getItem("genie_activeChatId") || null;
let speechRecognition = null;
let voices = [];

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  console.log("🚀 Initializing app...");
  setupDownloadAppButton();

  // 1) Always show welcome first (no sidebar, no chat-started)
  initUIState();

  // 2) User
  const userId = getUserId();
  console.log("👤 User ID:", userId);

  // 3) Theme + speech + mic
  initTheme();
  initSpeechSynthesis();
  initMicrophone();

  // 4) Events
  initEventListeners();

  // 5) Backend check (don't block UI)
  testBackendConnection().catch(console.error);

  // 6) OPTIONAL: Preload last chat in background (welcome stays)
  if (activeChatId && chatbox) {
    try {
      await loadChatFromServer(activeChatId);
      // IMPORTANT: do NOT add chat-started here
      // welcome screen remains visible until user clicks Start Chat
    } catch (e) {
      console.warn("⚠️ Could not preload last chat:", e);
    }
  }

  console.log("✅ App initialized");
}


// ================= CORE FUNCTIONS =================

// 1. USER MANAGEMENT
function getUserId() {
    let userId = localStorage.getItem('genie_userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('genie_userId', userId);
    }
    return userId;
}

function initUIState() {
  // ALWAYS start on welcome screen
  document.body.classList.remove("chat-started", "show-chatbot", "show-history");

  if (welcome) welcome.style.display = "block";
  if (container) container.style.display = "none";

  // Sidebar MUST be hidden on welcome (remove inline overrides too)
  if (historySidebar) {
    historySidebar.classList.remove("active");
    historySidebar.style.display = "";     // remove forced "block/none"
    historySidebar.style.transform = "";   // remove forced translate
  }
}


// 3. THEME MANAGEMENT
function initTheme() {
    if (!modeToggle || !modeIcon) return;
    
    // Set initial icon
    modeIcon.textContent = document.body.classList.contains("light-mode") 
        ? "light_mode" 
        : "dark_mode";
    
    modeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");
        modeIcon.textContent = document.body.classList.contains("light-mode") 
            ? "light_mode" 
            : "dark_mode";
        localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
    });
    
    // Load saved theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        modeIcon.textContent = "light_mode";
    }
}

// 4. EVENT LISTENERS
function initEventListeners() {
    // Send message on button click
    if (sendChatBtn) sendChatBtn.addEventListener("click", handleChat);
    
    // Send message on Enter (without Shift)
    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChat();
            }
        });
    }
    
    // Start chat button
    if (startChatBtn) {
        startChatBtn.addEventListener("click", async () => {
            await startChat();
        });
    }
    
    // Close chatbot
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.body.classList.remove("chat-started", "show-chatbot");
            if (historySidebar) historySidebar.classList.remove("active");
            if (container) container.style.display = "none";
            if (welcome) welcome.style.display = "block";
        });
    }
    
    // SIDEBAR TOGGLE - FIXED VERSION
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            console.log("📱 Sidebar toggle clicked");
            
            if (!historySidebar) {
                console.error("❌ History sidebar not found!");
                return;
            }
            
            const isMobile = window.innerWidth <= 480;
            
            if (isMobile) {
                // Mobile: toggle active class
                historySidebar.classList.toggle("active");
                console.log("📱 Sidebar active:", historySidebar.classList.contains("active"));
                
                // Show/hide with display property for mobile
                if (historySidebar.classList.contains("active")) {
                    historySidebar.style.display = "block";
                    historySidebar.style.transform = "translateX(0)";
                } else {
                    historySidebar.style.display = "none";
                    historySidebar.style.transform = "translateX(-100%)";
                }
            } else {
                // Desktop: just ensure it's visible
                historySidebar.style.display = "block";
                historySidebar.style.transform = "translateX(0)";
            }
        });
    }
    
    
    // New chat button
    if (newChatBtn) {
        newChatBtn.addEventListener("click", async () => {
            await createNewChat();
        });
    }
    
    // Delete all chats
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener("click", async () => {
            await deleteAllChats();
        });
    }
    
    // Close sidebar when clicking outside (mobile only)
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 480 && 
            historySidebar && 
            historySidebar.classList.contains("active") &&
            !historySidebar.contains(e.target) &&
            e.target !== sidebarToggle &&
            !sidebarToggle?.contains(e.target)) {
            historySidebar.classList.remove("active");
            historySidebar.style.display = "none";
            historySidebar.style.transform = "translateX(-100%)";
        }
    });
    
    // Handle window resize
    window.addEventListener("resize", handleResize);
}

// 5. CHAT MANAGEMENT
async function startChat() {
    console.log("💬 Starting chat...");
    
    // Update UI state
    document.body.classList.add("chat-started", "show-chatbot");
    
    if (welcome) welcome.style.display = "none";
    if (container) container.style.display = "block";
    
    // Handle sidebar based on screen size
    if (window.innerWidth > 480) {
        // Desktop: show sidebar
        if (historySidebar) {
            historySidebar.style.display = "block";
            historySidebar.style.transform = "translateX(0)";
        }
        document.body.classList.add("show-history");
    } else {
        // Mobile: hide sidebar initially
        if (historySidebar) {
            historySidebar.style.display = "none";
            historySidebar.style.transform = "translateX(-100%)";
        }
    }
    
    // Ensure active chat exists
    await ensureActiveChat();
    
    // Focus on input
    if (chatInput) chatInput.focus();
}

async function ensureActiveChat() {
    const userId = getUserId();
    
    if (!activeChatId) {
        // Create new chat
        const resp = await fetch(`${BACKEND_URL}/chat/new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, title: "New chat" })
        });
        
        if (resp.ok) {
            const data = await resp.json();
            activeChatId = data.chatId;
            localStorage.setItem("genie_activeChatId", activeChatId);
        } else {
            console.error("❌ Failed to create new chat");
            return;
        }
    }
    
    // Load sidebar sessions
    await loadSessionsSidebar();
    
    // Load chat messages
    await loadChatFromServer(activeChatId);
}

async function createNewChat() {
    const userId = getUserId();
    
    try {
        const resp = await fetch(`${BACKEND_URL}/chat/new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, title: "New chat" })
        });
        
        if (resp.ok) {
            const data = await resp.json();
            await openSession(data.chatId);
        }
    } catch (error) {
        console.error("❌ Error creating new chat:", error);
    }
}

async function openSession(chatId) {
    activeChatId = chatId;
    localStorage.setItem("genie_activeChatId", activeChatId);
    await loadChatFromServer(chatId);
    await loadSessionsSidebar();
}

async function loadSessionsSidebar() {
    const userId = getUserId();
    
    try {
        const resp = await fetch(`${BACKEND_URL}/chats/${userId}`);
        if (!resp.ok) throw new Error("Failed to load sessions");
        
        const data = await resp.json();
        const sessions = data.sessions || [];
        
        historyList.innerHTML = "";
        
        if (sessions.length === 0) {
            // Create styled "no chats" message
            const noChatsLi = document.createElement("li");
            noChatsLi.className = "no-chats";
            noChatsLi.textContent = "No chats yet";
            historyList.appendChild(noChatsLi);
            return;
        }
        
        sessions.forEach(session => {
            const li = document.createElement("li");
            li.className = "history-item";
            if (session.chatId === activeChatId) li.classList.add("active");
            
            li.innerHTML = `
                <span class="history-title">${escapeHtml(session.title || "New chat")}</span>
                <span class="material-icons delete-icon" title="Delete chat">delete</span>
            `;
            
            // Open chat on click
            li.addEventListener("click", (e) => {
                if (e.target.classList.contains("delete-icon")) return;
                openSession(session.chatId);
            });
            
            // Delete chat
            li.querySelector(".delete-icon").addEventListener("click", async (e) => {
                e.stopPropagation();
                await deleteSession(session.chatId);
            });
            
            historyList.appendChild(li);
        });
    } catch (error) {
        console.error("❌ Error loading sessions:", error);
        // Create styled error message
        const errorLi = document.createElement("li");
        errorLi.className = "error";
        errorLi.textContent = "Failed to load chats";
        historyList.innerHTML = "";
        historyList.appendChild(errorLi);
    }
}

async function loadChatFromServer(chatId) {
    const userId = getUserId();
    
    try {
        const resp = await fetch(`${BACKEND_URL}/chat/${userId}/${chatId}`);
        if (!resp.ok) throw new Error("Failed to load chat");
        
        const data = await resp.json();
        chatbox.innerHTML = "";
        
        (data.messages || []).forEach(msg => {
            if (msg.role === "user") {
                chatbox.appendChild(createChatLi(msg.message, "outgoing"));
            } else {
                const li = createChatLi("", "incoming");
                const p = li.querySelector("p");
                
                const htmlWithBlocks = parseFencedBlocks(msg.message);
                p.innerHTML = `<div class="bot-message-content">${htmlWithBlocks}</div>`;
                
                if (window.Prism) Prism.highlightAllUnder(p);
                enableCopyButtons(p);
                ensureMsgActions(li.querySelector(".bot-message-container"));
                
                chatbox.appendChild(li);
            }
        });
        
        chatbox.scrollTo(0, chatbox.scrollHeight);
    } catch (error) {
        console.error("❌ Error loading chat:", error);
        // Create properly styled error message
        const errorLi = document.createElement("li");
        errorLi.className = "chat incoming error";
        errorLi.innerHTML = `
            <div class="bot-message-container">
                <p>Failed to load chat. Please check your connection and try again.</p>
            </div>
        `;
        chatbox.innerHTML = "";
        chatbox.appendChild(errorLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
    }
}

async function deleteSession(chatId) {
    const userId = getUserId();
    
    try {
        await fetch(`${BACKEND_URL}/chat/${userId}/${chatId}`, {
            method: "DELETE"
        });
        
        // If deleted current chat, create a new one
        if (chatId === activeChatId) {
            activeChatId = null;
            localStorage.removeItem("genie_activeChatId");
            await ensureActiveChat();
        } else {
            await loadSessionsSidebar();
        }
    } catch (error) {
        console.error("❌ Error deleting session:", error);
    }
}

async function deleteAllChats() {
    const userId = getUserId();
    
    if (!confirm("Are you sure you want to delete all chats?")) return;
    
    try {
        await fetch(`${BACKEND_URL}/chats/${userId}`, {
            method: "DELETE"
        });
        
        activeChatId = null;
        localStorage.removeItem("genie_activeChatId");
        await ensureActiveChat();
    } catch (error) {
        console.error("❌ Error deleting all chats:", error);
    }
}

// 6. MESSAGE HANDLING
function handleChat() {
    const userMessage = chatInput?.value.trim();
    if (!userMessage || !chatInput) return;
    
    // Clear input
    chatInput.value = "";
    
    // Add user message to chatbox
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);
    
    // Show typing indicator and generate response
    setTimeout(() => {
        const typingLi = showTypingIndicator();
        generateResponse(typingLi, userMessage);
    }, 600);
}
async function generateResponse(incomingChatli, userMessage) {
  const messageElement = convertTypingToMessage(incomingChatli);
  messageElement.innerHTML = "Thinking<span class='dots'></span>";

  // Check for special commands
  if (await handleSpecialCommands(messageElement, userMessage)) {
    return;
  }

  try {
    const userId = getUserId();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId,
        chatId: activeChatId,
        message: userMessage.trim(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.reply || "No response from AI.";

    // ✅ 1) TYPE the plain text (ChatGPT feel)
    messageElement.innerHTML = "";
    const speed = responseText.length > 1200 ? 5 : 12;

    

    // ✅ Typing effect (text + code typed inside block)
messageElement.innerHTML = "";

const textSpeed = responseText.length > 1200 ? 6 : 12;
const codeSpeed = 3;

await typeTextAndCode(messageElement, responseText, textSpeed, codeSpeed);

// After typing finishes: highlight + copy
if (window.Prism) Prism.highlightAllUnder(messageElement);
enableCopyButtons(messageElement);
ensureMsgActions(messageElement.closest(".bot-message-container"));


    // Save to conversation memory
    conversationMemory.push({ role: "user", text: userMessage });
    conversationMemory.push({
      role: "assistant",
      text: responseText.replace(/<[^>]*>/g, ""),
    });

    // Update sidebar
    await loadSessionsSidebar();
  } catch (error) {
    console.error("❌ Error generating response:", error);
    messageElement.innerHTML = "❌ Failed to get response. Please try again.";
  } finally {
    chatbox.scrollTo(0, chatbox.scrollHeight);
  }
}


async function handleSpecialCommands(messageElement, userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Weather command
    if (lowerMessage.includes("weather") || lowerMessage.includes("temperature")) {
        const cityMatch = userMessage.match(/weather|temperature\s+(?:in|at|for)?\s*([a-zA-Z\s]+)/i);
        let city = cityMatch ? cityMatch[1].trim() : "";
        
        if (!city) {
            const words = userMessage.split(" ");
            city = words[words.length - 1];
        }
        
        if (!city) {
            messageElement.innerHTML = "Please specify a location for the weather.";
            return true;
        }
        
        const weatherData = await fetchWeather(city);
        if (!weatherData) {
            messageElement.innerHTML = `Sorry, I couldn't find weather data for "${city}".`;
            return true;
        }
        
        const { temp, feels_like, humidity } = weatherData.main;
        const description = weatherData.weather[0].description;
        const windSpeed = weatherData.wind.speed;
        const cityName = weatherData.name;
        const country = weatherData.sys.country;
        
        const weatherReply = `🌤️ Weather in ${cityName}, ${country}:<br>
        Temperature: ${temp}°C (feels like ${feels_like}°C)<br>
        Condition: ${description}<br>
        Humidity: ${humidity}%<br>
        Wind Speed: ${windSpeed} m/s`;
        
        messageElement.innerHTML = weatherReply;
        return true;
    }
    
    // Clear memory command
    if (lowerMessage.includes("clear memory")) {
        conversationMemory = [];
        messageElement.innerHTML = "🧠 Memory cleared.";
        return true;
    }
    
    return false;
}

async function fetchWeather(city) {
    try {
        const resp = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
        );
        return resp.ok ? await resp.json() : null;
    } catch {
        return null;
    }
}

// 7. UI ELEMENTS CREATION
function createChatLi(message, className) {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", className);
    
    if (className === "outgoing") {
        chatLi.innerHTML = `<p>${escapeHtml(message)}</p>`;
    } else {
        const container = document.createElement("div");
        container.className = "bot-message-container";
        
        const p = document.createElement("p");
        p.innerHTML = message;
        container.appendChild(p);
        
        chatLi.appendChild(container);
    }
    
    return chatLi;
}

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

function ensureMsgActions(container) {
    if (!container || container.querySelector(".msg-actions")) return;
    
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    
    actions.innerHTML = `
        <button class="copy-btn material-symbols-outlined" title="Copy">content_copy</button>
        <button class="speak-btn material-symbols-outlined" title="Speak">volume_up</button>
    `;
    
    // Copy button functionality
    actions.querySelector(".copy-btn").addEventListener("click", () => {
        const messageText = container.querySelector("p")?.innerText || "";
        navigator.clipboard.writeText(messageText).then(() => {
            const btn = actions.querySelector(".copy-btn");
            btn.textContent = "done";
            setTimeout(() => {
                btn.textContent = "content_copy";
            }, 1500);
        });
    });
    
    // Speak button functionality
    actions.querySelector(".speak-btn").addEventListener("click", () => {
        const messageText = container.querySelector("p")?.innerText || "";
        if (!messageText) return;
        
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            actions.querySelector(".speak-btn").textContent = "volume_up";
            return;
        }
        
        const speakBtn = actions.querySelector(".speak-btn");
        speakBtn.textContent = "volume_off";
        
        const utterance = new SpeechSynthesisUtterance(messageText);
        if (voices.length > 0) {
            const englishVoice = voices.find(v => v.lang.startsWith("en"));
            if (englishVoice) utterance.voice = englishVoice;
        }
        
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            speakBtn.textContent = "volume_up";
        };
        
        window.speechSynthesis.speak(utterance);
    });
    
    container.appendChild(actions);
}

// 8. CODE BLOCKS AND FORMATTING
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
    if (!container) return;
    
    container.querySelectorAll(".code-copy-btn").forEach(btn => {
        btn.onclick = () => {
            const code = btn.nextElementSibling?.innerText || "";
            if (!code) return;
            
            navigator.clipboard.writeText(code).then(() => {
                const originalText = btn.innerText;
                btn.innerText = "Copied!";
                setTimeout(() => {
                    btn.innerText = originalText;
                }, 1500);
            });
        };
    });
}

// 9. SPEECH SYNTHESIS
function initSpeechSynthesis() {
    function loadVoices() {
        voices = window.speechSynthesis.getVoices();
    }
    
    if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

// 10. MICROPHONE FUNCTIONALITY
function initMicrophone() {
    if (!micBtn || !chatInput) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = "none";
        return;
    }
    
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = "en-US";
    speechRecognition.interimResults = false;
    speechRecognition.continuous = false;
    
    let isListening = false;
    
    micBtn.addEventListener("click", () => {
        if (isListening) {
            speechRecognition.stop();
            return;
        }
        
        try {
            speechRecognition.start();
        } catch (error) {
            console.error("Microphone error:", error);
            alert("Please allow microphone permission.");
        }
    });
    
    speechRecognition.onstart = () => {
        isListening = true;
        micBtn.classList.add("listening");
        micBtn.textContent = "mic_off";
    };
    
    speechRecognition.onend = () => {
        isListening = false;
        micBtn.classList.remove("listening");
        micBtn.textContent = "mic";
    };
    
    speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (chatInput) {
            chatInput.value = transcript;
            handleChat();
        }
    };
    
    speechRecognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        isListening = false;
        micBtn.classList.remove("listening");
        micBtn.textContent = "mic";
    };
}

// 11. UTILITY FUNCTIONS
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function testBackendConnection() {
    try {
        const response = await fetch(BACKEND_URL);
        if (response.ok) {
            console.log("✅ Backend is reachable");
            return true;
        } else {
            console.error("❌ Backend error:", response.status);
            return false;
        }
    } catch (error) {
        console.error("❌ Cannot reach backend:", error);
        return false;
    }
}

function handleResize() {
    // Update sidebar visibility based on screen size
    if (window.innerWidth > 480) {
        // Desktop: show sidebar if chat is started
        if (document.body.classList.contains("chat-started") && historySidebar) {
            historySidebar.style.display = "block";
            historySidebar.style.transform = "translateX(0)";
            if (sidebarToggle) sidebarToggle.style.display = "none";
        }
    } else {
        // Mobile: hide sidebar toggle button and ensure proper state
        if (sidebarToggle) sidebarToggle.style.display = "block";
        if (historySidebar && !historySidebar.classList.contains("active")) {
            historySidebar.style.display = "none";
            historySidebar.style.transform = "translateX(-100%)";
        }
    }
}

// ================= FIX SIDEBAR CLOSE BUTTON =================
function fixSidebarCloseButton() {
  const closeBtn = document.getElementById("close-sidebar");
  const sidebar = document.querySelector(".history-sidebar");
  
  if (!closeBtn) {
    console.error("❌ Close sidebar button not found!");
    return;
  }
  
  if (!sidebar) {
    console.error("❌ History sidebar not found!");
    return;
  }
  
  console.log("✅ Found sidebar close button:", closeBtn);
  
  // Remove any existing event listeners by cloning
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  
  // Add click event listener
  newCloseBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("🟡 Closing sidebar...");
    
    // Remove active class
    sidebar.classList.remove("active");
    
    // On mobile, also hide with transform
    if (window.innerWidth <= 480) {
      sidebar.style.transform = "translateX(-100%)";
    }
    
    console.log("✅ Sidebar closed");
  });
  
  // Also add event listener to the original sidebar reference
  sidebar.addEventListener("click", function(e) {
    if (e.target.id === "close-sidebar" || 
        e.target.closest("#close-sidebar")) {
      e.stopPropagation();
      sidebar.classList.remove("active");
      if (window.innerWidth <= 480) {
        sidebar.style.transform = "translateX(-100%)";
      }
    }
  });
}

// Run fix when page loads
document.addEventListener("DOMContentLoaded", function() {
  console.log("🚀 DOM loaded, fixing sidebar close button...");
  setTimeout(fixSidebarCloseButton, 500); // Delay to ensure everything is loaded
});

// Also run fix when chat starts (if sidebar is dynamically shown)
document.addEventListener("click", function(e) {
  if (e.target.closest(".start-chat-btn")) {
    setTimeout(fixSidebarCloseButton, 1000);
  }
});

// ================= WEBVIEW FIX FOR SIDEBAR CLOSE BUTTON =================
// ADD THIS AT THE VERY BOTTOM OF THE FILE

// ================= WEBVIEW FIX FOR SIDEBAR CLOSE BUTTON =================

function setupWebViewCloseButton() {
  console.log("🔧 Setting up WebView close button...");
  
  const closeBtn = document.getElementById("close-sidebar");
  const sidebar = document.querySelector(".history-sidebar");
  
  if (!closeBtn || !sidebar) {
    console.log("⏳ WebView: Waiting for elements...");
    return;
  }
  
  console.log("✅ WebView: Found close button and sidebar");
  
  // SIMPLEST SOLUTION: Direct onclick
  closeBtn.onclick = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("🎯 WebView: Close button CLICKED!");
    
    // Close sidebar
    sidebar.classList.remove("active");
    
    // Force hide on mobile
    if (window.innerWidth <= 480) {
      sidebar.style.transform = "translateX(-100%)";
      sidebar.style.display = "none";
    }
    
    return false;
  };
  
  console.log("✅ WebView: Close button setup complete");
}

// Run setup immediately and multiple times
setupWebViewCloseButton();
setTimeout(setupWebViewCloseButton, 500);
setTimeout(setupWebViewCloseButton, 1000);
setTimeout(setupWebViewCloseButton, 2000);

// Run when sidebar opens
document.addEventListener("click", function(e) {
  if (e.target.closest("#sidebar-toggle") || 
      e.target.closest(".start-chat-btn")) {
    console.log("🔄 Sidebar state changed, re-setting up close button...");
    setTimeout(setupWebViewCloseButton, 300);
  }
});

// ---- Typing simulation helpers ----
function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function typeCharsInto(el, text, baseSpeed = 10) {
  return new Promise((resolve) => {
    const safe = escapeHTML(text);
    let i = 0;
    el.innerHTML = "";

    function tick() {
      if (i >= safe.length) return resolve();

      el.innerHTML += safe[i++];
      const chatbox = document.querySelector(".chatbox");
      if (chatbox) chatbox.scrollTop = chatbox.scrollHeight;

      let delay = baseSpeed;
      const c = safe[i - 1];
      if (c === "\n") delay = 25;
      else if (c === "." || c === "!" || c === "?") delay = 120;
      else if (c === "," || c === ";") delay = 60;

      setTimeout(tick, delay);
    }

    tick();
  });
}

async function typeTextAndCode(element, fullText, textSpeed = 12, codeSpeed = 4) {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  element.innerHTML = "";

  while ((match = regex.exec(fullText)) !== null) {
    const before = fullText.slice(lastIndex, match.index);
    const lang = (match[1] || "text").toLowerCase();
    const code = match[2] || "";

    // 🔹 Type normal text
    if (before) {
      const span = document.createElement("span");
      element.appendChild(span);

      const lines = before.split("\n");
      for (let i = 0; i < lines.length; i++) {
        await typeCharsInto(span, lines[i], textSpeed);
        if (i < lines.length - 1) span.innerHTML += "<br>";
      }
    }

    // 🔹 Create code block immediately
    const block = document.createElement("div");
    block.className = "code-block";
    block.innerHTML = `
      <button class="code-copy-btn" type="button">Copy</button>
      <pre class="language-${lang}"><code class="language-${lang}"></code></pre>
    `;
    element.appendChild(block);

    // 🔹 Type code inside <code>
    const codeEl = block.querySelector("code");
    await typeCharsInto(codeEl, code, codeSpeed);

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  const rest = fullText.slice(lastIndex);
  if (rest) {
    const span = document.createElement("span");
    element.appendChild(span);

    const lines = rest.split("\n");
    for (let i = 0; i < lines.length; i++) {
      await typeCharsInto(span, lines[i], textSpeed);
      if (i < lines.length - 1) span.innerHTML += "<br>";
    }
  }
}
const APK_URL =
  "https://github.com/Anup851/genie.apk/releases/download/v1.0/Genie.AI_v1.0.apk";

function isRunningInsideApp() {
  if (window.GENIE_APP === true) return true;
  if (document.body.classList.contains("app-view")) return true;

  const ua = navigator.userAgent || "";
  const isWebView =
    /wv/i.test(ua) || (ua.includes("Version/") && ua.includes("Chrome/"));
  return isWebView;
}


function setupDownloadAppButton() {
  const btn = document.getElementById("download-app-btn");
  if (!btn) return;

  if (isRunningInsideApp()) {
    btn.style.display = "none";
    return;
  }

  btn.style.display = "inline-flex";
  btn.href = APK_URL;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    // GitHub release link works great with direct navigation
    window.location.href = APK_URL;
  });
}



// ================= END OF CODE =================
