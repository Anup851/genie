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
// app view 
document.addEventListener("DOMContentLoaded", async () => {
  if (window.Capacitor?.isNativePlatform?.()) {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: false });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.Capacitor?.isNativePlatform?.()) {
    document.body.classList.add("in-app");
  }
});



// Initialize user ID when page loads
document.addEventListener('DOMContentLoaded', function() {
  const userId = getUserId();
  console.log('👤 Current user:', userId);
});


// API configurations
const WEATHER_API_KEY = "c4846573091c7b3978af67020443a2b4";
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let conversationMemory = [];

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

    const botIcon = document.createElement("span");
    botIcon.className = "material-symbols-outlined robot-icon";
    botIcon.textContent = "smart_toy";

    chatLi.appendChild(botIcon);
    chatLi.appendChild(container);
  }

  return chatLi;
}


// Save search history
const saveSearchHistory = (message) => {
  searchHistory.push(message);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  updateHistorySidebar();
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
const deleteHistoryItem = (index) => {
  searchHistory.splice(index, 1);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  updateHistorySidebar();
};

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
    saveSearchHistory(userMessage);
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
        userId: userId, // Use persistent user ID
        message: userMessage.trim()  // ✅ CORRECT - property name is "message"
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

    messageElement.innerHTML = `<div class="bot-message-content">${finalText}</div>`;


    // Save clean text to memory
    const plainText = responseText.replace(/<[^>]*>/g, "");
    conversationMemory.push({ role: "assistant", text: plainText });
    saveSearchHistory(userMessage);

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
chatbotToggler.addEventListener("click", () => {
  document.body.classList.toggle("show-chatbot");
  document.body.classList.toggle("show-history");
});
closeBtn.addEventListener("click", () => {
  document.body.classList.remove("show-chatbot");
  document.body.classList.remove("show-history");
});
updateHistorySidebar();
deleteAllBtn.addEventListener("click", () => {
  searchHistory = [];
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  updateHistorySidebar();
});
const startChatBtn = document.querySelector(".start-chat-btn");
startChatBtn.addEventListener("click", () => {
  document.body.classList.add("show-chatbot");
  document.body.classList.add("show-history");
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


// History sidebar functionality
if (sidebarToggle && closeSidebarBtn) {
  sidebarToggle.addEventListener("click", () => {
    historySidebar.classList.toggle("active");
    document.body.classList.toggle("show-history");
  });
  closeSidebarBtn.addEventListener("click", () => {
    historySidebar.classList.remove("active");
    document.body.classList.remove("show-history");
  });
  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 480 && 
        historySidebar.classList.contains("active") && 
        !historySidebar.contains(event.target) && 
        event.target !== sidebarToggle) {
      historySidebar.classList.remove("active");
      document.body.classList.remove("show-history");
    }
  });
}

// Welcome screen and container management
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const welcome = document.querySelector(".welcome");
  const startChatBtn = document.querySelector(".start-chat-btn");
  if (welcome && container) {
    welcome.style.display = "block";
    container.style.display = "none";
  }
  historySidebar.classList.remove("active");
  document.body.classList.remove("show-history");
  if (startChatBtn) {
    startChatBtn.addEventListener("click", () => {
      if (welcome && container) {
        welcome.style.display = "none";
        container.style.display = "block";
      }
      historySidebar.classList.add("active");
      document.body.classList.add("show-history");
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

// Adjust sidebar on window resize
window.addEventListener("resize", () => {
  if (window.innerWidth <= 480) {
    historySidebar.classList.remove("active");
    document.body.classList.remove("show-history");
  } else {
    const container = document.querySelector(".container");
    if (container && container.style.display === "block") {
      historySidebar.classList.add("active");
      document.body.classList.add("show-history");
    } else {
      historySidebar.classList.remove("active");
      document.body.classList.remove("show-history");
    }
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
document.addEventListener('DOMContentLoaded', function() {
  testBackendConnection();
});


function showTypingIndicator() {
  const typingLi = document.createElement("li");
  typingLi.className = "chat incoming typing";

  typingLi.innerHTML = `
    <span class="material-symbols-outlined">smart_toy</span>
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
    <span class="material-symbols-outlined">smart_toy</span>
    <div class="bot-message-container">
      <p></p>
      <button class="speak-btn material-symbols-outlined">volume_up</button>
    </div>
  `;

  return incomingChatli.querySelector("p");
}

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





